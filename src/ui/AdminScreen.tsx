import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { fetchAllResults, signIn, useAuth, type ResultRow } from '../cloud/cloud';
import { formatDateTime, formatDuration, plural } from './format';

interface Props { titleOf: (simId: string) => string | null }

interface Student { userId: string; name: string; email: string; rows: ResultRow[] }

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const fmt1 = (x: number | null) => (x === null ? '—' : String(Math.round(x * 10) / 10).replace('.', ','));
const nmtOf = (r: ResultRow) => (r.nmt_score ?? null);
const nmtText = (r: ResultRow) => (r.nmt_score === null ? 'не склав' : String(r.nmt_score));
const ts = (iso: string) => new Date(iso).getTime();

/** Сторінка адміністратора: усі результати учнів із бази. Дані видно лише пошті зі списку admins (перевіряє сама база). */
export function AdminScreen({ titleOf }: Props) {
  const auth = useAuth();
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = () => {
    setError(null);
    fetchAllResults().then(setRows).catch((e) => setError(String(e?.message ?? e)));
  };
  useEffect(() => { if (auth.isAdmin) load(); }, [auth.isAdmin]);

  const title = (r: ResultRow) => r.simulation_title || titleOf(r.simulation_id) || r.simulation_id;
  const sims = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows ?? []) if (!m.has(r.simulation_id)) m.set(r.simulation_id, title(r));
    return [...m.entries()];
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (sim === 'all' || r.simulation_id === sim)
      && (!needle || (r.full_name ?? '').toLowerCase().includes(needle) || (r.email ?? '').toLowerCase().includes(needle)));
  }, [rows, sim, q]);

  const students = useMemo(() => {
    const m = new Map<string, Student>();
    for (const r of filtered) {
      const s = m.get(r.user_id) ?? { userId: r.user_id, name: r.full_name || r.email || 'Без імені', email: r.email ?? '', rows: [] };
      s.rows.push(r);
      m.set(r.user_id, s);
    }
    return [...m.values()].sort((a, b) => ts(b.rows[0].finished_at) - ts(a.rows[0].finished_at));
  }, [filtered]);

  const tests = useMemo(() => sims.map(([id, t]) => {
    const rs = (rows ?? []).filter((r) => r.simulation_id === id);
    return { id, title: t, attempts: rs.length, students: new Set(rs.map((r) => r.user_id)).size,
      avgNmt: avg(rs.map(nmtOf).filter((x): x is number => x !== null)), avgPrimary: avg(rs.map((r) => Number(r.primary_score))), max: rs[0] ? Number(rs[0].max_score) : null };
  }), [rows, sims]);

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

  const nmts = filtered.map(nmtOf).filter((x): x is number => x !== null);

  return (
    <main className="admin" id="main">
      <div className="admin__head">
        <h1 className="admin__title">Результати учнів</h1>
        <button type="button" className="btn btn--ghost btn--sm" onClick={load}><RefreshCw size={16} aria-hidden /> Оновити</button>
      </div>

      {error && <div className="notice notice--warn"><ShieldAlert size={18} aria-hidden /><p>Не вдалося завантажити результати: {error}</p></div>}
      {!rows && !error && <p className="loading" role="status">Завантаження…</p>}

      {rows && (
        <>
          <div className="admin__filters">
            <label className="admin__field">
              <span>Тест</span>
              <select value={sim} onChange={(e) => setSim(e.target.value)}>
                <option value="all">Усі тести</option>
                {sims.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
              </select>
            </label>
            <label className="admin__field admin__field--grow">
              <span>Пошук учня</span>
              <span className="admin__search"><Search size={16} aria-hidden /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ім’я або пошта" /></span>
            </label>
          </div>

          <dl className="admin__stats">
            <div><dt>Учнів</dt><dd>{students.length}</dd></div>
            <div><dt>Спроб</dt><dd>{filtered.length}</dd></div>
            <div><dt>Середній бал НМТ</dt><dd>{fmt1(avg(nmts))}</dd></div>
            <div><dt>Середній відсоток</dt><dd>{fmt1(avg(filtered.map((r) => Number(r.percent))))} %</dd></div>
          </dl>

          <section className="card admin-card">
            <h2 className="admin__h2">Учні</h2>
            {students.length === 0 ? <p className="hint">Ще ніхто не пройшов тест.</p> : (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead><tr><th>Учень</th><th>Спроб</th><th>Середній НМТ</th><th>Найкращий</th><th>Останній</th></tr></thead>
                  <tbody>
                    {students.map((s) => {
                      const sn = s.rows.map(nmtOf).filter((x): x is number => x !== null);
                      const last = s.rows[0];
                      const isOpen = open === s.userId;
                      return (
                        <Fragment key={s.userId}>
                          <tr className="admin__row" onClick={() => setOpen(isOpen ? null : s.userId)}>
                            <td>
                              <button type="button" className="admin__expand" aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : s.userId); }}>
                                {isOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                                <span><strong>{s.name}</strong><small>{s.email}</small></span>
                              </button>
                            </td>
                            <td>{s.rows.length}</td>
                            <td>{fmt1(avg(sn))}</td>
                            <td>{sn.length ? Math.max(...sn) : '—'}</td>
                            <td>{nmtText(last)}<small>{formatDateTime(ts(last.finished_at))}</small></td>
                          </tr>
                          {isOpen && (
                            <tr className="admin__sub"><td colSpan={5}>
                              <AttemptsTable rows={s.rows} title={title} showStudent={false} />
                            </td></tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card admin-card">
            <h2 className="admin__h2">Тести</h2>
            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead><tr><th>Тест</th><th>Спроб</th><th>Учнів</th><th>Середній НМТ</th><th>Середній первинний</th></tr></thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id}><td>{t.title}</td><td>{t.attempts}</td><td>{t.students}</td><td>{fmt1(t.avgNmt)}</td><td>{fmt1(t.avgPrimary)}{t.max ? ` з ${t.max}` : ''}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card admin-card">
            <h2 className="admin__h2">Усі спроби <span className="hint">({filtered.length} {plural(filtered.length, ['спроба', 'спроби', 'спроб'])})</span></h2>
            <AttemptsTable rows={filtered} title={title} showStudent />
          </section>
        </>
      )}
    </main>
  );
}

function AttemptsTable({ rows, title, showStudent }: { rows: ResultRow[]; title: (r: ResultRow) => string; showStudent: boolean }) {
  return (
    <div className="admin__table-wrap">
      <table className="admin__table">
        <thead><tr><th>Дата</th>{showStudent && <th>Учень</th>}<th>Тест</th><th>Бали</th><th>НМТ</th><th>Час</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{formatDateTime(ts(r.finished_at))}</td>
              {showStudent && <td>{r.full_name || r.email}</td>}
              <td>{title(r)}</td>
              <td>{String(r.primary_score).replace('.', ',')} з {r.max_score}<small>{String(r.percent).replace('.', ',')} %</small></td>
              <td><strong>{nmtText(r)}</strong></td>
              <td>{formatDuration((r.duration_seconds ?? 0) * 1000)}{r.finish_reason === 'timeout' && <small>час вийшов</small>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
