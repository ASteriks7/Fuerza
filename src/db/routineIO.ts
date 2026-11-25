import { db } from './schema';
import { newId } from './routines';
import type { Exercise, Routine, RoutineDay } from './types';
import { guessDefinition, normalizeName, toRoutineFile, type RoutineDraft } from '../domain/routineImport';
import { shareFile, shareText, slug } from '../lib/share';
import { routineToCsv, routineToText, type ExportLang } from '../domain/routineExport';

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
          const { nameEn: _en, ...def } = de.definition ?? guessDefinition(de.rawName);
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

export type ShareFormat = 'fuerza' | 'text' | 'csv';

/**
 * Comparte una rutina:
 * - fuerza: archivo .json para importarlo en otra app Fuerza (lleva el nombre en español e inglés).
 * - text: mensaje legible (WhatsApp, notas), en español o inglés.
 * - csv: tabla para Excel / Google Sheets, en español o inglés.
 */
export async function shareRoutine(routine: Routine, format: ShareFormat = 'fuerza', lang: ExportLang = 'es') {
  const list = await db.exercises.toArray();
  const exercises = new Map<number, Exercise>(list.map((e) => [e.id, e]));
  const base = slug(routine.name) + (lang === 'en' ? '-en' : '');
  if (format === 'text') return shareText(routineToText(routine, exercises, lang), routine.name);
  if (format === 'csv')
    return shareFile(`${base}.csv`, '﻿' + routineToCsv(routine, exercises, lang), 'text/csv', routine.name);
  const file = toRoutineFile(routine, exercises);
  return shareFile(`${slug(routine.name)}.fuerza.json`, JSON.stringify(file, null, 1), 'application/json', routine.name);
}
