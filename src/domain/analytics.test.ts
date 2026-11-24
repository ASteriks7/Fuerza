import { describe, expect, it } from 'vitest';
import type { WorkoutSet } from '../db/types';
import { bestE1RMSet, e1rmByDay, monthGrid, repPRs, startOfWeek, weeklyTonnage } from './analytics';

let nextId = 1;
function set(p: Partial<WorkoutSet> & { at: Date }): WorkoutSet {
  const { at, ...rest } = p;
  return { id: nextId++, workoutId: 1, exerciseId: 1, order: 0, type: 'working', completedAt: at.getTime(), ...rest };
}

const d = (day: number, h = 10) => new Date(2026, 10, day, h); // noviembre 2026

describe('repPRs', () => {
  const sets = [
    set({ at: d(2), weight: 180, reps: 1 }),
    set({ at: d(3), weight: 170, reps: 3 }),
    set({ at: d(4), weight: 172.5, reps: 5 }), // también cuenta como 3RM
    set({ at: d(5), weight: 200, reps: 1, type: 'warmup' }), // calentamiento: no cuenta
    set({ at: d(6), weight: 190, reps: 1, completedAt: undefined }), // sin completar
  ];
  it('toma el mayor peso con al menos n reps', () => {
    const pr = repPRs(sets);
    expect(pr[1]?.weight).toBe(180);
    expect(pr[3]?.weight).toBe(172.5);
    expect(pr[5]?.weight).toBe(172.5);
  });
  it('en empate se queda con el más antiguo', () => {
    const pr = repPRs([set({ at: d(10), weight: 100, reps: 5 }), set({ at: d(8), weight: 100, reps: 5 })]);
    expect(pr[5]?.date).toBe(d(8).getTime());
  });
  it('sin datos devuelve undefined', () => {
    expect(repPRs([])[1]).toBeUndefined();
  });
});

describe('e1RM', () => {
  const sets = [
    set({ at: d(2, 9), weight: 150, reps: 5, e1rm: 185 }),
    set({ at: d(2, 10), weight: 155, reps: 5, e1rm: 190 }),
    set({ at: d(9), weight: 160, reps: 3, e1rm: 176 }),
  ];
  it('mejor por día, en orden', () => {
    const pts = e1rmByDay(sets);
    expect(pts.map((p) => p.e1rm)).toEqual([190, 176]);
  });
  it('mejor serie desde una fecha', () => {
    expect(bestE1RMSet(sets)?.e1rm).toBe(190);
    expect(bestE1RMSet(sets, d(5).getTime())?.e1rm).toBe(176);
  });
});

describe('weeklyTonnage', () => {
  it('agrupa por semana (lunes) e incluye semanas vacías', () => {
    const now = d(25).getTime(); // miércoles 25-nov-2026
    const weeks = weeklyTonnage(
      [
        set({ at: d(23), weight: 100, reps: 5 }), // lunes de esta semana
        set({ at: d(22), weight: 100, reps: 10 }), // domingo: semana anterior
        set({ at: d(23), weight: 60, reps: 10, type: 'warmup' }),
      ],
      3,
      now,
    );
    expect(weeks).toHaveLength(3);
    expect(weeks[2].weekStart).toBe(startOfWeek(now));
    expect(weeks.map((w) => w.kg)).toEqual([0, 1000, 500]);
  });
});

describe('monthGrid', () => {
  it('noviembre 2026 empieza en domingo: 6 huecos delante', () => {
    const cells = monthGrid(2026, 10);
    expect(cells.slice(0, 7).filter((c) => c === null)).toHaveLength(6);
    expect(cells.filter((c) => c !== null)).toHaveLength(30);
    expect(cells.length % 7).toBe(0);
  });
});
