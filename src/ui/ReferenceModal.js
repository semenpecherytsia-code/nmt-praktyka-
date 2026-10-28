import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from 'lucide-react';
import { resolveContentUrl } from '../content/urls';
import { Dialog } from './Dialog';
import { RichText } from './RichText';
const PdfPages = lazy(() => import('./PdfPages'));
const ZOOMS = [0.75, 1, 1.25, 1.5, 2];
export function ReferenceModal({ open, onClose, material, baseDir }) {
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(null);
    const [zoomIdx, setZoomIdx] = useState(1);
    const zoom = ZOOMS[zoomIdx];
    const onCount = useCallback((n) => { setCount(n); setPage((p) => Math.min(p, n)); }, []);
    const title = material?.title ?? 'Довідкові матеріали';
    if (!material) {
        return (_jsx(Dialog, { open: open, onClose: onClose, title: "\u0414\u043E\u0432\u0456\u0434\u043A\u043E\u0432\u0456 \u043C\u0430\u0442\u0435\u0440\u0456\u0430\u043B\u0438", titleId: "ref-title", size: "sm", children: _jsx("p", { className: "empty-state", children: "\u0414\u043E\u0432\u0456\u0434\u043A\u043E\u0432\u0456 \u043C\u0430\u0442\u0435\u0440\u0456\u0430\u043B\u0438 \u0449\u0435 \u043D\u0435 \u0434\u043E\u0434\u0430\u043D\u043E." }) }));
    }
    const total = material.kind === 'pdf' ? count : material.pages.length;
    const download = material.kind === 'pdf'
        ? (material.downloadable ? resolveContentUrl(material.src, baseDir) : null)
        : material.downloadSrc ? resolveContentUrl(material.downloadSrc, baseDir) : null;
    const toolbar = (_jsxs("div", { className: "ref-toolbar", role: "toolbar", "aria-label": "\u041A\u0435\u0440\u0443\u0432\u0430\u043D\u043D\u044F \u0434\u043E\u0432\u0456\u0434\u043D\u0438\u043A\u043E\u043C", children: [_jsxs("div", { className: "ref-toolbar__group", children: [_jsx("button", { type: "button", className: "btn btn--ghost btn--icon", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1, "aria-label": "\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u044F \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430", children: _jsx(ChevronLeft, { size: 20, "aria-hidden": true }) }), _jsxs("span", { className: "ref-toolbar__page", "aria-live": "polite", children: [_jsx("span", { className: "hide-xs", children: "\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0430 " }), page, total ? ` з ${total}` : ''] }), _jsx("button", { type: "button", className: "btn btn--ghost btn--icon", onClick: () => setPage((p) => (total ? Math.min(total, p + 1) : p)), disabled: !total || page >= total, "aria-label": "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0430 \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0430", children: _jsx(ChevronRight, { size: 20, "aria-hidden": true }) })] }), _jsxs("div", { className: "ref-toolbar__group", children: [_jsx("button", { type: "button", className: "btn btn--ghost btn--icon", onClick: () => setZoomIdx((z) => Math.max(0, z - 1)), disabled: zoomIdx === 0, "aria-label": "\u0417\u043C\u0435\u043D\u0448\u0438\u0442\u0438", children: _jsx(Minus, { size: 18, "aria-hidden": true }) }), _jsxs("span", { className: "ref-toolbar__zoom tabular", "aria-live": "polite", children: [Math.round(zoom * 100), " %"] }), _jsx("button", { type: "button", className: "btn btn--ghost btn--icon", onClick: () => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1)), disabled: zoomIdx === ZOOMS.length - 1, "aria-label": "\u0417\u0431\u0456\u043B\u044C\u0448\u0438\u0442\u0438", children: _jsx(Plus, { size: 18, "aria-hidden": true }) }), download && (_jsxs("a", { className: "btn btn--ghost btn--sm", href: download, download: true, target: "_blank", rel: "noopener", "aria-label": "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 PDF", title: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 PDF", children: [_jsx(Download, { size: 18, "aria-hidden": true }), " ", _jsx("span", { className: "hide-xs", children: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 PDF" }), _jsx("span", { className: "show-xs", children: "PDF" })] }))] })] }));
    return (_jsxs(Dialog, { open: open, onClose: onClose, title: title, titleId: "ref-title", size: "lg", className: "dialog--reference", children: [toolbar, _jsxs("div", { className: "ref-view", children: [material.kind === 'pages' && (_jsx("div", { className: "ref-page ref-page--rich", style: { fontSize: `${zoom}em` }, children: _jsx(RichText, { text: material.pages[page - 1] }) })), material.kind === 'images' && (() => {
                        const pg = material.pages[page - 1];
                        const src = pg ? resolveContentUrl(pg.src, baseDir) : null;
                        return src
                            ? _jsx("img", { className: "ref-image", src: src, alt: pg.alt, style: { width: `min(${Math.round(zoom * 100)}%, ${Math.round(zoom * 820)}px)` } })
                            : _jsx("p", { className: "empty-state", children: "\u0421\u0442\u043E\u0440\u0456\u043D\u043A\u0443 \u043D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438." });
                    })(), material.kind === 'pdf' && (() => {
                        const src = resolveContentUrl(material.src, baseDir);
                        if (!src)
                            return _jsx("p", { className: "empty-state", children: "\u0414\u043E\u0432\u0456\u0434\u043A\u043E\u0432\u0456 \u043C\u0430\u0442\u0435\u0440\u0456\u0430\u043B\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0456: \u043D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0430 \u0430\u0434\u0440\u0435\u0441\u0430 \u0444\u0430\u0439\u043B\u0430." });
                        return (_jsx(Suspense, { fallback: _jsx("p", { className: "empty-state", children: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F\u2026" }), children: _jsx(PdfPages, { src: src, page: page, zoom: zoom, onCount: onCount }) }));
                    })()] })] }));
}
