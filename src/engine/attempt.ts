// Рушій спроби: чисті функції без React і без сховища.
// Час завжди рахується від абсолютних startedAt / deadlineAt.

import type { ContentPackage, Question } from '../content/types';
import { type AnswerValue, answersEqual, checkAnswer, isEmptyAnswer } from './answers';
import { type AttemptResult, scoreAttempt } from './scoring';

export type AttemptStatus = 'active' | 'finished' | 'abandoned';
export type FinishReason = 'manual' | 'timeout';

export interface Attempt {
  id: string;
  simulationId: string;
  contentVersion: string;
  startedAt: number;
  deadlineAt: number;
  draftAnswers: Record<string, AnswerValue>;
  committedAnswers: Record<string, AnswerValue>;
  flaggedQuestionIds: string[];
  currentQuestionId: string;
  status: AttemptStatus;
  finishedAt: number | null;
  finishReason: FinishReason | null;
  /** Чернетки, зараховані під час завершення (за оголошеним правилом). */
  appliedDraftIds: string[];
  result: AttemptResult | null;
  revision: number;
}

export function newAttemptId(now: number): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `a${now.toString(36)}${rnd}`;
}

export function createAttempt(pkg: ContentPackage, now: number, id = newAttemptId(now)): Attempt {
  const sim = pkg.simulation;
  return {
    id,
    simulationId: sim.id,
    contentVersion: sim.version,
    startedAt: now,
    deadlineAt: now + sim.durationSeconds * 1000,
    draftAnswers: {},
    committedAnswers: {},
    flaggedQuestionIds: [],
    currentQuestionId: sim.orderedQuestionIds[0],
    status: 'active',
    finishedAt: null,
    finishReason: null,
    appliedDraftIds: [],
    result: null,
    revision: 0,
  };
}

export function remainingMs(a: Attempt, now: number): number {
  return Math.max(0, a.deadlineAt - now);
}

export function isExpired(a: Attempt, now: number): boolean {
  return a.status === 'active' && now >= a.deadlineAt;
}

function guard(a: Attempt): void {
  if (a.status !== 'active') throw new Error('Завершену спробу змінювати не можна');
}

function bump(a: Attempt, patch: Partial<Attempt>): Attempt {
  return { ...a, ...patch, revision: a.revision + 1 };
}

/** Чернетка зберігається, лише якщо відрізняється від збереженої відповіді. */
export function setDraft(a: Attempt, questionId: string, value: AnswerValue): Attempt {
  guard(a);
  const drafts = { ...a.draftAnswers };
  if (answersEqual(value, a.committedAnswers[questionId])) delete drafts[questionId];
  else drafts[questionId] = value;
  return bump(a, { draftAnswers: drafts });
}

export function commitAnswer(a: Attempt, q: Question): Attempt {
  guard(a);
  const draft = a.draftAnswers[q.id];
  if (!draft || !checkAnswer(q, draft).valid) return a;
  const drafts = { ...a.draftAnswers };
  delete drafts[q.id];
  return bump(a, { committedAnswers: { ...a.committedAnswers, [q.id]: draft }, draftAnswers: drafts });
}

export function toggleFlag(a: Attempt, questionId: string): Attempt {
  guard(a);
  const has = a.flaggedQuestionIds.includes(questionId);
  return bump(a, { flaggedQuestionIds: has ? a.flaggedQuestionIds.filter((x) => x !== questionId) : [...a.flaggedQuestionIds, questionId] });
}

export function goTo(a: Attempt, questionId: string): Attempt {
  if (a.status !== 'active' || a.currentQuestionId === questionId) return a;
  return bump(a, { currentQuestionId: questionId });
}

/** Поточний вигляд відповіді: чернетка, якщо є, інакше збережена. */
export function visibleAnswer(a: Attempt, questionId: string): AnswerValue | undefined {
  return a.draftAnswers[questionId] ?? a.committedAnswers[questionId];
}

export type QuestionProgress = 'saved' | 'saved_with_changes' | 'draft_only' | 'empty';

