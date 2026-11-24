import { describe, expect, it } from 'vitest';
import { calcPlates, groupPlates } from './plates';

const STD = [25, 20, 15, 10, 5, 2.5, 1.25];

describe('calcPlates', () => {
  it('carga exacta con discos grandes', () => {
    const r = calcPlates(180, 20, STD);
    expect(r.perSide).toEqual([25, 25, 25, 5]);
    expect(r.achieved).toBe(180);
    expect(r.exact).toBe(true);
  });
  it('usa discos fraccionarios', () => {
    const r = calcPlates(102.5, 20, STD);
    expect(r.perSide).toEqual([25, 15, 1.25]);
    expect(r.exact).toBe(true);
  });
  it('solo la barra', () => {
    expect(calcPlates(20, 20, STD)).toEqual({ perSide: [], achieved: 20, exact: true });
  });
  it('peso menor que la barra', () => {
    const r = calcPlates(15, 20, STD);
    expect(r.perSide).toEqual([]);
    expect(r.achieved).toBe(20);
    expect(r.exact).toBe(false);
  });
  it('no exacto: devuelve el más cercano por debajo', () => {
    const r = calcPlates(101, 20, STD);
    expect(r.achieved).toBe(100);
    expect(r.exact).toBe(false);
  });
  it('respeta el inventario disponible', () => {
    const r = calcPlates(140, 20, [20, 10, 5, 2.5, 1.25]);
    expect(r.perSide).toEqual([20, 20, 20]);
  });
  it('barra de 15 kg', () => {
    expect(calcPlates(65, 15, STD).perSide).toEqual([25]);
  });
});

describe('groupPlates', () => {
  it('agrupa discos iguales', () => {
    expect(groupPlates([25, 25, 10, 1.25])).toEqual([
      { plate: 25, count: 2 },
      { plate: 10, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
  });
});
