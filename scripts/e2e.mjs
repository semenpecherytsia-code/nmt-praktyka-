// Наскрізна перевірка в Chromium (Playwright): npm run build && npm run e2e
// Запускає `vite preview`, проходить сценарій і зберігає знімки екрана в ./e2e-shots.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
fs.mkdirSync('e2e-shots', { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview не запустився')), 20000);
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) { clearTimeout(t); res(); } });
});

let passed = 0;
const failures = [];
const consoleErrors = [];
async function step(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); console.log('  ✗', name, '\n     ', e.message.split('\n').slice(0, 8).join('\n      ')); }
}
function assert(c, msg) { if (!c) throw new Error(msg); }

const browser = await chromium.launch();
function watch(page) {
  page.setDefaultTimeout(8000);
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} pageerror ${e.message}`));
}
async function noHScroll(page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert(sw <= iw, `горизонтальна прокрутка: ${sw} > ${iw}`);
}
const timerSeconds = async (page) => {
  const t = (await page.locator('.exam-side .timer__value').innerText()).trim();
  const p = t.split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
};

// ---------- компʼютер 1280 ----------
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'uk-UA' });
const page = await ctx.newPage();
watch(page);
console.log('Компʼютер 1280 px');

await step('стартовий екран: №23, логотип веде на головну, без сторонньої навігації', async () => {
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Симуляція НМТ №23' }).waitFor();
  const stats = await page.locator('.start-stats').innerText();
  assert(/22/.test(stats) && /90 хв/.test(stats) && /32/.test(stats), stats);
  const body = await page.locator('body').innerText();
  for (const bad of ['Matanschool', 'matanschool', 'Курси', 'Меню', 'Демонстраційний']) assert(!body.includes(bad), `знайдено «${bad}»`);
  assert(await page.locator('a.brand').getAttribute('href') === '#/', 'логотип не веде на головну');
  await page.getByRole('button', { name: 'Обрати симуляцію' }).click();
  assert(await page.locator('.selector__item').count() === 1, 'у виборі не 1 набір');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'e2e-shots/01-home-1280.png', fullPage: true });
});

await step('довідник до старту: 3 сторінки-зображення, Escape, повернення фокуса, таймер не стартує', async () => {
  const btn = page.getByRole('button', { name: 'Довідкові матеріали' });
  await btn.click();
  await page.getByText('Сторінка 1 з 3').waitFor({ timeout: 15000 });
  await page.locator('dialog[open] img.ref-image').waitFor();
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await page.getByText('Сторінка 2 з 3').waitFor();
  await page.getByRole('button', { name: 'Збільшити' }).click();
  await page.getByText('125 %').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e-shots/03-reference-1280.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  assert(!(await page.locator('dialog[open]').count()), 'діалог не закрився');
  assert(await btn.evaluate((el) => el === document.activeElement), 'фокус не повернувся');
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('nmt.v1.attempts') || '[]').length);
  assert(n === 0, 'спробу створено до старту');
});

let attemptId;
await step('старт: 90 хвилин, 22 номери, перша стрілка вимкнена', async () => {
  await page.getByRole('button', { name: 'Розпочати симуляцію' }).click();
  await page.waitForURL(/#\/attempt\/.+\/q\/1$/);
  attemptId = page.url().match(/attempt\/([^/]+)/)[1];
  const s = await timerSeconds(page);
  assert(s <= 5400 && s >= 5390, `таймер ${s}`);
  assert(await page.locator('.exam-side .qcell').count() === 22, 'не 22 номери');
  assert(await page.locator('.exam-side').getByRole('button', { name: 'Попереднє завдання' }).isDisabled(), 'стрілка «Попереднє» активна');
  await page.getByText('Збережено відповідей:').first().waitFor();
});

await step('збереження: перехід на наступне, відповідь не змінюється (завдання 1)', async () => {
  const save = page.getByRole('button', { name: 'Зберегти відповідь' });
  assert(await save.isDisabled(), 'кнопка активна без вводу');
  assert(!(await save.locator('svg').count()), 'на кнопці є значок');
  await page.locator('.choice').nth(0).click();
  await page.locator('.choice').nth(2).click();
  assert(await page.locator('.choice.is-selected').count() === 1, 'обрано кілька варіантів');
  await save.click();
  await page.waitForURL(/q\/2$/);
  assert((await page.locator('.exam-side').innerText()).includes('1 із 22'), 'лічильник не 1 із 22');
  assert(await page.locator('.choice.is-selected').count() === 0, 'щось обрано автоматично');
  assert(await page.evaluate(() => document.activeElement?.tagName) === 'H1', 'фокус не на заголовку');
  await page.locator('.exam-side .qcell').nth(0).click();
  await page.waitForURL(/q\/1$/);
  await page.getByRole('status').filter({ hasText: 'Змінити її не можна' }).waitFor();
  assert(!(await page.getByRole('button', { name: 'Зберегти відповідь' }).count()), 'кнопка збереження лишилася');
  await page.locator('.choice').nth(3).click({ force: true });
  assert(await page.locator('.choice').nth(2).evaluate((e) => e.classList.contains('is-selected')), 'збережену відповідь змінено');
  const overflow = await page.locator('.choice__content').evaluateAll((els) => els.filter((e) => getComputedStyle(e).overflowY !== 'hidden').length);
  assert(overflow === 0, 'у варіантах можлива вертикальна прокрутка');
  await page.screenshot({ path: 'e2e-shots/04-exam-single-locked-1280.png' });
  await page.locator('.exam-side .qcell').nth(1).click();
  await page.waitForURL(/q\/2$/);
  await page.locator('.choice').nth(0).click(); // свідомо неправильна відповідь
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await page.waitForURL(/q\/3$/);
});

async function touchDrag(p, from, to) {
  const cdp = await p.context().newCDPSession(p);
  await from.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const a = await from.boundingBox(); const b = await to.boundingBox();
  const pt = (x, y) => [{ x, y, id: 1 }];
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(ax, ay) });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(ax + (bx - ax) * i / 10, ay + (by - ay) * i / 10) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await p.waitForTimeout(400);
}

async function dragChip(letter, row) {
  const chip = page.getByRole('button', { name: `Варіант ${letter}`, exact: true });
  const slot = page.locator('.dnd__slot').nth(row - 1);
  await page.locator('.dnd').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const a = await chip.boundingBox(); const b = await slot.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

await step('відповідності перетягуванням (16, 17)', async () => {
  await page.locator('.exam-side .qcell').nth(15).click();
  await page.waitForURL(/q\/16$/);
  await dragChip('В', 1);
  await page.getByRole('button', { name: 'Пункт 1: прибрати варіант В' }).waitFor();
  assert(!(await page.getByRole('button', { name: 'Варіант В', exact: true }).count()), 'використаний варіант лишився в списку');
  await dragChip('Г', 2);
  await page.getByRole('button', { name: 'Варіант Б', exact: true }).click(); // натискання нічого не ставить
  await page.locator('.dnd__status', { hasText: 'Заповнено 2 з 3' }).waitFor();
  await dragChip('Б', 3);
  await page.locator('.dnd__status', { hasText: 'Заповнено 3 з 3' }).waitFor();
  await page.screenshot({ path: 'e2e-shots/05-exam-matching-1280.png', fullPage: true });
  // прибрати й повернути
  await page.getByRole('button', { name: 'Пункт 3: прибрати варіант Б' }).click();
  await page.locator('.dnd__status', { hasText: 'Заповнено 2 з 3' }).waitFor();
  await dragChip('Б', 3);
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await page.waitForURL(/q\/17$/);
  await dragChip('В', 1);
  await page.locator('.dnd__status', { hasText: 'Заповнено 1 з 3' }).waitFor();
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await page.waitForURL(/q\/18$/);
});

await step('відповідності (18): обмін місцями, варіант не повторюється, 16 заблоковано', async () => {
  await dragChip('В', 1);
  await dragChip('Б', 2);
  // перетягнути поставлений варіант з клітинки 1 у клітинку 2 — вони міняються місцями
  {
    await page.locator('.dnd').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    const a = await page.locator('.dnd__slot').nth(0).locator('.mchip').boundingBox();
    const b = await page.locator('.dnd__slot').nth(1).boundingBox();
    await page.mouse.move(a.x + 20, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x + 40, a.y + a.height / 2, { steps: 3 });
    await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
  }
  await page.getByRole('button', { name: 'Пункт 1: прибрати варіант Б' }).waitFor();
  await page.getByRole('button', { name: 'Пункт 2: прибрати варіант В' }).waitFor();
  await page.getByRole('button', { name: 'Пункт 2: прибрати варіант В' }).click();
  await dragChip('В', 2);
  assert(!(await page.getByRole('button', { name: 'Варіант В', exact: true }).count()), 'варіант можна використати двічі');
  await dragChip('А', 3);
  await page.locator('.dnd__status', { hasText: 'Заповнено 3 з 3' }).waitFor();
  assert(await page.getByRole('button', { name: 'Зберегти відповідь' }).isEnabled(), 'збереження вимкнене');
  await page.locator('.exam-side .qcell').nth(15).click();
  await page.waitForURL(/q\/16$/);
  await page.getByRole('status').filter({ hasText: 'Змінити її не можна' }).waitFor();
  assert(!(await page.locator('.mchip__remove').count()), 'збережену відповідність можна прибрати');
  assert(await page.getByRole('button', { name: 'Варіант А', exact: true }).isDisabled(), 'варіанти активні');
});

await step('числовий ввід: Unicode-мінус, кома, некоректний текст, дріб', async () => {
  const go = async (n) => { await page.locator('.exam-side .qcell').nth(n - 1).click(); await page.waitForURL(new RegExp(`q/${n}$`)); };
  const input = page.getByLabel('Ваша відповідь');
  await go(19);
  await input.fill('  −3 ');
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await page.waitForURL(/q\/20$/);
  await input.fill('1,5'); // лише чернетка
  await go(21);
  await input.fill('abc');
  await input.blur();
  await page.getByText(/Введіть ціле або десяткове число/).waitFor();
  assert(await page.getByRole('button', { name: 'Зберегти відповідь' }).isDisabled(), 'некоректне число можна зберегти');
  await input.fill('');
  assert(await page.getByRole('button', { name: 'Зберегти відповідь' }).isDisabled(), 'порожнє поле можна зберегти');
  await input.fill('Infinity');
  assert(await page.getByRole('button', { name: 'Зберегти відповідь' }).isDisabled(), 'Infinity можна зберегти');
  await input.fill('abc');
  await go(22);
  await input.fill('3/8');
  await input.blur();
  assert(await page.getByRole('button', { name: 'Зберегти відповідь' }).isDisabled(), 'дріб приймається там, де його не дозволено');
  await input.fill('1');
  await input.press('Enter');
  await page.getByRole('status').filter({ hasText: 'Змінити її не можна' }).waitFor();
  assert(await input.getAttribute('readonly') !== null, 'числове поле не заблоковане');
  await page.screenshot({ path: 'e2e-shots/06-exam-numeric-1280.png' });
});

await step('позначка для перегляду', async () => {
  await page.locator('.exam-side .qcell').nth(4).click();
  const flag = page.getByRole('button', { name: 'Позначити для перегляду' });
  await flag.click();
  await page.locator('[aria-pressed="true"]').filter({ hasText: 'Позначено для перегляду' }).waitFor();
  assert(await page.locator('.exam-side .qcell').nth(4).evaluate((e) => e.classList.contains('is-flagged')), 'немає прапорця в сітці');
});

await step('перезавантаження: чернетка й позиція зберігаються', async () => {
  await page.locator('.exam-side .qcell').nth(19).click();
  await page.reload();
  await page.waitForURL(/q\/20$/);
  assert(await page.getByLabel('Ваша відповідь').inputValue() === '1,5', 'чернетка зникла');
  await page.goto(BASE + '#/');
  await page.getByRole('button', { name: 'Продовжити' }).waitFor();
  await page.getByText('Залишилось').waitFor();
  assert(!(await page.getByRole('button', { name: 'Обрати симуляцію' }).count()), 'під час тесту можна обрати іншу симуляцію');
  await page.getByRole('button', { name: 'Завершити тест' }).click();
  await page.locator('dialog[open]').getByText('Завершити тест?').waitFor();
  await page.locator('dialog[open]').getByRole('button', { name: 'Скасувати' }).click();
  await page.getByRole('button', { name: 'Продовжити' }).click();
  await page.waitForURL(/q\/20$/);
});

await step('довідник під час тесту: таймер іде, Escape повертає фокус', async () => {
  const before = await timerSeconds(page);
  const btn = page.getByRole('button', { name: /Довідкові матеріали/ });
  await btn.click();
  await page.getByText('Сторінка 1 з 3').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const after = await timerSeconds(page);
  assert(before - after >= 2, `таймер стояв: ${before} → ${after}`);
  assert(await btn.evaluate((el) => el === document.activeElement), 'фокус не повернувся');
});

await step('завершення: точні лічильники й попередження про чернетки', async () => {
  await page.getByRole('button', { name: 'Завершити симуляцію' }).click();
  const dlg = page.locator('dialog[open]');
  await dlg.getByText('Завершити симуляцію?').waitFor();
  const t = await dlg.innerText();
  // збережено: 1,2,16,17,19,22 = 6; чернетки: 18 (кор.), 20 (кор.), 21 (некор.) = 3; порожні 13
  assert(/Збережено\s*6\s*з 22/.test(t), 'збережено ≠ 6: ' + t);
  assert(/Без відповіді\s*13/.test(t), 'без відповіді ≠ 13: ' + t);
  assert(/Незбережені чернетки\s*3/.test(t), 'чернеток ≠ 3: ' + t);
  assert(t.includes('1 чернетка некоректна'), 'немає згадки про некоректну чернетку');
  await page.screenshot({ path: 'e2e-shots/07-finish-dialog-1280.png' });
  await dlg.getByRole('button', { name: 'Продовжити тест' }).click();
  await page.getByRole('button', { name: 'Завершити симуляцію' }).click();
  await page.getByLabel(/Застосувати коректні чернетки \(2\)/).check();
  const fin = page.getByRole('button', { name: 'Завершити та переглянути результат' });
  await fin.dblclick();
  await page.waitForURL(/review$/);
});

await step('результат: 9 з 32, лічильники та відсоток', async () => {
  await page.getByRole('heading', { name: 'Результат' }).waitFor();
  const t = await page.locator('.result').innerText();
  assert(/9\s*з 32 первинних балів/.test(t), t);
  assert(t.includes('28,1 %'), 'відсоток');
  assert(/131/.test(t), 'немає бала НМТ 131: ' + t);
  const counts = await page.locator('.result__counts').innerText();
  assert(/3\s*повністю правильно/.test(counts) && /2\s*частково/.test(counts) && /3\s*неправильно/.test(counts) && /14\s*без відповіді/.test(counts), counts);
  const finished = await page.evaluate(() => JSON.parse(localStorage.getItem('nmt.v1.attempts')).map((id) => JSON.parse(localStorage.getItem('nmt.v1.attempt.' + id))).filter((a) => a.status === 'finished').length);
  assert(finished === 1, `завершених спроб ${finished}`);
  await page.screenshot({ path: 'e2e-shots/08-review-top-1280.png' });
});

await step('розбір: 22 картки, фільтри з вихідними номерами', async () => {
  assert(await page.locator('.rcard').count() === 22, 'не 22 картки');
  await page.getByRole('button', { name: /^Частково/ }).click();
  assert((await page.locator('.rcard h2').allInnerTexts()).join() === 'Завдання 17,Завдання 18', 'фільтр «Частково»');
  await page.getByRole('button', { name: /^Помилки/ }).click();
  assert((await page.locator('.rcard h2').allInnerTexts()).join() === 'Завдання 2,Завдання 19,Завдання 20', 'фільтр «Помилки»');
  await page.getByRole('button', { name: /^Без відповіді/ }).click();
  assert(await page.locator('.rcard').count() === 14, 'фільтр «Без відповіді»');
  assert((await page.locator('.rcard').filter({ hasText: 'Завдання 21' }).innerText()).includes('Відповідь не надано'), '21 має бути без відповіді');
  await page.getByRole('button', { name: /^Усі/ }).click();
  const c17 = await page.locator('#review-q-17').innerText();
  assert(c17.includes('Правильних відповідностей: 1 з 3') && c17.includes('1 бал з 3'), 'частковий бал 17');
  const c19 = await page.locator('#review-q-19').innerText();
  assert(c19.includes('−3') && c19.includes('0 балів з 2'), '19');
  await page.locator('#review-q-17').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'e2e-shots/09-review-matching-1280.png' });
});

await step('сітка розбору прокручує до картки', async () => {
  await page.locator('.exam-side .qcell').nth(20).click();
  await page.waitForTimeout(700);
  const top = await page.locator('#review-q-21').evaluate((e) => e.getBoundingClientRect().top);
  assert(top > -5 && top < 200, `картка 21 не у видимій зоні (${top})`);
});

await step('відео: доки його не додано, показується «ще не додано», без плеєрів', async () => {
  await page.locator('#review-q-1').scrollIntoViewIfNeeded();
  assert((await page.locator('#review-q-1 .video--missing').innerText()).includes('Відеопояснення ще не додано'), '1 без позначки');
  assert(await page.locator('video').count() === 0, 'з’явився порожній плеєр');
  await page.screenshot({ path: 'e2e-shots/10-review-q1-1280.png' });
});

await step('завершену спробу не можна змінити через адресу питання', async () => {
  await page.goto(BASE + `#/attempt/${attemptId}/q/3`);
  await page.waitForURL(/review$/);
});

