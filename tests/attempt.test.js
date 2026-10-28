import { describe, expect, it } from 'vitest';
import { commitAnswer, createAttempt, finishAttempt, isExpired, remainingMs, setDraft, summarize, toggleFlag, visibleAnswer, goTo, orderedQuestions, timeSpentMs } from '../src/engine/attempt';
import { AttemptRepo, memoryKV, TabLease, LEASE_TTL_MS } from '../src/engine/storage';
import { demoPackage } from './helpers';
const pkg = demoPackage();
const qs = orderedQuestions(pkg);
const T0 = Date.UTC(2026, 9, 1, 10, 0, 0);
describe('дедлайн і час', () => {
    it('90 хвилин від старту, залишок рахується від абсолютного часу', () => {
        const a = createAttempt(pkg, T0);
        expect(a.deadlineAt - a.startedAt).toBe(90 * 60 * 1000);
        expect(remainingMs(a, T0 + 60_000)).toBe(89 * 60 * 1000);
        // «Перезавантаження» через 2 години не дає зайвого часу
        expect(remainingMs(a, T0 + 2 * 3600_000)).toBe(0);
        expect(isExpired(a, a.deadlineAt)).toBe(true);
        expect(isExpired(a, a.deadlineAt - 1)).toBe(false);
    });
});
describe('чернетки та збереження', () => {
    it('чернетка не є збереженою відповіддю і переживає перехід', () => {
        let a = createAttempt(pkg, T0);
        a = setDraft(a, 'nmt23-q01', { type: 'single_choice', optionId: 'nmt23-q01-o3' });
        expect(a.committedAnswers['nmt23-q01']).toBeUndefined();
        a = goTo(a, 'nmt23-q05');
        a = goTo(a, 'nmt23-q01');
        expect(visibleAnswer(a, 'nmt23-q01')).toEqual({ type: 'single_choice', optionId: 'nmt23-q01-o3' });
        a = commitAnswer(a, qs[0]);
        expect(a.committedAnswers['nmt23-q01']).toEqual({ type: 'single_choice', optionId: 'nmt23-q01-o3' });
        expect(a.draftAnswers['nmt23-q01']).toBeUndefined();
    });
    it('некоректне число не зберігається', () => {
        let a = createAttempt(pkg, T0);
        const q = qs[18];
        a = setDraft(a, q.id, { type: 'numeric', raw: '2+2' });
        a = commitAnswer(a, q);
        expect(a.committedAnswers[q.id]).toBeUndefined();
    });
    it('підсумок без подвійного підрахунку', () => {
        let a = createAttempt(pkg, T0);
        a = setDraft(a, qs[0].id, { type: 'single_choice', optionId: qs[0].type === 'single_choice' ? qs[0].options[0].id : '' });
        a = commitAnswer(a, qs[0]); // збережено
        a = setDraft(a, qs[1].id, { type: 'single_choice', optionId: 'nmt23-q02-o1' });
        a = commitAnswer(a, qs[1]);
        a = setDraft(a, qs[1].id, { type: 'single_choice', optionId: 'nmt23-q02-o2' }); // збережену змінити не можна
        expect(a.committedAnswers[qs[1].id]).toEqual({ type: 'single_choice', optionId: 'nmt23-q02-o1' });
        expect(a.draftAnswers[qs[1].id]).toBeUndefined();
        a = setDraft(a, qs[18].id, { type: 'numeric', raw: 'abc' }); // некоректна чернетка
        a = setDraft(a, qs[19].id, { type: 'numeric', raw: '1,5' }); // коректна чернетка
        a = toggleFlag(a, qs[3].id);
        const s = summarize(a, qs);
        expect(s).toEqual({ total: 22, saved: 2, empty: 18, draftOnly: 2, savedWithChanges: 0, applicableDrafts: 1, invalidDrafts: 1 });
        expect(s.saved + s.empty + s.draftOnly).toBe(22);
    });
});
describe('завершення', () => {
    it('ідемпотентне: повторне завершення не змінює результат', () => {
        let a = createAttempt(pkg, T0);
        a = setDraft(a, 'nmt23-q19', { type: 'numeric', raw: '-3' });
        const f1 = finishAttempt(a, pkg, { now: T0 + 1000, reason: 'manual', applyDrafts: false });
        const f2 = finishAttempt(f1, pkg, { now: T0 + 5000, reason: 'timeout', applyDrafts: true });
        expect(f2).toBe(f1);
        expect(f1.result.primary).toBe(0);
        expect(() => setDraft(f1, 'nmt23-q01', { type: 'single_choice', optionId: 'nmt23-q01-o1' })).toThrow();
    });
    it('за часом зараховує коректні чернетки, некоректні — ні', () => {
        let a = createAttempt(pkg, T0);
        a = setDraft(a, 'nmt23-q19', { type: 'numeric', raw: ' 6 ' });
        a = setDraft(a, 'nmt23-q20', { type: 'numeric', raw: '1.5.' });
        const f = finishAttempt(a, pkg, { now: a.deadlineAt + 3600_000, reason: 'timeout', applyDrafts: true });
        expect(f.result.primary).toBe(2);
        expect(f.appliedDraftIds).toEqual(['nmt23-q19']);
        expect(f.finishedAt).toBe(a.deadlineAt);
        expect(timeSpentMs(f)).toBe(90 * 60 * 1000);
    });
});
describe('сховище і вкладки', () => {
    it('нова спроба не перезаписує попередній результат', () => {
        const repo = new AttemptRepo(memoryKV());
        const a1 = finishAttempt(createAttempt(pkg, T0, 'a1'), pkg, { now: T0 + 10, reason: 'manual', applyDrafts: false });
        expect(repo.save(a1)).toBe('ok');
        const a2 = createAttempt(pkg, T0 + 100, 'a2');
        repo.save(setDraft(a2, 'nmt23-q01', { type: 'single_choice', optionId: 'nmt23-q01-o1' }));
        expect(repo.finishedFor('nmt-23').map((a) => a.id)).toEqual(['a1']);
        expect(repo.activeFor('nmt-23').id).toBe('a2');
    });
    it('застаріла ревізія з іншої вкладки дає конфлікт, а не тихий перезапис', () => {
        const repo = new AttemptRepo(memoryKV());
        const base = createAttempt(pkg, T0, 'x');
        const tabA = setDraft(base, 'nmt23-q01', { type: 'single_choice', optionId: 'nmt23-q01-o1' });
        const tabB = setDraft(base, 'nmt23-q01', { type: 'single_choice', optionId: 'nmt23-q01-o2' });
        expect(repo.save(tabA)).toBe('ok');
        expect(repo.save(tabB)).toBe('conflict');
        const finished = finishAttempt(tabA, pkg, { now: T0 + 5, reason: 'manual', applyDrafts: false });
        expect(repo.save(finished)).toBe('ok');
        expect(repo.save(finished)).toBe('ok'); // повторне збереження того самого результату
        expect(repo.save(setDraft(tabA, 'nmt23-q02', { type: 'single_choice', optionId: 'nmt23-q02-o1' }))).toBe('conflict');
        expect(repo.list()).toHaveLength(1);
    });
    it('оренда вкладки', () => {
        const kv = memoryKV();
        let now = T0;
        const a = new TabLease(kv, 'A', () => now);
        const b = new TabLease(kv, 'B', () => now);
        expect(a.acquire('x')).toBe(true);
        expect(b.state('x')).toBe('other');
        expect(b.acquire('x')).toBe(false);
        now += LEASE_TTL_MS + 1;
        expect(b.acquire('x')).toBe(true);
        expect(a.state('x')).toBe('other');
        expect(a.acquire('x', true)).toBe(true);
    });
});
