// Правки адміністратора до тексту завдань. Зберігаються в Supabase (таблиця content_edits),
// читати може кожен, змінювати — лише адміністратор (перевіряє сама база).
import type { ContentPackage, ImageAsset, Question, ReferenceMaterial } from '../content/types';
import { supabase } from './cloud';

/** Що можна змінити в завданні. Ідентифікатори варіантів і пунктів не змінюються. */
export interface QuestionEdit {
  statement?: string;
  textExplanation?: string | null;
  options?: Record<string, string>;
  matchingRows?: Record<string, string>;
  matchingOptions?: Record<string, string>;
  answerKey?: { optionId: string } | { pairs: Record<string, string> } | { value: string };
  /** Рисунки до умови. Відсутнє поле — рисунки з пакета без змін. */
  assets?: ImageAsset[];
}

/** question_id = SIM_KEY — правка самої симуляції (назва, предмет). */
export const SIM_KEY = '_simulation';
export interface SimulationEdit { title?: string; subject?: string; /** Сховати симуляцію від учнів. */ hidden?: boolean }
/** question_id = REF_KEY — власні довідкові матеріали (ReferenceMaterial). */
export const REF_KEY = '_reference';

export interface EditRow { simulation_id: string; question_id: string; data: QuestionEdit | SimulationEdit | ReferenceMaterial; updated_at: string }

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

export async function saveEdit(simulationId: string, questionId: string, data: QuestionEdit | SimulationEdit | ReferenceMaterial): Promise<void> {
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
    assets: Array.isArray(e.assets) ? (e.assets.length ? e.assets : undefined) : q.assets,
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
  const ref = byQ.get(REF_KEY) as ReferenceMaterial | undefined;
  const refId = pkg.simulation.referenceMaterialId ?? 'reference';
  return {
    ...pkg,
    referenceMaterials: ref ? [...pkg.referenceMaterials.filter((r) => r.id !== refId), { ...ref, id: refId }] : pkg.referenceMaterials,
    simulation: {
      ...pkg.simulation,
      title: simEdit.title?.trim() || pkg.simulation.title,
      subject: simEdit.subject?.trim() || pkg.simulation.subject,
      referenceMaterialId: ref ? refId : pkg.simulation.referenceMaterialId,
      version: `${pkg.simulation.version}+e${stamp(rows)}`,
    },
    questions: pkg.questions.map((q) => (byQ.has(q.id) ? applyQuestionEdit(q, byQ.get(q.id) as QuestionEdit) : q)),
  };
}

export const isHidden = (simulationId: string, rows: EditRow[]) =>
  rows.some((r) => r.simulation_id === simulationId && r.question_id === SIM_KEY && (r.data as SimulationEdit).hidden === true);

// ---------- Власні симуляції адміністратора (таблиця simulations) ----------

export interface SimulationRow { id: string; package: ContentPackage; published: boolean; updated_at: string }

/** Учні отримують лише опубліковані; адміністратор — усі (так налаштовано в базі). */
export async function fetchSimulations(timeoutMs = 4000): Promise<SimulationRow[]> {
  if (!supabase) return [];
  const query = supabase.from('simulations').select('id, package, published, updated_at').order('created_at');
  const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), timeoutMs));
  try {
    const res = await Promise.race([query, timeout]);
    if (!res || res.error) return [];
    return (res.data ?? []) as SimulationRow[];
  } catch {
    return [];
  }
}

export async function createSimulation(pkg: ContentPackage): Promise<void> {
  if (!supabase) throw new Error('База не підключена');
  const { error } = await supabase.from('simulations').insert({ id: pkg.simulation.id, package: pkg, published: false });
  if (error) throw new Error(error.message);
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  if (!supabase) throw new Error('База не підключена');
  const { error } = await supabase.from('simulations').update({ published, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSimulation(id: string): Promise<void> {
  if (!supabase) throw new Error('База не підключена');
  const r1 = await supabase.from('content_edits').delete().eq('simulation_id', id);
  if (r1.error) throw new Error(r1.error.message);
  const r2 = await supabase.from('simulations').delete().eq('id', id);
  if (r2.error) throw new Error(r2.error.message);
}

/** Порожня симуляція зі структурою шаблону (типи завдань, бали, шкала НМТ, довідник): текст — заглушки, які треба замінити. */
export function blankFrom(template: ContentPackage, id: string, title: string): ContentPackage {
  const n = (i: number) => String(i + 1).padStart(2, '0');
  const questions: Question[] = template.simulation.orderedQuestionIds.map((qid, i) => {
    const t = template.questions.find((q) => q.id === qid)!;
    const qId = `${id}-q${n(i)}`;
    const base = { id: qId, statement: `Умова завдання ${i + 1}.`, maxPoints: t.maxPoints, textExplanation: null, explanationVideoId: null };
    switch (t.type) {
      case 'single_choice': {
        const options = t.options.map((_, j) => ({ id: `${qId}-o${j + 1}`, content: `Варіант ${j + 1}` }));
        return { ...base, type: 'single_choice', options, answerKey: { optionId: options[0].id } };
      }
      case 'matching': {
        const matchingRows = t.matchingRows.map((_, j) => ({ id: `${qId}-r${j + 1}`, content: `Пункт ${j + 1}` }));
        const matchingOptions = t.matchingOptions.map((_, j) => ({ id: `${qId}-m${j + 1}`, content: `Варіант ${j + 1}` }));
        return { ...base, type: 'matching', matchingRows, matchingOptions, allowOptionReuse: t.allowOptionReuse,
          answerKey: { pairs: Object.fromEntries(matchingRows.map((r, j) => [r.id, matchingOptions[j % matchingOptions.length].id])) } };
      }
      case 'numeric':
        return { ...base, type: 'numeric', numericRule: t.numericRule, answerKey: { value: '0' } };
    }
  });
  return {
    ...template,
    simulation: {
      ...template.simulation, id, title, version: '1', orderedQuestionIds: questions.map((q) => q.id),
      readiness: 'complete', isDemo: false, source: { kind: 'imported', note: 'Створено адміністратором на сайті.' },
    },
    questions,
  };
}

// ---------- Файли (Supabase Storage, кошик content) ----------

const BUCKET = 'content';

/** Завантажує файл і повертає його постійну https-адресу. */
export async function uploadFile(simulationId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('База не підключена');
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const rand = (() => { try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); } })();
  const path = `${simulationId}/${rand}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Розмір зображення в пікселях (щоб рисунок не «стрибав» під час завантаження). */
export function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
