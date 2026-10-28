import fs from 'node:fs';
export function demoPackage() {
    return JSON.parse(fs.readFileSync('public/content/sets/nmt-23/package.json', 'utf8'));
}
export function demoVideoMap() {
    return JSON.parse(fs.readFileSync('tests/fixtures/video-map.json', 'utf8'));
}
export const clone = (x) => JSON.parse(JSON.stringify(x));
