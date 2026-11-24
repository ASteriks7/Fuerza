import { describe, expect, it } from 'vitest';
import { estimate1RM, rirFromRpe, roundE1RM } from './e1rm';

describe('rirFromRpe', () => {
  it('convierte RPE en RIR', () => {
    expect(rirFromRpe(10)).toBe(0);
    expect(rirFromRpe(8)).toBe(2);
    expect(rirFromRpe(7.5)).toBe(2.5);
  });
  it('sin RPE asume RIR 0', () => {
    expect(rirFromRpe(undefined)).toBe(0);
  });
});

describe('estimate1RM', () => {
  it('single a RPE 10 = peso', () => {
    expect(estimate1RM(200, 1, 10)).toBe(200);
  });
  it('single sin RPE = peso', () => {
    expect(estimate1RM(180, 1)).toBe(180);
  });
  it('5 reps a RPE 10 = Epley clásico', () => {
    expect(estimate1RM(150, 5, 10)).toBeCloseTo(175, 5);
  });
  it('5 reps a RPE 8 suma 2 reps en reserva', () => {
    // 150 × (1 + 7/30) = 185
    expect(estimate1RM(150, 5, 8)).toBeCloseTo(185, 5);
  });
  it('single a RPE 8 usa 3 reps hasta el fallo', () => {
    // 200 × (1 + 3/30) = 220
    expect(estimate1RM(200, 1, 8)).toBeCloseTo(220, 5);
  });
  it('devuelve 0 con datos incompletos', () => {
    expect(estimate1RM(undefined, 5, 8)).toBe(0);
    expect(estimate1RM(100, 0, 8)).toBe(0);
    expect(estimate1RM(0, 5)).toBe(0);
  });
});

describe('roundE1RM', () => {
  it('redondea a 0.5', () => {
    expect(roundE1RM(184.74)).toBe(184.5);
    expect(roundE1RM(184.76)).toBe(185);
  });
});
