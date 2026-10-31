import { useMemo, useState } from 'react';
import { Check, X, Minus, CircleSlash, RotateCcw, Home, ListOrdered, Clock, Target, Percent } from 'lucide-react';
import { bunnyEmbedUrl, type ContentPackage, type Question, type VideoMap, type VideoMedia } from '../content/types';
import { type Attempt, orderedQuestions, timeSpentMs } from '../engine/attempt';
import type { QuestionResult, QuestionStatus } from '../engine/scoring';
import { displayNumber } from '../engine/numeric';
import { RichText } from './RichText';
import { Figure } from './Figure';
import { VideoBlock } from './VideoBlock';
import { formatDateTime, formatDuration, formatPercent, LETTERS, plural, TYPE_LABEL } from './format';

type Filter = 'all' | 'wrong' | 'partial' | 'skipped';

const STATUS: Record<QuestionStatus, { label: string; icon: typeof Check }> = {
  correct: { label: 'Правильно', icon: Check },
  partial: { label: 'Частково правильно', icon: Minus },
  wrong: { label: 'Неправильно', icon: X },
  skipped: { label: 'Без відповіді', icon: CircleSlash },
};

const POINTS: [string, string, string] = ['бал', 'бали', 'балів'];

function points(n: number) { return `${String(n).replace('.', ',')} ${plural(Math.round(n), POINTS)}`; }

function StatusBadge({ status }: { status: QuestionStatus }) {
  const S = STATUS[status];
  return <span className={`status status--${status}`}><S.icon size={14} strokeWidth={2.5} aria-hidden />{S.label}</span>;
}

interface Props {
  attempt: Attempt;
  pkg: ContentPackage;
  baseDir: string;
  videoMap: VideoMap | null;
  onRetry: (() => void) | null;
  onHome: () => void;
  history: Attempt[];
  onOpenAttempt: (id: string) => void;
}

