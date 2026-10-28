// Перевірка адрес у вмісті. Дозволені лише відносні шляхи та https.
// javascript:, data:, http:, file: та абсолютні шляхи комп'ютера відхиляються.
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
export function checkContentUrl(raw) {
    if (typeof raw !== 'string' || raw.trim() === '')
        return 'порожня адреса';
    const value = raw.trim();
    // Керувальні символи та пробіли всередині можуть маскувати схему (java\tscript:).
    if (/[\u0000-\u001F\u007F\s\\]/.test(value))
        return 'адреса містить пробіли, зворотні похилі або керувальні символи';
    if (/^[a-z]:/i.test(value) && !/^https:/i.test(value)) {
        if (/^[a-z]:\//i.test(value))
            return 'шлях до файлу на комп’ютері не є публічною адресою';
    }
    if (SCHEME.test(value)) {
        if (!/^https:\/\//i.test(value))
            return `недозволена схема адреси «${value.split(':')[0]}:»`;
        try {
            const u = new URL(value);
            if (u.username || u.password)
                return 'адреса не може містити облікові дані';
        }
        catch {
            return 'некоректна https-адреса';
        }
        return null;
    }
    if (value.startsWith('//'))
        return 'адреса без схеми (//) не дозволена';
    if (value.startsWith('/'))
        return 'абсолютний шлях не дозволений — використовуйте шлях відносно папки набору';
    if (value.split('/').includes('..'))
        return 'шлях не може виходити за межі папки (..)';
    if (/^~/.test(value))
        return 'шлях до файлу на комп’ютері не є публічною адресою';
    return null;
}
export function isSafeUrl(raw) {
    return checkContentUrl(raw) === null;
}
/** Повертає адресу для браузера: https як є, відносний шлях — від базової папки. */
export function resolveContentUrl(raw, baseDir) {
    if (!isSafeUrl(raw))
        return null;
    if (/^https:\/\//i.test(raw))
        return raw;
    return baseDir.replace(/\/?$/, '/') + raw;
}
/** Вбудовані плеєри, які можна показувати в iframe. */
export const ALLOWED_EMBED_HOSTS = ['www.youtube-nocookie.com', 'www.youtube.com', 'player.vimeo.com'];
export function checkEmbedUrl(raw) {
    const err = checkContentUrl(raw);
    if (err)
        return err;
    if (!/^https:/i.test(raw))
        return 'вбудований плеєр має бути https-адресою';
    const host = new URL(raw).host;
    if (!ALLOWED_EMBED_HOSTS.includes(host))
        return `хост «${host}» не входить до дозволених вбудованих плеєрів`;
    return null;
}
