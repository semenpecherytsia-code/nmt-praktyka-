import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, EyeOff, FileText, ImagePlus, Plus, RotateCcw, Save, ShieldAlert, Trash2, Upload } from 'lucide-react';
import type { LoadedSet } from '../content/load';
import type { Catalog, ContentPackage, ImageAsset, Question, ReferenceMaterial } from '../content/types';
import { validatePackage } from '../content/validate';
import type { AnswerValue } from '../engine/answers';
import { orderedQuestions } from '../engine/attempt';
import { signIn, useAuth } from '../cloud/cloud';
import {
  applyQuestionEdit, blankFrom, createSimulation, deleteEdit, deleteSimulation, imageSize, REF_KEY, saveEdit, setPublished, SIM_KEY, uploadFile,
  type EditRow, type QuestionEdit, type SimulationEdit,
} from '../cloud/edits';
import { resolveContentUrl } from '../content/urls';
import { navigate, routeHref } from '../router';
import { RichText } from './RichText';
import { Figure } from './Figure';
import { SingleChoice } from './answers/SingleChoice';
import { Matching } from './answers/Matching';
import { Numeric } from './answers/Numeric';
import { LETTERS, TYPE_LABEL } from './format';

interface Props {
  /** Усі симуляції, включно з чернетками й схованими. */
  sets: LoadedSet[];
  edits: EditRow[];
  catalog: Catalog;
  simulationId?: string;
  position: number;
  /** Перезавантажує завдання з бази після збереження. */
  reload: () => Promise<void>;
}

