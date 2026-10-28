// Перевіряє всі набори з public/content/catalog.json. Завершується з кодом 1 при помилках.
import path from 'node:path';
import { formatIssue } from '../src/content/validate';
import { CONTENT_DIR, readCatalog, validateFiles } from './lib';
const catalog = readCatalog();
let failed = false;
const ids = new Set();
for (const e of catalog.entries) {
    if (ids.has(e.id)) {
        console.error(`ПОМИЛКА · каталог · entries: ідентифікатор «${e.id}» повторюється`);
        failed = true;
    }
    ids.add(e.id);
    if (!e.package) {
        console.log(`• ${e.title} (${e.id}): набір ще не додано`);
        continue;
    }
    const res = validateFiles(path.join(CONTENT_DIR, e.package), e.videoMap ? path.join(CONTENT_DIR, e.videoMap) : null);
    if (res.report && res.report.simulationId !== e.id) {
        console.error(`ПОМИЛКА · каталог · ${e.id}: пакет містить simulation.id «${res.report.simulationId}»`);
        failed = true;
    }
    const errors = res.issues.filter((i) => i.level === 'error');
    const warnings = res.issues.filter((i) => i.level === 'warning');
    console.log(`• ${e.title} (${e.id}): ${errors.length ? 'ПОМИЛКИ' : 'OK'} — помилок ${errors.length}, попереджень ${warnings.length}`);
    errors.forEach((i) => console.error('   ' + formatIssue(i)));
    if (process.argv.includes('--verbose'))
        warnings.forEach((i) => console.log('   ' + formatIssue(i)));
    if (errors.length)
        failed = true;
}
if (!ids.has(catalog.defaultSimulationId)) {
    console.error(`ПОМИЛКА · каталог · defaultSimulationId: «${catalog.defaultSimulationId}» немає в entries`);
    failed = true;
}
process.exit(failed ? 1 : 0);
