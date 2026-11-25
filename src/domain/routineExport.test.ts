import { describe, expect, it } from 'vitest';
import type { Exercise, Routine } from '../db/types';
import { SEED_EXERCISES } from '../db/seed';
import { EXERCISE_NAMES_EN, englishName } from './exerciseNamesEn';
import { normalizeName, parseRoutineText } from './routineImport';
import { routineToCsv, routineToText, translateDayName } from './routineExport';

const catalog: Exercise[] = SEED_EXERCISES.map((e, i) => ({ ...e, id: i + 1, isCustom: false, archived: 0 }) as Exercise);
const byName = (n: string) => catalog.find((e) => e.name === n)!;
const custom = { id: 999, name: 'Mi ejercicio raro', category: 'accessory', equipment: 'barbell', isCustom: true, archived: 0 } as unknown as Exercise;
const map = new Map([...catalog, custom].map((e) => [e.id, e]));

const routine: Routine = {
  id: 1,
  name: 'Bloque fuerza',
  updatedAt: 0,
  days: [
    {
      id: 'a',
      name: 'Día 1',
      exercises: [
        {
          exerciseId: byName('Sentadilla').id,
          restSec: 180,
          notes: 'Cinturón en la top',
          sets: [
            { type: 'warmup', reps: 5 },
            { type: 'top', reps: 3, target: { kind: 'rpe', rpe: 8 } },
            { type: 'backoff', reps: 5, target: { kind: 'pct1rm', pct: 75 } },
            { type: 'backoff', reps: 5, target: { kind: 'pct1rm', pct: 75 } },
          ],
        },
        { exerciseId: byName('Dos tiempos (cargada y envión)').id, restSec: 150, sets: [{ type: 'working', reps: 1, target: { kind: 'kg', kg: 92.5 } }] },
      ],
    },
    {
      id: 'b',
      name: 'Jueves',
      exercises: [
        { exerciseId: byName('Peso muerto rumano').id, sets: [{ type: 'working', reps: 8, target: { kind: 'rpe', rpe: 7.5 } }, { type: 'failure', reps: 8 }] },
        { exerciseId: custom.id, sets: [{ type: 'working', reps: 10 }] },
      ],
    },
  ],
};

describe('nombres en inglés', () => {
  it('todo el catálogo tiene traducción única', () => {
    const missing = SEED_EXERCISES.filter((e) => !EXERCISE_NAMES_EN[e.name]).map((e) => e.name);
    expect(missing).toEqual([]);
    const en = Object.values(EXERCISE_NAMES_EN).map(normalizeName);
    expect(new Set(en).size).toBe(en.length);
    expect(Object.keys(EXERCISE_NAMES_EN).every((k) => SEED_EXERCISES.some((e) => e.name === k))).toBe(true);
  });
  it('los personales mantienen su nombre', () => expect(englishName('Mi ejercicio raro')).toBe('Mi ejercicio raro'));
  it('traduce nombres de día habituales', () => {
    expect(translateDayName('Día 2', 'en')).toBe('Day 2');
    expect(translateDayName('Lunes', 'en')).toBe('Monday');
    expect(translateDayName('Pierna pesada', 'en')).toBe('Pierna pesada');
  });
  it('cada nombre en inglés se reconoce al importar', () => {
    for (const [es, en] of Object.entries(EXERCISE_NAMES_EN)) {
      const d = parseRoutineText(`X\nDay 1:\n${en}: 3x5`, catalog);
      const ex = d.days[0].exercises[0];
      expect([en, catalog.find((e) => e.id === ex.exerciseId)?.name, !!ex.fuzzy]).toEqual([en, es, false]);
    }
  });
});

describe('exportar e importar de nuevo', () => {
  const check = (text: string) => {
    const d = parseRoutineText(text, [...catalog, custom], 'Bloque fuerza'); // el CSV no lleva nombre: se usa el del archivo
    expect(d.name).toBe('Bloque fuerza');
    expect(d.days.map((x) => x.exercises.map((e) => e.exerciseId))).toEqual(routine.days.map((x) => x.exercises.map((e) => e.exerciseId)));
    const sq = d.days[0].exercises[0];
    expect(sq.sets).toEqual(routine.days[0].exercises[0].sets);
    expect(sq.restSec).toBe(180);
    expect(d.days[0].exercises[1].restSec).toBe(150);
    expect(d.days[0].exercises[1].sets[0].target).toEqual({ kind: 'kg', kg: 92.5 });
    expect(d.days[1].exercises[0].sets.map((s) => [s.type, s.target])).toEqual([
      ['working', { kind: 'rpe', rpe: 7.5 }],
      ['failure', undefined],
    ]);
    return d;
  };
  it('texto en inglés', () => {
    const text = routineToText(routine, map, 'en');
    expect(text).toContain('Back squat: 1x5 warm-up, 1x3 @8 top set, 2x5 75% back-off, rest 3 min // Cinturón en la top');
    expect(text).toContain('Clean and jerk: 1x1 92.5 kg, rest 2:30');
    expect(text).toContain('Monday'.replace('Monday', 'Thursday:'));
    const d = check(text);
    expect(d.days[0].exercises[0].notes).toBe('Cinturón en la top');
    expect(d.days.map((x) => x.name)).toEqual(['Day 1', 'Thursday']);
  });
  it('texto en español', () => {
    const text = routineToText(routine, map, 'es');
    expect(text).toContain('Sentadilla: 1x5 calentamiento, 1x3 @8 top set, 2x5 75% back-off, descanso 3 min');
    check(text);
  });
  it('CSV en inglés (coma) y en español (punto y coma)', () => {
    const en = routineToCsv(routine, map, 'en');
    expect(en.split('\r\n')[0]).toBe('Day,Exercise,Sets,Reps,Load,Rest,Type,Notes');
    expect(en).toContain('Day 1,Back squat,2,5,75%,3 min,Back-off,');
    check(en);
    const es = routineToCsv(routine, map, 'es');
    expect(es).toContain('Día 1;Dos tiempos (cargada y envión);1;1;92,5 kg;2:30;;');
    check(es);
  });
});
