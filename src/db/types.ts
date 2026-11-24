// Todos los pesos en kg. Todas las fechas en epoch ms.

export type ExerciseCategory =
  | 'squat'
  | 'bench'
  | 'deadlift'
  | 'ohp'
  | 'back'
  | 'legs'
  | 'upper'
  | 'core';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export type SbdSlot = 'S' | 'B' | 'D';

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  /** Indica qué levantamiento cuenta para el Total SBD. */
  sbdSlot?: SbdSlot;
  /** Peso de la barra (kg). Solo para equipment === 'barbell'. */
  barWeight?: number;
  /** 1RM manual (kg) para calcular cargas por %. Si no hay, se usa el mejor e1RM reciente. */
  oneRepMax?: number;
  isCustom: boolean;
  /** 0 | 1 para poder indexarlo (IndexedDB no indexa booleanos). */
  archived: 0 | 1;
}

export type SetType = 'warmup' | 'working' | 'top' | 'backoff' | 'failure';

export type LoadTarget =
  | { kind: 'pct1rm'; pct: number }
  | { kind: 'rpe'; rpe: number }
  | { kind: 'kg'; kg: number };

export interface PlannedSet {
  type: SetType;
  reps: number;
  target?: LoadTarget;
}

export interface PlannedExercise {
  exerciseId: number;
  restSec?: number;
  notes?: string;
  sets: PlannedSet[];
}

export interface RoutineDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

/** Rutinas: la UI llega en la Fase 2, el esquema existe desde ya. */
export interface Routine {
  id: number;
  name: string;
  updatedAt: number;
  days: RoutineDay[];
}

export type WorkoutStatus = 'active' | 'done';

export interface Workout {
  id: number;
  routineId?: number;
  routineDayId?: string;
  name?: string;
  startedAt: number;
  endedAt?: number;
  status: WorkoutStatus;
  /** Orden de los ejercicios dentro de la sesión. */
  exerciseOrder: number[];
  /** Descanso por ejercicio definido en la rutina (s). */
  restByExercise?: Record<number, number>;
  notes?: string;
}

export interface WorkoutSet {
  id: number;
  workoutId: number;
  exerciseId: number;
  order: number;
  type: SetType;
  weight?: number;
  reps?: number;
  /** 6–10 en pasos de 0.5. RIR = 10 − RPE. */
  rpe?: number;
  /** undefined = serie aún no completada. */
  completedAt?: number;
  /** Desnormalizado al completar la serie, para gráficos rápidos. */
  e1rm?: number;
  /** Objetivo de la rutina (solo informativo durante el registro). */
  target?: LoadTarget;
}

export interface SettingRow {
  key: string;
  value: unknown;
}
