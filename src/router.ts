// Hash-маршрутизація: працює на будь-якому статичному хостингу та в будь-якій підпапці.
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home'; simulationId?: string }
  | { name: 'attempt'; attemptId: string; position: number }
  | { name: 'review'; attemptId: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'sim' && parts[1]) return { name: 'home', simulationId: parts[1] };
  if (parts[0] === 'attempt' && parts[1]) {
    if (parts[2] === 'review') return { name: 'review', attemptId: parts[1] };
    const n = Number(parts[3] ?? parts[2]);
    return { name: 'attempt', attemptId: parts[1], position: Number.isInteger(n) && n > 0 ? n : 0 };
  }
  return { name: 'home' };
}

export function routeHash(r: Route): string {
  switch (r.name) {
    case 'home': return r.simulationId ? `#/sim/${encodeURIComponent(r.simulationId)}` : '#/';
    case 'attempt': return `#/attempt/${encodeURIComponent(r.attemptId)}/q/${r.position}`;
    case 'review': return `#/attempt/${encodeURIComponent(r.attemptId)}/review`;
  }
}

/** replace = true не додає запис в історію (наприклад, при перемиканні питань). */
export function navigate(r: Route, replace = false): void {
  const hash = routeHash(r);
  if (window.location.hash === hash) return;
  if (replace) window.history.replaceState(null, '', hash);
  else window.history.pushState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
  }, []);
  return route;
}
