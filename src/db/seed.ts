import type { Exercise } from './types';

type Seed = Omit<Exercise, 'id' | 'isCustom' | 'archived'>;

const bb = (name: string, category: Exercise['category'], extra: Partial<Seed> = {}): Seed => ({
  name,
  category,
  equipment: 'barbell',
  barWeight: 20,
  ...extra,
});

const other = (name: string, category: Exercise['category'], equipment: Exercise['equipment']): Seed => ({
  name,
  category,
  equipment,
});

const SEED: Seed[] = [
  // Sentadilla
  bb('Sentadilla', 'squat', { sbdSlot: 'S' }),
  bb('Sentadilla low bar', 'squat'),
  bb('Sentadilla con pausa', 'squat'),
  bb('Sentadilla frontal', 'squat'),
  bb('Sentadilla tempo', 'squat'),
  bb('Sentadilla con safety bar', 'squat', { barWeight: 25 }),
  bb('Sentadilla a cajón', 'squat'),
  bb('Pin squat', 'squat'),

  // Press banca
  bb('Press banca', 'bench', { sbdSlot: 'B' }),
  bb('Press banca con pausa larga', 'bench'),
  bb('Press banca agarre cerrado', 'bench'),
  bb('Press banca Larsen', 'bench'),
  bb('Press banca Spoto', 'bench'),
  bb('Press banca con tablas', 'bench'),
  bb('Press inclinado con barra', 'bench'),
  other('Press banca con mancuernas', 'bench', 'dumbbell'),
  other('Fondos en paralelas', 'bench', 'bodyweight'),

  // Peso muerto
  bb('Peso muerto', 'deadlift', { sbdSlot: 'D' }),
  bb('Peso muerto sumo', 'deadlift'),
  bb('Peso muerto con déficit', 'deadlift'),
  bb('Peso muerto con pausa', 'deadlift'),
  bb('Peso muerto rumano', 'deadlift'),
  bb('Peso muerto piernas rígidas', 'deadlift'),
  bb('Rack pull', 'deadlift'),
  bb('Peso muerto con barra hexagonal', 'deadlift', { barWeight: 25 }),
  bb('Buenos días', 'deadlift'),

  // Press militar
  bb('Press militar', 'ohp'),
  bb('Push press', 'ohp'),
  other('Press de hombro con mancuernas', 'ohp', 'dumbbell'),

  // Espalda
  bb('Remo con barra', 'back'),
  bb('Remo Pendlay', 'back'),
  other('Dominadas', 'back', 'bodyweight'),
  other('Jalón al pecho', 'back', 'cable'),
  other('Remo con mancuerna', 'back', 'dumbbell'),
  other('Remo en polea baja', 'back', 'cable'),

  // Piernas
  other('Prensa de piernas', 'legs', 'machine'),
  bb('Hip thrust', 'legs'),
  other('Sentadilla búlgara', 'legs', 'dumbbell'),
  other('Zancadas', 'legs', 'dumbbell'),
  other('Curl femoral', 'legs', 'machine'),
  other('Extensión de cuádriceps', 'legs', 'machine'),
  other('Elevación de gemelos', 'legs', 'machine'),

  // Tren superior
  bb('Curl con barra', 'upper'),
  other('Extensión de tríceps en polea', 'upper', 'cable'),
  bb('Press francés', 'upper', { barWeight: 10 }),
  other('Elevaciones laterales', 'upper', 'dumbbell'),
  other('Face pull', 'upper', 'cable'),

  // Core
  other('Plancha', 'core', 'bodyweight'),
  other('Rueda abdominal', 'core', 'bodyweight'),
  other('Elevación de piernas colgado', 'core', 'bodyweight'),
];

export const SEED_EXERCISES: Omit<Exercise, 'id'>[] = SEED.map((e) => ({
  ...e,
  isCustom: false,
  archived: 0,
}));
