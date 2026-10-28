// Створює демонстраційний PDF-довідник (3 сторінки) для перевірки переглядача.
// Це не офіційний довідник НМТ. Запуск: node scripts/make-demo-reference.mjs
import katex from 'katex';

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const css = fs.readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8')
  .replace(/url\(fonts\//g, `url(file://${path.dirname(require.resolve('katex/dist/katex.min.css'))}/fonts/`);
const m = (tex) => katex.renderToString(tex, { displayMode: true, output: 'html' });

const pages = [
  ['Алгебра', [
    ['Формули скороченого множення', ['(a+b)^2=a^2+2ab+b^2', '(a-b)^2=a^2-2ab+b^2', 'a^2-b^2=(a-b)(a+b)']],
    ['Степені', ['a^m\\cdot a^n=a^{m+n}', '\\dfrac{a^m}{a^n}=a^{m-n}', 'a^{-n}=\\dfrac{1}{a^n}']],
    ['Квадратне рівняння', ['ax^2+bx+c=0,\\quad D=b^2-4ac', 'x_{1,2}=\\dfrac{-b\\pm\\sqrt{D}}{2a}']],
  ]],
  ['Логарифми та прогресії', [
    ['Логарифми', ['a^{\\log_a b}=b', '\\log_a(bc)=\\log_a b+\\log_a c', '\\log_a b^k=k\\log_a b']],
    ['Арифметична прогресія', ['a_n=a_1+(n-1)d', 'S_n=\\dfrac{a_1+a_n}{2}\\cdot n']],
    ['Геометрична прогресія', ['b_n=b_1q^{n-1}']],
  ]],
  ['Геометрія', [
    ['Трикутник', ['c^2=a^2+b^2 \\text{ (теорема Піфагора)}', 'S=\\tfrac12 ah']],
    ['Коло і круг', ['C=2\\pi r', 'S=\\pi r^2']],
    ['Тіла', ['V_{\\text{призми}}=S_{\\text{осн}}\\cdot h', 'V_{\\text{кулі}}=\\tfrac43\\pi R^3']],
  ]],
];

const html = `<!doctype html><html lang="uk"><head><meta charset="utf-8"><style>${css}
@page { size: A4; margin: 18mm; }
body { font-family: Inter, 'DejaVu Sans', Arial, sans-serif; color: #172033; }
section { page-break-after: always; } section:last-child { page-break-after: auto; }
.badge { display:inline-block; font-size: 11px; padding: 4px 8px; border-radius: 8px; background:#EFEDFF; color:#4B3FD1; }
h1 { font-size: 26px; margin: 12px 0 18px; } h2 { font-size: 17px; margin: 22px 0 4px; color:#0E6D86; }
.katex-display { margin: 6px 0; text-align:left; } .katex-display > .katex { text-align:left; }
footer { position: fixed; bottom: 0; font-size: 10px; color: #64748B; }
</style></head><body>
${pages.map(([title, groups], i) => `<section><span class="badge">Демонстраційний довідник · не офіційний матеріал НМТ</span>
<h1>${title}</h1>${groups.map(([g, fs]) => `<h2>${g}</h2>${fs.map(m).join('')}`).join('')}
<footer>Сторінка ${i + 1} з ${pages.length}</footer></section>`).join('')}
</body></html>`;

const out = path.resolve('public/content/sets/demo-tech/reference/demo-reference.pdf');
fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({ path: out, format: 'A4', printBackground: true });
await browser.close();
console.log('PDF:', out);
