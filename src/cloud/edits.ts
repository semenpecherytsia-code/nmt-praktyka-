// Правки адміністратора до тексту завдань. Зберігаються в Supabase (таблиця content_edits),
// читати може кожен, змінювати — лише адміністратор (перевіряє сама база).
import type { ContentPackage, Question } from '../content/types';
import { supabase } from './cloud';

/** Що можна змінити в завданні. Ідентифікатори варіантів і пунктів не змінюються. */
export interface QuestionEdit {
  statement?: string;
  textExplanation?: string | null;
  options?: Record<string, string>;
  matchingRows?: Record<string, string>;
  matchingOptions?: Record<string, string>;
  answerKey?: { optionId: string } | { pairs: Record<string, string> } | { value: string };
}

/** question_id = SIM_KEY — правка самої симуляції (назва, предмет). */
export const SIM_KEY = '_simulation';
export interface SimulationEdit { title?: string; subject?: string }

export interface EditRow { simulation_id: string; question_id: string; data: QuestionEdit | SimulationEdit; updated_at: string }

/** Правки для всіх симуляцій. Якщо база недоступна — порожньо, сайт працює з початковими завданнями. */
export async function fetchEdits(timeoutMs = 4000): Promise<EditRow[]> {
  if (!supabase) return [];
  const query = supabase.from('content_edits').select('simulation_id, question_id, data, updated_at');
  const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), timeoutMs));
  try {
    const res = await Promise.race([query, timeout]);
    if (!res || res.error) return [];
    return (res.data ?? []) as EditRow[];
  } catch {
    return [];
  }
}

export async function saveEdit(simulationId: string, questionId: string, data: QuestionEdit | SimulationEdit): Promise<void> {
  if (!supabase) throw new Error('База не підключена');
  const { error } = await supabase.from('content_edits')
    .upsert({ simulation_id: simulationId, question_id: questionId, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function deleteEdit(simulationId: string, questionId: string): Promise<void> {
  if (!supabase) throw new Error('База не підключена');
  const { error } = await supabase.from('content_edits').delete().eq('simulation_id', simulationId).eq('question_id', questionId);
  if (error) throw new Error(error.message);
}

const pick = (cur: string, map: Record<string, string> | undefined, id: string) => (map && typeof map[id] === 'string' ? map[id] : cur);

export function applyQuestionEdit(q: Question, e: QuestionEdit): Question {
  const base = {
    statement: typeof e.statement === 'string' ? e.statement : q.statement,
    textExplanation: e.textExplanation !== undefined ? e.textExplanation : q.textExplanation,
  };
  switch (q.type) {
    case 'single_choice':
      return { ...q, ...base, options: q.options.map((o) => ({ ...o, content: pick(o.content, e.options, o.id) })),
        answerKey: e.answerKey && 'optionId' in e.answerKey ? e.answerKey : q.answerKey };
    case 'matching':
      return { ...q, ...base,
        matchingRows: q.matchingRows.map((r) => ({ ...r, content: pick(r.content, e.matchingRows, r.id) })),
        matchingOptions: q.matchingOptions.map((o) => ({ ...o, content: pick(o.content, e.matchingOptions, o.id) })),
        answerKey: e.answerKey && 'pairs' in e.answerKey ? e.answerKey : q.answerKey };
    case 'numeric':
      return { ...q, ...base, answerKey: e.answerKey && 'value' in e.answerKey ? e.answerKey : q.answerKey };
  }
}

/** Коротка стабільна позначка набору правок: змінюється з кожним збереженням. */
function stamp(rows: EditRow[]): string {
  const s = rows.map((r) => `${r.question_id}@${r.updated_at}`).sort().join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Накладає правки на пакет. Версія отримує позначку правок, тому спроби, розпочаті раніше,
 * і далі відкриваються зі своїм знімком (старим текстом і ключами).
 */
export function applyEdits(pkg: ContentPackage, all: EditRow[]): ContentPackage {
  const rows = all.filter((r) => r.simulation_id === pkg.simulation.id);
  if (!rows.length) return pkg;
  const byQ = new Map(rows.map((r) => [r.question_id, r.data]));
  const simEdit = (byQ.get(SIM_KEY) ?? {}) as SimulationEdit;
  return {
    ...pkg,
    simulation: {
      ...pkg.simulation,
      title: simEdit.title?.trim() || pkg.simulation.title,
      subject: simEdit.subject?.trim() || pkg.simulation.subject,
      version: `${pkg.simulation.version}+e${stamp(rows)}`,
    },
    questions: pkg.questions.map((q) => (byQ.has(q.id) ? applyQuestionEdit(q, byQ.get(q.id) as QuestionEdit) : q)),
  };
}
