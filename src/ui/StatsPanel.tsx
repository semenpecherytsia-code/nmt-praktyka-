import { useMemo, useState } from 'react';
import { Info, PenLine, ThumbsUp, TriangleAlert } from 'lucide-react';
import type { QuestionDetail, ResultRow } from '../cloud/cloud';
import type { ContentPackage } from '../content/types';
import { orderedQuestions } from '../engine/attempt';
import { routeHref } from '../router';
import { plural, TYPE_LABEL } from './format';

interface Props {
  /** Результати однієї симуляції (вже відфільтровані за пошуком). */
  rows: ResultRow[];
  simulationId: string;
  pkg: ContentPackage | null;
}

const fmt1 = (x: number | null) => (x === null || Number.isNaN(x) ? '—' : String(Math.round(x * 10) / 10).replace('.', ','));
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

interface TaskStat { p: number; n: number; correct: number; partial: number; wrong: number; skipped: number; earned: number; max: number; ok: number }

/** Короткий текст умови для підказки: без формул і розмітки. */
function plainSnippet(s: string, len = 90): string {
  const t = s.replace(/\$\$?([^$]*)\$\$?/g, ' … ').replace(/\*\*?/g, '').replace(/\s+/g, ' ').trim();
  return t.length > len ? `${t.slice(0, len - 1)}…` : t;
}

const BUCKETS: { label: string; test: (n: number | null) => boolean }[] = [
  { label: 'не склав', test: (n) => n === null },
  { label: '100–139', test: (n) => n !== null && n < 140 },
  { label: '140–159', test: (n) => n !== null && n >= 140 && n < 160 },
  { label: '160–179', test: (n) => n !== null && n >= 160 && n < 180 },
  { label: '180–199', test: (n) => n !== null && n >= 180 && n < 200 },
  { label: '200', test: (n) => n === 200 },
];

