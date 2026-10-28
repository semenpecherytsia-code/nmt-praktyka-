import { parseNumeric } from './numeric';
export function isEmptyAnswer(v) {
    if (!v)
        return true;
    if (v.type === 'single_choice')
        return !v.optionId;
    if (v.type === 'matching')
        return Object.values(v.pairs).every((x) => !x);
    return v.raw.trim() === '';
}
export function answersEqual(a, b) {
    if (!a || !b)
        return isEmptyAnswer(a) && isEmptyAnswer(b);
    if (a.type !== b.type)
        return false;
    if (a.type === 'single_choice')
        return a.optionId === b.optionId;
    if (a.type === 'numeric')
        return a.raw.trim() === b.raw.trim();
    const bp = b.pairs;
    const keys = new Set([...Object.keys(a.pairs), ...Object.keys(bp)]);
    for (const k of keys)
        if ((a.pairs[k] ?? null) !== (bp[k] ?? null))
            return false;
    return true;
}
/** Чи можна зберегти цю відповідь. Неповні відповідності дозволені. */
export function checkAnswer(q, v) {
    if (!v || isEmptyAnswer(v))
        return { valid: false, reason: 'empty' };
    if (v.type !== q.type)
        return { valid: false, reason: 'wrong_type' };
    if (v.type === 'single_choice' && q.type === 'single_choice') {
        return q.options.some((o) => o.id === v.optionId) ? { valid: true } : { valid: false, reason: 'wrong_type' };
    }
    if (v.type === 'matching' && q.type === 'matching') {
        const rowIds = new Set(q.matchingRows.map((r) => r.id));
        const optIds = new Set(q.matchingOptions.map((o) => o.id));
        const used = new Set();
        for (const [row, opt] of Object.entries(v.pairs)) {
            if (!rowIds.has(row))
                return { valid: false, reason: 'wrong_type' };
            if (!opt)
                continue;
            if (!optIds.has(opt))
                return { valid: false, reason: 'wrong_type' };
            if (!q.allowOptionReuse && used.has(opt))
                return { valid: false, reason: 'duplicate_option' };
            used.add(opt);
        }
        return { valid: true };
    }
    if (v.type === 'numeric' && q.type === 'numeric') {
        const p = parseNumeric(v.raw, { allowFractions: q.numericRule.allowFractions });
        if (p.ok)
            return { valid: true };
        return { valid: false, reason: p.reason === 'fraction_not_allowed' ? 'fraction_not_allowed' : p.reason === 'empty' ? 'empty' : 'invalid_number' };
    }
    return { valid: false, reason: 'wrong_type' };
}
export function filledPairs(v) {
    return v?.type === 'matching' ? Object.values(v.pairs).filter(Boolean).length : 0;
}
