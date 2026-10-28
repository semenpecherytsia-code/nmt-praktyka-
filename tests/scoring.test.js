import { describe, expect, it } from 'vitest';
import { scoreAttempt, scoreQuestion } from '../src/engine/scoring';
import { demoPackage } from './helpers';
const pkg = demoPackage();
const byId = new Map(pkg.questions.map((q) => [q.id, q]));
const ordered = pkg.simulation.orderedQuestionIds.map((id) => byId.get(id));
function perfectAnswers() {
    const out = {};
    for (const q of ordered) {
        if (q.type === 'single_choice')
            out[q.id] = { type: 'single_choice', optionId: q.answerKey.optionId };
        if (q.type === 'matching')
            out[q.id] = { type: 'matching', pairs: { ...q.answerKey.pairs } };
        if (q.type === 'numeric')
            out[q.id] = { type: 'numeric', raw: q.answerKey.value };
    }
    return out;
}
describe('оцінювання', () => {
    it('профіль 15 + 3 + 4 дає максимум 32 при повністю правильних відповідях', () => {
        const r = scoreAttempt(ordered, perfectAnswers(), null);
        expect(r.max).toBe(32);
        expect(r.primary).toBe(32);
        expect(r.percent).toBe(100);
        expect(r.counts).toEqual({ correct: 22, partial: 0, wrong: 0, skipped: 0 });
    });
    it('нуль балів і 22 пропуски, якщо відповідей немає', () => {
        const r = scoreAttempt(ordered, {}, null);
        expect(r.primary).toBe(0);
        expect(r.counts.skipped).toBe(22);
        expect(r.counts.wrong).toBe(0);
        expect(r.scaled).toBeNull();
    });
    it('відповідності: 0, 1, 2 або 3 бали; неповна відповідь не повна', () => {
        const q = byId.get('nmt23-q16');
        const [r1, r2, r3] = q.matchingRows.map((r) => r.id);
        const k = q.answerKey.pairs;
        const wrong = q.matchingOptions.find((o) => !Object.values(k).includes(o.id)).id;
        const s = (pairs) => scoreQuestion(q, 16, { type: 'matching', pairs });
        expect(s({ [r1]: wrong, [r2]: wrong, [r3]: null })).toMatchObject({ earned: 0, status: 'wrong' });
        expect(s({ [r1]: k[r1], [r2]: null, [r3]: null })).toMatchObject({ earned: 1, status: 'partial' });
        expect(s({ [r1]: k[r1], [r2]: k[r2], [r3]: wrong })).toMatchObject({ earned: 2, status: 'partial' });
        expect(s({ [r1]: k[r1], [r2]: k[r2], [r3]: k[r3] })).toMatchObject({ earned: 3, status: 'correct' });
        expect(s({ [r1]: null, [r2]: null, [r3]: null })).toMatchObject({ earned: 0, status: 'skipped' });
    });
    it('числова відповідь: 2 або 0, нуль — повноцінна відповідь', () => {
        const q = byId.get('nmt23-q19');
        expect(scoreQuestion(q, 19, { type: 'numeric', raw: '6,0' }).earned).toBe(2);
        expect(scoreQuestion(q, 19, { type: 'numeric', raw: '0' })).toMatchObject({ earned: 0, status: 'wrong' });
        expect(scoreQuestion(q, 19, { type: 'numeric', raw: '' })).toMatchObject({ earned: 0, status: 'skipped' });
    });
    it('використовує таблицю переведення лише з даних', () => {
        const map = {};
        for (let i = 0; i <= 32; i++)
            map[String(i)] = i < 5 ? null : 100 + Math.round(i * 3);
        const r = scoreAttempt(ordered, perfectAnswers(), { id: 't', year: 2026, source: 'тест', maxPrimary: 32, map });
        expect(r.scaled).toEqual({ value: 196, year: 2026, tableId: 't', source: 'тест' });
        const low = scoreAttempt(ordered, {}, { id: 't', year: 2026, source: 'тест', maxPrimary: 32, map });
        expect(low.scaled?.value).toBeNull();
    });
});
