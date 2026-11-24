import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { FuerzaDB } from './schema';
import { SEED_EXERCISES } from './seed';

// Simula a alguien que ya tenía la app (base v1, ejercicios sin músculos) y actualiza.
describe('actualización de la base v1 → v2', () => {
  it('rellena músculos, añade ejercicios nuevos y respeta los datos del usuario', async () => {
    const name = 'upgrade-test';
    const v1 = new Dexie(name);
    v1.version(1).stores({
      exercises: '++id, name, category, isCustom, archived',
      routines: '++id, name, updatedAt',
      workouts: '++id, startedAt, status, routineId',
      sets: '++id, workoutId, exerciseId, [exerciseId+completedAt], completedAt',
      settings: 'key',
    });
    await v1.open();
    await v1.table('exercises').bulkAdd([
      { name: 'Sentadilla', category: 'squat', equipment: 'barbell', barWeight: 20, sbdSlot: 'S', oneRepMax: 200, isCustom: false, archived: 0 },
      { name: 'Press banca', category: 'bench', equipment: 'barbell', barWeight: 20, sbdSlot: 'B', isCustom: false, archived: 0 },
      { name: 'Mi ejercicio raro', category: 'core', equipment: 'bodyweight', isCustom: true, archived: 0 },
    ]);
    await v1.table('sets').add({ workoutId: 1, exerciseId: 1, order: 0, type: 'working', weight: 150, reps: 5, completedAt: 1 });
    v1.close();

    const db = new FuerzaDB(name);
    await db.open();
    const all = await db.exercises.toArray();
    const squat = all.find((e) => e.name === 'Sentadilla')!;

    expect(squat.id).toBe(1); // mismo id: el historial sigue apuntando bien
    expect(squat.oneRepMax).toBe(200); // no pisa lo que el usuario configuró
    expect(squat.muscles?.primary).toContain('quads');
    expect(all.find((e) => e.name === 'Mi ejercicio raro')?.muscles).toBeUndefined();
    expect(all.some((e) => e.name === 'Arrancada')).toBe(true);
    expect(all.some((e) => e.name === 'Salto al cajón')).toBe(true);
    expect(all.filter((e) => e.name === 'Sentadilla')).toHaveLength(1); // sin duplicados
    expect(all).toHaveLength(SEED_EXERCISES.length + 1);
    expect(await db.sets.count()).toBe(1);
    db.close();
    await Dexie.delete(name);
  });

  it('todos los ejercicios del catálogo tienen músculos y nombres únicos', () => {
    const names = SEED_EXERCISES.map((e) => e.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const e of SEED_EXERCISES) expect(e.muscles?.primary.length, e.name).toBeGreaterThan(0);
  });
});
