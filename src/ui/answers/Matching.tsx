import { useEffect, useRef, useState } from 'react';
import type { MatchingQuestion } from '../../content/types';
import type { AnswerValue } from '../../engine/answers';
import { RichText } from '../RichText';
import { LETTERS } from '../format';
import { X } from 'lucide-react';

interface Props { q: MatchingQuestion; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; disabled?: boolean }

/** fromRow — клітинка, з якої тягнуть уже поставлений варіант (null — з панелі «Варіанти»). */
interface Drag { optId: string; fromRow: string | null; x: number; y: number; startX: number; startY: number; moved: boolean; overRow: string | null }

/** Відповідності лише перетягуванням (мишею або пальцем): варіант із панелі «Варіанти» тягнуть у клітинку пункту. */
export function Matching({ q, value, onChange, disabled }: Props) {
  const pairs: Record<string, string | null> = value?.type === 'matching' ? value.pairs : {};
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  useEffect(() => { if (disabled) setDrag(null); }, [disabled]);

  // Автопрокрутка сторінки, коли палець або курсор біля верхнього чи нижнього краю екрана.
  useEffect(() => {
    if (!drag?.moved) return;
    const t = window.setInterval(() => {
      const d = dragRef.current;
      if (!d) return;
      const edge = 90;
      const dy = d.y < edge ? -(edge - d.y) / 5 : d.y > window.innerHeight - edge ? (d.y - (window.innerHeight - edge)) / 5 : 0;
      if (dy) window.scrollBy(0, dy);
    }, 16);
    return () => window.clearInterval(t);
  }, [drag?.moved]);

  const apply = (changes: Record<string, string | null>) => {
    if (disabled) return;
    const next: Record<string, string | null> = {};
    for (const r of q.matchingRows) next[r.id] = r.id in changes ? changes[r.id] : pairs[r.id] ?? null;
    if (!q.allowOptionReuse) {
      for (const [rowId, optId] of Object.entries(changes)) {
        if (!optId) continue;
        for (const r of q.matchingRows) if (r.id !== rowId && next[r.id] === optId && !(r.id in changes)) next[r.id] = null;
      }
    }
    onChange({ type: 'matching', pairs: next });
  };

  const letterOf = (optId: string) => LETTERS[q.matchingOptions.findIndex((o) => o.id === optId)];
  const optionOf = (optId: string) => q.matchingOptions.find((o) => o.id === optId);
  const used = new Set(Object.values(pairs).filter(Boolean) as string[]);
  const bank = q.matchingOptions.filter((o) => q.allowOptionReuse || !used.has(o.id));
  const filled = q.matchingRows.filter((r) => pairs[r.id]).length;

  const rowAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-slot]');
    return el && el.getAttribute('data-q') === q.id ? el.getAttribute('data-slot') : null;
  };

  const onPointerDown = (e: React.PointerEvent, optId: string, fromRow: string | null) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest('.mchip__remove')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ optId, fromRow, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, overRow: null });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4;
    setDrag({ ...d, x: e.clientX, y: e.clientY, moved, overRow: moved ? rowAt(e.clientX, e.clientY) : null });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    setDrag(null);
    if (!d?.moved) return;
    const row = rowAt(e.clientX, e.clientY);
    if (row && row !== d.fromRow) {
      const changes: Record<string, string | null> = { [row]: d.optId };
      if (d.fromRow) changes[d.fromRow] = pairs[row] ?? null; // обмін місцями
      apply(changes);
    } else if (!row && d.fromRow) {
      apply({ [d.fromRow]: null }); // витягнули з клітинки — варіант повертається в панель
    }
  };
  const handlers = { onPointerMove, onPointerUp, onPointerCancel: () => setDrag(null) };

  const ghost = drag?.moved ? optionOf(drag.optId) : null;

  return (
    <div className={`dnd${disabled ? ' is-locked' : ''}`}>
      <div className="dnd__rows">
        {q.matchingRows.map((r, ri) => {
          const opt = pairs[r.id] ? optionOf(pairs[r.id]!) : null;
          const over = drag?.overRow === r.id;
          const dragging = drag?.moved && drag.fromRow === r.id;
          return (
            <div key={r.id} className="dnd__row">
              <div className="dnd__item"><span className="dnd__num" aria-hidden>{ri + 1}</span><span className="visually-hidden">Пункт {ri + 1}: </span><RichText text={r.content} /></div>
              <div className={`dnd__slot${over ? ' is-over' : ''}${opt ? ' is-filled' : ''}`} data-slot={r.id} data-q={q.id} aria-label={`Клітинка пункту ${ri + 1}`}>
                {opt ? (
                  <div className={`mchip mchip--placed${dragging ? ' is-dragging' : ''}`} aria-label={`Пункт ${ri + 1}: варіант ${letterOf(opt.id)}`}
                    onPointerDown={(e) => onPointerDown(e, opt.id, r.id)} {...handlers}>
                    <span className="mchip__letter" aria-hidden>{letterOf(opt.id)}</span>
                    <RichText text={opt.content} className="mchip__text" />
                    {!disabled && (
                      <button type="button" className="mchip__remove" onClick={() => apply({ [r.id]: null })} aria-label={`Пункт ${ri + 1}: прибрати варіант ${letterOf(opt.id)}`}>
                        <X size={16} aria-hidden />
                      </button>
                    )}
                  </div>
                ) : <span className="dnd__drop" aria-hidden />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dnd__bank">
        <p className="dnd__bank-title">Варіанти</p>
        {bank.length === 0 ? <p className="hint">Усі варіанти розставлено.</p> : (
          <ul className="dnd__options">
            {bank.map((o) => (
              <li key={o.id}>
                <div role="button" aria-disabled={disabled || undefined}
                  className={`mchip${disabled ? ' is-disabled' : ''}${drag?.moved && drag.optId === o.id && !drag.fromRow ? ' is-dragging' : ''}`}
                  aria-label={`Варіант ${letterOf(o.id)}`}
                  onPointerDown={(e) => onPointerDown(e, o.id, null)} {...handlers}>
                  <span className="mchip__letter" aria-hidden>{letterOf(o.id)}</span>
                  <RichText text={o.content} className="mchip__text" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="dnd__status" aria-live="polite">
        Заповнено {filled} з {q.matchingRows.length}.{!disabled && ' Перетягніть варіант у клітинку.'}
      </p>

      {ghost && drag && (
        <div className="mchip mchip--ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <span className="mchip__letter">{letterOf(ghost.id)}</span>
          <RichText text={ghost.content} className="mchip__text" />
        </div>
      )}
    </div>
  );
}
