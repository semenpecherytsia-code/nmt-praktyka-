import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';
import { formatClock, plural } from './format';
const ANS = ['відповідь', 'відповіді', 'відповідей'];
const TASK = ['завдання', 'завдання', 'завдань'];
const DRAFT = ['чернетка', 'чернетки', 'чернеток'];
export function FinishDialog({ open, summary: s, deadlineAt, onCancel, onConfirm }) {
    const pending = s.draftOnly + s.savedWithChanges;
    const [apply, setApply] = useState(true);
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!open)
            return;
        setBusy(false);
        setApply(true);
        const t = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, [open]);
    return (_jsxs(Dialog, { open: open, onClose: onCancel, title: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0456\u044E?", titleId: "finish-title", size: "sm", footer: _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "btn btn--ghost", onClick: onCancel, children: "\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u0442\u0435\u0441\u0442" }), _jsx("button", { type: "button", className: "btn btn--primary", disabled: busy, onClick: () => { setBusy(true); onConfirm(pending > 0 && apply); }, children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0442\u0430 \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442" })] }), children: [_jsxs("dl", { className: "finish-stats", children: [_jsxs("div", { children: [_jsx("dt", { children: "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E" }), _jsxs("dd", { children: [s.saved, " ", _jsxs("span", { children: ["\u0437 ", s.total] })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u0411\u0435\u0437 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456" }), _jsx("dd", { children: s.empty })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u041D\u0435\u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0456 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0438" }), _jsx("dd", { children: pending })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u0417\u0430\u043B\u0438\u0448\u043E\u043A \u0447\u0430\u0441\u0443" }), _jsx("dd", { className: "tabular", children: formatClock(deadlineAt - now) })] })] }), s.empty > 0 && _jsxs("p", { className: "hint", children: [s.empty, " ", plural(s.empty, TASK), " \u0431\u0435\u0437 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456 \u043E\u0442\u0440\u0438\u043C\u0430\u044E\u0442\u044C 0 \u0431\u0430\u043B\u0456\u0432."] }), pending > 0 && (_jsxs("div", { className: "notice notice--warn", role: "note", children: [_jsx(AlertTriangle, { size: 18, "aria-hidden": true }), _jsxs("div", { children: [_jsxs("p", { children: ["\u0423 ", pending, " ", plural(pending, TASK), " \u0454 \u043D\u0435\u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0456 \u0437\u043C\u0456\u043D\u0438", s.savedWithChanges > 0 && ` (з них ${s.savedWithChanges} — поверх збереженої відповіді)`, ".", s.invalidDrafts > 0 && ` ${s.invalidDrafts} ${plural(s.invalidDrafts, DRAFT)} ${s.invalidDrafts === 1 ? 'некоректна' : 'некоректні'} і не ${s.invalidDrafts === 1 ? 'буде зарахована' : 'будуть зараховані'}.`] }), _jsxs("fieldset", { className: "radio-stack", children: [_jsx("legend", { className: "visually-hidden", children: "\u0429\u043E \u0437\u0440\u043E\u0431\u0438\u0442\u0438 \u0437 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0430\u043C\u0438" }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "drafts", checked: apply, onChange: () => setApply(true), disabled: s.applicableDrafts === 0 }), "\u0417\u0430\u0441\u0442\u043E\u0441\u0443\u0432\u0430\u0442\u0438 \u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0456 \u0447\u0435\u0440\u043D\u0435\u0442\u043A\u0438 (", s.applicableDrafts, ") \u0456 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "drafts", checked: !apply || s.applicableDrafts === 0, onChange: () => setApply(false) }), "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u043B\u0438\u0448\u0435 \u0437\u0456 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0438\u043C\u0438 ", plural(2, ANS)] })] })] })] }))] }));
}