/** Поля форми: увесь текст завдання, який можна змінити, і правильна відповідь. */
function formOf(q: Question): QuestionEdit {
  const map = (xs: { id: string; content: string }[]) => Object.fromEntries(xs.map((x) => [x.id, x.content]));
  const base = { statement: q.statement, textExplanation: q.textExplanation ?? '', assets: q.assets ?? [] };
  switch (q.type) {
    case 'single_choice': return { ...base, options: map(q.options), answerKey: { ...q.answerKey } };
    case 'matching': return { ...base, matchingRows: map(q.matchingRows), matchingOptions: map(q.matchingOptions), answerKey: { pairs: { ...q.answerKey.pairs } } };
    case 'numeric': return { ...base, answerKey: { ...q.answerKey } };
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const issuesOf = (p: ContentPackage) => validatePackage(p, null).issues.filter((i) => i.level === 'error').map((i) => `${i.field}: ${i.message}`);

/** Сторінка адміністратора: зміна тексту завдань, варіантів, ключів і пояснень. Учні бачать правки після збереження. */
export function EditScreen({ sets, edits, catalog, simulationId, position, reload }: Props) {
  const auth = useAuth();
  const available = sets.filter((s) => s.pkg && s.original);
  const set = available.find((s) => s.entry.id === simulationId) ?? available[0];

  if (!auth.ready) return <main className="admin" id="main"><p className="loading" role="status">Завантаження…</p></main>;
  if (!auth.user || !auth.isAdmin) {
    return (
      <main className="admin" id="main">
        <div className="card admin-card">
          <div className="notice notice--warn"><ShieldAlert size={18} aria-hidden />
            <p>{auth.user ? `Пошта ${auth.user.email} не має доступу адміністратора.` : 'Увійдіть через Google з пошти адміністратора.'}</p></div>
          {!auth.user && <button type="button" className="btn btn--primary" onClick={() => void signIn()}>Увійти через Google</button>}
        </div>
      </main>
    );
  }
  if (!set) return <main className="admin" id="main"><p className="hint">Немає доступних симуляцій.</p></main>;
  const template = available.find((s) => s.entry.id === catalog.defaultSimulationId && !s.custom) ?? available.find((s) => !s.custom) ?? null;
  return <Editor key={set.entry.id} set={set} sets={available} edits={edits} template={template?.original ?? null} position={position} reload={reload} />;
}

const statusLabel = (s: LoadedSet) => (s.custom && !s.custom.published ? ' (чернетка)' : s.hidden ? ' (схована)' : '');

function Editor({ set, sets, edits, template, position, reload }: {
  set: LoadedSet; sets: LoadedSet[]; edits: EditRow[]; template: ContentPackage | null; position: number; reload: () => Promise<void>;
}) {
  const pkg = set.pkg!;
  const original = set.original!;
  const ordered = useMemo(() => orderedQuestions(pkg), [pkg]);
  const origById = useMemo(() => new Map(original.questions.map((q) => [q.id, q])), [original]);
  const total = ordered.length;
  const pos = Math.min(Math.max(position, 1), total);
  const q = ordered[pos - 1];
  const orig = origById.get(q.id)!;
  const simId = pkg.simulation.id;
  const go = (n: number) => navigate({ name: 'edit', simulationId: simId, position: n }, true);
  const edited = (x: Question) => !same(formOf(x), formOf(origById.get(x.id)!));

  return (
    <main className="admin" id="main">
      <div className="admin__head">
        <h1 className="admin__title">Редагування завдань</h1>
        <a className="btn btn--ghost btn--sm" data-link href={routeHref({ name: 'admin' })}><ArrowLeft size={16} aria-hidden /> Результати учнів</a>
      </div>

      <div className="notice notice--info">
        <p>Правки опублікованих симуляцій учні бачать одразу після збереження. Спроби, розпочаті раніше, залишаються зі старим текстом і ключами. Формули пишіть між знаками <code>$…$</code>, жирний — <code>**так**</code>.</p>
      </div>

      <div className="edit-simbar">
        <label className="admin__field admin__field--grow">
          <span>Симуляція</span>
          <select value={simId} onChange={(e) => navigate({ name: 'edit', simulationId: e.target.value, position: 1 }, true)}>
            {sets.map((s) => <option key={s.entry.id} value={s.entry.id}>{s.pkg!.simulation.title}{statusLabel(s)}</option>)}
          </select>
        </label>
        {template && <NewSimulation template={template} reload={reload} />}
      </div>

      <SimulationForm set={set} pkg={pkg} original={original} simEdit={(edits.find((r) => r.simulation_id === simId && r.question_id === SIM_KEY)?.data ?? {}) as SimulationEdit} reload={reload} />

      <ReferenceForm pkg={pkg} original={original} baseDir={set.baseDir} isEdited={edits.some((r) => r.simulation_id === simId && r.question_id === REF_KEY)} reload={reload} />

      <nav aria-label="Номери завдань">
        <ol className="qgrid edit-grid">
          {ordered.map((x, i) => (
            <li key={x.id}>
              <button type="button" className={`qcell${i + 1 === pos ? ' is-current' : ''}${edited(x) ? ' qcell--saved' : ''}`}
                aria-current={i + 1 === pos ? 'step' : undefined} aria-label={`Завдання ${i + 1}${edited(x) ? ', змінено' : ''}`} onClick={() => go(i + 1)}>
                <span className="qcell__num">{i + 1}</span>
                {edited(x) && <Check className="qcell__mark" size={12} strokeWidth={3} aria-hidden />}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <QuestionForm key={q.id} q={q} orig={orig} pkg={pkg} original={original} baseDir={set.baseDir} position={pos} live={!set.hidden} reload={reload} />

      <div className="side-nav">
        <button type="button" className="btn btn--ghost" onClick={() => go(pos - 1)} disabled={pos <= 1}><ChevronLeft size={20} aria-hidden /> Попереднє</button>
        <span className="side-nav__pos">Завдання <strong>{pos}</strong> з {total}</span>
        <button type="button" className="btn btn--ghost" onClick={() => go(pos + 1)} disabled={pos >= total}>Наступне <ChevronRight size={20} aria-hidden /></button>
      </div>
    </main>
  );
}

function useSaver(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<void>, okText: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); await reload(); setMsg({ ok: true, text: okText }); }
    catch (e) { setMsg({ ok: false, text: `Не вдалося зберегти: ${(e as Error).message}` }); }
    finally { setBusy(false); }
  };
  return { busy, msg, setMsg, run };
}

function Status({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`edit-status${msg.ok ? ' is-ok' : ' is-err'}`} role="status">{msg.text}</p>;
}

/** Нова симуляція зі структурою НМТ (22 завдання, та сама шкала). Учні не бачать її, доки її не опубліковано. */
function NewSimulation({ template, reload }: { template: ContentPackage; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const { busy, msg, run } = useSaver(reload);
  const create = () => {
    const d = new Date();
    const id = `s-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6)}`;
    void run(async () => {
      await createSimulation(blankFrom(template, id, title.trim()));
      navigate({ name: 'edit', simulationId: id, position: 1 }, true);
    }, 'Чернетку створено. Замініть текст завдань і опублікуйте.');
  };
  if (!open) return <button type="button" className="btn btn--outline btn--sm" onClick={() => setOpen(true)}><Plus size={16} aria-hidden /> Нова симуляція</button>;
  return (
    <div className="card admin-card edit-new">
      <label className="edit-field"><span>Назва нової симуляції</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Наприклад: Симуляція НМТ №24" autoFocus />
      </label>
      <p className="hint">Буде 22 завдання, як у НМТ: 1–15 з вибором відповіді, 16–18 на відповідності, 19–22 з числовою відповіддю.</p>
      <div className="edit-actions">
        <button type="button" className="btn btn--primary btn--sm" disabled={busy || !title.trim()} onClick={create}><Plus size={16} aria-hidden /> Створити</button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => setOpen(false)}>Скасувати</button>
      </div>
      <Status msg={msg} />
    </div>
  );
}

function SimulationForm({ set, pkg, original, simEdit, reload }: {
  set: LoadedSet; pkg: ContentPackage; original: ContentPackage; simEdit: SimulationEdit; reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState(pkg.simulation.title);
  const [subject, setSubject] = useState(pkg.simulation.subject);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setTitle(pkg.simulation.title); setSubject(pkg.simulation.subject); }, [pkg.simulation.title, pkg.simulation.subject]);
  const { busy, msg, run } = useSaver(reload);
  const changed = title !== pkg.simulation.title || subject !== pkg.simulation.subject;
  const isEdited = pkg.simulation.title !== original.simulation.title || pkg.simulation.subject !== original.simulation.subject;
  const id = pkg.simulation.id;
  // Запис '_simulation' містить і назву, і позначку «сховано» — зберігаємо їх разом.
  const saveSim = (next: SimulationEdit) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== false && v !== ''));
    return Object.keys(clean).length ? saveEdit(id, SIM_KEY, clean) : deleteEdit(id, SIM_KEY);
  };
  const custom = set.custom;
  return (
    <section className="card admin-card">
      <h2 className="admin__h2">Симуляція</h2>
      <p className={`edit-badge${set.hidden ? ' is-off' : ' is-on'}`}>
        {custom ? (custom.published ? 'Опубліковано: учні бачать цю симуляцію' : 'Чернетка: учні її не бачать') : set.hidden ? 'Схована: учні її не бачать' : 'Учні бачать цю симуляцію'}
      </p>
      <div className="edit-row2">
        <label className="edit-field"><span>Назва</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="edit-field"><span>Предмет</span><input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
      </div>
      <div className="edit-actions">
        <button type="button" className="btn btn--primary btn--sm" disabled={busy || !changed || !title.trim()}
          onClick={() => void run(() => saveSim({ ...simEdit, title: title.trim(), subject: subject.trim() }), 'Назву збережено.')}>
          <Save size={16} aria-hidden /> Зберегти назву
        </button>
        {isEdited && (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy}
            onClick={() => void run(() => saveSim({ hidden: simEdit.hidden }), 'Повернуто початкову назву.')}>
            <RotateCcw size={16} aria-hidden /> Повернути початкову
          </button>
        )}
      </div>
      <div className="edit-actions edit-actions--split">
        {custom ? (
          <button type="button" className={`btn btn--sm ${custom.published ? 'btn--ghost' : 'btn--primary'}`} disabled={busy}
            onClick={() => void run(() => setPublished(id, !custom.published), custom.published ? 'Знято з публікації.' : 'Опубліковано. Учні вже бачать симуляцію.')}>
            {custom.published ? <><EyeOff size={16} aria-hidden /> Зняти з публікації</> : <><Eye size={16} aria-hidden /> Опублікувати</>}
          </button>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy}
            onClick={() => void run(() => saveSim({ ...simEdit, hidden: !simEdit.hidden }), simEdit.hidden ? 'Симуляцію знову видно учням.' : 'Симуляцію сховано від учнів.')}>
            {simEdit.hidden ? <><Eye size={16} aria-hidden /> Показати учням</> : <><EyeOff size={16} aria-hidden /> Сховати від учнів</>}
          </button>
        )}
        {custom && !confirmDelete && (
          <button type="button" className="btn btn--ghost btn--sm edit-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} aria-hidden /> Видалити симуляцію
          </button>
        )}
      </div>
      {custom && confirmDelete && (
        <div className="notice notice--warn" role="alert"><ShieldAlert size={18} aria-hidden />
          <div>
            <p><strong>Видалити «{pkg.simulation.title}» назавжди?</strong> Завдання й правки зникнуть. Результати учнів на сторінці «Адмін» залишаться.</p>
            <div className="edit-actions">
              <button type="button" className="btn btn--danger btn--sm" disabled={busy}
                onClick={() => void run(async () => { await deleteSimulation(id); navigate({ name: 'edit', position: 1 }, true); }, 'Симуляцію видалено.')}>
                <Trash2 size={16} aria-hidden /> Так, видалити
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => setConfirmDelete(false)}>Скасувати</button>
            </div>
          </div>
        </div>
      )}
      <Status msg={msg} />
    </section>
  );
}

