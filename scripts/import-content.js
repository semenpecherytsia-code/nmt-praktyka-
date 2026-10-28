// Імпорт набору: npm run content:import -- <папка-набору>
// Папка має містити package.json (і за потреби video-map.json, assets/, reference/).
// Набір перевіряється; при помилках нічого не копіюється. Вміст не змінюється.
import fs from 'node:fs';
import path from 'node:path';
import { formatIssue } from '../src/content/validate';
import { CONTENT_DIR, readCatalog, validateFiles } from './lib';
const src = process.argv[2];
if (!src) {
    console.error('Вкажіть папку набору: npm run content:import -- ./my-set');
    process.exit(1);
}
const dir = path.resolve(src);
const pkgFile = path.join(dir, 'package.json');
const vmFile = path.join(dir, 'video-map.json');
if (!fs.existsSync(pkgFile)) {
    console.error(`Не знайдено ${pkgFile}`);
    process.exit(1);
}
const res = validateFiles(pkgFile, fs.existsSync(vmFile) ? vmFile : null);
res.issues.forEach((i) => (i.level === 'error' ? console.error : console.log)(formatIssue(i)));
if (!res.ok || !res.report) {
    console.error('\nІмпорт скасовано: виправте помилки у вихідних файлах.');
    process.exit(1);
}
const id = res.report.simulationId;
const target = path.join(CONTENT_DIR, 'sets', id);
if (fs.existsSync(target) && !process.argv.includes('--replace')) {
    console.error(`Набір «${id}» уже існує. Щоб замінити, змініть version у пакеті й додайте --replace.`);
    process.exit(1);
}
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(dir, target, { recursive: true, filter: (p) => !/\.(mp4|mov|mkv|webm|m3u8|ts)$/i.test(p) });
const catalog = readCatalog();
const entry = { id, title: res.report.title, package: `sets/${id}/package.json`, videoMap: fs.existsSync(vmFile) ? `sets/${id}/video-map.json` : null };
const idx = catalog.entries.findIndex((e) => e.id === id);
if (idx >= 0)
    catalog.entries[idx] = entry;
else
    catalog.entries.push(entry);
fs.writeFileSync(path.join(CONTENT_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`\nІмпортовано «${res.report.title}» (${id}, версія ${res.report.version}): ${res.report.questionCount} питань.`);
console.log('Відеофайли не копіюються в репозиторій: покладіть їх у ./media (локально) або вкажіть publicUrl.');
