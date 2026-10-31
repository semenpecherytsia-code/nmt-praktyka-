import { describe, expect, it } from 'vitest';
import { overlayTransition, resolveScreen } from '../src/machine';
import { parseRoute, routePath } from '../src/router';
import { createAttempt, finishAttempt } from '../src/engine/attempt';
import { demoPackage } from './helpers';

const pkg = demoPackage();

describe('модель станів', () => {
  it('розбір незавершеної спроби перенаправляє на проходження', () => {
    const a = createAttempt(pkg, 0, 'x');
    expect(resolveScreen({ name: 'review', attemptId: 'x' }, a)).toEqual({ screen: 'active', redirect: { name: 'attempt', attemptId: 'x', position: 1 } });
  });
  it('завершену спробу не можна відкрити як активну', () => {
    const f = finishAttempt(createAttempt(pkg, 0, 'x'), pkg, { now: 10, reason: 'manual', applyDrafts: false });
    expect(resolveScreen({ name: 'attempt', attemptId: 'x', position: 3 }, f).redirect).toEqual({ name: 'review', attemptId: 'x' });
  });
  it('оверлеї: дозволені лише на своїх екранах, один за раз', () => {
    expect(overlayTransition('prepare', 'none', { type: 'OPEN_REFERENCE' })).toBe('reference');
    expect(overlayTransition('prepare', 'none', { type: 'REQUEST_FINISH' })).toBe('none');
    expect(overlayTransition('active', 'none', { type: 'OPEN_SELECTOR' })).toBe('none');
    expect(overlayTransition('active', 'reference', { type: 'REQUEST_FINISH' })).toBe('reference');
    expect(overlayTransition('active', 'reference', { type: 'CLOSE' })).toBe('none');
    expect(overlayTransition('review', 'none', { type: 'OPEN_REFERENCE' })).toBe('none');
  });
  it('маршрути туди й назад', () => {
    for (const r of [{ name: 'home' } as const, { name: 'home', simulationId: 'nmt-23' } as const, { name: 'attempt', attemptId: 'a1', position: 7 } as const, { name: 'review', attemptId: 'a1' } as const]) {
      expect(parseRoute(routePath(r))).toEqual(r);
    }
  });
});
