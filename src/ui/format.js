export function formatClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
export function formatDuration(ms) {
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (h)
        parts.push(`${h} год`);
    if (m || h)
        parts.push(`${m} хв`);
    parts.push(`${s} с`);
    return parts.join(' ');
}
export function formatMinutes(seconds) {
    return `${Math.round(seconds / 60)} хв`;
}
export function formatPercent(p) {
    return `${String(p).replace('.', ',')} %`;
}
export function formatDateTime(ts) {
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(ts);
}
/** Українські відмінки: plural(5, ['завдання','завдання','завдань']). */
export function plural(n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20)
        return forms[2];
    if (b > 1 && b < 5)
        return forms[1];
    if (b === 1)
        return forms[0];
    return forms[2];
}
export const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Є', 'Ж'];
export const TYPE_LABEL = {
    single_choice: 'Один правильний варіант',
    matching: 'Встановлення відповідності',
    numeric: 'Коротка числова відповідь',
};
