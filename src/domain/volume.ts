import type { WorkoutSet } from '../db/types';

/** Tonelaje (kg × reps) de las series completadas, sin contar calentamientos. */
export function tonnage(sets: WorkoutSet[]): number {
  return sets.reduce(
    (t, s) => (s.completedAt != null && s.type !== 'warmup' ? t + (s.weight ?? 0) * (s.reps ?? 0) : t),
    0,
  );
}

/** Serie completada con mayor e1RM. */
export function bestSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  let best: WorkoutSet | undefined;
  for (const s of sets) {
    if (s.completedAt == null) continue;
    if (!best || (s.e1rm ?? 0) > (best.e1rm ?? 0)) best = s;
  }
  return best;
}
