import { describe, expect, it } from 'vitest';
import type { Exercise, Goal, Workout, WorkoutSet } from '../db/types';
import { estimate1RM } from './e1rm';
import { suggestNext, weightForRpe } from './progression';
import { describePRs, detectPRs, workoutRecordSummary } from './records';
import { computeAchievements, goalProgress } from './achievements';
import { volumeTotals } from './analytics';
import { muscleSetsFromWorkoutSets, weeklyMuscleSets } from './muscles';

let nextId = 1;
const d = (day: number, h = 10) => new Date(2026, 10, day, h).getTime(); // noviembre 2026
function s(p: Partial<WorkoutSet> & { at: number }): WorkoutSet {
  const { at, ...rest } = p;
  const base: WorkoutSet = { id: nextId++, workoutId: 1, exerciseId: 1, order: 0, type: 'working', completedAt: at, ...rest };
  base.e1rm = estimate1RM(base.weight, base.reps, base.rpe);
  return base;
}

describe('suggestNext', () => {
  const inc = { increment: 2.5 };
  it('sube un incremento si completó todo sin RPE alto', () => {
    const last = [1, 2, 3].map(() => s({ at: d(1), weight: 100, reps: 5, rpe: 8 }));
    expect(suggestNext(last, inc)).toMatchObject({ weight: 102.5, reps: 5, kind: 'up' });
  });
  it('sube doble en un básico de pierna muy fácil', () => {
    const last = [s({ at: d(1), weight: 140, reps: 5, rpe: 7 })];
    expect(suggestNext(last, { ...inc, bigLift: true })?.weight).toBe(145);
  });
  it('repite si fue a RPE 9+', () => {
    const last = [s({ at: d(1), weight: 100, reps: 5, rpe: 9.5 })];
    expect(suggestNext(last, inc)).toMatchObject({ weight: 100, kind: 'same' });
  });
  it('repite si faltó una rep y baja si faltaron varias', () => {
    const one = [s({ at: d(1), weight: 100, reps: 5 }), s({ at: d(1), weight: 100, reps: 5 }), s({ at: d(1), weight: 100, reps: 4 })];
    expect(suggestNext(one, { ...inc, plannedReps: 5 })).toMatchObject({ weight: 100, kind: 'same' });
    const many = [s({ at: d(1), weight: 100, reps: 2 }), s({ at: d(1), weight: 100, reps: 3 })];
    expect(suggestNext(many, { ...inc, plannedReps: 5 })).toMatchObject({ weight: 95, kind: 'down' });
  });
  it('ignora calentamientos y back-offs más ligeros', () => {
    const last = [
      s({ at: d(1), weight: 60, reps: 5, type: 'warmup' }),
      s({ at: d(1), weight: 150, reps: 3, type: 'top', rpe: 8 }),
      s({ at: d(1), weight: 130, reps: 5, type: 'backoff' }),
    ];
    expect(suggestNext(last, inc)?.weight).toBe(152.5);
  });
  it('con RPE objetivo usa el e1RM (coherente con la fórmula)', () => {
    const last = [s({ at: d(1), weight: 100, reps: 5, rpe: 8 })]; // e1RM 123,3
    const sug = suggestNext(last, { ...inc, targetRpe: 8, plannedReps: 3 })!;
    expect(sug.weight).toBe(weightForRpe(last[0].e1rm!, 3, 8, 2.5));
    expect(sug.weight).toBe(105); // 123,3 / (1 + 5/30) = 105,7 → 105
  });
  it('peso corporal progresa en reps; sin datos no sugiere', () => {
    expect(suggestNext([s({ at: d(1), weight: 0, reps: 10 })], inc)).toMatchObject({ reps: 11, kind: 'up' });
    expect(suggestNext([], inc)).toBeUndefined();
  });
});

describe('records', () => {
  const prior = [s({ at: d(1), weight: 100, reps: 5 }), s({ at: d(2), weight: 120, reps: 1 })];
  it('detecta e1RM y RM superados', () => {
    const hits = detectPRs(s({ at: d(3), weight: 105, reps: 5 }), prior);
    expect(hits.map((h) => (h.kind === 'rm' ? `${h.reps}RM` : 'e1rm'))).toEqual(['e1rm', '3RM', '5RM']);
  });
  it('no cuenta la primera vez, ni calentamientos, ni empates', () => {
    expect(detectPRs(s({ at: d(3), weight: 200, reps: 1 }), [])).toEqual([]);
    expect(detectPRs(s({ at: d(3), weight: 200, reps: 1, type: 'warmup' }), prior)).toEqual([]);
    expect(detectPRs(s({ at: d(3), weight: 100, reps: 5 }), prior)).toEqual([]);
  });
  it('describePRs agrupa los RM con el mismo peso', () => {
    const hits = detectPRs(s({ at: d(3), weight: 125, reps: 1 }), prior);
    expect(describePRs(hits)).toEqual(['e1RM 125 kg (antes 120)', 'Récord de 1 rep: 125 kg (antes 120)']);
    const many = detectPRs(s({ at: d(3), weight: 130, reps: 5 }), prior);
    expect(describePRs(many).at(-1)).toBe('Récord de 1, 3 y 5 reps: 130 kg (antes 120)');
  });
  it('workoutRecordSummary: un resumen por ejercicio con el mejor valor frente a lo previo', () => {
    const today = [130, 130, 135].map((w, i) => s({ at: d(3, 10 + i), weight: w, reps: 1, workoutId: 9 }));
    const [sum] = workoutRecordSummary(today, prior);
    const rm1 = sum.hits.find((h) => h.kind === 'rm' && h.reps === 1)!;
    expect(sum.hits.filter((h) => h.kind === 'rm')).toHaveLength(1);
    expect([rm1.value, rm1.previous]).toEqual([135, 120]);
  });
});

