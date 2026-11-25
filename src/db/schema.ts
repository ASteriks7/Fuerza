import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, Goal, Routine, SettingRow, Workout, WorkoutSet } from './types';
import { SEED_EXERCISES, syncSeedExercises } from './seed';

export class FuerzaDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  sets!: EntityTable<WorkoutSet, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;
  goals!: EntityTable<Goal, 'id'>;

  constructor(name = 'fuerza') {
    super(name);
    this.version(1).stores({
      exercises: '++id, name, category, isCustom, archived',
      routines: '++id, name, updatedAt',
      workouts: '++id, startedAt, status, routineId',
      // [exerciseId+completedAt]: “última sesión” y gráficos por ejercicio en una sola consulta.
      // Las series sin completedAt quedan fuera del índice compuesto (justo lo que queremos).
      sets: '++id, workoutId, exerciseId, [exerciseId+completedAt], completedAt',
      settings: 'key',
    });

    // v2: músculos por ejercicio + halterofilia, pliometría y más variantes.
    // Mismo esquema de índices; solo pone al día la biblioteca de quien ya tenía la app.
    this.version(2)
      .stores({})
      .upgrade((tx) => syncSeedExercises(tx.table('exercises')));

    // v3: metas del usuario.
    this.version(3).stores({ goals: '++id, exerciseId' });

    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(SEED_EXERCISES);
    });
  }
}

export const db = new FuerzaDB();
