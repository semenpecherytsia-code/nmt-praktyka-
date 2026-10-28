import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { resolveContentUrl } from '../content/urls';
import { RichText } from './RichText';
import { Dialog } from './Dialog';
/** Рисунок зберігає пропорції; натискання відкриває збільшений перегляд. */
export function Figure({ asset, baseDir }) {
    const [zoom, setZoom] = useState(false);
    const src = resolveContentUrl(asset.src, baseDir);
    if (!src)
        return _jsx("p", { className: "notice notice--warn", children: "\u0420\u0438\u0441\u0443\u043D\u043E\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439: \u043D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0430 \u0430\u0434\u0440\u0435\u0441\u0430." });
    const ratio = asset.width && asset.height ? `${asset.width} / ${asset.height}` : undefined;
    return (_jsxs("figure", { className: "figure", children: [_jsxs("button", { type: "button", className: "figure__btn", onClick: () => setZoom(true), "aria-label": `Збільшити рисунок: ${asset.alt}`, children: [_jsx("img", { src: src, alt: asset.alt, loading: "lazy", decoding: "async", width: asset.width, height: asset.height, style: { aspectRatio: ratio, maxWidth: asset.width ? `min(100%, ${asset.width}px)` : '100%' } }), _jsx("span", { className: "figure__zoom", "aria-hidden": true, children: _jsx(ZoomIn, { size: 16 }) })] }), asset.caption && _jsx("figcaption", { children: _jsx(RichText, { text: asset.caption }) }), _jsx(Dialog, { open: zoom, onClose: () => setZoom(false), title: "\u0420\u0438\u0441\u0443\u043D\u043E\u043A", titleId: `fig-${asset.id}`, size: "lg", children: _jsx("img", { src: src, alt: asset.alt, className: "figure__large" }) })] }));
}