export function questionProgress(a: Attempt, qid: string): QuestionProgress {
  const committed = a.committedAnswers[qid];
  const draft = a.draftAnswers[qid];
  const hasDraft = !!draft && !answersEqual(draft, committed);
  if (committed) return hasDraft ? 'saved_with_changes' : 'saved';
  return hasDraft && !isEmptyAnswer(draft) ? 'draft_only' : 'empty';
}

export interface FinishSummary {
  total: number;
  /** Збережені відповіді (включно з тими, де поверх є незбережені зміни). */
  saved: number;
  /** Без збереженої відповіді й без чернетки. */
  empty: number;
  /** Чернетки без збереженої відповіді (частина з них може бути некоректною). */
  draftOnly: number;
  /** Збережені відповіді з незбереженими змінами. */
  savedWithChanges: number;
  /** Скільки чернеток можна застосувати (коректні). */
  applicableDrafts: number;
  /** Некоректні чернетки, які не буде зараховано. */
  invalidDrafts: number;
}

/** Кожне питання потрапляє рівно в одну з категорій saved / draftOnly / empty — без подвійного підрахунку. */
export function summarize(a: Attempt, ordered: Question[]): FinishSummary {
  const s: FinishSummary = { total: ordered.length, saved: 0, empty: 0, draftOnly: 0, savedWithChanges: 0, applicableDrafts: 0, invalidDrafts: 0 };
  for (const q of ordered) {
    const p = questionProgress(a, q.id);
    if (p === 'saved') s.saved++;
    else if (p === 'saved_with_changes') { s.saved++; s.savedWithChanges++; }
    else if (p === 'draft_only') s.draftOnly++;
    else s.empty++;
    if (p === 'saved_with_changes' || p === 'draft_only') {
      if (checkAnswer(q, a.draftAnswers[q.id]).valid) s.applicableDrafts++;
      else s.invalidDrafts++;
    }
  }
  return s;
}

/**
 * Завершення. Ідемпотентне: повторний виклик для завершеної спроби повертає її без змін.
 * applyDrafts = true — коректні чернетки замінюють збережені відповіді.
 * Правило для завершення за часом (оголошене на стартовому екрані): коректні чернетки зараховуються.
 */
export function finishAttempt(
  a: Attempt,
  pkg: ContentPackage,
  opts: { now: number; reason: FinishReason; applyDrafts: boolean },
): Attempt {
  if (a.status === 'finished') return a;
  const byId = new Map(pkg.questions.map((q) => [q.id, q]));
  const ordered = pkg.simulation.orderedQuestionIds.map((id) => byId.get(id)!);
  const final = { ...a.committedAnswers };
  const applied: string[] = [];
  if (opts.applyDrafts) {
    for (const q of ordered) {
      const d = a.draftAnswers[q.id];
      if (d && !answersEqual(d, final[q.id]) && checkAnswer(q, d).valid) {
        final[q.id] = d;
        applied.push(q.id);
      }
    }
  }
  const table = pkg.simulation.conversionTableId
    ? pkg.conversionTables?.find((t) => t.id === pkg.simulation.conversionTableId) ?? null
    : null;
  const finishedAt = Math.min(opts.now, a.deadlineAt);
  return bump(a, {
    status: 'finished',
    finishedAt,
    finishReason: opts.reason,
    committedAnswers: final,
    appliedDraftIds: applied,
    result: scoreAttempt(ordered, final, table),
  });
}

/** «Почати заново»: незавершена спроба позначається покинутою (не видаляється й не оцінюється). */
export function abandonAttempt(a: Attempt): Attempt {
  if (a.status !== 'active') return a;
  return bump(a, { status: 'abandoned' });
}

export function timeSpentMs(a: Attempt): number {
  const end = a.finishedAt ?? a.deadlineAt;
  return Math.max(0, Math.min(end, a.deadlineAt) - a.startedAt);
}

export function orderedQuestions(pkg: ContentPackage): Question[] {
  const byId = new Map(pkg.questions.map((q) => [q.id, q]));
  return pkg.simulation.orderedQuestionIds.map((id) => byId.get(id)!);
}
