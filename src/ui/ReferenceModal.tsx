import { lazy, Suspense, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from 'lucide-react';
import type { ReferenceMaterial } from '../content/types';
import { resolveContentUrl } from '../content/urls';
import { Dialog } from './Dialog';
import { RichText } from './RichText';

const PdfPages = lazy(() => import('./PdfPages'));

interface Props { open: boolean; onClose: () => void; material: ReferenceMaterial | null; baseDir: string }

const ZOOMS = [0.75, 1, 1.25, 1.5, 2];

export function ReferenceModal({ open, onClose, material, baseDir }: Props) {
  const [page, setPage] = useState(1);
  const [count, setCount] = useState<number | null>(null);
  const [zoomIdx, setZoomIdx] = useState(1);
  const zoom = ZOOMS[zoomIdx];
  const onCount = useCallback((n: number) => { setCount(n); setPage((p) => Math.min(p, n)); }, []);

  const title = material?.title ?? 'Довідкові матеріали';
  if (!material) {
    return (
      <Dialog open={open} onClose={onClose} title="Довідкові матеріали" titleId="ref-title" size="sm">
        <p className="empty-state">Довідкові матеріали ще не додано.</p>
      </Dialog>
    );
  }
  const total = material.kind === 'pdf' ? count : material.pages.length;
  const download = material.kind === 'pdf'
    ? (material.downloadable ? resolveContentUrl(material.src, baseDir) : null)
    : material.downloadSrc ? resolveContentUrl(material.downloadSrc, baseDir) : null;

  const toolbar = (
    <div className="ref-toolbar" role="toolbar" aria-label="Керування довідником">
      <div className="ref-toolbar__group">
        <button type="button" className="btn btn--ghost btn--icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Попередня сторінка">
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span className="ref-toolbar__page" aria-live="polite"><span className="hide-xs">Сторінка </span>{page}{total ? ` з ${total}` : ''}</span>
        <button type="button" className="btn btn--ghost btn--icon" onClick={() => setPage((p) => (total ? Math.min(total, p + 1) : p))} disabled={!total || page >= total} aria-label="Наступна сторінка">
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
      <div className="ref-toolbar__group">
        <button type="button" className="btn btn--ghost btn--icon" onClick={() => setZoomIdx((z) => Math.max(0, z - 1))} disabled={zoomIdx === 0} aria-label="Зменшити">
          <Minus size={18} aria-hidden />
        </button>
        <span className="ref-toolbar__zoom tabular" aria-live="polite">{Math.round(zoom * 100)} %</span>
        <button type="button" className="btn btn--ghost btn--icon" onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoomIdx === ZOOMS.length - 1} aria-label="Збільшити">
          <Plus size={18} aria-hidden />
        </button>
        {download && (
          <a className="btn btn--ghost btn--sm" href={download} download target="_blank" rel="noopener" aria-label="Завантажити PDF" title="Завантажити PDF">
            <Download size={18} aria-hidden /> <span className="hide-xs">Завантажити PDF</span><span className="show-xs">PDF</span>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} title={title} titleId="ref-title" size="lg" className="dialog--reference">
      {toolbar}
      <div className="ref-view">
        {material.kind === 'pages' && (
          <div className="ref-page ref-page--rich" style={{ fontSize: `${zoom}em` }}>
            <RichText text={material.pages[page - 1]} />
          </div>
        )}
        {material.kind === 'images' && (() => {
          const pg = material.pages[page - 1];
          const src = pg ? resolveContentUrl(pg.src, baseDir) : null;
          return src
            ? <img className="ref-image" src={src} alt={pg.alt} style={{ width: `min(${Math.round(zoom * 100)}%, ${Math.round(zoom * 820)}px)` }} />
            : <p className="empty-state">Сторінку не вдалося завантажити.</p>;
        })()}
        {material.kind === 'pdf' && (() => {
          const src = resolveContentUrl(material.src, baseDir);
          if (!src) return <p className="empty-state">Довідкові матеріали недоступні: некоректна адреса файла.</p>;
          return (
            <Suspense fallback={<p className="empty-state">Завантаження…</p>}>
              <PdfPages src={src} page={page} zoom={zoom} onCount={onCount} />
            </Suspense>
          );
        })()}
      </div>
    </Dialog>
  );
}
