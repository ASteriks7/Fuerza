import type { Exercise, Muscle, PlannedExercise, WorkoutSet } from '../db/types';
import { startOfWeek } from './analytics';

export interface MuscleVolume {
  muscle: Muscle;
  /** Series efectivas: músculo principal = 1, secundario = 0,5. */
  sets: number;
  /** Ejercicios que lo trabajan (para el detalle). */
  exercises: number[];
}

/**
 * Recuento de series por músculo de una lista de ejercicios planificados.
 * No cuenta los calentamientos. Convención habitual: un músculo secundario suma media serie.
 */
export function muscleVolume(planned: PlannedExercise[], exercises: Map<number, Exercise>): MuscleVolume[] {
  const acc = new Map<Muscle, MuscleVolume>();
  const add = (muscle: Muscle, sets: number, exerciseId: number) => {
    const cur = acc.get(muscle) ?? { muscle, sets: 0, exercises: [] };
    cur.sets += sets;
    if (!cur.exercises.includes(exerciseId)) cur.exercises.push(exerciseId);
    acc.set(muscle, cur);
  };
  for (const pe of planned) {
    const muscles = exercises.get(pe.exerciseId)?.muscles;
    if (!muscles) continue;
    const n = pe.sets.filter((s) => s.type !== 'warmup').length;
    if (n === 0) continue;
    for (const mu of muscles.primary) add(mu, n, pe.exerciseId);
    for (const mu of muscles.secondary) add(mu, n / 2, pe.exerciseId);
  }
  return [...acc.values()].sort((a, b) => b.sets - a.sets);
}

/**
 * Series efectivas por músculo de series realmente hechas (completadas, sin calentamientos).
 * Misma convención: principal = 1, secundario = 0,5.
 */
export function muscleSetsFromWorkoutSets(sets: WorkoutSet[], exercises: Map<number, Exercise>): Map<Muscle, number> {
  const out = new Map<Muscle, number>();
  for (const s of sets) {
    if (s.completedAt == null || s.type === 'warmup') continue;
    const m = exercises.get(s.exerciseId)?.muscles;
    if (!m) continue;
    for (const mu of m.primary) out.set(mu, (out.get(mu) ?? 0) + 1);
    for (const mu of m.secondary) out.set(mu, (out.get(mu) ?? 0) + 0.5);
  }
  return out;
}

/** Series por músculo de cada una de las últimas `weeks` semanas (lunes a domingo), de la más antigua a la actual. */
export function weeklyMuscleSets(
  sets: WorkoutSet[],
  exercises: Map<number, Exercise>,
  weeks: number,
  now = Date.now(),
): { weekStart: number; sets: Map<Muscle, number> }[] {
  const current = startOfWeek(now);
  const starts = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(current);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    return d.getTime();
  });
  const buckets = new Map<number, WorkoutSet[]>(starts.map((w) => [w, []]));
  for (const s of sets) {
    if (s.completedAt == null) continue;
    buckets.get(startOfWeek(s.completedAt))?.push(s);
  }
  return starts.map((w) => ({ weekStart: w, sets: muscleSetsFromWorkoutSets(buckets.get(w)!, exercises) }));
}
