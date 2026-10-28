import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Doc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
const cache = new Map<string, Promise<Doc>>();

/** Рендер однієї сторінки PDF у canvas. Кількість сторінок береться з самого файла. */
export default function PdfPages({ src, page, zoom, onCount }: { src: string; page: number; zoom: number; onCount: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!cache.has(src)) cache.set(src, pdfjs.getDocument({ url: src }).promise);
    cache.get(src)!.then((d) => { if (alive) { setDoc(d); onCount(d.numPages); } })
      .catch(() => { cache.delete(src); if (alive) setError('Не вдалося відкрити PDF-файл довідника.'); });
    return () => { alive = false; };
  }, [src, onCount]);

  useEffect(() => {
    if (!doc) return;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let alive = true;
    doc.getPage(Math.min(page, doc.numPages)).then((p) => {
      if (!alive || !canvasRef.current || !wrapRef.current) return;
      const base = p.getViewport({ scale: 1 });
      const fit = Math.min(wrapRef.current.clientWidth, 900) / base.width;
      const scale = fit * zoom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = p.getViewport({ scale: scale * dpr });
      const c = canvasRef.current;
      c.width = vp.width;
      c.height = vp.height;
      c.style.width = `${vp.width / dpr}px`;
      c.style.height = `${vp.height / dpr}px`;
      task = p.render({ canvas: c, viewport: vp }) as any;
      task!.promise.catch(() => undefined);
    });
    return () => { alive = false; task?.cancel(); };
  }, [doc, page, zoom]);

  if (error) return <p className="empty-state">{error}</p>;
  return (
    <div ref={wrapRef} className="ref-pdf">
      {!doc && <p className="empty-state">Завантаження…</p>}
      <canvas ref={canvasRef} className="ref-pdf__canvas" role="img" aria-label={`Сторінка ${page} довідника`} />
    </div>
  );
}
