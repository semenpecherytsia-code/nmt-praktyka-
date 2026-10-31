// Маршрутизація за звичайними адресами (matannmt.com/admin, /sim/nmt-23 …) через History API.
// На GitHub Pages невідомі адреси віддає 404.html — це копія index.html, тож застосунок відкривається з будь-якої адреси.
// Старі посилання виду /#/sim/... автоматично перетворюються на нові.
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home'; simulationId?: string }
  | { name: 'admin' }
  | { name: 'edit'; simulationId?: string; position: number }
  | { name: 'attempt'; attemptId: string; position: number }
  | { name: 'review'; attemptId: string };

const BASE = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
const ROUTE_EVENT = 'nmt:route';

/** Розбирає шлях усередині застосунку (без базового префікса), напр. "/attempt/a1/q/3". Приймає й старий формат "#/...". */
export function parseRoute(path: string): Route {
  const parts = path.replace(/^#/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'edit') {
    const n = Number(parts[2]);
    return { name: 'edit', simulationId: parts[1], position: Number.isInteger(n) && n > 0 ? n : 1 };
  }
  if (parts[0] === 'sim' && parts[1]) return { name: 'home', simulationId: parts[1] };
  if (parts[0] === 'attempt' && parts[1]) {
    if (parts[2] === 'review') return { name: 'review', attemptId: parts[1] };
    const n = Number(parts[3] ?? parts[2]);
    return { name: 'attempt', attemptId: parts[1], position: Number.isInteger(n) && n > 0 ? n : 0 };
  }
  return { name: 'home' };
}

/** Шлях маршруту всередині застосунку, напр. "/admin". */
export function routePath(r: Route): string {
  switch (r.name) {
    case 'admin': return '/admin';
    case 'edit': return r.simulationId ? `/edit/${encodeURIComponent(r.simulationId)}/${r.position}` : '/edit';
    case 'home': return r.simulationId ? `/sim/${encodeURIComponent(r.simulationId)}` : '/';
    case 'attempt': return `/attempt/${encodeURIComponent(r.attemptId)}/q/${r.position}`;
    case 'review': return `/attempt/${encodeURIComponent(r.attemptId)}/review`;
  }
}

/** Повна адреса для href (з урахуванням базового шляху). */
export function routeHref(r: Route): string {
  return BASE.replace(/\/$/, '') + routePath(r);
}

/** Поточний шлях усередині застосунку. */
export function currentPath(): string {
  const p = window.location.pathname;
  const base = BASE.replace(/\/$/, '');
  return base && p.startsWith(base) ? p.slice(base.length) || '/' : p;
}

/** Оновлює адресу без перезавантаження й повідомляє useRoute. */
export function setUrl(url: string, replace = false): void {
  try {
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  } catch {
    window.location.assign(url);
    return;
  }
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

/** replace = true не додає запис в історію (наприклад, при перемиканні питань). */
export function navigate(r: Route, replace = false): void {
  const href = routeHref(r);
  if (window.location.pathname === href && !window.location.hash) return;
  setUrl(href + window.location.search, replace);
}

/** Старі адреси /#/... → нові /... */
function upgradeHashUrl(): void {
  const h = window.location.hash;
  if (!h.startsWith('#/')) return;
  try { window.history.replaceState(null, '', routeHref(parseRoute(h)) + window.location.search); } catch { /* ігноруємо */ }
}

/** Внутрішні посилання <a data-link href="/..."> відкриваються без перезавантаження сторінки. */
function onLinkClick(e: MouseEvent): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a[data-link]') as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== '_self')) return;
  e.preventDefault();
  setUrl(a.getAttribute('href') ?? BASE);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => { upgradeHashUrl(); return parseRoute(currentPath()); });
  useEffect(() => {
    const on = () => { upgradeHashUrl(); setRoute(parseRoute(currentPath())); };
    window.addEventListener(ROUTE_EVENT, on);
    window.addEventListener('popstate', on);
    window.addEventListener('hashchange', on);
    document.addEventListener('click', onLinkClick);
    return () => {
      window.removeEventListener(ROUTE_EVENT, on);
      window.removeEventListener('popstate', on);
      window.removeEventListener('hashchange', on);
      document.removeEventListener('click', onLinkClick);
    };
  }, []);
  return route;
}
