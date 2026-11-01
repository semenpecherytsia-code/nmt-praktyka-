// Вхід через Google і відправлення результатів у Supabase. Без налаштувань (config.ts) усе тут вимкнено.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { Attempt } from '../engine/attempt';
import type { AttemptRepo, KV } from '../engine/storage';
import { CLOUD_CONFIG, cloudEnabled } from './config';
import { setUrl } from '../router';

export { cloudEnabled };

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  })
  : null;

const RETURN_KEY = 'nmt.v1.authReturn';
const UPLOADED_KEY = 'nmt.v1.uploaded';
const OWNER_KEY = 'nmt.v1.owners';
const DETAILED_KEY = 'nmt.v1.detailed';

export interface CloudUser { id: string; email: string; name: string; avatar: string | null }

export interface AuthState {
  ready: boolean;
  user: CloudUser | null;
  isAdmin: boolean;
}

function toUser(s: Session | null): CloudUser | null {
  const u = s?.user;
  if (!u) return null;
  const m = (u.user_metadata ?? {}) as Record<string, unknown>;
  const email = u.email ?? '';
  return { id: u.id, email, name: String(m.full_name ?? m.name ?? email.split('@')[0] ?? ''), avatar: typeof m.avatar_url === 'string' ? m.avatar_url : null };
}

/** Після повернення з Google прибирає ?code=… з адреси й відновлює сторінку, з якої пішли на вхід. */
function restoreAfterLogin(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
  let back = '';
  try { back = sessionStorage.getItem(RETURN_KEY) ?? ''; sessionStorage.removeItem(RETURN_KEY); } catch { /* немає sessionStorage */ }
  setUrl(back || url.pathname + url.hash, true);
}

let state: AuthState = { ready: !supabase, user: null, isAdmin: false };
const listeners = new Set<(s: AuthState) => void>();
function emit(next: AuthState) { state = next; listeners.forEach((l) => l(state)); }

async function checkAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = toUser(session);
    emit({ ...state, ready: true, user, isAdmin: user && state.user?.id === user.id ? state.isAdmin : false });
    if (user) {
      restoreAfterLogin();
      // Запит до бази не можна робити просто в обробнику подій авторизації — відкладаємо.
      window.setTimeout(() => { void checkAdmin().then((isAdmin) => { if (state.user?.id === user.id) emit({ ...state, isAdmin }); }); }, 0);
    }
  });
  void supabase.auth.getSession().then(({ data }) => {
    if (!data.session) { restoreAfterLogin(); emit({ ...state, ready: true }); }
  });
}

export function useAuth(): AuthState {
  const [s, set] = useState(state);
  useEffect(() => { listeners.add(set); set(state); return () => { listeners.delete(set); }; }, []);
  return s;
}

export async function signIn(): Promise<void> {
  if (!supabase) return;
  try { sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.hash); } catch { /* немає sessionStorage */ }
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL, queryParams: { prompt: 'select_account' } },
  });
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

// ---------- Відправлення результатів ----------

function uploadedIds(kv: KV): Set<string> {
  try { return new Set(JSON.parse(kv.get(UPLOADED_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}

/** Результат одного завдання в базі (коротко, щоб рядок був невеликим): номер, статус, бали, максимум. */
export interface QuestionDetail { p: number; s: 'correct' | 'partial' | 'wrong' | 'skipped'; e: number; m: number }

export function questionDetails(a: Attempt): QuestionDetail[] {
  return a.result!.questions.map((q) => ({ p: q.position, s: q.status, e: q.earned, m: q.max }));
}

export function resultRow(a: Attempt, user: CloudUser, title: string | null) {
  const r = a.result!;
  return {
    id: a.id,
    user_id: user.id,
    email: user.email,
    full_name: user.name,
    simulation_id: a.simulationId,
    simulation_title: title,
    content_version: a.contentVersion,
    primary_score: r.primary,
    max_score: r.max,
    percent: r.percent,
    nmt_score: r.scaled?.value ?? null,
    correct: r.counts.correct,
    partial: r.counts.partial,
    wrong: r.counts.wrong,
    skipped: r.counts.skipped,
    started_at: new Date(a.startedAt).toISOString(),
    finished_at: new Date(a.finishedAt ?? a.startedAt).toISOString(),
    duration_seconds: Math.round(((a.finishedAt ?? a.startedAt) - a.startedAt) / 1000),
    finish_reason: a.finishReason,
    questions: questionDetails(a) as QuestionDetail[] | null,
  };
}

function idSet(kv: KV, key: string): Set<string> {
  try { return new Set(JSON.parse(kv.get(key) ?? '[]') as string[]); } catch { return new Set(); }
}

/** Колонку questions додає окремий SQL; поки її немає, результати надсилаються без розбивки по завданнях. */
let detailsColumn = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const withoutDetails = ({ questions, ...rest }: ReturnType<typeof resultRow>) => rest;
const missingColumn = (e: { code?: string; message?: string } | null) => !!e && (e.code === 'PGRST204' || /questions/.test(e.message ?? ''));

function owners(kv: KV): Record<string, string> {
  try { return JSON.parse(kv.get(OWNER_KEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}

/** Запам’ятовує, хто з учнів розпочав спробу в цьому браузері: результат піде лише в його обліковий запис. */
export function markOwner(kv: KV, attemptId: string): void {
  if (!state.user) return;
  kv.set(OWNER_KEY, JSON.stringify({ ...owners(kv), [attemptId]: state.user.id }));
}

let syncing = false;
/** Надсилає завершені спроби поточного учня, яких ще немає в базі. Повторний запуск безпечний. */
export async function syncResults(repo: AttemptRepo, kv: KV, titleOf: (simId: string) => string | null): Promise<void> {
  const user = state.user;
  if (!supabase || !user || syncing) return;
  syncing = true;
  try {
    const done = uploadedIds(kv);
    const own = owners(kv);
    const detailed = idSet(kv, DETAILED_KEY);
    const markDetailed = (id: string) => { detailed.add(id); kv.set(DETAILED_KEY, JSON.stringify([...detailed])); };
    for (const a of repo.list()) {
      if (a.status !== 'finished' || !a.result || own[a.id] !== user.id) continue;
      if (done.has(a.id)) {
        // Спроби, надіслані до появи статистики по завданнях: один раз доповнюємо розбивкою.
        if (!detailsColumn || detailed.has(a.id)) continue;
        const { error } = await supabase.from('results').update({ questions: questionDetails(a) }).eq('id', a.id);
        if (missingColumn(error)) detailsColumn = false;
        else if (!error) markDetailed(a.id);
        continue;
      }
      const row = resultRow(a, user, titleOf(a.simulationId));
      let { error } = await supabase.from('results').insert(detailsColumn ? row : withoutDetails(row));
      if (missingColumn(error)) {
        detailsColumn = false;
        ({ error } = await supabase.from('results').insert(withoutDetails(row)));
      }
      // 23505 — такий запис уже є (наприклад, надіслано з іншої вкладки).
      if (error && error.code !== '23505') break;
      done.add(a.id);
      kv.set(UPLOADED_KEY, JSON.stringify([...done]));
      if (detailsColumn && !error) markDetailed(a.id);
    }
  } finally {
    syncing = false;
  }
}

export interface ResultRow extends ReturnType<typeof resultRow> { created_at: string }

export async function fetchAllResults(): Promise<ResultRow[]> {
  if (!supabase) return [];
  const all: ResultRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('results').select('*').order('finished_at', { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...(data as ResultRow[]));
    if (!data || data.length < 1000) break;
  }
  return all;
}