let attempt2;
await step('«Пройти ще раз»: нова спроба, новий таймер, старий результат зберігся', async () => {
  await page.getByRole('button', { name: 'Пройти ще раз' }).first().click();
  await page.waitForURL(/q\/1$/);
  attempt2 = page.url().match(/attempt\/([^/]+)/)[1];
  assert(attempt2 !== attemptId, 'та сама спроба');
  assert(await timerSeconds(page) >= 5395, 'таймер не новий');
  assert(await page.locator('.exam-side .qcell--saved').count() === 0, 'відповіді перенеслися');
  await page.goto(BASE + `#/attempt/${attempt2}/review`);
  await page.waitForURL(/q\/1$/);
  assert(!(await page.getByText('Розв’язання').count()), 'розбір незавершеної спроби відкрився');
  await page.goto(BASE + '#/');
  await page.getByText('Попередні спроби').waitFor();
  assert((await page.locator('.history').innerText()).includes('9 з 32'), 'старого результату немає');
});

await step('друга вкладка з тією самою спробою отримує попередження', async () => {
  const p2 = await ctx.newPage();
  watch(p2);
  await page.goto(BASE + `#/attempt/${attempt2}/q/1`);
  await page.waitForTimeout(300);
  await p2.goto(BASE + `#/attempt/${attempt2}/q/1`);
  await p2.getByText('Спробу відкрито в іншій вкладці').waitFor();
  await p2.screenshot({ path: 'e2e-shots/11-second-tab-1280.png' });
  await p2.getByRole('button', { name: 'Працювати тут' }).click();
  await page.getByText('Спробу відкрито в іншій вкладці').waitFor({ timeout: 6000 });
  await p2.close();
});

