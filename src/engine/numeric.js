// Нормалізація та точне порівняння числових відповідей.
// Жодного eval: рядок розбирається регулярним виразом у раціональне число (BigInt).
const DECIMAL = /^([+-]?)(\d+)(?:[.,](\d+))?$/;
const LEADING_SEP = /^([+-]?)[.,](\d+)$/;
const FRACTION = /^([+-]?)(\d+)\/(\d+)$/;
function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b)
        [a, b] = [b, a % b];
    return a || 1n;
}
function make(n, d) {
    if (d < 0n) {
        n = -n;
        d = -d;
    }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
}
/** Прибирає лише зовнішні пробіли, замінює Unicode-мінус (U+2212) та інші тире-мінуси на «-». */
export function normalizeNumericInput(raw) {
    return raw.trim().replace(/[−‒–﹣－]/g, '-');
}
export function parseNumeric(raw, opts = {}) {
    const s = normalizeNumericInput(raw);
    if (s === '')
        return { ok: false, reason: 'empty' };
    let m = DECIMAL.exec(s);
    if (m) {
        const frac = m[3] ?? '';
        const n = BigInt(m[2] + frac) * (m[1] === '-' ? -1n : 1n);
        return { ok: true, value: make(n, 10n ** BigInt(frac.length)), normalized: s.replace(',', '.') };
    }
    m = LEADING_SEP.exec(s);
    if (m) {
        const n = BigInt(m[2]) * (m[1] === '-' ? -1n : 1n);
        return { ok: true, value: make(n, 10n ** BigInt(m[2].length)), normalized: s.replace(',', '.') };
    }
    m = FRACTION.exec(s);
    if (m) {
        if (!opts.allowFractions)
            return { ok: false, reason: 'fraction_not_allowed' };
        const d = BigInt(m[3]);
        if (d === 0n)
            return { ok: false, reason: 'invalid' };
        return { ok: true, value: make(BigInt(m[2]) * (m[1] === '-' ? -1n : 1n), d), normalized: s };
    }
    return { ok: false, reason: 'invalid' };
}
export function numericErrorText(reason) {
    switch (reason) {
        case 'empty': return 'Введіть число.';
        case 'fraction_not_allowed': return 'Дріб через «/» у цьому завданні не приймається. Запишіть десятковий дріб.';
        default: return 'Введіть ціле або десяткове число, наприклад −2 або 3,5.';
    }
}
function sub(a, b) { return make(a.n * b.d - b.n * a.d, a.d * b.d); }
function abs(a) { return { n: a.n < 0n ? -a.n : a.n, d: a.d }; }
function lte(a, b) { return a.n * b.d <= b.n * a.d; }
/** Чи правильна відповідь за правилом конкретного завдання. Загальної прихованої похибки немає. */
export function numericMatches(raw, key, rule) {
    const user = parseNumeric(raw, { allowFractions: rule.allowFractions });
    const correct = parseNumeric(key, { allowFractions: true });
    if (!user.ok || !correct.ok)
        return false;
    const diff = abs(sub(user.value, correct.value));
    if (rule.mode === 'exact')
        return diff.n === 0n;
    const tol = parseNumeric(rule.tolerance);
    if (!tol.ok)
        return false;
    return lte(diff, abs(tol.value));
}
/** Канонічний запис правильного значення для показу (кома як десятковий роздільник, справжній мінус). */
export function displayNumber(raw) {
    return normalizeNumericInput(raw).replace('.', ',').replace(/^-/, '−');
}
