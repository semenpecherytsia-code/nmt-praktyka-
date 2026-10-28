import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  titleId: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Елемент, який отримує фокус після відкриття (інакше — заголовок). */
  initialFocus?: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Модальне вікно на основі нативного <dialog>.showModal(): фон стає inert (фокус утримується),
 * Escape закриває, після закриття фокус повертається на елемент, що відкрив вікно.
 */
export function Dialog({ open, onClose, title, titleId, children, footer, size = 'md', initialFocus, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      d.showModal();
      (initialFocus?.current ?? headingRef.current)?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, initialFocus]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    const onCloseEv = () => {
      const el = returnTo.current;
      returnTo.current = null;
      if (el && document.contains(el)) requestAnimationFrame(() => el.focus());
    };
    d.addEventListener('cancel', onCancel);
    d.addEventListener('close', onCloseEv);
    return () => { d.removeEventListener('cancel', onCancel); d.removeEventListener('close', onCloseEv); };
  }, [onClose]);

  return (
    <dialog ref={ref} className={`dialog dialog--${size} ${className ?? ''}`} aria-labelledby={titleId}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {open && (
        <div className="dialog__inner">
          <header className="dialog__header">
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="dialog__title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрити">
              <X aria-hidden size={20} />
            </button>
          </header>
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
