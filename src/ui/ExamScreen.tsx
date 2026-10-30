import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Flag, Flag as FlagIcon, Grid3x3, Lock, PenLine, Clock } from 'lucide-react';
import type { ContentPackage, Question } from '../content/types';
import { type Attempt, commitAnswer, goTo, questionProgress, remainingMs, setDraft, summarize, toggleFlag, visibleAnswer, orderedQuestions } from '../engine/attempt';
import { checkAnswer, filledPairs } from '../engine/answers';
import { RichText } from './RichText';
import { SingleChoice } from './answers/SingleChoice';
import { Matching } from './answers/Matching';
import { Numeric } from './answers/Numeric';
import { Dialog } from './Dialog';
import { FinishDialog } from './FinishDialog';
import { Figure } from './Figure';
import { formatClock, TYPE_LABEL } from './format';
import { APP_CONFIG } from '../config';
import { navigate } from '../router';
import { useAuth } from '../cloud/cloud';

interface Props {
  attempt: Attempt;
  pkg: ContentPackage;
  baseDir: string;
  position: number;
  update: (fn: (a: Attempt) => Attempt) => Attempt | null;
  onFinish: (applyDrafts: boolean) => void;
  overlay: 'none' | 'reference' | 'finishConfirm' | 'selector';
  openReference: () => void;
  requestFinish: () => void;
  closeOverlay: () => void;
  hasReference: boolean;
}

function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [intervalMs]);
  return now;
}

/** Таймер: цифри однакової ширини; екранний читач не чує кожну секунду — лише рідкісні попередження. */
function Timer({ deadlineAt, compact = false }: { deadlineAt: number; compact?: boolean }) {
  const now = useNow();
  const left = Math.max(0, deadlineAt - now);
  const lastMinute = left <= 60_000;
  const warn = left <= 5 * 60_000;
  return (
    <div className={`timer${warn ? ' timer--warn' : ''}${lastMinute ? ' timer--critical' : ''}${compact ? ' timer--compact' : ''}`}>
      <Clock size={compact ? 16 : 18} aria-hidden />
      {!compact && <span className="timer__label">Залишилось</span>}
      <span className="timer__value" role="timer" aria-label="Залишок часу" aria-live="off">{formatClock(left)}</span>
    </div>
  );
}

function TimerAnnouncer({ deadlineAt }: { deadlineAt: number }) {
  const now = useNow(1000);
  const [msg, setMsg] = useState('');
  const said = useRef(new Set<number>());
  useEffect(() => {
    const left = Math.ceil((deadlineAt - now) / 1000);
    for (const t of APP_CONFIG.timerAnnouncements) {
      if (left <= t && left > t - 5 && !said.current.has(t)) {
        said.current.add(t);
        setMsg(t >= 60 ? `Залишилось ${t / 60} хв.` : `Залишилось ${t} с.`);
      } else if (left <= t - 5) said.current.add(t);
    }
  }, [now, deadlineAt]);
  return <div className="visually-hidden" aria-live="assertive">{msg}</div>;
}

const STATE_LABEL = {
  saved: 'відповідь збережено',
  saved_with_changes: 'відповідь збережено, є незбережені зміни',
  draft_only: 'є незбережена чернетка',
  empty: 'без збереженої відповіді',
} as const;

