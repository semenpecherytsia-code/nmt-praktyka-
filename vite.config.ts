import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Локальний медіасервер для розробки: файли з ./media доступні за адресою <base>media/...
// Він працює лише в `npm run dev` і `npm run preview`; у production-збірку файли не потрапляють.
function localMedia(): Plugin {
  const root = path.resolve(import.meta.dirname, 'media');
  const types: Record<string, string> = {
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf',
  };
  const handler = (req: any, res: any, next: () => void) => {
    const url = decodeURIComponent((req.url ?? '').split('?')[0]);
    const idx = url.indexOf('/media/');
    if (idx < 0) return next();
    const file = path.resolve(root, url.slice(idx + '/media/'.length));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
    const stat = fs.statSync(file);
    const type = types[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    const range = req.headers.range as string | undefined;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : stat.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size });
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: 'local-media',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

// GitHub Pages віддає 404.html для будь-якої невідомої адреси (напр. /admin) — робимо його копією index.html,
// щоб застосунок відкривався з будь-якого посилання.
function spaFallback(): Plugin {
  return {
    name: 'spa-404',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(import.meta.dirname, 'dist');
      const index = path.join(dist, 'index.html');
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
    },
  };
}

// VITE_BASE задає базовий шлях. За замовчуванням '/' — сайт у корені домену (matannmt.com).
// Для підпапки: VITE_BASE=/назва-папки/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), localMedia(), spaFallback()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
