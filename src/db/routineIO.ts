import { db } from './schema';
import { newId } from './routines';
import type { Exercise, Routine, RoutineDay } from './types';
import { guessDefinition, normalizeName, toRoutineFile, type RoutineDraft } from '../domain/routineImport';
import { shareFile, slug } from '../lib/share';

/**
 * Guarda un borrador revisado como rutina nueva. Los ejercicios que no existen se
 * crean como ejercicios personales (una sola vez aunque aparezcan en varios días).
 */
export async function saveDraft(draft: RoutineDraft): Promise<number> {
  return db.transaction('rw', db.exercises, db.routines, async () => {
    const created = new Map<string, number>();
    const days: RoutineDay[] = [];
    for (const d of draft.days) {
      const exercises = [];
      for (const de of d.exercises) {
        let id = de.exerciseId;
        if (id == null) {
          const def = de.definition ?? guessDefinition(de.rawName);
          const key = normalizeName(def.name);
          id = created.get(key);
          if (id == null) {
            id = await db.exercises.add({ ...def, isCustom: true, archived: 0 });
            created.set(key, id);
          }
        }
        exercises.push({ exerciseId: id, sets: de.sets, ...(de.restSec ? { restSec: de.restSec } : {}), ...(de.notes ? { notes: de.notes } : {}) });
      }
      days.push({ id: newId(), name: d.name, exercises });
    }
    return db.routines.add({ name: draft.name.trim() || 'Rutina importada', updatedAt: Date.now(), days });
  });
}

/** Exporta una rutina como archivo .json de Fuerza y abre el menú de compartir. */
export async function shareRoutine(routine: Routine): Promise<void> {
  const exercises = await db.exercises.toArray();
  const file = toRoutineFile(routine, new Map<number, Exercise>(exercises.map((e) => [e.id, e])));
  await shareFile(`${slug(routine.name)}.fuerza.json`, JSON.stringify(file, null, 1), 'application/json', routine.name);
}
