import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Flag, Flag as FlagIcon, Grid3x3, Lock, PenLine, Clock } from 'lucide-react';
import { commitAnswer, goTo, questionProgress, remainingMs, setDraft, summarize, toggleFlag, visibleAnswer, orderedQuestions } from '../engine/attempt';
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
function useNow(intervalMs = 250) {
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
function Timer({ deadlineAt, compact = false }) {
    const now = useNow();
    const left = Math.max(0, deadlineAt - now);
    const lastMinute = left <= 60_000;
    const warn = left <= 5 * 60_000;
    return (_jsxs("div", { className: `timer${warn ? ' timer--warn' : ''}${lastMinute ? ' timer--critical' : ''}${compact ? ' timer--compact' : ''}`, children: [_jsx(Clock, { size: compact ? 16 : 18, "aria-hidden": true }), !compact && _jsx("span", { className: "timer__label", children: "\u0417\u0430\u043B\u0438\u0448\u0438\u043B\u043E\u0441\u044C" }), _jsx("span", { className: "timer__value", role: "timer", "aria-label": "\u0417\u0430\u043B\u0438\u0448\u043E\u043A \u0447\u0430\u0441\u0443", "aria-live": "off", children: formatClock(left) })] }));
}
function TimerAnnouncer({ deadlineAt }) {
    const now = useNow(1000);
    const [msg, setMsg] = useState('');
    const said = useRef(new Set());
    useEffect(() => {
        const left = Math.ceil((deadlineAt - now) / 1000);
        for (const t of APP_CONFIG.timerAnnouncements) {
            if (left <= t && left > t - 5 && !said.current.has(t)) {
                said.current.add(t);
                setMsg(t >= 60 ? `Залишилось ${t / 60} хв.` : `Залишилось ${t} с.`);
            }
            else if (left <= t - 5)
                said.current.add(t);
        }
    }, [now, deadlineAt]);
    return _jsx("div", { className: "visually-hidden", "aria-live": "assertive", children: msg });
}
const STATE_LABEL = {
    saved: 'відповідь збережено',
    saved_with_changes: 'відповідь збережено, є незбережені зміни',
    draft_only: 'є незбережена чернетка',
    empty: 'без збереженої відповіді',
};
function QuestionGrid({ attempt, ordered, current, onGo }) {
    return (_jsx("nav", { "aria-label": "\u041D\u043E\u043C\u0435\u0440\u0438 \u0437\u0430\u0432\u0434\u0430\u043D\u044C", children: _jsx("ol", { className: "qgrid", children: ordered.map((q, i) => {
                const p = questionProgress(attempt, q.id);
                const flagged = attempt.flaggedQuestionIds.includes(q.id);
                const isCur = i + 1 === current;
                const label = `Завдання ${i + 1}: ${STATE_LABEL[p]}${flagged ? ', позначено для перегляду' : ''}${isCur ? ', поточне' : ''}`;
                return (_jsx("li", { children: _jsxs("button", { type: "button", className: `qcell qcell--${p}${isCur ? ' is-current' : ''}${flagged ? ' is-flagged' : ''}`, "aria-label": label, "aria-current": isCur ? 'step' : undefined, onClick: () => onGo(i + 1), children: [_jsx("span", { className: "qcell__num", children: i + 1 }), (p === 'saved' || p === 'saved_with_changes') && _jsx(Check, { className: "qcell__mark", size: 12, strokeWidth: 3, "aria-hidden": true }), flagged && _jsx(FlagIcon, { className: "qcell__flag", size: 11, strokeWidth: 2.5, "aria-hidden": true })] }) }, q.id));
            }) }) }));
}
function Legend() {
    return (_jsxs("ul", { className: "legend", "aria-label": "\u041F\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F", children: [_jsxs("li", { children: [_jsx("span", { className: "lg lg--current", "aria-hidden": true, children: "1" }), "\u041F\u043E\u0442\u043E\u0447\u043D\u0435"] }), _jsxs("li", { children: [_jsx("span", { className: "lg lg--saved", "aria-hidden": true, children: _jsx(Check, { size: 10, strokeWidth: 3 }) }), "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E"] }), _jsxs("li", { children: [_jsx("span", { className: "lg lg--draft", "aria-hidden": true }), " \u041D\u0435\u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0430 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430"] }), _jsxs("li", { children: [_jsx("span", { className: "lg", "aria-hidden": true }), " \u0411\u0435\u0437 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456"] }), _jsxs("li", { children: [_jsx("span", { className: "lg lg--flag", "aria-hidden": true, children: _jsx(FlagIcon, { size: 10, strokeWidth: 2.5 }) }), "\u041F\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u043E"] })] }));
}
export function ExamScreen(props) {
    const { attempt, pkg, baseDir, update, overlay } = props;
    const ordered = useMemo(() => orderedQuestions(pkg), [pkg]);
    const total = ordered.length;
    const position = Math.min(Math.max(props.position, 1), total);
    const q = ordered[position - 1];
    const headingRef = useRef(null);
    const firstRender = useRef(true);
    const [gridOpen, setGridOpen] = useState(false);
    // Маршрут → поточне питання у спробі (щоб «Продовжити» відкривало те саме місце).
    useEffect(() => {
        if (attempt.currentQuestionId !== q.id)
            update((a) => goTo(a, q.id));
    }, [q.id, attempt.currentQuestionId, update]);
    // Після зміни питання фокус переходить на заголовок без різкої прокрутки сторінки.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        const h = headingRef.current;
        if (!h)
            return;
        h.focus({ preventScroll: true });
        const top = h.getBoundingClientRect().top;
        if (top < 72 || top > window.innerHeight * 0.6)
            h.scrollIntoView({ block: 'start', behavior: 'auto' });
    }, [position]);
    const go = (n) => {
        if (n < 1 || n > total)
            return;
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
    const onChange = (v) => { update((a) => setDraft(a, q.id, v)); };
    const save = () => {
        if (!canSave)
            return;
        const next = update((a) => commitAnswer(a, q));
        if (next?.committedAnswers[q.id]) {
            if (position < total)
                go(position + 1);
        }
    };
    const locked = !!attempt.committedAnswers[q.id];
    const statusText = locked ? 'Відповідь збережено. Змінити її не можна.'
        : progress === 'saved_with_changes' ? 'Є незбережені зміни — збережіть, щоб вони зарахувалися'
            : progress === 'draft_only' ? 'Відповідь ще не збережено'
                : '';
    const headingId = `q-title-${q.id}`;
    const summary = summarize(attempt, ordered);
    return (_jsxs("div", { className: "exam", children: [_jsx(TimerAnnouncer, { deadlineAt: attempt.deadlineAt }), _jsxs("header", { className: "exam-bar", children: [_jsxs("div", { className: "exam-bar__title", children: [_jsx("span", { className: "exam-bar__name", children: pkg.simulation.title }), _jsx("span", { className: "exam-bar__subject", children: pkg.simulation.subject })] }), _jsxs("div", { className: "exam-bar__mobile", children: [_jsx(Timer, { deadlineAt: attempt.deadlineAt, compact: true }), _jsxs("button", { type: "button", className: "btn btn--ghost btn--sm", onClick: () => setGridOpen(true), "aria-haspopup": "dialog", children: [_jsx(Grid3x3, { size: 16, "aria-hidden": true }), " ", position, " / ", total] })] }), _jsxs("button", { type: "button", className: "btn btn--ghost btn--sm", onClick: props.openReference, children: [_jsx(BookOpen, { size: 18, "aria-hidden": true }), " ", _jsx("span", { className: "hide-xs", children: "\u0414\u043E\u0432\u0456\u0434\u043A\u043E\u0432\u0456 \u043C\u0430\u0442\u0435\u0440\u0456\u0430\u043B\u0438" }), _jsx("span", { className: "show-xs", children: "\u0414\u043E\u0432\u0456\u0434\u043D\u0438\u043A" })] })] }), _jsxs("div", { className: "exam-layout", children: [_jsxs("main", { className: "question-col", id: "main", children: [_jsxs("article", { className: "card question", "aria-labelledby": headingId, children: [_jsxs("div", { className: "question__head", children: [_jsxs("div", { children: [_jsxs("h1", { id: headingId, ref: headingRef, tabIndex: -1, className: "question__title", children: ["\u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F ", position, " ", _jsxs("span", { className: "question__of", children: ["\u0437 ", total] })] }), _jsxs("p", { className: "question__type", children: [TYPE_LABEL[q.type], " \u00B7 ", q.maxPoints, " ", q.maxPoints === 1 ? 'бал' : q.maxPoints < 5 ? 'бали' : 'балів'] })] }), _jsxs("button", { type: "button", className: `btn btn--flag btn--sm${flagged ? ' is-on' : ''}`, "aria-pressed": flagged, onClick: () => update((a) => toggleFlag(a, q.id)), children: [_jsx(Flag, { size: 16, "aria-hidden": true, fill: flagged ? 'currentColor' : 'none' }), _jsx("span", { children: flagged ? 'Позначено для перегляду' : 'Позначити для перегляду' })] })] }), _jsx(RichText, { text: q.statement, className: "question__statement" }), q.assets?.map((a) => _jsx(Figure, { asset: a, baseDir: baseDir }, a.id)), _jsxs("div", { className: "question__answer", children: [q.type === 'single_choice' && _jsx(SingleChoice, { q: q, value: value, onChange: onChange, labelledBy: headingId, disabled: locked }), q.type === 'matching' && _jsx(Matching, { q: q, value: value, onChange: onChange, disabled: locked }), q.type === 'numeric' && _jsx(Numeric, { q: q, value: value, onChange: onChange, onSubmit: save, disabled: locked }, q.id)] }), _jsxs("div", { className: "question__foot", children: [_jsxs("p", { className: `save-status save-status--${progress}`, role: "status", children: [statusText && (locked ? _jsx(Lock, { size: 16, "aria-hidden": true }) : progress !== 'empty' ? _jsx(PenLine, { size: 16, "aria-hidden": true }) : null), _jsx("span", { children: statusText }), q.type === 'matching' && progress !== 'empty' && _jsxs("span", { className: "save-status__extra", children: [" \u00B7 \u0437\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u043E ", filledPairs(value), " \u0437 ", q.matchingRows.length] })] }), !locked && (_jsx("button", { type: "button", className: "btn btn--primary", onClick: save, disabled: !canSave, children: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C" }))] })] }), _jsx("button", { type: "button", className: "btn btn--outline btn--block mobile-finish", onClick: props.requestFinish, children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0456\u044E" }), _jsxs("div", { className: "mobile-actions", role: "group", "aria-label": "\u041F\u0435\u0440\u0435\u0445\u0456\u0434 \u043C\u0456\u0436 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F\u043C\u0438", children: [_jsxs("button", { type: "button", className: "btn btn--ghost", onClick: () => go(position - 1), disabled: position <= 1, "aria-label": "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0454 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F", children: [_jsx(ChevronLeft, { size: 20, "aria-hidden": true }), " ", _jsx("span", { children: "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0454" })] }), _jsxs("span", { className: "mobile-actions__pos", "aria-hidden": true, children: [position, " / ", total] }), position < total ? (_jsxs("button", { type: "button", className: "btn btn--ghost", onClick: () => go(position + 1), "aria-label": "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0435 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F", children: [_jsx("span", { children: "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0435" }), " ", _jsx(ChevronRight, { size: 20, "aria-hidden": true })] })) : (_jsx("button", { type: "button", className: "btn btn--primary", onClick: props.requestFinish, children: _jsx("span", { children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438" }) }))] })] }), _jsx("aside", { className: "exam-side", "aria-label": "\u041D\u0430\u0432\u0456\u0433\u0430\u0446\u0456\u044F \u0442\u0430 \u0447\u0430\u0441", children: _jsxs("div", { className: "card side-card", children: [_jsx(Timer, { deadlineAt: attempt.deadlineAt }), _jsxs("p", { className: "side-card__saved", children: ["\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0435\u0439: ", _jsxs("strong", { children: [savedCount, " \u0456\u0437 ", total] })] }), _jsx(QuestionGrid, { attempt: attempt, ordered: ordered, current: position, onGo: go }), _jsx(Legend, {}), _jsxs("div", { className: "side-nav", children: [_jsx("button", { type: "button", className: "btn btn--ghost btn--icon", onClick: () => go(position - 1), disabled: position <= 1, "aria-label": "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0454 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F", title: "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0454", children: _jsx(ChevronLeft, { size: 20, "aria-hidden": true }) }), _jsxs("span", { className: "side-nav__pos", children: ["\u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F ", _jsx("strong", { children: position }), " \u0437 ", total] }), _jsx("button", { type: "button", className: "btn btn--ghost btn--icon", onClick: () => go(position + 1), disabled: position >= total, "aria-label": "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0435 \u0437\u0430\u0432\u0434\u0430\u043D\u043D\u044F", title: "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0435", children: _jsx(ChevronRight, { size: 20, "aria-hidden": true }) })] }), _jsx("button", { type: "button", className: "btn btn--outline btn--block", onClick: props.requestFinish, children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0456\u044E" })] }) })] }), _jsxs(Dialog, { open: gridOpen, onClose: () => setGridOpen(false), title: "\u0417\u0430\u0432\u0434\u0430\u043D\u043D\u044F", titleId: "grid-dialog-title", size: "sm", className: "dialog--sheet", children: [_jsx("div", { className: "sheet-timer", children: _jsx(Timer, { deadlineAt: attempt.deadlineAt }) }), _jsxs("p", { className: "side-card__saved", children: ["\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0435\u0439: ", _jsxs("strong", { children: [savedCount, " \u0456\u0437 ", total] })] }), _jsx(QuestionGrid, { attempt: attempt, ordered: ordered, current: position, onGo: go }), _jsx(Legend, {}), _jsx("button", { type: "button", className: "btn btn--outline btn--block", onClick: () => { setGridOpen(false); props.requestFinish(); }, children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0456\u044E" })] }), _jsx(FinishDialog, { open: overlay === 'finishConfirm', summary: summary, remaining: remainingMs(attempt, Date.now()), deadlineAt: attempt.deadlineAt, onCancel: props.closeOverlay, onConfirm: props.onFinish })] }));
}
