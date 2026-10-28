import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_CONFIG } from './config';
import { loadAll } from './content/load';
import { abandonAttempt, createAttempt, finishAttempt, isExpired } from './engine/attempt';
import { AttemptRepo, browserKV, TabLease } from './engine/storage';
import { navigate, useRoute } from './router';
import { overlayTransition, resolveScreen } from './machine';
import { StartScreen } from './ui/StartScreen';
import { ExamScreen } from './ui/ExamScreen';
import { ReviewScreen } from './ui/ReviewScreen';
import { ReferenceModal } from './ui/ReferenceModal';
import { SelectorModal } from './ui/SelectorModal';
import { useAttempt } from './ui/useAttempt';
import { AlertTriangle } from 'lucide-react';
const kv = browserKV();
const repo = new AttemptRepo(kv);
const tabId = (() => { try {
    return crypto.randomUUID();
}
catch {
    return Math.random().toString(36).slice(2);
} })();
const lease = new TabLease(kv, tabId);
function Brand() {
    return (_jsxs("a", { className: "brand", href: "#/", "aria-label": `${APP_CONFIG.appName} — на головну`, children: [_jsxs("svg", { width: "28", height: "28", viewBox: "0 0 32 32", "aria-hidden": true, children: [_jsx("rect", { width: "32", height: "32", rx: "9", fill: "var(--accent)" }), _jsx("path", { d: "M9 22V10l7 8 7-8v12", stroke: "#fff", strokeWidth: "3", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { children: APP_CONFIG.appName })] }));
}
/** Завершує прострочені спроби (наприклад, якщо вкладку закрили до кінця часу). Рівно один раз завдяки перевірці ревізії. */
function finishExpired(sets) {
    const now = Date.now();
    for (const a of repo.list()) {
        if (!isExpired(a, now) || lease.state(a.id) === 'other')
            continue;
        const pkg = contentFor(a, sets);
        if (pkg)
            repo.save(finishAttempt(a, pkg, { now, reason: 'timeout', applyDrafts: true }));
    }
}
/** Версія завдань і ключів, з якою спробу розпочато (знімок), або поточна, якщо версія збігається. */
function contentFor(a, sets) {
    const snap = repo.getSnapshot(a.simulationId, a.contentVersion);
    if (snap)
        return snap;
    const cur = sets.find((s) => s.pkg?.simulation.id === a.simulationId)?.pkg;
    return cur && cur.simulation.version === a.contentVersion ? cur : null;
}
export function App() {
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const route = useRoute();
    useEffect(() => {
        loadAll().then((d) => { finishExpired(d.sets); setData(d); }).catch((e) => setLoadError(String(e?.message ?? e)));
    }, []);
    useEffect(() => { document.title = APP_CONFIG.appName; }, []);
    if (loadError)
        return _jsx(Fatal, { text: `Не вдалося завантажити каталог наборів (${loadError}).` });
    if (!data)
        return _jsxs("div", { className: "app", children: [_jsx("div", { className: "topstrip", children: _jsx(Brand, {}) }), _jsx("p", { className: "loading", role: "status", children: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026" })] });
    return _jsx(Routed, { data: data, route: route });
}
function Fatal({ text }) {
    return (_jsxs("div", { className: "app", children: [_jsx("div", { className: "topstrip", children: _jsx(Brand, {}) }), _jsx("main", { className: "start", id: "main", children: _jsxs("div", { className: "card start-card", children: [_jsxs("div", { className: "notice notice--warn", children: [_jsx(AlertTriangle, { size: 18, "aria-hidden": true }), _jsx("p", { children: text })] }), _jsx("button", { type: "button", className: "btn btn--primary", onClick: () => navigate({ name: 'home' }), children: "\u041D\u0430 \u043F\u043E\u0447\u0430\u0442\u043E\u043A" })] }) })] }));
}
function Routed({ data, route }) {
    if (route.name === 'home')
        return _jsx(Home, { data: data, simulationId: route.simulationId });
    return _jsx(AttemptView, { data: data, route: route }, route.attemptId);
}
function useOverlay(screen) {
    const [overlay, setOverlay] = useState('none');
    const send = useCallback((ev) => setOverlay((cur) => overlayTransition(screen, cur, ev)), [screen]);
    return [overlay, send];
}
function Home({ data, simulationId }) {
    const prefs = repo.prefs();
    // Поки є незавершена спроба, головна завжди показує саме її симуляцію.
    const running = repo.list().find((a) => a.status === 'active' && !isExpired(a, Date.now()) && data.sets.some((s) => s.entry.id === a.simulationId && s.pkg));
    const requested = running?.simulationId ?? simulationId ?? prefs.selectedSimulationId ?? data.catalog.defaultSimulationId;
    const set = data.sets.find((s) => s.entry.id === requested) ?? data.sets.find((s) => s.entry.id === data.catalog.defaultSimulationId);
    const [overlay, send] = useOverlay('prepare');
    const [now, setNow] = useState(Date.now());
    const [, force] = useState(0);
    useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
    useEffect(() => {
        const on = () => force((x) => x + 1);
        window.addEventListener('storage', on);
        return () => window.removeEventListener('storage', on);
    }, []);
    const simId = set.entry.id;
    const active = set.pkg ? repo.activeFor(simId) : null;
    const activeValid = active && !isExpired(active, now) ? active : null;
    if (active && !activeValid)
        finishExpired(data.sets);
    const finished = repo.finishedFor(simId);
    const available = data.sets.filter((s) => s.status === 'available');
    const demoId = data.catalog.demoSimulationId && available.some((s) => s.entry.id === data.catalog.demoSimulationId) ? data.catalog.demoSimulationId : null;
    const pick = (id) => {
        if (running)
            return;
        repo.setPrefs({ selectedSimulationId: id });
        send({ type: 'CLOSE' });
        navigate({ name: 'home', simulationId: id });
    };
    const start = () => {
        if (!set.pkg)
            return;
        const existing = repo.activeFor(simId);
        if (existing && !isExpired(existing, Date.now()))
            return navigate({ name: 'attempt', attemptId: existing.id, position: 1 });
        repo.saveSnapshot(set.pkg);
        const a = createAttempt(set.pkg, Date.now());
        repo.save(a);
        repo.setPrefs({ selectedSimulationId: simId });
        lease.acquire(a.id, true);
        navigate({ name: 'attempt', attemptId: a.id, position: 1 });
    };
    const restart = () => {
        const cur = repo.activeFor(simId);
        if (cur) {
            if (lease.state(cur.id) === 'other') {
                alert('Цю спробу відкрито в іншій вкладці. Закрийте її або продовжіть там.');
                return;
            }
            repo.save(abandonAttempt(cur));
        }
        start();
    };
    const finishActive = () => {
        const cur = repo.activeFor(simId);
        if (!cur)
            return;
        if (lease.state(cur.id) === 'other') {
            alert('Цю спробу відкрито в іншій вкладці. Завершіть її там.');
            return;
        }
        const pkg = contentFor(cur, data.sets);
        if (!pkg)
            return;
        repo.save(finishAttempt(cur, pkg, { now: Date.now(), reason: 'manual', applyDrafts: true }));
        navigate({ name: 'review', attemptId: cur.id });
    };
    const material = set.pkg?.referenceMaterials.find((r) => r.id === set.pkg.simulation.referenceMaterialId) ?? null;
    return (_jsxs("div", { className: "app", children: [_jsx("div", { className: "topstrip", children: _jsx(Brand, {}) }), _jsx(StartScreen, { set: set, active: activeValid, finished: finished, availableCount: available.length, demoId: demoId, now: now, onStart: start, onRestart: restart, onFinish: finishActive, onContinue: () => activeValid && navigate({ name: 'attempt', attemptId: activeValid.id, position: 0 }), onOpenSelector: () => send({ type: 'OPEN_SELECTOR' }), onOpenReference: () => send({ type: 'OPEN_REFERENCE' }), onOpenDemo: () => demoId && pick(demoId), onOpenReview: (id) => navigate({ name: 'review', attemptId: id }) }), _jsx(SelectorModal, { open: overlay === 'selector', onClose: () => send({ type: 'CLOSE' }), sets: data.sets, currentId: simId, onPick: pick }), set.pkg && _jsx(ReferenceModal, { open: overlay === 'reference', onClose: () => send({ type: 'CLOSE' }), material: material, baseDir: set.baseDir })] }));
}
function AttemptView({ data, route }) {
    const stored = useMemo(() => repo.get(route.attemptId), [route.attemptId]);
    const pkg = useMemo(() => (stored ? contentFor(stored, data.sets) : null), [stored, data.sets]);
    const { attempt, update, finish, leaseState, takeOver, conflict, dismissConflict } = useAttempt(repo, lease, route.attemptId, pkg);
    const set = data.sets.find((s) => s.entry.id === attempt?.simulationId);
    const { screen, redirect } = resolveScreen(route, attempt);
    const [overlay, send] = useOverlay(screen === 'review' ? 'review' : 'active');
    useEffect(() => { if (redirect)
        navigate(redirect, true); }, [redirect?.name, route.attemptId]); // eslint-disable-line react-hooks/exhaustive-deps
    // Після перезавантаження відкривається те питання, на якому зупинилися.
    useEffect(() => {
        if (route.name === 'attempt' && route.position === 0 && attempt && pkg && attempt.status === 'active') {
            const pos = pkg.simulation.orderedQuestionIds.indexOf(attempt.currentQuestionId) + 1;
            navigate({ name: 'attempt', attemptId: attempt.id, position: Math.max(1, pos) }, true);
        }
    }, [route, attempt, pkg]);
    if (!attempt || screen === 'not_found')
        return _jsx(Fatal, { text: "\u0421\u043F\u0440\u043E\u0431\u0443 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u0446\u044C\u043E\u043C\u0443 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0456." });
    if (!pkg)
        return _jsx(Fatal, { text: "\u0412\u0435\u0440\u0441\u0456\u044E \u0437\u0430\u0432\u0434\u0430\u043D\u044C, \u0437 \u044F\u043A\u043E\u044E \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E \u0446\u044E \u0441\u043F\u0440\u043E\u0431\u0443, \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u043F\u0435\u0440\u0435\u043E\u0446\u0456\u043D\u044E\u0454\u0442\u044C\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E." });
    const baseDir = set?.baseDir ?? '';
    const material = pkg.referenceMaterials.find((r) => r.id === pkg.simulation.referenceMaterialId) ?? null;
    if (screen === 'review' && attempt.status === 'finished') {
        const retry = set?.pkg ? () => {
            const existing = repo.activeFor(attempt.simulationId);
            if (existing && !isExpired(existing, Date.now()))
                return navigate({ name: 'attempt', attemptId: existing.id, position: 0 });
            repo.saveSnapshot(set.pkg);
            const a = createAttempt(set.pkg, Date.now());
            repo.save(a);
            lease.acquire(a.id, true);
            navigate({ name: 'attempt', attemptId: a.id, position: 1 });
        } : null;
        return (_jsxs("div", { className: "app", children: [_jsx("div", { className: "topstrip", children: _jsx(Brand, {}) }), _jsx(ReviewScreen, { attempt: attempt, pkg: pkg, baseDir: baseDir, videoMap: set?.videoMap ?? null, onRetry: retry, onHome: () => navigate({ name: 'home', simulationId: attempt.simulationId }), history: repo.finishedFor(attempt.simulationId), onOpenAttempt: (id) => navigate({ name: 'review', attemptId: id }) })] }));
    }
    if (attempt.status !== 'active' || route.name !== 'attempt')
        return _jsx("div", { className: "app", children: _jsx("p", { className: "loading", role: "status", children: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026" }) });
    return (_jsxs("div", { className: "app app--exam", children: [_jsx("div", { className: "topstrip topstrip--exam", children: _jsx(Brand, {}) }), leaseState === 'other' && (_jsx("div", { className: "takeover", role: "alertdialog", "aria-labelledby": "takeover-title", "aria-describedby": "takeover-text", children: _jsxs("div", { className: "card takeover__card", children: [_jsx("h2", { id: "takeover-title", children: "\u0421\u043F\u0440\u043E\u0431\u0443 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E \u0432 \u0456\u043D\u0448\u0456\u0439 \u0432\u043A\u043B\u0430\u0434\u0446\u0456" }), _jsx("p", { id: "takeover-text", children: "\u0429\u043E\u0431 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456 \u043D\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0443\u0432\u0430\u043B\u0438 \u043E\u0434\u043D\u0430 \u043E\u0434\u043D\u0443, \u043F\u0440\u0430\u0446\u044E\u0432\u0430\u0442\u0438 \u043C\u043E\u0436\u043D\u0430 \u043B\u0438\u0448\u0435 \u0432 \u043E\u0434\u043D\u0456\u0439 \u0432\u043A\u043B\u0430\u0434\u0446\u0456. \u0427\u0430\u0441 \u0456\u0434\u0435 \u0432 \u0431\u0443\u0434\u044C-\u044F\u043A\u043E\u043C\u0443 \u0440\u0430\u0437\u0456." }), _jsxs("div", { className: "start-card__actions", children: [_jsx("button", { type: "button", className: "btn btn--primary", onClick: takeOver, children: "\u041F\u0440\u0430\u0446\u044E\u0432\u0430\u0442\u0438 \u0442\u0443\u0442" }), _jsx("button", { type: "button", className: "btn btn--ghost", onClick: () => navigate({ name: 'home', simulationId: attempt.simulationId }), children: "\u041D\u0430 \u043F\u043E\u0447\u0430\u0442\u043E\u043A" })] })] }) })), conflict && (_jsxs("div", { className: "notice notice--warn notice--floating", role: "alert", children: [_jsx(AlertTriangle, { size: 18, "aria-hidden": true }), _jsx("p", { children: "\u0421\u043F\u0440\u043E\u0431\u0443 \u0437\u043C\u0456\u043D\u0435\u043D\u043E \u0432 \u0456\u043D\u0448\u0456\u0439 \u0432\u043A\u043B\u0430\u0434\u0446\u0456 \u2014 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0438\u0439 \u0441\u0442\u0430\u043D." }), _jsx("button", { type: "button", className: "btn btn--ghost btn--sm", onClick: dismissConflict, children: "\u0417\u0440\u043E\u0437\u0443\u043C\u0456\u043B\u043E" })] })), _jsx(ExamScreen, { attempt: attempt, pkg: pkg, baseDir: baseDir, position: route.position, update: update, overlay: overlay, onFinish: (applyDrafts) => {
                    const done = finish('manual', applyDrafts);
                    send({ type: 'CLOSE' });
                    if (done?.status === 'finished')
                        navigate({ name: 'review', attemptId: done.id }, true);
                }, openReference: () => send({ type: 'OPEN_REFERENCE' }), requestFinish: () => send({ type: 'REQUEST_FINISH' }), closeOverlay: () => send({ type: 'CLOSE' }), hasReference: !!material }), _jsx(ReferenceModal, { open: overlay === 'reference', onClose: () => send({ type: 'CLOSE' }), material: material, baseDir: baseDir })] }));
}
