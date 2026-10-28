import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { RichText } from '../RichText';
import { LETTERS } from '../format';
import { X } from 'lucide-react';
/** Відповідності лише перетягуванням (мишею або пальцем): варіант із панелі «Варіанти» тягнуть у клітинку пункту. */
export function Matching({ q, value, onChange, disabled }) {
    const pairs = value?.type === 'matching' ? value.pairs : {};
    const [drag, setDrag] = useState(null);
    const dragRef = useRef(null);
    dragRef.current = drag;
    useEffect(() => { if (disabled)
        setDrag(null); }, [disabled]);
    // Автопрокрутка сторінки, коли палець або курсор біля верхнього чи нижнього краю екрана.
    useEffect(() => {
        if (!drag?.moved)
            return;
        const t = window.setInterval(() => {
            const d = dragRef.current;
            if (!d)
                return;
            const edge = 90;
            const dy = d.y < edge ? -(edge - d.y) / 5 : d.y > window.innerHeight - edge ? (d.y - (window.innerHeight - edge)) / 5 : 0;
            if (dy)
                window.scrollBy(0, dy);
        }, 16);
        return () => window.clearInterval(t);
    }, [drag?.moved]);
    const apply = (changes) => {
        if (disabled)
            return;
        const next = {};
        for (const r of q.matchingRows)
            next[r.id] = r.id in changes ? changes[r.id] : pairs[r.id] ?? null;
        if (!q.allowOptionReuse) {
            for (const [rowId, optId] of Object.entries(changes)) {
                if (!optId)
                    continue;
                for (const r of q.matchingRows)
                    if (r.id !== rowId && next[r.id] === optId && !(r.id in changes))
                        next[r.id] = null;
            }
        }
        onChange({ type: 'matching', pairs: next });
    };
    const letterOf = (optId) => LETTERS[q.matchingOptions.findIndex((o) => o.id === optId)];
    const optionOf = (optId) => q.matchingOptions.find((o) => o.id === optId);
    const used = new Set(Object.values(pairs).filter(Boolean));
    const bank = q.matchingOptions.filter((o) => q.allowOptionReuse || !used.has(o.id));
    const filled = q.matchingRows.filter((r) => pairs[r.id]).length;
    const rowAt = (x, y) => {
        const el = document.elementFromPoint(x, y)?.closest('[data-slot]');
        return el && el.getAttribute('data-q') === q.id ? el.getAttribute('data-slot') : null;
    };
    const onPointerDown = (e, optId, fromRow) => {
        if (disabled || (e.pointerType === 'mouse' && e.button !== 0))
            return;
        if (e.target.closest('.mchip__remove'))
            return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDrag({ optId, fromRow, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, overRow: null });
    };
    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (!d)
            return;
        const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4;
        setDrag({ ...d, x: e.clientX, y: e.clientY, moved, overRow: moved ? rowAt(e.clientX, e.clientY) : null });
    };
    const onPointerUp = (e) => {
        const d = dragRef.current;
        setDrag(null);
        if (!d?.moved)
            return;
        const row = rowAt(e.clientX, e.clientY);
        if (row && row !== d.fromRow) {
            const changes = { [row]: d.optId };
            if (d.fromRow)
                changes[d.fromRow] = pairs[row] ?? null; // обмін місцями
            apply(changes);
        }
        else if (!row && d.fromRow) {
            apply({ [d.fromRow]: null }); // витягнули з клітинки — варіант повертається в панель
        }
    };
    const handlers = { onPointerMove, onPointerUp, onPointerCancel: () => setDrag(null) };
    const ghost = drag?.moved ? optionOf(drag.optId) : null;
    return (_jsxs("div", { className: `dnd${disabled ? ' is-locked' : ''}`, children: [_jsx("div", { className: "dnd__rows", children: q.matchingRows.map((r, ri) => {
                    const opt = pairs[r.id] ? optionOf(pairs[r.id]) : null;
                    const over = drag?.overRow === r.id;
                    const dragging = drag?.moved && drag.fromRow === r.id;
                    return (_jsxs("div", { className: "dnd__row", children: [_jsxs("div", { className: "dnd__item", children: [_jsx("span", { className: "dnd__num", "aria-hidden": true, children: ri + 1 }), _jsxs("span", { className: "visually-hidden", children: ["\u041F\u0443\u043D\u043A\u0442 ", ri + 1, ": "] }), _jsx(RichText, { text: r.content })] }), _jsx("div", { className: `dnd__slot${over ? ' is-over' : ''}${opt ? ' is-filled' : ''}`, "data-slot": r.id, "data-q": q.id, "aria-label": `Клітинка пункту ${ri + 1}`, children: opt ? (_jsxs("div", { className: `mchip mchip--placed${dragging ? ' is-dragging' : ''}`, "aria-label": `Пункт ${ri + 1}: варіант ${letterOf(opt.id)}`, onPointerDown: (e) => onPointerDown(e, opt.id, r.id), ...handlers, children: [_jsx("span", { className: "mchip__letter", "aria-hidden": true, children: letterOf(opt.id) }), _jsx(RichText, { text: opt.content, className: "mchip__text" }), !disabled && (_jsx("button", { type: "button", className: "mchip__remove", onClick: () => apply({ [r.id]: null }), "aria-label": `Пункт ${ri + 1}: прибрати варіант ${letterOf(opt.id)}`, children: _jsx(X, { size: 16, "aria-hidden": true }) }))] })) : _jsx("span", { className: "dnd__drop", "aria-hidden": true }) })] }, r.id));
                }) }), _jsxs("div", { className: "dnd__bank", children: [_jsx("p", { className: "dnd__bank-title", children: "\u0412\u0430\u0440\u0456\u0430\u043D\u0442\u0438" }), bank.length === 0 ? _jsx("p", { className: "hint", children: "\u0423\u0441\u0456 \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0438 \u0440\u043E\u0437\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E." }) : (_jsx("ul", { className: "dnd__options", children: bank.map((o) => (_jsx("li", { children: _jsxs("div", { role: "button", "aria-disabled": disabled || undefined, className: `mchip${disabled ? ' is-disabled' : ''}${drag?.moved && drag.optId === o.id && !drag.fromRow ? ' is-dragging' : ''}`, "aria-label": `Варіант ${letterOf(o.id)}`, onPointerDown: (e) => onPointerDown(e, o.id, null), ...handlers, children: [_jsx("span", { className: "mchip__letter", "aria-hidden": true, children: letterOf(o.id) }), _jsx(RichText, { text: o.content, className: "mchip__text" })] }) }, o.id))) }))] }), _jsxs("p", { className: "dnd__status", "aria-live": "polite", children: ["\u0417\u0430\u043F\u043E\u0432\u043D\u0435\u043D\u043E ", filled, " \u0437 ", q.matchingRows.length, ".", !disabled && ' Перетягніть варіант у клітинку.'] }), ghost && drag && (_jsxs("div", { className: "mchip mchip--ghost", style: { left: drag.x, top: drag.y }, "aria-hidden": true, children: [_jsx("span", { className: "mchip__letter", children: letterOf(ghost.id) }), _jsx(RichText, { text: ghost.content, className: "mchip__text" })] }))] }));
}
