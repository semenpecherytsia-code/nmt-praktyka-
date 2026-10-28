import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { numericErrorText, parseNumeric } from '../../engine/numeric';
export function Numeric({ q, value, onChange, onSubmit, disabled }) {
    const raw = value?.type === 'numeric' ? value.raw : '';
    const [touched, setTouched] = useState(false);
    const parsed = parseNumeric(raw, { allowFractions: q.numericRule.allowFractions });
    const error = touched && !parsed.ok && parsed.reason !== 'empty' ? numericErrorText(parsed.reason) : null;
    const inputId = `${q.id}-input`;
    return (_jsxs("div", { className: "numeric", children: [_jsx("label", { htmlFor: inputId, className: "numeric__label", children: "\u0412\u0430\u0448\u0430 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C" }), _jsx("input", { id: inputId, className: `numeric__input${error ? ' is-invalid' : ''}`, type: "text", inputMode: "decimal", autoComplete: "off", autoCorrect: "off", spellCheck: false, enterKeyHint: "done", value: raw, readOnly: disabled, "aria-readonly": disabled || undefined, maxLength: 40, "aria-invalid": !!error, "aria-describedby": error ? `${inputId}-err` : undefined, onChange: (e) => onChange({ type: 'numeric', raw: e.target.value }), onBlur: () => setTouched(true), onKeyDown: (e) => { if (e.key === 'Enter' && !disabled) {
                    setTouched(true);
                    onSubmit();
                } } }), _jsx("p", { id: `${inputId}-err`, className: "field-error", "aria-live": "polite", children: error })] }));
}
