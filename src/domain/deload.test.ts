import { beforeEach, describe, expect, it } from 'vitest';
import type { DeloadConfig, PlannedSet } from '../db/types';
import { cycleWeek, deloadSets, deloadTarget, isDeloadWeek, nextDeloadWeek } from './deload';
import { startOfWeek } from './analytics';
import { db } from '../db/schema';
import { startWorkoutFromRoutine } from '../db/routines';
import { getPreviousSets } from '../db/workouts';

const day = (d: number) => new Date(2026, 10, d, 10).getTime(); // nov 2026; el 2 es lunes
const cfg = (p: Partial<DeloadConfig> = {}): DeloadConfig => ({ everyWeeks: 4, style: 'volume', anchor: startOfWeek(day(2)), ...p });

describe('ciclo de descarga', () => {
  it('la última semana del ciclo es de descarga', () => {
    expect([2, 9, 16, 23, 30].map((d) => cycleWeek(cfg(), day(d))?.week)).toEqual([1, 2, 3, 4, 1]);
    expect([2, 9, 16, 23, 30].map((d) => isDeloadWeek(cfg(), day(d)))).toEqual([false, false, false, true, false]);
    expect(isDeloadWeek(cfg(), day(29))).toBe(true); // domingo de la semana 4
    expect(nextDeloadWeek(cfg(), day(10))).toBe(startOfWeek(day(23)));
  });
  it('sin ciclo no hay descarga salvo que se fuerce esa semana', () => {
    expect(isDeloadWeek(undefined)).toBe(false);
    expect(isDeloadWeek(cfg({ everyWeeks: null }), day(23))).toBe(false);
    const forced = cfg({ everyWeeks: null, override: { week: startOfWeek(day(10)), deload: true } });
    expect([isDeloadWeek(forced, day(11)), isDeloadWeek(forced, day(17))]).toEqual([true, false]);
    // saltar la descarga que tocaba
    expect(isDeloadWeek(cfg({ override: { week: startOfWeek(day(23)), deload: false } }), day(24))).toBe(false);
  });
});

describe('reducciones', () => {
  const sets: PlannedSet[] = [
    { type: 'warmup', reps: 5 },
    { type: 'top', reps: 3, target: { kind: 'rpe', rpe: 8 } },
    { type: 'backoff', reps: 5, target: { kind: 'pct1rm', pct: 75 } },
    { type: 'backoff', reps: 5, target: { kind: 'pct1rm', pct: 75 } },
    { type: 'failure', reps: 8, target: { kind: 'kg', kg: 92.5 } },
  ];
  it('volumen: calentamientos + mitad de las efectivas (top set incluido)', () => {
    expect(deloadSets(sets, 'volume').map((s) => s.type)).toEqual(['warmup', 'top', 'backoff']);
    expect(deloadSets([{ type: 'working', reps: 5 }], 'volume')).toHaveLength(1);
  });
  it('carga: −10 %, −2 RPE, kg redondeado; el fallo pasa a efectiva', () => {
    const out = deloadSets(sets, 'intensity');
    expect(out).toHaveLength(5);
    expect(out.map((s) => s.target)).toEqual([undefined, { kind: 'rpe', rpe: 6 }, { kind: 'pct1rm', pct: 68 }, { kind: 'pct1rm', pct: 68 }, { kind: 'kg', kg: 82.5 }]);
    expect(out[4].type).toBe('working');
    expect(deloadTarget({ kind: 'rpe', rpe: 7 })).toEqual({ kind: 'rpe', rpe: 6 });
  });
  it('ambas', () => {
    expect(deloadSets(sets, 'both').map((s) => [s.type, s.target])).toEqual([
      ['warmup', undefined],
      ['top', { kind: 'rpe', rpe: 6 }],
      ['backoff', { kind: 'pct1rm', pct: 68 }],
    ]);
  });
});

describe('entrenamiento desde una rutina en semana de descarga', () => {
  beforeEach(async () => {
    await Promise.all([db.routines.clear(), db.workouts.clear(), db.sets.clear()]);
  });

  it('crea la sesión reducida, marcada, y no la usa como referencia después', async () => {
    const sq = (await db.exercises.where('name').equals('Sentadilla').first())!.id;
    // Sesión normal previa: 4×5 con 140 kg.
    const prevW = await db.workouts.add({ startedAt: day(16), endedAt: day(16), status: 'done', exerciseOrder: [sq] } as never);
    await db.sets.bulkAdd([0, 1, 2, 3].map((order) => ({ workoutId: prevW, exerciseId: sq, order, type: 'working' as const, weight: 140, reps: 5, completedAt: day(16) + order })));
    const routineId = await db.routines.add({
      name: 'Fuerza',
      updatedAt: 0,
      deload: cfg({ style: 'both' }),
      days: [{ id: 'd1', name: 'Día 1', exercises: [{ exerciseId: sq, sets: [0, 1, 2, 3].map(() => ({ type: 'working' as const, reps: 5 })) }] }],
    } as never);

    const wid = await startWorkoutFromRoutine(routineId, 'd1', day(24));
    const w = (await db.workouts.get(wid))!;
    const sets = await db.sets.where('workoutId').equals(wid).toArray();
    expect(w.deload).toBe(true);
    expect(sets.map((s) => s.weight)).toEqual([125, 125]); // mitad de series, 140 × 0,9 = 126 → 125

    // La completamos (más ligera) y la siguiente sesión normal se compara con la de 140 kg.
    await Promise.all(sets.map((s) => db.sets.update(s.id, { completedAt: day(24) + s.order, reps: 5 })));
    await db.workouts.update(wid, { status: 'done' });
    expect((await getPreviousSets(sq)).map((s) => s.weight)).toEqual([140, 140, 140, 140]);

    // Semana normal: sesión completa, sin marcar.
    await db.workouts.clear();
    const normal = await startWorkoutFromRoutine(routineId, 'd1', day(30));
    expect((await db.workouts.get(normal))!.deload).toBeUndefined();
    expect(await db.sets.where('workoutId').equals(normal).count()).toBe(4);
  });
});
