// Локальне сховище спроб (без облікового запису). Дані живуть лише в цьому браузері.
export function browserKV() {
    const mem = new Map();
    const ls = (() => { try {
        const s = window.localStorage;
        s.setItem('nmt.probe', '1');
        s.removeItem('nmt.probe');
        return s;
    }
    catch {
        return null;
    } })();
    return {
        get: (k) => (ls ? ls.getItem(k) : mem.get(k) ?? null),
        set: (k, v) => { if (ls)
            ls.setItem(k, v);
        else
            mem.set(k, v); },
        remove: (k) => { if (ls)
            ls.removeItem(k);
        else
            mem.delete(k); },
    };
}
export function memoryKV() {
    const m = new Map();
    return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}
const P = 'nmt.v1.';
export const KEYS = {
    attempt: (id) => `${P}attempt.${id}`,
    index: `${P}attempts`,
    snapshot: (simId, version) => `${P}content.${simId}@${version}`,
    prefs: `${P}prefs`,
    lease: (id) => `${P}lease.${id}`,
};
function readJSON(kv, key) {
    const raw = kv.get(key);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export class AttemptRepo {
    kv;
    constructor(kv) {
        this.kv = kv;
    }
    listIds() {
        return readJSON(this.kv, KEYS.index) ?? [];
    }
    list() {
        return this.listIds().map((id) => this.get(id)).filter((a) => !!a);
    }
    get(id) {
        return readJSON(this.kv, KEYS.attempt(id));
    }
    /**
     * Запис із перевіркою версії: якщо інша вкладка вже записала новішу ревізію
     * (або завершила спробу), повертається 'conflict', і нічого не перезаписується.
     */
    save(a) {
        const stored = this.get(a.id);
        if (stored && (stored.revision >= a.revision || (stored.status === 'finished' && a.status !== 'finished'))) {
            return stored.status === 'finished' && a.status === 'finished' && stored.revision === a.revision ? 'ok' : 'conflict';
        }
        this.kv.set(KEYS.attempt(a.id), JSON.stringify(a));
        const ids = this.listIds();
        if (!ids.includes(a.id))
            this.kv.set(KEYS.index, JSON.stringify([...ids, a.id]));
        return 'ok';
    }
    activeFor(simulationId) {
        return this.list().filter((a) => a.simulationId === simulationId && a.status === 'active').sort((x, y) => y.startedAt - x.startedAt)[0] ?? null;
    }
    finishedFor(simulationId) {
        return this.list().filter((a) => a.simulationId === simulationId && a.status === 'finished').sort((x, y) => (y.finishedAt ?? 0) - (x.finishedAt ?? 0));
    }
    /** Знімок вмісту: стара спроба відкривається з тією версією завдань і ключів, з якою її пройдено. */
    saveSnapshot(pkg) {
        const key = KEYS.snapshot(pkg.simulation.id, pkg.simulation.version);
        if (!this.kv.get(key))
            this.kv.set(key, JSON.stringify(pkg));
    }
    getSnapshot(simulationId, version) {
        return readJSON(this.kv, KEYS.snapshot(simulationId, version));
    }
    prefs() { return readJSON(this.kv, KEYS.prefs) ?? {}; }
    setPrefs(p) { this.kv.set(KEYS.prefs, JSON.stringify({ ...this.prefs(), ...p })); }
}
/**
 * Одна активна вкладка на спробу. Вкладка тримає «оренду» й оновлює її кожні 2 с.
 * Інша вкладка бачить свіжу оренду й показує попередження з кнопкою «Працювати тут».
 */
export const LEASE_TTL_MS = 8000;
export class TabLease {
    kv;
    tabId;
    now;
    constructor(kv, tabId, now = Date.now) {
        this.kv = kv;
        this.tabId = tabId;
        this.now = now;
    }
    owner(attemptId) {
        return readJSON(this.kv, KEYS.lease(attemptId));
    }
    state(attemptId) {
        const o = this.owner(attemptId);
        if (!o || this.now() - o.at > LEASE_TTL_MS)
            return 'free';
        return o.tabId === this.tabId ? 'mine' : 'other';
    }
    acquire(attemptId, force = false) {
        const s = this.state(attemptId);
        if (s === 'other' && !force)
            return false;
        this.kv.set(KEYS.lease(attemptId), JSON.stringify({ tabId: this.tabId, at: this.now() }));
        return true;
    }
    release(attemptId) {
        if (this.state(attemptId) === 'mine')
            this.kv.remove(KEYS.lease(attemptId));
    }
}
