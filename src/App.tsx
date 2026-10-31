import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_CONFIG } from './config';
import { loadAll, type LoadedSet } from './content/load';
import type { Catalog, ContentPackage } from './content/types';
import { abandonAttempt, createAttempt, finishAttempt, isExpired, type Attempt } from './engine/attempt';
import { AttemptRepo, browserKV, TabLease } from './engine/storage';
import { navigate, routeHref, useRoute, type Route } from './router';
import { overlayTransition, resolveScreen, type Overlay, type OverlayEvent } from './machine';
import { StartScreen } from './ui/StartScreen';
import { ExamScreen } from './ui/ExamScreen';
import { ReviewScreen } from './ui/ReviewScreen';
import { ReferenceModal } from './ui/ReferenceModal';
import { SelectorModal } from './ui/SelectorModal';
import { useAttempt } from './ui/useAttempt';
import { AlertTriangle } from 'lucide-react';
import { cloudEnabled, markOwner, signIn, syncResults, useAuth } from './cloud/cloud';
import { Account } from './ui/Account';
import { AdminScreen } from './ui/AdminScreen';
import { EditScreen } from './ui/EditScreen';

const kv = browserKV();
const repo = new AttemptRepo(kv);
const tabId = (() => { try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); } })();
const lease = new TabLease(kv, tabId);

interface Data { catalog: Catalog; sets: LoadedSet[] }

function Top({ exam = false }: { exam?: boolean }) {
  return <div className={`topstrip${exam ? ' topstrip--exam' : ''}`}><Brand /><Account compact={exam} /></div>;
}

function Brand() {
  return (
    <a className="brand" data-link href={routeHref({ name: 'home' })} aria-label={`${APP_CONFIG.appName} — на головну`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="9" fill="var(--accent)" /><path d="M9 22V10l7 8 7-8v12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span>{APP_CONFIG.appName}</span>
    </a>
  );
}

/** Завершує прострочені спроби (наприклад, якщо вкладку закрили до кінця часу). Рівно один раз завдяки перевірці ревізії. */
function finishExpired(sets: LoadedSet[]) {
  const now = Date.now();
  for (const a of repo.list()) {
    if (!isExpired(a, now) || lease.state(a.id) === 'other') continue;
    const pkg = contentFor(a, sets);
    if (pkg) repo.save(finishAttempt(a, pkg, { now, reason: 'timeout', applyDrafts: true }));
  }
}

/** Версія завдань і ключів, з якою спробу розпочато (знімок), або поточна, якщо версія збігається. */
function contentFor(a: Attempt, sets: LoadedSet[]): ContentPackage | null {
  const snap = repo.getSnapshot(a.simulationId, a.contentVersion);
  if (snap) return snap;
  const cur = sets.find((s) => s.pkg?.simulation.id === a.simulationId)?.pkg;
  return cur && cur.simulation.version === a.contentVersion ? cur : null;
}

export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const route = useRoute();

  useEffect(() => {
    loadAll().then((d) => { finishExpired(d.sets); setData(d); }).catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);

  useEffect(() => { document.title = APP_CONFIG.appName; }, []);

  // Завершені спроби учня надсилаються в базу після входу й після кожного завершення.
  const auth = useAuth();
  useEffect(() => {
    if (!data || !auth.user) return;
    const titleOf = (id: string) => data.sets.find((x) => x.entry.id === id)?.entry.title ?? null;
    void syncResults(repo, kv, titleOf);
  }, [data, auth.user?.id, route]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <Fatal text={`Не вдалося завантажити каталог наборів (${loadError}).`} />;
  if (!data) return <div className="app"><div className="topstrip"><Brand /></div><p className="loading" role="status">Завантаження…</p></div>;
  const reload = async () => { const d = await loadAll(); setData(d); };
  return <Routed data={data} route={route} reload={reload} />;
}

function Fatal({ text }: { text: string }) {
  return (
    <div className="app">
      <div className="topstrip"><Brand /></div>
      <main className="start" id="main"><div className="card start-card"><div className="notice notice--warn"><AlertTriangle size={18} aria-hidden /><p>{text}</p></div>
        <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'home' })}>На початок</button></div></main>
    </div>
  );
}

function Routed({ data, route, reload }: { data: Data; route: Route; reload: () => Promise<void> }) {
  if (route.name === 'home') return <Home data={data} simulationId={route.simulationId} />;
  if (route.name === 'edit') return (
    <div className="app"><Top /><EditScreen sets={data.sets} simulationId={route.simulationId} position={route.position} reload={reload} /></div>
  );
  if (route.name === 'admin') return (
    <div className="app"><Top /><AdminScreen titleOf={(id) => data.sets.find((x) => x.entry.id === id)?.entry.title ?? null} /></div>
  );
  return <AttemptView key={route.attemptId} data={data} route={route} />;
}

