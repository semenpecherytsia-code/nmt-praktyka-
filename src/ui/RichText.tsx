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

function renderInline(xs: Inline[], keyPrefix = ''): React.ReactNode[] {
  return xs.map((x, i) => {
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
