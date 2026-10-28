// Рушій спроби: чисті функції без React і без сховища.
// Час завжди рахується від абсолютних startedAt / deadlineAt.
import { answersEqual, checkAnswer, isEmptyAnswer } from './answers';
import { scoreAttempt } from './scoring';
export function newAttemptId(now) {
    const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `a${now.toString(36)}${rnd}`;
}
export function createAttempt(pkg, now, id = newAttemptId(now)) {
    const sim = pkg.simulation;
    return {
        id,
        simulationId: sim.id,
        contentVersion: sim.version,
        startedAt: now,
        deadlineAt: now + sim.durationSeconds * 1000,
        draftAnswers: {},
        committedAnswers: {},
        flaggedQuestionIds: [],
        currentQuestionId: sim.orderedQuestionIds[0],
        status: 'active',
        finishedAt: null,
        finishReason: null,
        appliedDraftIds: [],
        result: null,
        revision: 0,
    };
}
export function remainingMs(a, now) {
    return Math.max(0, a.deadlineAt - now);
}
export function isExpired(a, now) {
    return a.status === 'active' && now >= a.deadlineAt;
}
function guard(a) {
    if (a.status !== 'active')
        throw new Error('Завершену спробу змінювати не можна');
}
function bump(a, patch) {
    return { ...a, ...patch, revision: a.revision + 1 };
}
/** Чернетка для питання без збереженої відповіді. */
export function setDraft(a, questionId, value) {
    guard(a);
    // Збережену відповідь змінити не можна до кінця симуляції.
    if (a.committedAnswers[questionId])
        return a;
    const drafts = { ...a.draftAnswers };
    if (answersEqual(value, a.committedAnswers[questionId]))
        delete drafts[questionId];
    else
        drafts[questionId] = value;
    return bump(a, { draftAnswers: drafts });
}
export function commitAnswer(a, q) {
    guard(a);
    const draft = a.draftAnswers[q.id];
    if (a.committedAnswers[q.id] || !draft || !checkAnswer(q, draft).valid)
        return a;
    const drafts = { ...a.draftAnswers };
    delete drafts[q.id];
    return bump(a, { committedAnswers: { ...a.committedAnswers, [q.id]: draft }, draftAnswers: drafts });
}
export function toggleFlag(a, questionId) {
    guard(a);
    const has = a.flaggedQuestionIds.includes(questionId);
    return bump(a, { flaggedQuestionIds: has ? a.flaggedQuestionIds.filter((x) => x !== questionId) : [...a.flaggedQuestionIds, questionId] });
}
export function goTo(a, questionId) {
    if (a.status !== 'active' || a.currentQuestionId === questionId)
        return a;
    return bump(a, { currentQuestionId: questionId });
}
/** Поточний вигляд відповіді: чернетка, якщо є, інакше збережена. */
export function visibleAnswer(a, questionId) {
    return a.draftAnswers[questionId] ?? a.committedAnswers[questionId];
}
export function questionProgress(a, qid) {
    const committed = a.committedAnswers[qid];
    const draft = a.draftAnswers[qid];
    const hasDraft = !!draft && !answersEqual(draft, committed);
    if (committed)
        return hasDraft ? 'saved_with_changes' : 'saved';
    return hasDraft && !isEmptyAnswer(draft) ? 'draft_only' : 'empty';
}
/** Кожне питання потрапляє рівно в одну з категорій saved / draftOnly / empty — без подвійного підрахунку. */
export function summarize(a, ordered) {
    const s = { total: ordered.length, saved: 0, empty: 0, draftOnly: 0, savedWithChanges: 0, applicableDrafts: 0, invalidDrafts: 0 };
    for (const q of ordered) {
        const p = questionProgress(a, q.id);
        if (p === 'saved')
            s.saved++;
        else if (p === 'saved_with_changes') {
            s.saved++;
            s.savedWithChanges++;
        }
        else if (p === 'draft_only')
            s.draftOnly++;
        else
            s.empty++;
        if (p === 'saved_with_changes' || p === 'draft_only') {
            if (checkAnswer(q, a.draftAnswers[q.id]).valid)
                s.applicableDrafts++;
            else
                s.invalidDrafts++;
        }
    }
    return s;
}
/**
 * Завершення. Ідемпотентне: повторний виклик для завершеної спроби повертає її без змін.
 * applyDrafts = true — коректні чернетки замінюють збережені відповіді.
 * Правило для завершення за часом (оголошене на стартовому екрані): коректні чернетки зараховуються.
 */
export function finishAttempt(a, pkg, opts) {
    if (a.status === 'finished')
        return a;
    const byId = new Map(pkg.questions.map((q) => [q.id, q]));
    const ordered = pkg.simulation.orderedQuestionIds.map((id) => byId.get(id));
    const final = { ...a.committedAnswers };
    const applied = [];
    if (opts.applyDrafts) {
        for (const q of ordered) {
            const d = a.draftAnswers[q.id];
            if (d && !answersEqual(d, final[q.id]) && checkAnswer(q, d).valid) {
                final[q.id] = d;
                applied.push(q.id);
            }
        }
    }
    const table = pkg.simulation.conversionTableId
        ? pkg.conversionTables?.find((t) => t.id === pkg.simulation.conversionTableId) ?? null
        : null;
    const finishedAt = Math.min(opts.now, a.deadlineAt);
    return bump(a, {
        status: 'finished',
        finishedAt,
        finishReason: opts.reason,
        committedAnswers: final,
        appliedDraftIds: applied,
        result: scoreAttempt(ordered, final, table),
    });
}
/** «Почати заново»: незавершена спроба позначається покинутою (не видаляється й не оцінюється). */
export function abandonAttempt(a) {
    if (a.status !== 'active')
        return a;
    return bump(a, { status: 'abandoned' });
}
export function timeSpentMs(a) {
    const end = a.finishedAt ?? a.deadlineAt;
    return Math.max(0, Math.min(end, a.deadlineAt) - a.startedAt);
}
export function orderedQuestions(pkg) {
    const byId = new Map(pkg.questions.map((q) => [q.id, q]));
    return pkg.simulation.orderedQuestionIds.map((id) => byId.get(id));
}
