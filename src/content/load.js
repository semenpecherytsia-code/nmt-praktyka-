import { APP_CONFIG } from '../config';
import { validatePackage } from './validate';
async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok)
        throw new Error(`${res.status} ${url}`);
    return res.json();
}
export async function loadCatalog() {
    return (await fetchJson(APP_CONFIG.contentBase + 'catalog.json'));
}
/** Набір показується користувачу лише якщо він пройшов перевірку. */
export async function loadSet(entry) {
    const base = { entry, pkg: null, videoMap: null, validation: null };
    if (!entry.package)
        return { ...base, status: 'not_added', baseDir: '' };
    const pkgUrl = APP_CONFIG.contentBase + entry.package;
    const baseDir = pkgUrl.replace(/[^/]*$/, '');
    try {
        const pkg = await fetchJson(pkgUrl);
        let vm = null;
        if (entry.videoMap) {
            try {
                vm = await fetchJson(APP_CONFIG.contentBase + entry.videoMap);
            }
            catch {
                vm = null;
            }
        }
        const validation = validatePackage(pkg, vm);
        if (!validation.ok || pkg.simulation.id !== entry.id) {
            console.warn(`Набір «${entry.id}» не пройшов перевірку`, validation.issues.filter((i) => i.level === 'error'));
            return { ...base, status: 'invalid', validation, baseDir };
        }
        // Якщо карта відео не пройшла перевірку, пакет усе одно недоступний (validation.ok = false вище).
        return { entry, status: 'available', pkg: pkg, videoMap: vm, validation, baseDir };
    }
    catch (e) {
        return { ...base, status: 'load_error', baseDir, error: e.message };
    }
}
export async function loadAll() {
    const catalog = await loadCatalog();
    const sets = await Promise.all(catalog.entries.map(loadSet));
    return { catalog, sets };
}
