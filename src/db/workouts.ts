import Dexie from 'dexie';
import { db } from './schema';
import type { Exercise, SetType, Workout, WorkoutSet } from './types';
import { estimate1RM } from '../domain/e1rm';
import { detectPRs, type PrHit } from '../domain/records';

export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('active').first();
}

export async function startEmptyWorkout(): Promise<number> {
  const existing = await getActiveWorkout();
  if (existing) return existing.id;
  return db.workouts.add({
    startedAt: Date.now(),
    status: 'active',
    exerciseOrder: [],
  });
}

/**
 * Series completadas de la sesión más reciente (anterior a `excludeWorkoutId`)
 * en la que se hizo este ejercicio, ordenadas por `order`.
 */
export async function getPreviousSets(
  exerciseId: number,
  excludeWorkoutId?: number,
): Promise<WorkoutSet[]> {
  // Las sesiones de descarga no sirven de referencia (pesos y series reducidos a propósito).
  const deloadIds = new Set(await db.workouts.filter((w) => !!w.deload).primaryKeys());
  const latest = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .filter((s) => s.workoutId !== excludeWorkoutId && !deloadIds.has(s.workoutId))
    .first();
  if (!latest) return [];
  const sets = await db.sets.where('workoutId').equals(latest.workoutId).toArray();
  return sets
    .filter((s) => s.exerciseId === exerciseId && s.completedAt != null)
    .sort((a, b) => a.order - b.order);
}

export async function addExerciseToWorkout(workoutId: number, exerciseId: number): Promise<void> {
  const previous = await getPreviousSets(exerciseId, workoutId);
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout || workout.exerciseOrder.includes(exerciseId)) return;
    await db.workouts.update(workoutId, {
      exerciseOrder: [...workout.exerciseOrder, exerciseId],
    });
    // Replica la estructura de la última sesión (tipos de serie) con valores vacíos:
    // los valores anteriores aparecen como placeholder y ✓ los acepta en un toque.
    const types: SetType[] = previous.length ? previous.map((s) => s.type) : ['working'];
    await db.sets.bulkAdd(
      types.map(
        (type, i) => ({ workoutId, exerciseId, order: i, type }),
      ),
    );
  });
}

export async function addSet(workoutId: number, exerciseId: number): Promise<void> {
  const sets = await setsFor(workoutId, exerciseId);
  const last = sets.at(-1);
  // Después de un Top Set lo habitual es un back-off.
  const type: SetType = !last ? 'working' : last.type === 'top' ? 'backoff' : last.type;
  await db.sets.add({
    workoutId,
    exerciseId,
    order: last ? last.order + 1 : 0,
    type,
    // Peso y reps se copian; el RPE no (es subjetivo y hay que registrarlo serie a serie).
    weight: last?.weight,
    reps: last?.reps,
  });
}

export async function updateSet(id: number, patch: Partial<WorkoutSet>): Promise<void> {
  await db.transaction('rw', db.sets, async () => {
    const current = await db.sets.get(id);
    if (!current) return;
    const next = { ...current, ...patch };
    const e1rm = next.completedAt ? estimate1RM(next.weight, next.reps, next.rpe) : undefined;
    await db.sets.update(id, { ...patch, e1rm });
  });
}

/**
 * Completa la serie. Peso y reps vacíos se rellenan con `fallback`
 * (la serie equivalente de la última sesión). El RPE NO se copia: es subjetivo
 * y copiarlo falsearía el e1RM. Devuelve false si faltan datos.
 */
export async function completeSet(
  set: WorkoutSet,
  exercise: Exercise | undefined,
  fallback?: Pick<WorkoutSet, 'weight' | 'reps'>,
): Promise<boolean> {
  const weight = set.weight ?? fallback?.weight ?? (exercise?.equipment === 'bodyweight' ? 0 : undefined);
  const reps = set.reps ?? fallback?.reps;
  const rpe = set.rpe;
  if (weight == null || reps == null || reps <= 0) return false;
  await db.sets.update(set.id, {
    weight,
    reps,
    rpe,
    completedAt: Date.now(),
    e1rm: estimate1RM(weight, reps, rpe),
  });
  return true;
}

/** Récords que consigue una serie ya completada frente a todo lo anterior de ese ejercicio. */
export async function prsForSet(setId: number): Promise<PrHit[]> {
  const set = await db.sets.get(setId);
  if (!set?.completedAt) return [];
  const prior = await db.sets
    .where('[exerciseId+completedAt]')
    .between([set.exerciseId, Dexie.minKey], [set.exerciseId, set.completedAt], true, false)
    .toArray();
  return detectPRs(set, prior);
}

export async function uncompleteSet(id: number): Promise<void> {
  await db.sets.update(id, { completedAt: undefined, e1rm: undefined });
}

export async function deleteSet(id: number): Promise<void> {
  await db.sets.delete(id);
}

export async function removeExercise(workoutId: number, exerciseId: number): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return;
    await db.workouts.update(workoutId, {
      exerciseOrder: workout.exerciseOrder.filter((id) => id !== exerciseId),
    });
    const ids = (await setsFor(workoutId, exerciseId)).map((s) => s.id);
    await db.sets.bulkDelete(ids);
  });
}

export async function moveExercise(workoutId: number, exerciseId: number, dir: -1 | 1): Promise<void> {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return;
  const order = [...workout.exerciseOrder];
  const i = order.indexOf(exerciseId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  await db.workouts.update(workoutId, { exerciseOrder: order });
}

/** Termina la sesión: descarta series sin completar y ejercicios vacíos. */
export async function finishWorkout(workoutId: number): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return;
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
    await db.sets.bulkDelete(sets.filter((s) => s.completedAt == null).map((s) => s.id));
    const withSets = new Set(sets.filter((s) => s.completedAt != null).map((s) => s.exerciseId));
    await db.workouts.update(workoutId, {
      status: 'done',
      endedAt: Date.now(),
      exerciseOrder: workout.exerciseOrder.filter((id) => withSets.has(id)),
    });
  });
}

export async function deleteWorkout(workoutId: number): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
}

async function setsFor(workoutId: number, exerciseId: number): Promise<WorkoutSet[]> {
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
  return sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.order - b.order);
}