function QuestionGrid({ attempt, ordered, current, onGo }: { attempt: Attempt; ordered: Question[]; current: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Номери завдань">
      <ol className="qgrid">
        {ordered.map((q, i) => {
          const p = questionProgress(attempt, q.id);
          const flagged = attempt.flaggedQuestionIds.includes(q.id);
          const isCur = i + 1 === current;
          const label = `Завдання ${i + 1}: ${STATE_LABEL[p]}${flagged ? ', позначено для перегляду' : ''}${isCur ? ', поточне' : ''}`;
          return (
            <li key={q.id}>
              <button type="button" className={`qcell qcell--${p}${isCur ? ' is-current' : ''}${flagged ? ' is-flagged' : ''}`}
                aria-label={label} aria-current={isCur ? 'step' : undefined} onClick={() => onGo(i + 1)}>
                <span className="qcell__num">{i + 1}</span>
                {(p === 'saved' || p === 'saved_with_changes') && <Check className="qcell__mark" size={12} strokeWidth={3} aria-hidden />}
                {flagged && <FlagIcon className="qcell__flag" size={11} strokeWidth={2.5} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Legend() {
  return (
    <ul className="legend" aria-label="Позначення">
      <li><span className="lg lg--current" aria-hidden>1</span>Поточне</li>
      <li><span className="lg lg--saved" aria-hidden><Check size={10} strokeWidth={3} /></span>Збережено</li>
      <li><span className="lg lg--draft" aria-hidden /> Незбережена чернетка</li>
      <li><span className="lg" aria-hidden /> Без відповіді</li>
      <li><span className="lg lg--flag" aria-hidden><FlagIcon size={10} strokeWidth={2.5} /></span>Позначено</li>
    </ul>
  );
}

export function ExamScreen(props: Props) {
  const { attempt, pkg, baseDir, update, overlay } = props;
  const ordered = useMemo(() => orderedQuestions(pkg), [pkg]);
  const total = ordered.length;
  const position = Math.min(Math.max(props.position, 1), total);
  const q = ordered[position - 1];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const [gridOpen, setGridOpen] = useState(false);

  // Маршрут → поточне питання у спробі (щоб «Продовжити» відкривало те саме місце).
  useEffect(() => {
    if (attempt.currentQuestionId !== q.id) update((a) => goTo(a, q.id));
  }, [q.id, attempt.currentQuestionId, update]);

  // Після зміни питання фокус переходить на заголовок без різкої прокрутки сторінки.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    const top = h.getBoundingClientRect().top;
    if (top < 72 || top > window.innerHeight * 0.6) h.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [position]);

  const go = (n: number) => {
    if (n < 1 || n > total) return;
    setGridOpen(false);
    navigate({ name: 'attempt', attemptId: attempt.id, position: n }, true);
  };

  const value = visibleAnswer(attempt, q.id);
  const progress = questionProgress(attempt, q.id);
  const draft = attempt.draftAnswers[q.id];
  const check = checkAnswer(q, draft);
  const canSave = !!draft && check.valid;
  const flagged = attempt.flaggedQuestionIds.includes(q.id);
  const savedCount = ordered.filter((x) => attempt.committedAnswers[x.id]).length;

  const onChange = (v: Parameters<typeof setDraft>[2]) => { update((a) => setDraft(a, q.id, v)); };
  const save = () => {
    if (!canSave) return;
    const next = update((a) => commitAnswer(a, q));
    if (next?.committedAnswers[q.id]) {
      if (position < total) go(position + 1);
    }
  };
  const locked = !!attempt.committedAnswers[q.id];

  const statusText = locked ? 'Відповідь збережено. Змінити її не можна.'
    : progress === 'saved_with_changes' ? 'Є незбережені зміни — збережіть, щоб вони зарахувалися'
    : progress === 'draft_only' ? 'Відповідь ще не збережено'
    : '';
  const headingId = `q-title-${q.id}`;
  const isAdmin = useAuth().isAdmin;
  const summary = summarize(attempt, ordered);

  return (
    <div className="exam">
      <TimerAnnouncer deadlineAt={attempt.deadlineAt} />
      <header className="exam-bar">
        <div className="exam-bar__title">
          <span className="exam-bar__name">{pkg.simulation.title}</span>
          <span className="exam-bar__subject">{pkg.simulation.subject}</span>
        </div>
        <div className="exam-bar__mobile">
          <Timer deadlineAt={attempt.deadlineAt} compact />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setGridOpen(true)} aria-haspopup="dialog">
            <Grid3x3 size={16} aria-hidden /> {position} / {total}
          </button>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={props.openReference}>
          <BookOpen size={18} aria-hidden /> <span className="hide-xs">Довідкові матеріали</span><span className="show-xs">Довідник</span>
        </button>
      </header>

      <div className="exam-layout">
        <main className="question-col" id="main">
          <article className="card question" aria-labelledby={headingId}>
            <div className="question__head">
              <div>
                <h1 id={headingId} ref={headingRef} tabIndex={-1} className="question__title">Завдання {position} <span className="question__of">з {total}</span></h1>
                <p className="question__type">{TYPE_LABEL[q.type]} · {q.maxPoints} {q.maxPoints === 1 ? 'бал' : q.maxPoints < 5 ? 'бали' : 'балів'}</p>
              </div>
              <div className="question__head-actions">
                {isAdmin && (
                  <a className="btn btn--ghost btn--sm" href={`#/edit/${encodeURIComponent(pkg.simulation.id)}/${position}`}><PenLine size={16} aria-hidden /> Редагувати</a>
                )}
                <button type="button" className={`btn btn--flag btn--sm${flagged ? ' is-on' : ''}`} aria-pressed={flagged}
                  onClick={() => update((a) => toggleFlag(a, q.id))}>
                  <Flag size={16} aria-hidden fill={flagged ? 'currentColor' : 'none'} />
                  <span>{flagged ? 'Позначено для перегляду' : 'Позначити для перегляду'}</span>
                </button>
              </div>
            </div>

            <RichText text={q.statement} className="question__statement" />
            {q.assets?.map((a) => <Figure key={a.id} asset={a} baseDir={baseDir} />)}

            <div className="question__answer">
              {q.type === 'single_choice' && <SingleChoice q={q} value={value} onChange={onChange} labelledBy={headingId} disabled={locked} />}
              {q.type === 'matching' && <Matching q={q} value={value} onChange={onChange} disabled={locked} />}
              {q.type === 'numeric' && <Numeric key={q.id} q={q} value={value} onChange={onChange} onSubmit={save} disabled={locked} />}
            </div>

            <div className="question__foot">
              <p className={`save-status save-status--${progress}`} role="status">
                {statusText && (locked ? <Lock size={16} aria-hidden /> : progress !== 'empty' ? <PenLine size={16} aria-hidden /> : null)}
                <span>{statusText}</span>
                {q.type === 'matching' && progress !== 'empty' && <span className="save-status__extra"> · заповнено {filledPairs(value)} з {q.matchingRows.length}</span>}
              </p>
              {!locked && (
                <button type="button" className="btn btn--primary" onClick={save} disabled={!canSave}>
                  Зберегти відповідь
                </button>
              )}
            </div>
          </article>

          <button type="button" className="btn btn--outline btn--block mobile-finish" onClick={props.requestFinish}>
            Завершити симуляцію
          </button>

          <div className="mobile-actions" role="group" aria-label="Перехід між завданнями">
            <button type="button" className="btn btn--ghost" onClick={() => go(position - 1)} disabled={position <= 1} aria-label="Попереднє завдання">
              <ChevronLeft size={20} aria-hidden /> <span>Попереднє</span>
            </button>
            <span className="mobile-actions__pos" aria-hidden>{position} / {total}</span>
            {position < total ? (
              <button type="button" className="btn btn--ghost" onClick={() => go(position + 1)} aria-label="Наступне завдання">
                <span>Наступне</span> <ChevronRight size={20} aria-hidden />
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={props.requestFinish}>
                <span>Завершити</span>
              </button>
            )}
          </div>
        </main>

        <aside className="exam-side" aria-label="Навігація та час">
          <div className="card side-card">
            <Timer deadlineAt={attempt.deadlineAt} />
            <p className="side-card__saved">Збережено відповідей: <strong>{savedCount} із {total}</strong></p>
            <QuestionGrid attempt={attempt} ordered={ordered} current={position} onGo={go} />
            <Legend />
            <div className="side-nav">
              <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(position - 1)} disabled={position <= 1} aria-label="Попереднє завдання" title="Попереднє">
                <ChevronLeft size={20} aria-hidden />
              </button>
              <span className="side-nav__pos">Завдання <strong>{position}</strong> з {total}</span>
              <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(position + 1)} disabled={position >= total} aria-label="Наступне завдання" title="Наступне">
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>
            <button type="button" className="btn btn--outline btn--block" onClick={props.requestFinish}>
              Завершити симуляцію
            </button>
          </div>
        </aside>
      </div>

      <Dialog open={gridOpen} onClose={() => setGridOpen(false)} title="Завдання" titleId="grid-dialog-title" size="sm" className="dialog--sheet">
        <div className="sheet-timer"><Timer deadlineAt={attempt.deadlineAt} /></div>
        <p className="side-card__saved">Збережено відповідей: <strong>{savedCount} із {total}</strong></p>
        <QuestionGrid attempt={attempt} ordered={ordered} current={position} onGo={go} />
        <Legend />
        <button type="button" className="btn btn--outline btn--block" onClick={() => { setGridOpen(false); props.requestFinish(); }}>
          Завершити симуляцію
        </button>
      </Dialog>

      <FinishDialog open={overlay === 'finishConfirm'} summary={summary} remaining={remainingMs(attempt, Date.now())}
        deadlineAt={attempt.deadlineAt} onCancel={props.closeOverlay} onConfirm={props.onFinish} />
    </div>
  );
}
