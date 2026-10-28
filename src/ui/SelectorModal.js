import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { Dialog } from './Dialog';
import { formatMinutes, plural } from './format';
/** Компактний вибір: лише набори, що реально підключені й пройшли перевірку. */
export function SelectorModal({ open, onClose, sets, currentId, onPick }) {
    const available = sets.filter((s) => s.status === 'available' && s.pkg);
    return (_jsx(Dialog, { open: open, onClose: onClose, title: "\u041E\u0431\u0440\u0430\u0442\u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0456\u044E", titleId: "selector-title", size: "sm", children: available.length === 0 ? _jsx("p", { className: "empty-state", children: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0445 \u043D\u0430\u0431\u043E\u0440\u0456\u0432 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454." }) : (_jsx("ul", { className: "selector", children: available.map((s) => {
                const sim = s.pkg.simulation;
                const cur = sim.id === currentId;
                return (_jsx("li", { children: _jsxs("button", { type: "button", className: `selector__item${cur ? ' is-current' : ''}`, "aria-current": cur ? 'true' : undefined, onClick: () => onPick(sim.id), children: [_jsx("span", { className: "selector__title", children: sim.title }), _jsxs("span", { className: "selector__meta", children: [sim.orderedQuestionIds.length, " ", plural(sim.orderedQuestionIds.length, ['завдання', 'завдання', 'завдань']), " \u00B7 ", formatMinutes(sim.durationSeconds), sim.isDemo && _jsx("span", { className: "badge badge--demo", children: "\u0414\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0456\u0439\u043D\u0438\u0439" })] }), cur && _jsx(Check, { size: 18, "aria-label": "\u041E\u0431\u0440\u0430\u043D\u043E" })] }) }, sim.id));
            }) })) }));
}
