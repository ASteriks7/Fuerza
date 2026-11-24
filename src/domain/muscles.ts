import type { Exercise, Muscle, PlannedExercise } from '../db/types';

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
