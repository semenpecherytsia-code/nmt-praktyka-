import { memo, useMemo } from 'react';
import katex from 'katex';
import { parseRichText, type Inline } from '../content/richtext';

// KaTeX у безпечному режимі (trust: false): \href, \url, \includegraphics та HTML-розширення вимкнені.
// Вихід містить і HTML (для вигляду), і MathML (для екранних читачів).
function renderMath(tex: string, display: boolean): string {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: 'ignore', output: 'htmlAndMathml' });
}

const MathNode = memo(function MathNode({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(() => renderMath(tex, display), [tex, display]);
  if (display) return <span className="math-block" dangerouslySetInnerHTML={{ __html: html }} />;
  return <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Розділовий знак одразу після формули не повинен сам переноситися на новий рядок: дописуємо його в формулу. */
const TRAIL = /^[.,;:!?…)]+/;
function gluePunctuation(xs: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const next = xs[i + 1];
    const m = x.t === 'math' && next?.t === 'text' ? next.v.match(TRAIL) : null;
    if (x.t === 'math' && m) {
      out.push({ ...x, v: `${x.v}\\text{${m[0]}}` });
      const rest = (next as { v: string }).v.slice(m[0].length);
      if (rest) out.push({ t: 'text', v: rest });
      i++;
    } else out.push(x);
  }
  return out;
}

function renderInline(xs: Inline[], keyPrefix = ''): React.ReactNode[] {
  return gluePunctuation(xs).map((x, i) => {
    const key = keyPrefix + i;
    switch (x.t) {
      case 'text': return <span key={key}>{x.v}</span>;
      case 'br': return <br key={key} />;
      case 'math': return <MathNode key={key} tex={x.v} display={x.display} />;
      case 'strong': return <strong key={key}>{renderInline(x.c, key + '.')}</strong>;
      case 'em': return <em key={key}>{renderInline(x.c, key + '.')}</em>;
    }
  });
}

export function RichText({ text, inline = false, className }: { text: string; inline?: boolean; className?: string }) {
  const blocks = useMemo(() => {
    try { return parseRichText(text); } catch { return [[{ t: 'text', v: text } as Inline]]; }
  }, [text]);
  if (inline) return <span className={className}>{blocks.map((b, i) => <span key={i}>{i > 0 && ' '}{renderInline(b)}</span>)}</span>;
  return <div className={['rich', className].filter(Boolean).join(' ')}>{blocks.map((b, i) => <p key={i}>{renderInline(b)}</p>)}</div>;
}
