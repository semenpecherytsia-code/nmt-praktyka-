import { describe, expect, it } from 'vitest';
import { numericMatches, parseNumeric, displayNumber } from '../src/engine/numeric';
describe('нормалізація числового вводу', () => {
    it.each([
        ['0', true], ['-0', true], ['12', true], ['-3', true], ['\u22123', true], ['3,5', true], ['3.5', true],
        ['  -2,25  ', true], ['+4', true], [',5', true], ['-.5', true],
    ])('приймає %j', (raw, ok) => expect(parseNumeric(raw).ok).toBe(ok));
    it.each(['', '   ', 'NaN', 'Infinity', '-Infinity', '1e3', '2+2', '1 000', '3,5,1', '1..2', 'abc', '5-', '--5', '0x10', 'eval(1)', '1/2'])('відхиляє %j', (raw) => expect(parseNumeric(raw).ok).toBe(false));
    it('розрізняє порожній ввід і нуль', () => {
        expect(parseNumeric('')).toEqual({ ok: false, reason: 'empty' });
        expect(parseNumeric('0').ok).toBe(true);
    });
    it('дріб через / лише за явним правилом', () => {
        expect(parseNumeric('1/2')).toEqual({ ok: false, reason: 'fraction_not_allowed' });
        expect(parseNumeric('1/2', { allowFractions: true }).ok).toBe(true);
        expect(parseNumeric('1/0', { allowFractions: true }).ok).toBe(false);
    });
});
describe('порівняння за правилом завдання', () => {
    it('точне десяткове порівняння без прихованої похибки', () => {
        expect(numericMatches('1,5', '1.5', { mode: 'exact' })).toBe(true);
        expect(numericMatches('1.50', '1.5', { mode: 'exact' })).toBe(true);
        expect(numericMatches('1.5000001', '1.5', { mode: 'exact' })).toBe(false);
        expect(numericMatches('\u22123', '-3', { mode: 'exact' })).toBe(true);
        expect(numericMatches('3', '-3', { mode: 'exact' })).toBe(false);
        expect(numericMatches('0', '0', { mode: 'exact' })).toBe(true);
        expect(numericMatches('-0', '0', { mode: 'exact' })).toBe(true);
        expect(numericMatches('0.1', '0.3', { mode: 'exact' })).toBe(false);
    });
    it('точна арифметика без похибок двійкових дробів', () => {
        expect(numericMatches('0.30000000000000004', '0.3', { mode: 'exact' })).toBe(false);
        expect(numericMatches('0.3', '0.3', { mode: 'tolerance', tolerance: '0' })).toBe(true);
    });
    it('явна похибка включно з межею', () => {
        const rule = { mode: 'tolerance', tolerance: '0.01' };
        expect(numericMatches('6.28', '6.28', rule)).toBe(true);
        expect(numericMatches('6.27', '6.28', rule)).toBe(true);
        expect(numericMatches('6.29', '6.28', rule)).toBe(true);
        expect(numericMatches('6.2701', '6.28', rule)).toBe(true);
        expect(numericMatches('6.2699', '6.28', rule)).toBe(false);
    });
    it('дроби: ключ 3/8 і відповіді 3/8, 0,375, 6/16', () => {
        const rule = { mode: 'exact', allowFractions: true };
        expect(numericMatches('3/8', '3/8', rule)).toBe(true);
        expect(numericMatches('0,375', '3/8', rule)).toBe(true);
        expect(numericMatches('6/16', '3/8', rule)).toBe(true);
        expect(numericMatches('3/8', '0.375', { mode: 'exact' })).toBe(false);
    });
    it('показ канонічного значення', () => {
        expect(displayNumber('-1.5')).toBe('\u22121,5');
    });
});
