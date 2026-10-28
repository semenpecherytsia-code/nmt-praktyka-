import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RichText } from '../RichText';
import { LETTERS } from '../format';
export function SingleChoice({ q, value, onChange, labelledBy, disabled }) {
    const selected = value?.type === 'single_choice' ? value.optionId : null;
    return (_jsx("div", { role: "radiogroup", "aria-labelledby": labelledBy, "aria-disabled": disabled || undefined, className: `choice-list${disabled ? ' is-locked' : ''}`, children: q.options.map((o, i) => {
            const id = `${q.id}-${o.id}`;
            const checked = selected === o.id;
            return (_jsxs("label", { htmlFor: id, className: `choice${checked ? ' is-selected' : ''}`, children: [_jsx("input", { id: id, type: "radio", name: `answer-${q.id}`, value: o.id, checked: checked, disabled: disabled, onChange: () => onChange({ type: 'single_choice', optionId: o.id }) }), _jsx("span", { className: "choice__letter", "aria-hidden": true, children: LETTERS[i] }), _jsxs("span", { className: "visually-hidden", children: ["\u0412\u0430\u0440\u0456\u0430\u043D\u0442 ", LETTERS[i], ": "] }), _jsx(RichText, { text: o.content, className: "choice__content" })] }, o.id));
        }) }));
}