export function ReviewScreen({ attempt, pkg, baseDir, videoMap, onRetry, onHome, history, onOpenAttempt }: Props) {
  const result = attempt.result!;
  const ordered = useMemo(() => orderedQuestions(pkg), [pkg]);
  const [filter, setFilter] = useState<Filter>('all');
  const videoFor = useMemo(() => {
    const m = new Map<string, VideoMedia>();
    if (videoMap && videoMap.simulationId === pkg.simulation.id) {
      const media = new Map(videoMap.media.map((x) => [x.id, x]));
      for (const b of videoMap.bindings) {
        const x = media.get(b.explanationVideoId);
        if (x) m.set(b.questionId, x);
      }
    }
    for (const q of pkg.questions) {
      if (q.video?.provider === 'bunny') m.set(q.id, { id: `bunny-${q.video.videoId}`, kind: 'embed', publicUrl: bunnyEmbedUrl(q.video), readiness: 'ready' });
      else if (q.video?.provider === 'file') m.set(q.id, { id: `file-${q.id}`, kind: 'video', publicUrl: q.video.src, mimeType: q.video.mimeType, readiness: 'ready' });
    }
    return m;
  }, [videoMap, pkg]);

  const counts = result.counts;
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'Усі', n: result.questions.length },
    { id: 'wrong', label: 'Помилки', n: counts.wrong },
    { id: 'partial', label: 'Частково', n: counts.partial },
    { id: 'skipped', label: 'Без відповіді', n: counts.skipped },
  ];
  const visible = result.questions.filter((r) => filter === 'all' || r.status === filter);

  const jump = (pos: number) => {
    if (filter !== 'all' && result.questions[pos - 1].status !== filter) setFilter('all');
    requestAnimationFrame(() => {
      const el = document.getElementById(`review-q-${pos}`);
      el?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      (el?.querySelector('h2') as HTMLElement | null)?.focus({ preventScroll: true });
    });
    (document.getElementById('review-nav-details') as HTMLDetailsElement | null)?.removeAttribute('open');
  };

  const grid = (
    <ol className="qgrid qgrid--review">
      {result.questions.map((r) => {
        const S = STATUS[r.status];
        return (
          <li key={r.questionId}>
            <button type="button" className={`qcell qcell--r-${r.status}`} onClick={() => jump(r.position)}
              aria-label={`Завдання ${r.position}: ${S.label}, ${points(r.earned)} з ${r.max}`}>
              <span className="qcell__num">{r.position}</span>
              <S.icon className="qcell__mark" size={11} strokeWidth={3} aria-hidden />
            </button>
          </li>
        );
      })}
    </ol>
  );

  const others = history.filter((h) => h.id !== attempt.id);

  return (
    <div className="review">
      <header className="exam-bar">
        <div className="exam-bar__title">
          <span className="exam-bar__name">{pkg.simulation.title}</span>
          <span className="exam-bar__subject">Результат і розбір</span>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onHome}><Home size={18} aria-hidden /> <span className="hide-xs">На початок</span></button>
      </header>

      <div className="exam-layout">
        <main className="question-col" id="main">
          <section className="card result" aria-labelledby="result-title">
            <h1 id="result-title" tabIndex={-1} className="result__title">Результат</h1>
            <p className="result__meta">
              {attempt.finishReason === 'timeout' ? 'Час вичерпано — спробу завершено автоматично' : 'Спробу завершено'} · {formatDateTime(attempt.finishedAt!)}
              {pkg.simulation.isDemo && <> · <span className="badge badge--demo">Демонстраційний набір</span></>}
            </p>
            <div className="result__score">
              <div className="score-main">
                <span className="score-main__value tabular">{String(result.primary).replace('.', ',')}</span>
                <span className="score-main__max">з {result.max} первинних балів</span>
              </div>
              <dl className="result__stats">
                <div><dt><Percent size={16} aria-hidden /> Відсоток</dt><dd className="tabular">{formatPercent(result.percent)}</dd></div>
                <div><dt><Clock size={16} aria-hidden /> Витрачено часу</dt><dd className="tabular">{formatDuration(timeSpentMs(attempt))}</dd></div>
                <div><dt><Target size={16} aria-hidden /> Бал НМТ (100–200)</dt>
                  <dd>{result.scaled
                    ? (result.scaled.value === null ? 'Поріг не подолано' : <span className="tabular">{result.scaled.value}</span>)
                    : <span className="muted">Таблицю переведення ще не додано</span>}
                    {result.scaled && <small className="muted"> · таблиця {result.scaled.year} р.</small>}
                  </dd></div>
              </dl>
            </div>
            <ul className="result__counts" aria-label="Кількість завдань за статусом">
              {(['correct', 'partial', 'wrong', 'skipped'] as QuestionStatus[]).map((s) => (
                <li key={s} className={`count count--${s}`}>
                  <span className="count__n tabular">{counts[s]}</span>
                  <span className="count__label">{s === 'correct' ? 'повністю правильно' : s === 'partial' ? 'частково правильно' : s === 'wrong' ? 'неправильно' : 'без відповіді'}</span>
                </li>
              ))}
            </ul>
            {attempt.appliedDraftIds.length > 0 && (
              <p className="hint">Під час завершення зараховано {attempt.appliedDraftIds.length} {plural(attempt.appliedDraftIds.length, ['чернетку', 'чернетки', 'чернеток'])}.</p>
            )}
            <div className="result__actions">
              {onRetry && <button type="button" className="btn btn--primary" onClick={onRetry}><RotateCcw size={18} aria-hidden /> Пройти ще раз</button>}
              <button type="button" className="btn btn--ghost" onClick={onHome}>До початку</button>
            </div>
          </section>

          <details className="card review-nav-mobile" id="review-nav-details">
            <summary><ListOrdered size={18} aria-hidden /> Навігація за завданнями</summary>
            {grid}
          </details>

          <div className="filters" role="group" aria-label="Фільтр розбору">
            {filters.map((f) => (
              <button key={f.id} type="button" className={`chip chip--lg${filter === f.id ? ' is-on' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label} <span className="chip__n">{f.n}</span>
              </button>
            ))}
          </div>

          <div className="review-list" aria-live="polite">
            {visible.length === 0 && <p className="empty-state card">У цій категорії завдань немає.</p>}
            {visible.map((r) => (
              <ReviewCard key={r.questionId} q={ordered[r.position - 1]} r={r} baseDir={baseDir} media={videoFor.get(r.questionId) ?? null} />
            ))}
          </div>

          {others.length > 0 && (
            <section className="card history" aria-labelledby="history-title">
              <h2 id="history-title">Інші спроби цього набору</h2>
              <ul>
                {others.map((h) => (
                  <li key={h.id}>
                    <button type="button" className="link-btn" onClick={() => onOpenAttempt(h.id)}>
                      {formatDateTime(h.finishedAt!)} — {String(h.result?.primary ?? 0).replace('.', ',')} з {h.result?.max}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <aside className="exam-side" aria-label="Підсумок і навігація">
          <div className="card side-card">
            <p className="side-score"><span className="tabular">{String(result.primary).replace('.', ',')}</span> / {result.max}</p>
            <p className="side-card__saved">{formatPercent(result.percent)} · {formatDuration(timeSpentMs(attempt))}</p>
            <nav aria-label="Перехід до розбору завдань">{grid}</nav>
            <ul className="legend">
              <li><span className="lg lg--r-correct" aria-hidden><Check size={10} strokeWidth={3} /></span>Правильно</li>
              <li><span className="lg lg--r-partial" aria-hidden><Minus size={10} strokeWidth={3} /></span>Частково</li>
              <li><span className="lg lg--r-wrong" aria-hidden><X size={10} strokeWidth={3} /></span>Неправильно</li>
              <li><span className="lg lg--r-skipped" aria-hidden><CircleSlash size={10} strokeWidth={3} /></span>Без відповіді</li>
            </ul>
            {onRetry && <button type="button" className="btn btn--outline btn--block" onClick={onRetry}><RotateCcw size={16} aria-hidden /> Пройти ще раз</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewCard({ q, r, baseDir, media }: { q: Question; r: QuestionResult; baseDir: string; media: VideoMedia | null }) {
  const hid = `review-q-${r.position}-title`;
  return (
    <article className={`card rcard rcard--${r.status}`} id={`review-q-${r.position}`} aria-labelledby={hid}>
      <div className="rcard__head">
        <div>
          <h2 id={hid} tabIndex={-1} className="question__title">Завдання {r.position}</h2>
          <p className="question__type">{TYPE_LABEL[q.type]}</p>
        </div>
        <div className="rcard__badges">
          <StatusBadge status={r.status} />
          <span className="rcard__points tabular">{points(r.earned)} з {r.max}</span>
        </div>
      </div>
      <RichText text={q.statement} className="question__statement" />
      {q.assets?.map((a) => <Figure key={a.id} asset={a} baseDir={baseDir} />)}

      <div className="rcard__answer">
        {q.type === 'single_choice' && <SingleReview q={q} r={r} />}
        {q.type === 'matching' && <MatchingReview q={q} r={r} />}
        {q.type === 'numeric' && <NumericReview q={q} r={r} />}
      </div>

      <section className="solution" aria-label={`Розв’язання завдання ${r.position}`}>
        <h3>Розв’язання</h3>
        {q.textExplanation ? <RichText text={q.textExplanation} /> : <p className="muted">Текстовий розв’язок ще не додано.</p>}
      </section>
      <VideoBlock media={media} baseDir={baseDir} questionId={q.id} position={r.position} />
    </article>
  );
}

function SingleReview({ q, r }: { q: Extract<Question, { type: 'single_choice' }>; r: QuestionResult }) {
  const given = r.answer?.type === 'single_choice' ? r.answer.optionId : null;
  return (
    <>
      {!given && <p className="answer-line answer-line--none"><CircleSlash size={16} aria-hidden /> Відповідь не надано</p>}
      <ul className="choice-list choice-list--review">
        {q.options.map((o, i) => {
          const isKey = o.id === q.answerKey.optionId;
          const isGiven = o.id === given;
          const cls = isKey ? 'is-key' : isGiven ? 'is-wrong' : '';
          return (
            <li key={o.id} className={`choice choice--static ${cls}`}>
              <span className="choice__letter" aria-hidden>{LETTERS[i]}</span>
              <RichText text={o.content} className="choice__content" />
              <span className="choice__tags">
                {isGiven && <span className={`tagline ${isKey ? 'tagline--ok' : 'tagline--bad'}`}>{isKey ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />} Ваша відповідь</span>}
                {isKey && !isGiven && <span className="tagline tagline--ok"><Check size={14} aria-hidden /> Правильна відповідь</span>}
                {isKey && isGiven && <span className="visually-hidden">, правильна відповідь</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function MatchingReview({ q, r }: { q: Extract<Question, { type: 'matching' }>; r: QuestionResult }) {
  const letter = (id: string | null) => (id ? LETTERS[q.matchingOptions.findIndex((o) => o.id === id)] : null);
  const content = (id: string) => q.matchingOptions.find((o) => o.id === id)?.content ?? '';
  return (
    <>
      {r.status === 'skipped' && <p className="answer-line answer-line--none"><CircleSlash size={16} aria-hidden /> Відповідь не надано</p>}
      <table className="match-table">
        <caption className="visually-hidden">Перевірка кожної відповідності</caption>
        <thead><tr><th scope="col">Пункт</th><th scope="col">Ваша відповідь</th><th scope="col">Правильна</th><th scope="col"><span className="visually-hidden">Результат</span></th></tr></thead>
        <tbody>
          {q.matchingRows.map((row, i) => {
            const rc = r.rows?.find((x) => x.rowId === row.id);
            const given = rc?.given ?? null;
            return (
              <tr key={row.id} className={rc?.ok ? 'ok' : given ? 'bad' : 'none'}>
                <th scope="row"><span className="tag tag--num">{i + 1}</span> <RichText text={row.content} inline /></th>
                <td>{given ? <><strong>{letter(given)}</strong> <RichText text={content(given)} inline /></> : <span className="muted">не обрано</span>}</td>
                <td><strong>{letter(rc?.correct ?? q.answerKey.pairs[row.id])}</strong> <RichText text={content(q.answerKey.pairs[row.id])} inline /></td>
                <td className="match-table__res">
                  {rc?.ok ? <span className="tagline tagline--ok"><Check size={14} aria-hidden /> +1</span>
                    : given ? <span className="tagline tagline--bad"><X size={14} aria-hidden /> 0</span>
                    : <span className="tagline"><CircleSlash size={14} aria-hidden /> 0</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">Правильних відповідностей: {r.rows?.filter((x) => x.ok).length ?? 0} з {q.matchingRows.length}.</p>
    </>
  );
}

function NumericReview({ q, r }: { q: Extract<Question, { type: 'numeric' }>; r: QuestionResult }) {
  const given = r.answer?.type === 'numeric' ? r.answer.raw.trim() : null;
  const rule = q.numericRule;
  return (
    <dl className="numeric-review">
      <div className={given ? (r.status === 'correct' ? 'ok' : 'bad') : 'none'}>
        <dt>Ваша відповідь</dt>
        <dd>{given ? <span className="tabular">{given}</span> : <span className="muted">Відповідь не надано</span>}</dd>
      </div>
      <div className="ok">
        <dt>Правильна відповідь</dt>
        <dd><span className="tabular">{displayNumber(q.answerKey.value)}</span>
          {rule.mode === 'tolerance' && <small className="muted"> (зараховується з похибкою ±{displayNumber(rule.tolerance)})</small>}
        </dd>
      </div>
    </dl>
  );
}
