import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
/**
 * Модальне вікно на основі нативного <dialog>.showModal(): фон стає inert (фокус утримується),
 * Escape закриває, після закриття фокус повертається на елемент, що відкрив вікно.
 */
export function Dialog({ open, onClose, title, titleId, children, footer, size = 'md', initialFocus, className }) {
    const ref = useRef(null);
    const returnTo = useRef(null);
    const headingRef = useRef(null);
    useEffect(() => {
        const d = ref.current;
        if (!d)
            return;
        if (open && !d.open) {
            returnTo.current = document.activeElement;
            d.showModal();
            (initialFocus?.current ?? headingRef.current)?.focus();
        }
        else if (!open && d.open) {
            d.close();
        }
    }, [open, initialFocus]);
    useEffect(() => {
        const d = ref.current;
        if (!d)
            return;
        const onCancel = (e) => { e.preventDefault(); onClose(); };
        const onCloseEv = () => {
            const el = returnTo.current;
            returnTo.current = null;
            if (el && document.contains(el))
                requestAnimationFrame(() => el.focus());
        };
        d.addEventListener('cancel', onCancel);
        d.addEventListener('close', onCloseEv);
        return () => { d.removeEventListener('cancel', onCancel); d.removeEventListener('close', onCloseEv); };
    }, [onClose]);
    return (_jsx("dialog", { ref: ref, className: `dialog dialog--${size} ${className ?? ''}`, "aria-labelledby": titleId, onClick: (e) => { if (e.target === ref.current)
            onClose(); }, children: open && (_jsxs("div", { className: "dialog__inner", children: [_jsxs("header", { className: "dialog__header", children: [_jsx("h2", { id: titleId, ref: headingRef, tabIndex: -1, className: "dialog__title", children: title }), _jsx("button", { type: "button", className: "icon-btn", onClick: onClose, "aria-label": "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", children: _jsx(X, { "aria-hidden": true, size: 20 }) })] }), _jsx("div", { className: "dialog__body", children: children }), footer && _jsx("footer", { className: "dialog__footer", children: footer })] })) }));
}
