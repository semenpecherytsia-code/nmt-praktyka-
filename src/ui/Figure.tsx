import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import type { ImageAsset } from '../content/types';
import { resolveContentUrl } from '../content/urls';
import { RichText } from './RichText';
import { Dialog } from './Dialog';

/** Рисунок зберігає пропорції; натискання відкриває збільшений перегляд. */
export function Figure({ asset, baseDir }: { asset: ImageAsset; baseDir: string }) {
  const [zoom, setZoom] = useState(false);
  const src = resolveContentUrl(asset.src, baseDir);
  if (!src) return <p className="notice notice--warn">Рисунок недоступний: некоректна адреса.</p>;
  const ratio = asset.width && asset.height ? `${asset.width} / ${asset.height}` : undefined;
  return (
    <figure className="figure">
      <button type="button" className="figure__btn" onClick={() => setZoom(true)} aria-label={`Збільшити рисунок: ${asset.alt}`}>
        <img src={src} alt={asset.alt} loading="lazy" decoding="async" width={asset.width} height={asset.height}
          style={{ aspectRatio: ratio, maxWidth: asset.width ? `min(100%, ${asset.width}px)` : '100%' }} />
        <span className="figure__zoom" aria-hidden><ZoomIn size={16} /></span>
      </button>
      {asset.caption && <figcaption><RichText text={asset.caption} /></figcaption>}
      <Dialog open={zoom} onClose={() => setZoom(false)} title="Рисунок" titleId={`fig-${asset.id}`} size="lg">
        <img src={src} alt={asset.alt} className="figure__large" />
      </Dialog>
    </figure>
  );
}
