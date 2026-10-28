// Оцінювання. Правильність і максимум беруться лише з даних питання.

import type { ConversionTable, Question } from '../content/types';
import { type AnswerValue, isEmptyAnswer } from './answers';
import { numericMatches, parseNumeric } from './numeric';

export type QuestionStatus = 'correct' | 'partial' | 'wrong' | 'skipped';

export interface RowCheck { rowId: string; given: string | null; correct: string; ok: boolean }

export interface QuestionResult {
  questionId: string;
  position: number;
  type: Question['type'];
  earned: number;
  max: number;
  status: QuestionStatus;
  answer: AnswerValue | null;
  rows?: RowCheck[];
}

export interface AttemptResult {
  primary: number;
  max: number;
  percent: number;
  counts: Record<QuestionStatus, number>;
  questions: QuestionResult[];
  scaled: { value: number | null; year: number; tableId: string; source: string } | null;
}

export function scoreQuestion(q: Question, position: number, answer: AnswerValue | undefined): QuestionResult {
  const base = { questionId: q.id, position, type: q.type, max: q.maxPoints };
  if (!answer || isEmptyAnswer(answer) || answer.type !== q.type) {
    const rows = q.type === 'matching'
      ? q.matchingRows.map((r) => ({ rowId: r.id, given: null, correct: q.answerKey.pairs[r.id], ok: false }))
      : undefined;
    return { ...base, earned: 0, status: 'skipped', answer: null, rows };
  }
  let earned = 0;
  let rows: RowCheck[] | undefined;
  if (q.type === 'single_choice' && answer.type === 'single_choice') {
    earned = answer.optionId === q.answerKey.optionId ? q.maxPoints : 0;
  } else if (q.type === 'matching' && answer.type === 'matching') {
    rows = q.matchingRows.map((r) => {
      const given = answer.pairs[r.id] ?? null;
      const correct = q.answerKey.pairs[r.id];
      return { rowId: r.id, given, correct, ok: given !== null && given === correct };
    });
    // По 1 балу за кожну правильну пару; хибні пари не віднімають балів.
    const perPair = q.maxPoints / q.matchingRows.length;
    earned = rows.filter((r) => r.ok).length * perPair;
  } else if (q.type === 'numeric' && answer.type === 'numeric') {
    const parsed = parseNumeric(answer.raw, { allowFractions: q.numericRule.allowFractions });
    earned = parsed.ok && numericMatches(answer.raw, q.answerKey.value, q.numericRule) ? q.maxPoints : 0;
  }
  const status: QuestionStatus = earned >= q.maxPoints ? 'correct' : earned > 0 ? 'partial' : 'wrong';
  return { ...base, earned, status, answer, rows };
}

export function scoreAttempt(
  ordered: Question[],
  answers: Record<string, AnswerValue>,
  table: ConversionTable | null,
): AttemptResult {
  const questions = ordered.map((q, i) => scoreQuestion(q, i + 1, answers[q.id]));
  const primary = questions.reduce((s, r) => s + r.earned, 0);
  const max = questions.reduce((s, r) => s + r.max, 0);
  const counts = { correct: 0, partial: 0, wrong: 0, skipped: 0 } as Record<QuestionStatus, number>;
  questions.forEach((r) => counts[r.status]++);
  let scaled: AttemptResult['scaled'] = null;
  if (table && table.maxPrimary === max) {
    const v = table.map[String(primary)];
    scaled = { value: v ?? null, year: table.year, tableId: table.id, source: table.source };
  }
  return { primary, max, percent: max ? Math.round((primary / max) * 1000) / 10 : 0, counts, questions, scaled };
}
