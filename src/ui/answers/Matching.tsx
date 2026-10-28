import { useEffect, useRef, useState } from 'react';
import type { MatchingQuestion } from '../../content/types';
import type { AnswerValue } from '../../engine/answers';
import { RichText } from '../RichText';
import { LETTERS } from '../format';
import { ArrowRight, X } from 'lucide-react';

interface Props { q: MatchingQuestion; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; disabled?: boolean }

interface Drag { optId: string; x: number; y: number; startX: number; startY: number; moved: boolean; overRow: string | null }

/**
 * Відповідності перетягуванням: варіант із панелі «Варіанти» тягнуть у порожню клітинку пункту.
 * Без миші: натиснути варіант, потім клітинку (або Enter/пробіл на кожному).
 */
export function Matching({ q, value, onChange, disabled }: Props) {
  const pairs: Record<string, string | null> = value?.type === 'matching' ? value.pairs : {};
  const [picked, setPicked] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  useEffect(() => { if (disabled) { setPicked(null); setDrag(null); } }, [disabled]);

  const set = (rowId: string, optId: string | null) => {
    if (disabled) return;
    const next: Record<string, string | null> = {};
    for (const r of q.matchingRows) {
      let v = r.id === rowId ? optId : pairs[r.id] ?? null;
      if (r.id !== rowId && optId && !q.allowOptionReuse && v === optId) v = null;
      next[r.id] = v;
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

  const onPointerDown = (e: React.PointerEvent, optId: string) => {
    if (disabled || e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ optId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, overRow: null });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
    setDrag({ ...d, x: e.clientX, y: e.clientY, moved, overRow: moved ? rowAt(e.clientX, e.clientY) : null });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    setDrag(null);
    if (!d) return;
    if (d.moved) {
      const row = rowAt(e.clientX, e.clientY);
      if (row) { set(row, d.optId); setPicked(null); }
    } else {
      setPicked((p) => (p === d.optId ? null : d.optId));
    }
  };

  const ghost = drag?.moved ? optionOf(drag.optId) : null;

  return (
    <div className={`dnd${disabled ? ' is-locked' : ''}`}>
      <div className="dnd__rows">
        {q.matchingRows.map((r, ri) => {
          const opt = pairs[r.id] ? optionOf(pairs[r.id]!) : null;
          const over = drag?.overRow === r.id;
          return (
            <div key={r.id} className="dnd__row">
              <div className="dnd__item"><span className="dnd__num" aria-hidden>{ri + 1}</span><span className="visually-hidden">Пункт {ri + 1}: </span><RichText text={r.content} /></div>
              <ArrowRight className="dnd__arrow" size={20} aria-hidden />
              <div className={`dnd__slot${over ? ' is-over' : ''}${opt ? ' is-filled' : ''}`} data-slot={r.id} data-q={q.id}>
                {opt ? (
                  <div className="mchip mchip--placed">
                    <span className="mchip__letter" aria-hidden>{letterOf(opt.id)}</span>
                    <RichText text={opt.content} className="mchip__text" />
                    {!disabled && (
                      <button type="button" className="mchip__remove" onClick={() => set(r.id, null)} aria-label={`Пункт ${ri + 1}: прибрати варіант ${letterOf(opt.id)}`}>
                        <X size={16} aria-hidden />
                      </button>
                    )}
                  </div>
                ) : (
                  <button type="button" className="dnd__drop" disabled={disabled || !picked}
                    onClick={() => { if (picked) { set(r.id, picked); setPicked(null); } }}
                    aria-label={picked ? `Пункт ${ri + 1}: поставити варіант ${letterOf(picked)}` : `Пункт ${ri + 1}: порожньо`}>
                    {picked ? 'Сюди' : ''}
                  </button>
                )}
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
                <button type="button" className={`mchip${picked === o.id ? ' is-picked' : ''}${drag?.moved && drag.optId === o.id ? ' is-dragging' : ''}`}
                  disabled={disabled} aria-pressed={picked === o.id} aria-label={`Варіант ${letterOf(o.id)}`}
                  onPointerDown={(e) => onPointerDown(e, o.id)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked((p) => (p === o.id ? null : o.id)); } }}>
                  <span className="mchip__letter" aria-hidden>{letterOf(o.id)}</span>
                  <RichText text={o.content} className="mchip__text" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="dnd__status" aria-live="polite">
        Заповнено {filled} з {q.matchingRows.length}.{' '}
        {!disabled && (picked ? `Обрано варіант ${letterOf(picked)} — натисніть порожню клітинку.` : 'Перетягніть варіант у клітинку або натисніть варіант, а потім клітинку.')}
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