await step('закінчення часу: одне автоматичне завершення із зарахуванням коректних чернеток', async () => {
  await page.goto(BASE + `#/attempt/${attempt2}/q/19`);
  await page.getByRole('button', { name: 'Працювати тут' }).click().catch(() => {});
  await page.getByLabel('Ваша відповідь').fill('6'); // чернетка без збереження
  await page.waitForTimeout(200);
  await page.evaluate((id) => {
    const k = 'nmt.v1.attempt.' + id;
    const a = JSON.parse(localStorage.getItem(k));
    a.deadlineAt = Date.now() + 1500; a.revision += 1;
    localStorage.setItem(k, JSON.stringify(a));
  }, attempt2);
  await page.reload();
  await page.waitForURL(/review$/, { timeout: 8000 });
  const t = await page.locator('.result').innerText();
  assert(t.includes('Час вичерпано'), 'немає позначки часу');
  assert(/2\s*з 32/.test(t), 'чернетку не зараховано: ' + t.slice(0, 200));
  await page.reload();
  const finished = await page.evaluate(() => JSON.parse(localStorage.getItem('nmt.v1.attempts')).map((id) => JSON.parse(localStorage.getItem('nmt.v1.attempt.' + id))).filter((a) => a.status === 'finished').length);
  assert(finished === 2, `завершених спроб ${finished}`);
});

