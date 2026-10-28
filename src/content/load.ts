import { APP_CONFIG } from '../config';
import type { Catalog, CatalogEntry, ContentPackage, VideoMap } from './types';
import { validatePackage, type ValidationResult } from './validate';

export interface LoadedSet {
  entry: CatalogEntry;
  status: 'available' | 'not_added' | 'invalid' | 'load_error';
  pkg: ContentPackage | null;
  videoMap: VideoMap | null;
  validation: ValidationResult | null;
  /** Папка набору для відносних адрес рисунків, PDF і відео. */
  baseDir: string;
  error?: string;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export async function loadCatalog(): Promise<Catalog> {
  return (await fetchJson(APP_CONFIG.contentBase + 'catalog.json')) as Catalog;
}

/** Набір показується користувачу лише якщо він пройшов перевірку. */
export async function loadSet(entry: CatalogEntry): Promise<LoadedSet> {
  const base = { entry, pkg: null, videoMap: null, validation: null };
  if (!entry.package) return { ...base, status: 'not_added', baseDir: '' };
  const pkgUrl = APP_CONFIG.contentBase + entry.package;
  const baseDir = pkgUrl.replace(/[^/]*$/, '');
  try {
    const pkg = await fetchJson(pkgUrl);
    let vm: unknown = null;
    if (entry.videoMap) {
      try { vm = await fetchJson(APP_CONFIG.contentBase + entry.videoMap); } catch { vm = null; }
    }
    const validation = validatePackage(pkg, vm);
    if (!validation.ok || (pkg as ContentPackage).simulation.id !== entry.id) {
      console.warn(`Набір «${entry.id}» не пройшов перевірку`, validation.issues.filter((i) => i.level === 'error'));
      return { ...base, status: 'invalid', validation, baseDir };
    }
    // Якщо карта відео не пройшла перевірку, пакет усе одно недоступний (validation.ok = false вище).
    return { entry, status: 'available', pkg: pkg as ContentPackage, videoMap: vm as VideoMap | null, validation, baseDir };
  } catch (e) {
    return { ...base, status: 'load_error', baseDir, error: (e as Error).message };
  }
}

export async function loadAll(): Promise<{ catalog: Catalog; sets: LoadedSet[] }> {
  const catalog = await loadCatalog();
  const sets = await Promise.all(catalog.entries.map(loadSet));
  return { catalog, sets };
}
