import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import type { LoadedSet } from '../content/load';
import type { ContentPackage, Question } from '../content/types';
import { validatePackage } from '../content/validate';
import type { AnswerValue } from '../engine/answers';
import { orderedQuestions } from '../engine/attempt';
import { signIn, useAuth } from '../cloud/cloud';
import { applyQuestionEdit, deleteEdit, saveEdit, SIM_KEY, type QuestionEdit } from '../cloud/edits';
import { navigate } from '../router';
import { RichText } from './RichText';
import { Figure } from './Figure';
import { SingleChoice } from './answers/SingleChoice';
import { Matching } from './answers/Matching';
import { Numeric } from './answers/Numeric';
import { LETTERS, TYPE_LABEL } from './format';

interface Props {
  sets: LoadedSet[];
  simulationId?: string;
  position: number;
  /** Перезавантажує завдання з бази після збереження. */
  reload: () => Promise<void>;
}

/** Поля форми: увесь текст завдання, який можна змінити, і правильна відповідь. */
function formOf(q: Question): QuestionEdit {
  const map = (xs: { id: string; content: string }[]) => Object.fromEntries(xs.map((x) => [x.id, x.content]));
  const base = { statement: q.statement, textExplanation: q.textExplanation ?? '' };
  switch (q.type) {
    case 'single_choice': return { ...base, options: map(q.options), answerKey: { ...q.answerKey } };
    case 'matching': return { ...base, matchingRows: map(q.matchingRows), matchingOptions: map(q.matchingOptions), answerKey: { pairs: { ...q.answerKey.pairs } } };
    case 'numeric': return { ...base, answerKey: { ...q.answerKey } };
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const issuesOf = (p: ContentPackage) => validatePackage(p, null).issues.filter((i) => i.level === 'error').map((i) => `${i.field}: ${i.message}`);

/** Сторінка адміністратора: зміна тексту завдань, варіантів, ключів і пояснень. Учні бачать правки після збереження. */
export function EditScreen({ sets, simulationId, position, reload }: Props) {
  const auth = useAuth();
  const available = sets.filter((s) => s.status === 'available' && s.pkg && s.original);
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
  return <Editor key={set.entry.id} set={set} sets={available} position={position} reload={reload} />;
}

function Editor({ set, sets, position, reload }: { set: LoadedSet; sets: LoadedSet[]; position: number; reload: () => Promise<void> }) {
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
        <a className="btn btn--ghost btn--sm" href="#/admin"><ArrowLeft size={16} aria-hidden /> Результати учнів</a>
      </div>

      <div className="notice notice--info">
        <p>Правки бачать усі учні одразу після збереження. Спроби, розпочаті раніше, залишаються зі старим текстом і ключами. Формули пишіть між знаками <code>$…$</code>, жирний — <code>**так**</code>.</p>
      </div>

      {sets.length > 1 && (
        <label className="admin__field">
          <span>Симуляція</span>
          <select value={simId} onChange={(e) => navigate({ name: 'edit', simulationId: e.target.value, position: 1 }, true)}>
            {sets.map((s) => <option key={s.entry.id} value={s.entry.id}>{s.pkg!.simulation.title}</option>)}
          </select>
        </label>
      )}

      <SimulationForm pkg={pkg} original={original} reload={reload} />

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

      <QuestionForm key={q.id} q={q} orig={orig} pkg={pkg} original={original} baseDir={set.baseDir} position={pos} reload={reload} />

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

function SimulationForm({ pkg, original, reload }: { pkg: ContentPackage; original: ContentPackage; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(pkg.simulation.title);
  const [subject, setSubject] = useState(pkg.simulation.subject);
  useEffect(() => { setTitle(pkg.simulation.title); setSubject(pkg.simulation.subject); }, [pkg.simulation.title, pkg.simulation.subject]);
  const { busy, msg, run } = useSaver(reload);
  const changed = title !== pkg.simulation.title || subject !== pkg.simulation.subject;
  const isEdited = pkg.simulation.title !== original.simulation.title || pkg.simulation.subject !== original.simulation.subject;
  const id = pkg.simulation.id;
  return (
    <section className="card admin-card">
      <h2 className="admin__h2">Назва симуляції</h2>
      <div className="edit-row2">
        <label className="edit-field"><span>Назва</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="edit-field"><span>Предмет</span><input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
      </div>
      <div className="edit-actions">
        <button type="button" className="btn btn--primary btn--sm" disabled={busy || !changed || !title.trim()}
          onClick={() => void run(() => saveEdit(id, SIM_KEY, { title: title.trim(), subject: subject.trim() }), 'Назву збережено.')}>
          <Save size={16} aria-hidden /> Зберегти назву
        </button>
        {isEdited && (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy}
            onClick={() => void run(() => deleteEdit(id, SIM_KEY), 'Повернуто початкову назву.')}>
            <RotateCcw size={16} aria-hidden /> Повернути початкову
          </button>
        )}
      </div>
      <Status msg={msg} />
    </section>
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

function QuestionForm({ q, orig, pkg, original, baseDir, position, reload }: {
  q: Question; orig: Question; pkg: ContentPackage; original: ContentPackage; baseDir: string; position: number; reload: () => Promise<void>;
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
    void run(() => (same(formOf(preview), formOf(orig)) ? deleteEdit(pkg.simulation.id, q.id) : saveEdit(pkg.simulation.id, q.id, data)), 'Збережено. Учні вже бачать нову версію.');
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
