import Dexie from 'dexie';
import { db } from './schema';
import type { Routine, RoutineDay, WorkoutSet } from './types';
import { getActiveWorkout } from './workouts';
import { getSettings } from './settings';
import { resolveTargetWeight } from '../domain/load';

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function newDay(n: number): RoutineDay {
  return { id: newId(), name: `Día ${n}`, exercises: [] };
}

export async function createRoutine(): Promise<number> {
  return db.routines.add({ name: 'Nueva rutina', updatedAt: Date.now(), days: [newDay(1)] });
}

export async function saveRoutine(routine: Routine): Promise<void> {
  await db.routines.put({ ...routine, updatedAt: Date.now() });
}

export async function duplicateRoutine(id: number): Promise<number | undefined> {
  const r = await db.routines.get(id);
  if (!r) return;
  return db.routines.add({
    name: `${r.name} (copia)`,
    updatedAt: Date.now(),
    days: r.days.map((d) => ({ ...structuredClone(d), id: newId() })),
  });
}

export async function deleteRoutine(id: number): Promise<void> {
  await db.routines.delete(id);
}

const E1RM_WINDOW_MS = 120 * 24 * 3600 * 1000;

export interface Reference1RM {
  value: number;
  source: 'manual' | 'e1rm';
}

/** 1RM de referencia: el manual del ejercicio o, si no hay, el mejor e1RM de los últimos 120 días. */
export async function getReference1RM(exerciseId: number): Promise<Reference1RM | undefined> {
  const ex = await db.exercises.get(exerciseId);
  if (ex?.oneRepMax) return { value: ex.oneRepMax, source: 'manual' };
  const sets = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Date.now() - E1RM_WINDOW_MS], [exerciseId, Dexie.maxKey])
    .toArray();
  const best = Math.max(0, ...sets.map((s) => s.e1rm ?? 0));
  return best > 0 ? { value: best, source: 'e1rm' } : undefined;
}

/**
 * Crea un entrenamiento activo a partir de un día de rutina, con las cargas
 * ya calculadas (%1RM → kg redondeado) y las reps planificadas.
 */
export async function startWorkoutFromRoutine(routineId: number, dayId: string): Promise<number> {
  const active = await getActiveWorkout();
  if (active) return active.id;

  const routine = await db.routines.get(routineId);
  const day = routine?.days.find((d) => d.id === dayId);
  if (!routine || !day) throw new Error('Rutina no encontrada');

  const { loadIncrement } = await getSettings();
  const exerciseIds = [...new Set(day.exercises.map((e) => e.exerciseId))];
  const refs = new Map(
    await Promise.all(exerciseIds.map(async (id) => [id, (await getReference1RM(id))?.value] as const)),
  );

  return db.transaction('rw', db.workouts, db.sets, async () => {
    const restByExercise: Record<number, number> = {};
    for (const pe of day.exercises) if (pe.restSec) restByExercise[pe.exerciseId] = pe.restSec;

    const workoutId = await db.workouts.add({
      routineId,
      routineDayId: dayId,
      name: `${routine.name} · ${day.name}`,
      startedAt: Date.now(),
      status: 'active',
      exerciseOrder: exerciseIds,
      restByExercise,
    });

    const sets: Omit<WorkoutSet, 'id'>[] = [];
    const orderByExercise = new Map<number, number>();
    for (const pe of day.exercises) {
      for (const ps of pe.sets) {
        const order = orderByExercise.get(pe.exerciseId) ?? 0;
        orderByExercise.set(pe.exerciseId, order + 1);
        sets.push({
          workoutId,
          exerciseId: pe.exerciseId,
          order,
          type: ps.type,
          reps: ps.reps || undefined,
          weight: resolveTargetWeight(ps.target, refs.get(pe.exerciseId), loadIncrement),
          target: ps.target,
        });
      }
    }
    await db.sets.bulkAdd(sets);
    return workoutId;
  });
}