/** Статистика симуляції: рейтинг учнів, розподіл балів і які завдання найважчі. */
export function StatsPanel({ rows, simulationId, pkg }: Props) {
  const [order, setOrder] = useState<'hard' | 'num'>('hard');
  const ordered = useMemo(() => (pkg ? orderedQuestions(pkg) : []), [pkg]);

  const detailed = rows.filter((r) => Array.isArray(r.questions) && r.questions.length > 0);

  const tasks = useMemo(() => {
    const m = new Map<number, TaskStat>();
    for (const r of detailed) {
      for (const q of r.questions as QuestionDetail[]) {
        const t = m.get(q.p) ?? { p: q.p, n: 0, correct: 0, partial: 0, wrong: 0, skipped: 0, earned: 0, max: 0, ok: 0 };
        t.n++; t[q.s]++; t.earned += q.e; t.max += q.m;
        m.set(q.p, t);
      }
    }
    // «Успішність» — частка набраних балів від можливих (часткові відповіді рахуються пропорційно).
    return [...m.values()].map((t) => ({ ...t, ok: t.max ? t.earned / t.max : 0 })).sort((a, b) => a.p - b.p);
  }, [detailed]);

  const students = useMemo(() => {
    const m = new Map<string, { name: string; email: string; rows: ResultRow[] }>();
    for (const r of rows) {
      const s = m.get(r.user_id) ?? { name: r.full_name || r.email || 'Без імені', email: r.email ?? '', rows: [] };
      s.rows.push(r);
      m.set(r.user_id, s);
    }
    return [...m.entries()].map(([id, s]) => {
      const nmts = s.rows.map((r) => r.nmt_score).filter((x): x is number => x !== null);
      const prim = s.rows.map((r) => Number(r.primary_score));
      // Завдання, у яких учень найчастіше помилявся або пропускав.
      const miss = new Map<number, number>();
      for (const r of s.rows) for (const q of (r.questions ?? []) as QuestionDetail[]) if (q.s === 'wrong' || q.s === 'skipped') miss.set(q.p, (miss.get(q.p) ?? 0) + 1);
      const weak = [...miss.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 5).map(([p]) => p);
      return { id, name: s.name, email: s.email, attempts: s.rows.length, best: nmts.length ? Math.max(...nmts) : null, avgNmt: avg(nmts),
        bestPrimary: Math.max(...prim), avgPrimary: avg(prim), weak, hasDetails: s.rows.some((r) => r.questions?.length) };
    }).sort((a, b) => (b.best ?? 0) - (a.best ?? 0) || b.bestPrimary - a.bestPrimary);
  }, [rows]);

  const nmtAll = rows.map((r) => r.nmt_score);
  const maxBucket = Math.max(1, ...BUCKETS.map((b) => nmtAll.filter(b.test).length));
  const passed = nmtAll.filter((x) => x !== null).length;

  const hardest = [...tasks].sort((a, b) => a.ok - b.ok).slice(0, 3);
  const easiest = [...tasks].sort((a, b) => b.ok - a.ok).slice(0, 3);
  const shown = order === 'hard' ? [...tasks].sort((a, b) => a.ok - b.ok || a.p - b.p) : tasks;
  const qAt = (p: number) => ordered[p - 1];
  const editHref = (p: number) => routeHref({ name: 'edit', simulationId, position: p });

  if (!rows.length) return <section className="card admin-card"><p className="hint">Для цього тесту ще немає результатів.</p></section>;

  return (
    <>
      <dl className="admin__stats">
        <div><dt>Склали поріг</dt><dd>{pct(passed, rows.length)} %</dd></div>
        <div><dt>Найкращий бал НМТ</dt><dd>{passed ? Math.max(...nmtAll.filter((x): x is number => x !== null)) : '—'}</dd></div>
        <div><dt>Середній первинний</dt><dd>{fmt1(avg(rows.map((r) => Number(r.primary_score))))}</dd></div>
        <div><dt>Середній час</dt><dd>{fmt1(avg(rows.map((r) => (r.duration_seconds ?? 0) / 60)))} хв</dd></div>
      </dl>

      {tasks.length > 0 && (
        <div className="stats-highlights">
          <section className="card admin-card stats-hl stats-hl--bad">
            <h2 className="admin__h2"><TriangleAlert size={18} aria-hidden /> Найбільше помилок</h2>
            <ol>{hardest.map((t) => <TaskLine key={t.p} t={t} q={qAt(t.p)} href={editHref(t.p)} />)}</ol>
          </section>
          <section className="card admin-card stats-hl stats-hl--good">
            <h2 className="admin__h2"><ThumbsUp size={18} aria-hidden /> Найлегші</h2>
            <ol>{easiest.map((t) => <TaskLine key={t.p} t={t} q={qAt(t.p)} href={editHref(t.p)} />)}</ol>
          </section>
        </div>
      )}

      <section className="card admin-card">
        <h2 className="admin__h2">Рейтинг учнів</h2>
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead><tr><th>#</th><th>Учень</th><th>Найкращий НМТ</th><th>Середній НМТ</th><th>Найкращий первинний</th><th>Спроб</th><th>Найчастіше помиляється</th></tr></thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td><span className={`stats-rank${i < 3 ? ` stats-rank--${i + 1}` : ''}`}>{i + 1}</span></td>
                  <td><strong>{s.name}</strong><small>{s.email}</small></td>
                  <td><strong>{s.best ?? 'не склав'}</strong></td>
                  <td>{fmt1(s.avgNmt)}</td>
                  <td>{s.bestPrimary}{pkg ? <small>з {rows[0].max_score}</small> : null}</td>
                  <td>{s.attempts}</td>
                  <td className="stats-weak">{s.weak.length ? s.weak.map((p) => <a key={p} href={editHref(p)} data-link className="stats-chip">{p}</a>) : <span className="hint">{s.hasDetails ? 'немає' : '—'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card admin-card">
        <h2 className="admin__h2">Розподіл балів НМТ</h2>
        <ul className="stats-hist">
          {BUCKETS.map((b) => {
            const n = nmtAll.filter(b.test).length;
            return (
              <li key={b.label}>
                <span className="stats-hist__label">{b.label}</span>
                <span className="stats-hist__bar"><span style={{ width: `${(n / maxBucket) * 100}%` }} /></span>
                <span className="stats-hist__n">{n} {plural(n, ['спроба', 'спроби', 'спроб'])}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card admin-card">
        <div className="admin__head">
          <h2 className="admin__h2">Завдання</h2>
          <div className="stats-toggle" role="group" aria-label="Порядок завдань">
            <button type="button" className={`chip${order === 'hard' ? ' is-on' : ''}`} aria-pressed={order === 'hard'} onClick={() => setOrder('hard')}>Найважчі спочатку</button>
            <button type="button" className={`chip${order === 'num' ? ' is-on' : ''}`} aria-pressed={order === 'num'} onClick={() => setOrder('num')}>За номером</button>
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="notice notice--info"><Info size={18} aria-hidden />
            <p>Розбивка по завданнях з’явиться після нових спроб учнів (і коли учні з давніми спробами знову зайдуть на сайт).</p></div>
        ) : (
          <>
            <p className="hint">За {detailed.length} {plural(detailed.length, ['спробою', 'спробами', 'спробами'])}{detailed.length < rows.length ? ` (ще ${rows.length - detailed.length} — без розбивки, надіслані раніше)` : ''}.</p>
            <ul className="stats-legend" aria-hidden>
              <li><span className="sw sw--correct" /> правильно</li><li><span className="sw sw--partial" /> частково</li>
              <li><span className="sw sw--wrong" /> помилка</li><li><span className="sw sw--skipped" /> без відповіді</li>
            </ul>
            <ol className="stats-tasks">
              {shown.map((t) => {
                const q = qAt(t.p);
                return (
                  <li key={t.p}>
                    <a className="stats-tasks__num" href={editHref(t.p)} data-link title="Відкрити в редакторі">{t.p}</a>
                    <div className="stats-tasks__body">
                      <div className="stats-tasks__top">
                        <span className="stats-tasks__type">{q ? TYPE_LABEL[q.type] : ''}</span>
                        <strong className="stats-tasks__ok">{Math.round(t.ok * 100)} % балів</strong>
                      </div>
                      <div className="stats-bar" role="img" aria-label={`Завдання ${t.p}: правильно ${pct(t.correct, t.n)} %, частково ${pct(t.partial, t.n)} %, помилка ${pct(t.wrong, t.n)} %, без відповіді ${pct(t.skipped, t.n)} %`}>
                        {(['correct', 'partial', 'wrong', 'skipped'] as const).map((k) => t[k] > 0 && (
                          <span key={k} className={`sw--${k}`} style={{ width: `${(t[k] / t.n) * 100}%` }}>{pct(t[k], t.n) >= 12 ? `${pct(t[k], t.n)}%` : ''}</span>
                        ))}
                      </div>
                      {q && <p className="stats-tasks__text">{plainSnippet(q.statement)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>
    </>
  );
}

function TaskLine({ t, q, href }: { t: TaskStat; q: ReturnType<typeof orderedQuestions>[number] | undefined; href: string }) {
  return (
    <li>
      <a href={href} data-link className="stats-tasks__num">{t.p}</a>
      <div>
        <strong>{Math.round(t.ok * 100)} % балів</strong> · помилок {pct(t.wrong, t.n)} %, пропусків {pct(t.skipped, t.n)} %
        {q && <small>{TYPE_LABEL[q.type]} · {plainSnippet(q.statement, 70)}</small>}
      </div>
      <a href={href} data-link className="btn btn--ghost btn--sm btn--icon" aria-label={`Відкрити завдання ${t.p} в редакторі`}><PenLine size={16} aria-hidden /></a>
    </li>
  );
}
