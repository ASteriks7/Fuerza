import { describe, expect, it } from 'vitest';
import { resolveTargetWeight, roundToIncrement } from './load';

describe('roundToIncrement', () => {
  it('redondea a 2.5', () => {
    expect(roundToIncrement(161.3, 2.5)).toBe(162.5);
    expect(roundToIncrement(161.2, 2.5)).toBe(160);
  });
  it('redondea a 1.25 sin errores de coma flotante', () => {
    expect(roundToIncrement(101.3, 1.25)).toBe(101.25);
  });
});

describe('resolveTargetWeight', () => {
  it('%1RM', () => {
    expect(resolveTargetWeight({ kind: 'pct1rm', pct: 80 }, 200, 2.5)).toBe(160);
    expect(resolveTargetWeight({ kind: 'pct1rm', pct: 72.5 }, 185, 2.5)).toBe(135);
  });
  it('%1RM sin 1RM de referencia', () => {
    expect(resolveTargetWeight({ kind: 'pct1rm', pct: 80 }, undefined, 2.5)).toBeUndefined();
  });
  it('kg fijo', () => {
    expect(resolveTargetWeight({ kind: 'kg', kg: 100 }, 200, 2.5)).toBe(100);
  });
  it('RPE no fija peso', () => {
    expect(resolveTargetWeight({ kind: 'rpe', rpe: 8 }, 200, 2.5)).toBeUndefined();
  });
});