describe('volumen y músculos', () => {
  it('volumeTotals separa semana/mes/año', () => {
    const now = d(25); // miércoles 25/11/2026
    const t = volumeTotals(
      [
        s({ at: d(24), weight: 100, reps: 5 }), // esta semana
        s({ at: d(3), weight: 100, reps: 1 }), // este mes
        s({ at: new Date(2026, 0, 5).getTime(), weight: 10, reps: 10 }), // este año
        s({ at: new Date(2025, 5, 5).getTime(), weight: 50, reps: 2 }), // antes
        s({ at: d(24), weight: 60, reps: 5, type: 'warmup' }),
      ],
      now,
    );
    expect(t).toEqual({ week: 500, month: 600, year: 700, all: 800, reps: 18 });
  });
  it('series por músculo: principal 1, secundario ½, por semanas', () => {
    const ex = new Map<number, Exercise>([
      [1, { id: 1, name: 'Sentadilla', category: 'squat', equipment: 'barbell', isCustom: false, muscles: { primary: ['quads', 'glutes'], secondary: ['lowerBack'] } } as Exercise],
    ]);
    const sets = [s({ at: d(24), weight: 100, reps: 5 }), s({ at: d(24), weight: 100, reps: 5 }), s({ at: d(17), weight: 100, reps: 5 })];
    const m = muscleSetsFromWorkoutSets(sets, ex);
    expect(m.get('quads')).toBe(3);
    expect(m.get('lowerBack')).toBe(1.5);
    const weeks = weeklyMuscleSets(sets, ex, 3, d(25));
    expect(weeks.map((w) => w.sets.get('quads') ?? 0)).toEqual([0, 1, 2]);
  });
});

describe('logros y metas', () => {
  const exercises = [
    { id: 1, name: 'Sentadilla', sbdSlot: 'S' },
    { id: 2, name: 'Press banca', sbdSlot: 'B' },
    { id: 3, name: 'Peso muerto', sbdSlot: 'D' },
  ] as Exercise[];
  const workouts = [1, 8, 15, 22].map((day, i) => ({ id: i + 1, startedAt: d(day), status: 'done', exerciseOrder: [] }) as unknown as Workout);
  const sets = [
    s({ at: d(1), exerciseId: 1, weight: 100, reps: 5 }),
    s({ at: d(8), exerciseId: 2, weight: 80, reps: 5 }),
    s({ at: d(15), exerciseId: 3, weight: 150, reps: 3 }),
    s({ at: d(22), exerciseId: 1, weight: 140, reps: 1 }),
  ];
  const fam = Object.fromEntries(computeAchievements(workouts, sets, exercises).map((f) => [f.id, f]));
  it('cuenta entrenos, racha y clubes con su fecha', () => {
    expect(fam.workouts.tiers[0].unlockedAt).toBe(d(1));
    expect(fam.workouts.tiers[1].unlockedAt).toBeUndefined();
    expect(fam.streak.current).toBe(4);
    expect(fam['lift-S'].tiers.find((t) => t.value === 140)?.unlockedAt).toBe(d(22));
    expect(fam.total.current).toBe(140 + 80 + 150);
    expect(fam.total.tiers.find((t) => t.value === 300)?.unlockedAt).toBe(d(15)); // 100+80+150
  });
  it('progreso de metas', () => {
    const g = (p: Partial<Goal>) => ({ id: 1, createdAt: 0, target: 0, kind: 'weight', ...p }) as Goal;
    expect(goalProgress(g({ kind: 'weight', exerciseId: 1, target: 140 }), sets, exercises)).toEqual({ current: 140, achievedAt: d(22) });
    expect(goalProgress(g({ kind: 'total', target: 400 }), sets, exercises).achievedAt).toBeUndefined();
    expect(goalProgress(g({ kind: 'e1rm', exerciseId: 1, target: 110 }), sets, exercises).achievedAt).toBe(d(1));
  });
});