/** Довідкові матеріали: фото сторінок або один PDF. */
function ReferenceForm({ pkg, original, baseDir, isEdited, reload }: {
  pkg: ContentPackage; original: ContentPackage; baseDir: string; isEdited: boolean; reload: () => Promise<void>;
}) {
  const ref = pkg.referenceMaterials.find((r) => r.id === pkg.simulation.referenceMaterialId) ?? null;
  const { busy, msg, setMsg, run } = useSaver(reload);
  const id = pkg.simulation.id;
  const title = ref?.title ?? 'Довідкові матеріали';

  const uploadPages = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, 'uk', { numeric: true }));
    if (list.some((f) => !f.type.startsWith('image/'))) { setMsg({ ok: false, text: 'Оберіть лише зображення (JPG, PNG).' }); return; }
    void run(async () => {
      const pages = [];
      for (const [i, f] of list.entries()) pages.push({ src: await uploadFile(id, f), alt: `${title}, сторінка ${i + 1}` });
      const data: ReferenceMaterial = { id: 'reference', title, kind: 'images', pages, downloadSrc: null };
      await saveEdit(id, REF_KEY, data);
    }, `Завантажено сторінок: ${list.length}.`);
  };
  const uploadPdf = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setMsg({ ok: false, text: 'Оберіть файл PDF.' }); return; }
    void run(async () => {
      const data: ReferenceMaterial = { id: 'reference', title, kind: 'pdf', src: await uploadFile(id, f), downloadable: true };
      await saveEdit(id, REF_KEY, data);
    }, 'PDF завантажено.');
  };
  const hasOriginal = !!original.simulation.referenceMaterialId;

  return (
    <section className="card admin-card">
      <h2 className="admin__h2">Довідкові матеріали</h2>
      {!ref ? <p className="hint">Немає довідкових матеріалів.</p>
        : ref.kind === 'images' ? (
          <ol className="edit-pages">
            {ref.pages.map((pg, i) => {
              const src = resolveContentUrl(pg.src, baseDir);
              return <li key={i}>{src && <img src={src} alt={pg.alt} loading="lazy" />}<span>Сторінка {i + 1}</span></li>;
            })}
          </ol>
        ) : ref.kind === 'pdf' ? (
          <p className="edit-file"><FileText size={18} aria-hidden /> PDF-файл{(() => { const u = resolveContentUrl(ref.src, baseDir); return u ? <> · <a href={u} target="_blank" rel="noreferrer">відкрити</a></> : null; })()}</p>
        ) : <p className="hint">Текстові сторінки ({ref.pages.length}).</p>}
      <p className="hint">Фото сторінок покажуться в тому порядку, як названі файли (1.jpg, 2.jpg …). Новий довідник замінює старий.</p>
      <div className="edit-actions">
        <label className={`btn btn--outline btn--sm${busy ? ' is-disabled' : ''}`}>
          <Upload size={16} aria-hidden /> Фото сторінок
          <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => { uploadPages(e.target.files); e.target.value = ''; }} />
        </label>
        <label className={`btn btn--outline btn--sm${busy ? ' is-disabled' : ''}`}>
          <Upload size={16} aria-hidden /> PDF
          <input type="file" accept="application/pdf,.pdf" hidden disabled={busy} onChange={(e) => { uploadPdf(e.target.files); e.target.value = ''; }} />
        </label>
        {isEdited && (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy}
            onClick={() => void run(() => deleteEdit(id, REF_KEY), hasOriginal ? 'Повернуто початкові довідкові матеріали.' : 'Довідкові матеріали прибрано.')}>
            <RotateCcw size={16} aria-hidden /> {hasOriginal ? 'Повернути початкові' : 'Прибрати'}
          </button>
        )}
      </div>
      {busy && <p className="hint" role="status">Завантаження…</p>}
      <Status msg={msg} />
    </section>
  );
}

