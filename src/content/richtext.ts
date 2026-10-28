// Розбір обмеженого текстового формату. HTML не підтримується: будь-які теги
// показуються як звичайний текст. Формули передаються KaTeX у безпечному режимі.
//
//   порожній рядок      — новий абзац
//   перенесення рядка   — розрив рядка
//   $...$               — формула в рядку
//   $$...$$             — формула окремим блоком
//   **текст** / *текст* — жирний / курсив
//   \$                  — знак долара

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'br' }
  | { t: 'math'; v: string; display: boolean }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] };

export type Block = Inline[];

export class RichTextError extends Error {}

function parseEmphasis(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: 'strong', c: [{ t: 'text', v: m[1] }] });
    else out.push({ t: 'em', c: [{ t: 'text', v: m[2] }] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

function parseLine(line: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  let i = 0;
  const flush = () => { if (buf) { out.push(...parseEmphasis(buf)); buf = ''; } };
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (ch === '$') {
      const display = line[i + 1] === '$';
      const open = display ? 2 : 1;
      const close = display ? line.indexOf('$$', i + 2) : findInlineClose(line, i + 1);
      if (close < 0) throw new RichTextError(`незакрита формула, що починається з «${line.slice(i, i + 20)}»`);
      const tex = line.slice(i + open, close);
      if (!tex.trim()) throw new RichTextError('порожня формула');
      flush();
      out.push({ t: 'math', v: tex, display });
      i = close + open;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

function findInlineClose(line: string, from: number): number {
  for (let j = from; j < line.length; j++) {
    if (line[j] === '\\') { j++; continue; }
    if (line[j] === '$') return j;
  }
  return -1;
}

export function parseRichText(src: string): Block[] {
  return src
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const lines = p.split('\n');
      const block: Inline[] = [];
      lines.forEach((l, idx) => {
        if (idx > 0) block.push({ t: 'br' });
        block.push(...parseLine(l));
      });
      return block;
    });
}

export function collectMath(blocks: Block[]): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const walk = (xs: Inline[]) => xs.forEach((x) => {
    if (x.t === 'math') out.push({ tex: x.v, display: x.display });
    else if (x.t === 'strong' || x.t === 'em') walk(x.c);
  });
  blocks.forEach(walk);
  return out;
}
