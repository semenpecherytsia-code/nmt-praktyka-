import fs from 'node:fs';
import type { ContentPackage, VideoMap } from '../src/content/types';

export function demoPackage(): ContentPackage {
  return JSON.parse(fs.readFileSync('public/content/sets/nmt-23/package.json', 'utf8'));
}
export function demoVideoMap(): VideoMap {
  return JSON.parse(fs.readFileSync('public/content/sets/nmt-23/video-map.json', 'utf8'));
}
export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