function useOverlay(screen: 'prepare' | 'active' | 'review') {
  const [overlay, setOverlay] = useState<Overlay>('none');
  const send = useCallback((ev: OverlayEvent) => setOverlay((cur) => overlayTransition(screen, cur, ev)), [screen]);
  return [overlay, send] as const;
}

function Home({ data, simulationId }: { data: Data; simulationId?: string }) {
  const prefs = repo.prefs();
  // Поки є незавершена спроба, головна завжди показує саме її симуляцію.
  const running = repo.list().find((a) => a.status === 'active' && !isExpired(a, Date.now()) && data.sets.some((s) => s.entry.id === a.simulationId && s.pkg));
  const requested = running?.simulationId ?? simulationId ?? prefs.selectedSimulationId ?? data.catalog.defaultSimulationId;
  const set = data.sets.find((s) => s.entry.id === requested) ?? data.sets.find((s) => s.entry.id === data.catalog.defaultSimulationId)!;
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
  if (active && !activeValid) finishExpired(data.sets);
  const finished = repo.finishedFor(simId);
  const available = data.sets.filter((s) => s.status === 'available');
  const demoId = data.catalog.demoSimulationId && available.some((s) => s.entry.id === data.catalog.demoSimulationId) ? data.catalog.demoSimulationId : null;

  const pick = (id: string) => {
    if (running) return;
    repo.setPrefs({ selectedSimulationId: id });
    send({ type: 'CLOSE' });
    navigate({ name: 'home', simulationId: id });
  };

  const auth = useAuth();
  const start = () => {
    if (!set.pkg) return;
    const existing = repo.activeFor(simId);
    if (existing && !isExpired(existing, Date.now())) return navigate({ name: 'attempt', attemptId: existing.id, position: 1 });
    // Коли підключено базу, тест починається лише після входу — інакше викладач не побачить результат.
    if (cloudEnabled && !auth.user) { void signIn(); return; }
    repo.saveSnapshot(set.pkg);
    const a = createAttempt(set.pkg, Date.now());
    repo.save(a);
    markOwner(kv, a.id);
    repo.setPrefs({ selectedSimulationId: simId });
    lease.acquire(a.id, true);
    navigate({ name: 'attempt', attemptId: a.id, position: 1 });
  };

  const restart = () => {
    const cur = repo.activeFor(simId);
    if (cur) {
      if (lease.state(cur.id) === 'other') { alert('Цю спробу відкрито в іншій вкладці. Закрийте її або продовжіть там.'); return; }
      repo.save(abandonAttempt(cur));
    }
    start();
  };

  const finishActive = () => {
    const cur = repo.activeFor(simId);
    if (!cur) return;
    if (lease.state(cur.id) === 'other') { alert('Цю спробу відкрито в іншій вкладці. Завершіть її там.'); return; }
    const pkg = contentFor(cur, data.sets);
    if (!pkg) return;
    repo.save(finishAttempt(cur, pkg, { now: Date.now(), reason: 'manual', applyDrafts: true }));
    navigate({ name: 'review', attemptId: cur.id });
  };

  const material = set.pkg?.referenceMaterials.find((r) => r.id === set.pkg!.simulation.referenceMaterialId) ?? null;

  return (
    <div className="app">
      <Top />
      <StartScreen set={set} needsLogin={cloudEnabled && auth.ready && !auth.user} active={activeValid} finished={finished} availableCount={available.length} demoId={demoId} now={now}
        onStart={start} onRestart={restart} onFinish={finishActive}
        onContinue={() => activeValid && navigate({ name: 'attempt', attemptId: activeValid.id, position: 0 })}
        onOpenSelector={() => send({ type: 'OPEN_SELECTOR' })}
        onOpenReference={() => send({ type: 'OPEN_REFERENCE' })}
        onOpenDemo={() => demoId && pick(demoId)}
        onOpenReview={(id) => navigate({ name: 'review', attemptId: id })} />
      <SelectorModal open={overlay === 'selector'} onClose={() => send({ type: 'CLOSE' })} sets={data.sets} currentId={simId} onPick={pick} />
      {set.pkg && <ReferenceModal open={overlay === 'reference'} onClose={() => send({ type: 'CLOSE' })} material={material} baseDir={set.baseDir} />}
    </div>
  );
}

