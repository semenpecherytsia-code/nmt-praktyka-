// Локальне сховище спроб (без облікового запису). Дані живуть лише в цьому браузері.

import type { ContentPackage } from '../content/types';
import type { Attempt } from './attempt';

export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function browserKV(): KV {
  const mem = new Map<string, string>();
  const ls = (() => { try { const s = window.localStorage; s.setItem('nmt.probe', '1'); s.removeItem('nmt.probe'); return s; } catch { return null; } })();
  return {
    get: (k) => (ls ? ls.getItem(k) : mem.get(k) ?? null),
    set: (k, v) => { if (ls) ls.setItem(k, v); else mem.set(k, v); },
    remove: (k) => { if (ls) ls.removeItem(k); else mem.delete(k); },
  };
}

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}

const P = 'nmt.v1.';
export const KEYS = {
  attempt: (id: string) => `${P}attempt.${id}`,
  index: `${P}attempts`,
  snapshot: (simId: string, version: string) => `${P}content.${simId}@${version}`,
  prefs: `${P}prefs`,
  lease: (id: string) => `${P}lease.${id}`,
};

export interface Prefs { selectedSimulationId?: string }

function readJSON<T>(kv: KV, key: string): T | null {
  const raw = kv.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export type SaveResult = 'ok' | 'conflict';

export class AttemptRepo {
  constructor(private kv: KV) {}

  listIds(): string[] {
    return readJSON<string[]>(this.kv, KEYS.index) ?? [];
  }

  list(): Attempt[] {
    return this.listIds().map((id) => this.get(id)).filter((a): a is Attempt => !!a);
  }

  get(id: string): Attempt | null {
    return readJSON<Attempt>(this.kv, KEYS.attempt(id));
  }

  /**
   * Запис із перевіркою версії: якщо інша вкладка вже записала новішу ревізію
   * (або завершила спробу), повертається 'conflict', і нічого не перезаписується.
   */
  save(a: Attempt): SaveResult {
    const stored = this.get(a.id);
    if (stored && (stored.revision >= a.revision || (stored.status === 'finished' && a.status !== 'finished'))) {
      return stored.status === 'finished' && a.status === 'finished' && stored.revision === a.revision ? 'ok' : 'conflict';
    }
    this.kv.set(KEYS.attempt(a.id), JSON.stringify(a));
    const ids = this.listIds();
    if (!ids.includes(a.id)) this.kv.set(KEYS.index, JSON.stringify([...ids, a.id]));
    return 'ok';
  }

  activeFor(simulationId: string): Attempt | null {
    return this.list().filter((a) => a.simulationId === simulationId && a.status === 'active').sort((x, y) => y.startedAt - x.startedAt)[0] ?? null;
  }

  finishedFor(simulationId: string): Attempt[] {
    return this.list().filter((a) => a.simulationId === simulationId && a.status === 'finished').sort((x, y) => (y.finishedAt ?? 0) - (x.finishedAt ?? 0));
  }

  /** Знімок вмісту: стара спроба відкривається з тією версією завдань і ключів, з якою її пройдено. */
  saveSnapshot(pkg: ContentPackage): void {
    const key = KEYS.snapshot(pkg.simulation.id, pkg.simulation.version);
    if (!this.kv.get(key)) this.kv.set(key, JSON.stringify(pkg));
  }

  getSnapshot(simulationId: string, version: string): ContentPackage | null {
    return readJSON<ContentPackage>(this.kv, KEYS.snapshot(simulationId, version));
  }

  prefs(): Prefs { return readJSON<Prefs>(this.kv, KEYS.prefs) ?? {}; }
  setPrefs(p: Prefs): void { this.kv.set(KEYS.prefs, JSON.stringify({ ...this.prefs(), ...p })); }
}

/**
 * Одна активна вкладка на спробу. Вкладка тримає «оренду» й оновлює її кожні 2 с.
 * Інша вкладка бачить свіжу оренду й показує попередження з кнопкою «Працювати тут».
 */
export const LEASE_TTL_MS = 8000;

export class TabLease {
  constructor(private kv: KV, private tabId: string, private now: () => number = Date.now) {}

  owner(attemptId: string): { tabId: string; at: number } | null {
    return readJSON(this.kv, KEYS.lease(attemptId));
  }

  state(attemptId: string): 'mine' | 'other' | 'free' {
    const o = this.owner(attemptId);
    if (!o || this.now() - o.at > LEASE_TTL_MS) return 'free';
    return o.tabId === this.tabId ? 'mine' : 'other';
  }

  acquire(attemptId: string, force = false): boolean {
    const s = this.state(attemptId);
    if (s === 'other' && !force) return false;
    this.kv.set(KEYS.lease(attemptId), JSON.stringify({ tabId: this.tabId, at: this.now() }));
    return true;
  }

  release(attemptId: string): void {
    if (this.state(attemptId) === 'mine') this.kv.remove(KEYS.lease(attemptId));
  }
}