/** Рисунки до умови: додати, підписати, прибрати, змінити порядок. */
function ImagesField({ simId, qid, assets, baseDir, onChange, onError }: {
  simId: string; qid: string; assets: ImageAsset[]; baseDir: string; onChange: (a: ImageAsset[]) => void; onError: (t: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const add = async (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (!list.length) return;
    if (list.some((f) => !f.type.startsWith('image/'))) { onError('Оберіть лише зображення (JPG, PNG, SVG).'); return; }
    setBusy(true);
    try {
      const added: ImageAsset[] = [];
      for (const f of list) {
        const size = await imageSize(f);
        const src = await uploadFile(simId, f);
        // Ширина на сторінці — не більше 560 px, як у рисунків, перенесених з PDF.
        const w = size ? Math.min(size.width, 560) : undefined;
        const h = size && w ? Math.round((size.height * w) / size.width) : undefined;
        added.push({ id: `${qid}-img-${Math.random().toString(36).slice(2, 8)}`, kind: 'image', src, alt: 'Рисунок до завдання', width: w, height: h });
      }
      onChange([...assets, ...added]);
    } catch (e) {
      onError(`Не вдалося завантажити рисунок: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  const update = (i: number, patch: Partial<ImageAsset>) => onChange(assets.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const move = (i: number, d: number) => {
    const next = [...assets];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="edit-field">
      <span>Рисунки</span>
      {assets.length > 0 && (
        <ul className="edit-images">
          {assets.map((a, i) => {
            const src = resolveContentUrl(a.src, baseDir);
            return (
              <li key={a.id}>
                {src && <img src={src} alt="" />}
                <div className="edit-images__fields">
                  <input value={a.alt} onChange={(e) => update(i, { alt: e.target.value })} aria-label={`Опис рисунка ${i + 1} (для незрячих)`} placeholder="Короткий опис рисунка" />
                  <div className="edit-actions">
                    {assets.length > 1 && <button type="button" className="btn btn--ghost btn--sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Вище">↑</button>}
                    {assets.length > 1 && <button type="button" className="btn btn--ghost btn--sm" disabled={i === assets.length - 1} onClick={() => move(i, 1)} aria-label="Нижче">↓</button>}
                    <button type="button" className="btn btn--ghost btn--sm edit-danger" onClick={() => onChange(assets.filter((_, j) => j !== i))}><Trash2 size={16} aria-hidden /> Прибрати</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <label className={`btn btn--outline btn--sm edit-add${busy ? ' is-disabled' : ''}`}>
        <ImagePlus size={16} aria-hidden /> {busy ? 'Завантаження…' : 'Додати рисунок'}
        <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
      </label>
    </div>
  );
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="edit-field">
      <span>{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </label>
  );
}

function QuestionForm({ q, orig, pkg, original, baseDir, position, live, reload }: {
  q: Question; orig: Question; pkg: ContentPackage; original: ContentPackage; baseDir: string; position: number; live: boolean; reload: () => Promise<void>;
}) {
  const saved = useMemo(() => formOf(q), [q]);
  const [f, setF] = useState<QuestionEdit>(saved);
  // Після збереження завдання перезавантажуються з бази — форма бере нову збережену версію.
  useEffect(() => { setF(saved); }, [saved]);
  const { busy, msg, setMsg, run } = useSaver(reload);
  const set = (patch: Partial<QuestionEdit>) => { setMsg(null); setF((cur) => ({ ...cur, ...patch })); };
  const setIn = (k: 'options' | 'matchingRows' | 'matchingOptions', id: string, v: string) => set({ [k]: { ...f[k], [id]: v } });

  const preview = useMemo(() => applyQuestionEdit(orig, { ...f, textExplanation: f.textExplanation?.trim() ? f.textExplanation : null }), [orig, f]);
  const changed = !same(f, saved);
  const isEdited = !same(saved, formOf(orig));

  // Перевірка тим самим валідатором, що й при завантаженні сайту: зламану формулу чи ключ зберегти не вийде.
  const baseline = useMemo(() => new Set(issuesOf(original)), [original]);
  const errors = useMemo(() => {
    const cand: ContentPackage = { ...original, questions: original.questions.map((x) => (x.id === q.id ? preview : x)) };
    return issuesOf(cand).filter((m) => !baseline.has(m));
  }, [original, preview, q.id, baseline]);

  const save = () => {
    const data: QuestionEdit = { ...f, textExplanation: f.textExplanation?.trim() ? f.textExplanation : null };
    if (!f.assets?.length && !orig.assets?.length) delete data.assets;
    void run(() => (same(formOf(preview), formOf(orig)) ? deleteEdit(pkg.simulation.id, q.id) : saveEdit(pkg.simulation.id, q.id, data)), live ? 'Збережено. Учні вже бачать нову версію.' : 'Збережено.');
  };

  const key = f.answerKey as { optionId?: string; pairs?: Record<string, string>; value?: string };
  const answerValue: AnswerValue | undefined = q.type === 'single_choice' ? { type: 'single_choice', optionId: key.optionId ?? '' }
    : q.type === 'matching' ? { type: 'matching', pairs: key.pairs ?? {} }
    : { type: 'numeric', raw: key.value ?? '' };

  return (
    <div className="edit-layout">
      <section className="card admin-card">
        <h2 className="admin__h2">Завдання {position} <span className="hint">· {TYPE_LABEL[q.type]}</span></h2>
        <Area label="Умова" value={f.statement ?? ''} onChange={(v) => set({ statement: v })} rows={5} />
        <ImagesField simId={pkg.simulation.id} qid={q.id} assets={f.assets ?? []} baseDir={baseDir}
          onChange={(assets) => set({ assets })} onError={(text) => setMsg({ ok: false, text })} />

        {q.type === 'single_choice' && (
          <>
            {q.options.map((o, i) => <Area key={o.id} label={`Варіант ${LETTERS[i]}`} value={f.options?.[o.id] ?? ''} onChange={(v) => setIn('options', o.id, v)} rows={1} />)}
            <label className="edit-field"><span>Правильна відповідь</span>
              <select value={key.optionId} onChange={(e) => set({ answerKey: { optionId: e.target.value } })}>
                {q.options.map((o, i) => <option key={o.id} value={o.id}>{LETTERS[i]}</option>)}
              </select>
            </label>
          </>
        )}

        {q.type === 'matching' && (
          <>
            {q.matchingRows.map((r, i) => <Area key={r.id} label={`Пункт ${i + 1}`} value={f.matchingRows?.[r.id] ?? ''} onChange={(v) => setIn('matchingRows', r.id, v)} rows={1} />)}
            {q.matchingOptions.map((o, i) => <Area key={o.id} label={`Варіант ${LETTERS[i]}`} value={f.matchingOptions?.[o.id] ?? ''} onChange={(v) => setIn('matchingOptions', o.id, v)} rows={1} />)}
            <div className="edit-field"><span>Правильні відповідності</span>
              <div className="edit-pairs">
                {q.matchingRows.map((r, i) => (
                  <label key={r.id}>{i + 1} →
                    <select value={key.pairs?.[r.id] ?? ''} onChange={(e) => set({ answerKey: { pairs: { ...key.pairs, [r.id]: e.target.value } } })}>
                      {q.matchingOptions.map((o, j) => <option key={o.id} value={o.id}>{LETTERS[j]}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {q.type === 'numeric' && (
          <label className="edit-field"><span>Правильна відповідь (число)</span>
            <input value={key.value ?? ''} onChange={(e) => set({ answerKey: { value: e.target.value } })} inputMode="text" autoComplete="off" spellCheck={false} />
          </label>
        )}

        <Area label="Пояснення (видно після завершення)" value={f.textExplanation ?? ''} onChange={(v) => set({ textExplanation: v })} rows={5} />

        {errors.length > 0 && (
          <div className="notice notice--warn" role="alert"><ShieldAlert size={18} aria-hidden />
            <div>{errors.map((e, i) => <p key={i}>{e}</p>)}</div></div>
        )}

        <div className="edit-actions">
          <button type="button" className="btn btn--primary" disabled={busy || !changed || errors.length > 0} onClick={save}>
            <Save size={18} aria-hidden /> Зберегти
          </button>
          {changed && <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setF(saved); setMsg(null); }}>Скасувати зміни</button>}
          {isEdited && !changed && (
            <button type="button" className="btn btn--ghost" disabled={busy}
              onClick={() => void run(() => deleteEdit(pkg.simulation.id, q.id), 'Повернуто початковий текст завдання.')}>
              <RotateCcw size={18} aria-hidden /> Повернути початковий текст
            </button>
          )}
        </div>
        <Status msg={msg} />
      </section>

      <section className="card question edit-preview" aria-label="Як побачить учень">
        <p className="eyebrow">Як побачить учень · правильну відповідь позначено</p>
        <RichText text={preview.statement} className="question__statement" />
        {preview.assets?.map((a) => <Figure key={a.id} asset={a} baseDir={baseDir} />)}
        <div className="question__answer">
          {preview.type === 'single_choice' && <SingleChoice q={preview} value={answerValue} onChange={() => {}} labelledBy="" disabled />}
          {preview.type === 'matching' && <Matching q={preview} value={answerValue} onChange={() => {}} disabled />}
          {preview.type === 'numeric' && <Numeric q={preview} value={answerValue} onChange={() => {}} onSubmit={() => {}} disabled />}
        </div>
        {preview.textExplanation && (
          <div className="edit-expl"><p className="eyebrow">Пояснення</p><RichText text={preview.textExplanation} /></div>
        )}
      </section>
    </div>
  );
}