function AttemptView({ data, route }: { data: Data; route: Extract<Route, { name: 'attempt' | 'review' }> }) {
  const stored = useMemo(() => repo.get(route.attemptId), [route.attemptId]);
  const pkg = useMemo(() => (stored ? contentFor(stored, data.sets) : null), [stored, data.sets]);
  const { attempt, update, finish, leaseState, takeOver, conflict, dismissConflict } = useAttempt(repo, lease, route.attemptId, pkg);
  const set = data.sets.find((s) => s.entry.id === attempt?.simulationId);
  const { screen, redirect } = resolveScreen(route, attempt);
  const [overlay, send] = useOverlay(screen === 'review' ? 'review' : 'active');
  const auth = useAuth();

  useEffect(() => { if (redirect) navigate(redirect, true); }, [redirect?.name, route.attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Після перезавантаження відкривається те питання, на якому зупинилися.
  useEffect(() => {
    if (route.name === 'attempt' && route.position === 0 && attempt && pkg && attempt.status === 'active') {
      const pos = pkg.simulation.orderedQuestionIds.indexOf(attempt.currentQuestionId) + 1;
      navigate({ name: 'attempt', attemptId: attempt.id, position: Math.max(1, pos) }, true);
    }
  }, [route, attempt, pkg]);

  if (!attempt || screen === 'not_found') return <Fatal text="Спробу не знайдено в цьому браузері." />;
  if (!pkg) return <Fatal text="Версію завдань, з якою пройдено цю спробу, не знайдено. Результат не переоцінюється автоматично." />;
  const baseDir = set?.baseDir ?? '';
  const material = pkg.referenceMaterials.find((r) => r.id === pkg.simulation.referenceMaterialId) ?? null;

  if (screen === 'review' && attempt.status === 'finished') {
    const retry = set?.pkg ? () => {
      const existing = repo.activeFor(attempt.simulationId);
      if (existing && !isExpired(existing, Date.now())) return navigate({ name: 'attempt', attemptId: existing.id, position: 0 });
      if (cloudEnabled && !auth.user) { void signIn(); return; }
      repo.saveSnapshot(set.pkg!);
      const a = createAttempt(set.pkg!, Date.now());
      repo.save(a);
      markOwner(kv, a.id);
      lease.acquire(a.id, true);
      navigate({ name: 'attempt', attemptId: a.id, position: 1 });
    } : null;
    return (
      <div className="app">
        <Top />
        <ReviewScreen attempt={attempt} pkg={pkg} baseDir={baseDir} videoMap={set?.videoMap ?? null}
          onRetry={retry} onHome={() => navigate({ name: 'home', simulationId: attempt.simulationId })}
          history={repo.finishedFor(attempt.simulationId)} onOpenAttempt={(id) => navigate({ name: 'review', attemptId: id })} />
      </div>
    );
  }

  if (attempt.status !== 'active' || route.name !== 'attempt') return <div className="app"><p className="loading" role="status">Завантаження…</p></div>;

  return (
    <div className="app app--exam">
      <Top exam />
      {leaseState === 'other' && (
        <div className="takeover" role="alertdialog" aria-labelledby="takeover-title" aria-describedby="takeover-text">
          <div className="card takeover__card">
            <h2 id="takeover-title">Спробу відкрито в іншій вкладці</h2>
            <p id="takeover-text">Щоб відповіді не перезаписували одна одну, працювати можна лише в одній вкладці. Час іде в будь-якому разі.</p>
            <div className="start-card__actions">
              <button type="button" className="btn btn--primary" onClick={takeOver}>Працювати тут</button>
              <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'home', simulationId: attempt.simulationId })}>На початок</button>
            </div>
          </div>
        </div>
      )}
      {conflict && (
        <div className="notice notice--warn notice--floating" role="alert">
          <AlertTriangle size={18} aria-hidden /><p>Спробу змінено в іншій вкладці — показано актуальний стан.</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={dismissConflict}>Зрозуміло</button>
        </div>
      )}
      <ExamScreen attempt={attempt} pkg={pkg} baseDir={baseDir} position={route.position} update={update}
        overlay={overlay}
        onFinish={(applyDrafts) => {
          const done = finish('manual', applyDrafts);
          send({ type: 'CLOSE' });
          if (done?.status === 'finished') navigate({ name: 'review', attemptId: done.id }, true);
        }}
        openReference={() => send({ type: 'OPEN_REFERENCE' })}
        requestFinish={() => send({ type: 'REQUEST_FINISH' })}
        closeOverlay={() => send({ type: 'CLOSE' })}
        hasReference={!!material} />
      <ReferenceModal open={overlay === 'reference'} onClose={() => send({ type: 'CLOSE' })} material={material} baseDir={baseDir} />
    </div>
  );
}
