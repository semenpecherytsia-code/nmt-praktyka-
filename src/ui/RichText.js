import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo } from 'react';
import katex from 'katex';
import { parseRichText } from '../content/richtext';
// KaTeX у безпечному режимі (trust: false): \href, \url, \includegraphics та HTML-розширення вимкнені.
// Вихід містить і HTML (для вигляду), і MathML (для екранних читачів).
function renderMath(tex, display) {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: 'ignore', output: 'htmlAndMathml' });
}
const MathNode = memo(function MathNode({ tex, display }) {
    const html = useMemo(() => renderMath(tex, display), [tex, display]);
    if (display)
        return _jsx("span", { className: "math-block", dangerouslySetInnerHTML: { __html: html } });
    return _jsx("span", { className: "math-inline", dangerouslySetInnerHTML: { __html: html } });
});
function renderInline(xs, keyPrefix = '') {
    return xs.map((x, i) => {
        const key = keyPrefix + i;
        switch (x.t) {
            case 'text': return _jsx("span", { children: x.v }, key);
            case 'br': return _jsx("br", {}, key);
            case 'math': return _jsx(MathNode, { tex: x.v, display: x.display }, key);
            case 'strong': return _jsx("strong", { children: renderInline(x.c, key + '.') }, key);
            case 'em': return _jsx("em", { children: renderInline(x.c, key + '.') }, key);
        }
    });
}
export function RichText({ text, inline = false, className }) {
    const blocks = useMemo(() => {
        try {
            return parseRichText(text);
        }
        catch {
            return [[{ t: 'text', v: text }]];
        }
    }, [text]);
    if (inline)
        return _jsx("span", { className: className, children: blocks.map((b, i) => _jsxs("span", { children: [i > 0 && ' ', renderInline(b)] }, i)) });
    return _jsx("div", { className: ['rich', className].filter(Boolean).join(' '), children: blocks.map((b, i) => _jsx("p", { children: renderInline(b) }, i)) });
}
