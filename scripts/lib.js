import fs from 'node:fs';
import path from 'node:path';
import { validatePackage } from '../src/content/validate';
export const CONTENT_DIR = path.resolve('public/content');
export const MEDIA_DIR = path.resolve('media');
export function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch (e) {
        throw new Error(`Не вдалося прочитати JSON «${file}»: ${e.message}`);
    }
}
export function validateFiles(packageFile, videoMapFile) {
    const setDir = path.dirname(packageFile);
    const pkg = readJson(packageFile);
    const vm = videoMapFile && fs.existsSync(videoMapFile) ? readJson(videoMapFile) : null;
    return validatePackage(pkg, vm, {
        fileExists: (rel, kind) => {
            const base = kind === 'media' ? MEDIA_DIR : setDir;
            const full = path.resolve(base, rel);
            return full.startsWith(base + path.sep) && fs.existsSync(full);
        },
    });
}
export function readCatalog() {
    return readJson(path.join(CONTENT_DIR, 'catalog.json'));
}
