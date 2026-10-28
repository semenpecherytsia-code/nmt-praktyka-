import { useCallback, useEffect, useRef, useState } from 'react';
import { finishAttempt, isExpired } from '../engine/attempt';
import { KEYS } from '../engine/storage';
/**
 * Стан однієї спроби: кожна зміна одразу записується локально.
 * Одна активна вкладка: інша вкладка бачить попередження й може перехопити роботу.
 * Завершення за часом виконується рівно один раз (finishAttempt ідемпотентний,
 * а запис перевіряє ревізію).
 */
export function useAttempt(repo, lease, attemptId, pkg) {
    const [attempt, setAttempt] = useState(() => repo.get(attemptId));
    const ref = useRef(attempt);
    const [leaseState, setLeaseState] = useState('mine');
    const [conflict, setConflict] = useState(false);
    const reload = useCallback(() => {
        const a = repo.get(attemptId);
        ref.current = a;
        setAttempt(a);
    }, [repo, attemptId]);
    useEffect(() => { reload(); }, [reload]);
    const update = useCallback((fn) => {
        const prev = ref.current;
        if (!prev)
            return null;
        if (prev.status === 'active' && lease.state(prev.id) === 'other') {
            setLeaseState('other');
            return prev;
        }
        const next = fn(prev);
        if (next === prev)
            return prev;
        if (repo.save(next) === 'conflict') {
            setConflict(true);
            reload();
            return ref.current;
        }
        ref.current = next;
        setAttempt(next);
        return next;
    }, [repo, lease, reload]);
    // Оренда вкладки та синхронізація між вкладками.
    useEffect(() => {
        if (attempt?.status !== 'active')
            return;
        const id = attempt.id;
        const tick = () => {
            if (lease.state(id) === 'other')
                setLeaseState('other');
            else {
                lease.acquire(id);
                setLeaseState('mine');
            }
        };
        tick();
        const timer = window.setInterval(tick, 2000);
        const onStorage = (e) => {
            if (e.key === KEYS.attempt(id))
                reload();
            if (e.key === KEYS.lease(id))
                tick();
        };
        const onHide = () => lease.release(id);
        window.addEventListener('storage', onStorage);
        window.addEventListener('pagehide', onHide);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('pagehide', onHide);
            lease.release(id);
        };
    }, [attempt?.id, attempt?.status, lease, reload]);
    const takeOver = useCallback(() => {
        if (!ref.current)
            return;
        lease.acquire(ref.current.id, true);
        reload();
        setLeaseState('mine');
        setConflict(false);
    }, [lease, reload]);
    const finish = useCallback((reason, applyDrafts) => {
        if (!pkg)
            return null;
        return update((a) => finishAttempt(a, pkg, { now: Date.now(), reason, applyDrafts }));
    }, [pkg, update]);
    // Автоматичне завершення за абсолютним дедлайном (також після повернення у фонову вкладку).
    useEffect(() => {
        if (attempt?.status !== 'active' || !pkg)
            return;
        const check = () => {
            const a = ref.current;
            if (a && isExpired(a, Date.now()) && lease.state(a.id) !== 'other')
                finish('timeout', true);
        };
        check();
        const t = window.setInterval(check, 500);
        document.addEventListener('visibilitychange', check);
        return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', check); };
    }, [attempt?.status, pkg, finish, lease]);
    return { attempt, update, finish, leaseState, takeOver, conflict, dismissConflict: () => setConflict(false) };
}