await step('ширини 1440 і 768 без горизонтальної прокрутки', async () => {
  await page.goto(BASE + '#/');
  await page.getByRole('button', { name: 'Розпочати симуляцію' }).click();
  await page.waitForURL(/q\/1$/);
  for (const w of [1440, 768]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const n of [1, 14, 16, 5]) {
      await page.goto(page.url().replace(/q\/\d+$/, `q/${n}`));
      await page.waitForTimeout(150);
      await noHScroll(page);
    }
    await page.goto(page.url().replace(/q\/\d+$/, 'q/16'));
    await page.screenshot({ path: `e2e-shots/12-exam-matching-${w}.png`, fullPage: true });
    await page.goto(BASE + `#/attempt/${attemptId}/review`);
    await page.waitForTimeout(200);
    await noHScroll(page);
    await page.screenshot({ path: `e2e-shots/13-review-${w}.png` });
    await page.goBack();
    await page.waitForTimeout(150);
  }
});
await ctx.close();

// ---------- телефон ----------
for (const w of [360, 390]) {
  console.log(`Телефон ${w} px`);
  const m = await browser.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'uk-UA' });
  const p = await m.newPage();
  watch(p);
  await step(`${w}: старт, сітка в аркуші, відповідності дотиком, без горизонтальної прокрутки`, async () => {
    await p.goto(BASE + '#/sim/nmt-23');
    await p.getByRole('button', { name: 'Розпочати симуляцію' }).waitFor();
    await noHScroll(p);
    await p.getByRole('button', { name: 'Розпочати симуляцію' }).tap();
    await p.waitForURL(/q\/1$/);
    await noHScroll(p);
    await p.screenshot({ path: `e2e-shots/20-mobile-${w}-q1.png` });
    await p.getByRole('button', { name: /1 \/ 22/ }).tap();
    await p.locator('dialog[open] .qcell').nth(15).tap();
    await p.waitForURL(/q\/16$/);
    await touchDrag(p, p.getByRole('button', { name: 'Варіант Г', exact: true }), p.locator('.dnd__slot').nth(0));
    await touchDrag(p, p.getByRole('button', { name: 'Варіант Б', exact: true }), p.locator('.dnd__slot').nth(1));
    const cols = await p.evaluate(() => { const a = document.querySelector('.dnd__rows').getBoundingClientRect(), b = document.querySelector('.dnd__bank').getBoundingClientRect(); return b.left > a.right - 1; });
    assert(cols, 'на телефоні варіанти не праворуч від пунктів');
    await p.locator('.dnd__status', { hasText: 'Заповнено 2 з 3' }).waitFor();
    await noHScroll(p);
    await p.screenshot({ path: `e2e-shots/21-mobile-${w}-matching.png`, fullPage: true });
    await p.getByRole('button', { name: 'Зберегти відповідь' }).tap();
    await p.waitForURL(/q\/17$/);
    for (const n of [5, 9, 14, 22]) {
      await p.goto(p.url().replace(/q\/\d+$/, `q/${n}`));
      await p.waitForTimeout(150);
      await noHScroll(p);
    }
    await p.screenshot({ path: `e2e-shots/22-mobile-${w}-numeric.png` });
    const small = await p.evaluate(() => [...document.querySelectorAll('button:not(:disabled), .choice, .mchip, input[type=text], a.btn')]
      .filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 40).length);
    assert(small === 0, `${small} елементів менші за 44 px`);
    assert(await p.getByRole('button', { name: 'Завершити', exact: true }).isVisible(), 'немає «Завершити» внизу на 22');
    await p.locator('.mobile-finish').scrollIntoViewIfNeeded();
    assert(await p.locator('.mobile-finish').isVisible(), 'кнопки завершення не видно');
    await p.locator('.mobile-finish').tap();
    await p.getByRole('button', { name: 'Завершити та переглянути результат' }).tap();
    await p.waitForURL(/review$/);
    await noHScroll(p);
    await p.screenshot({ path: `e2e-shots/23-mobile-${w}-review.png` });
    await p.locator('#review-nav-details summary').tap();
    await p.locator('#review-nav-details .qcell').nth(15).tap();
    await p.waitForTimeout(600);
    await p.screenshot({ path: `e2e-shots/24-mobile-${w}-review-q16.png` });
    await p.getByRole('button', { name: 'Довідкові матеріали' }).count().then((c) => assert(c === 0, 'довідник у розборі'));
  });
  await m.close();
}

await browser.close();
server.kill();
console.log(`\nПройдено кроків: ${passed}, помилок: ${failures.length}, помилок консолі: ${consoleErrors.length}`);
consoleErrors.forEach((e) => console.log('  console:', e));
failures.forEach((f) => console.log('  ✗', f));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
