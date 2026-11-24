import { describe, expect, it } from 'vitest';
import type { Exercise, Routine } from '../db/types';
import { SEED_EXERCISES } from '../db/seed';
import {
  draftFromRoutineFile,
  guessDefinition,
  matchExercise,
  parseExerciseLine,
  parseLoad,
  parseRest,
  parseRoutineText,
  parseTable,
  splitDelimited,
  toRoutineFile,
} from './routineImport';
import { CSV_EXAMPLE, ROUTINE_TEMPLATES } from './routineTemplates';

const LIB: Exercise[] = SEED_EXERCISES.map((e, i) => ({ ...e, id: i + 1 }));
const idOf = (name: string) => LIB.find((e) => e.name === name)!.id;
const nameOf = (id?: number) => LIB.find((e) => e.id === id)?.name;

describe('matchExercise', () => {
  it.each([
    ['sentadilla', 'Sentadilla'],
    ['Back Squat', 'Sentadilla'],
    ['PRESS BANCA', 'Press banca'],
    ['snatch', 'Arrancada'],
    ['Power Clean', 'Cargada de potencia'],
    ['Clean & Jerk', 'Dos tiempos (cargada y envión)'],
    ['hang power snatch', 'Arrancada colgante de potencia'],
    ['Split jerk', 'Envión en tijera'],
    ['OHS', 'Sentadilla de arrancada (overhead squat)'],
    ['box jumps', 'Salto al cajón'],
    ['Dominadas', 'Dominadas'],
    ['RDL', 'Peso muerto rumano'],
  ])('“%s” → %s', (raw, expected) => {
    const m = matchExercise(raw, LIB);
    expect(nameOf(m?.id)).toBe(expected);
    expect(m?.fuzzy).toBe(false);
  });
  it('aproximado marca fuzzy; sin parecido no coincide', () => {
    expect(matchExercise('Sentadilla frontal con pausa', LIB)?.fuzzy).toBe(true);
    expect(matchExercise('Burpees', LIB)).toBeUndefined();
  });
});

describe('cargas y descansos', () => {
  it('parseLoad', () => {
    expect(parseLoad('@80%')).toEqual({ kind: 'pct1rm', pct: 80 });
    expect(parseLoad('72,5 %')).toEqual({ kind: 'pct1rm', pct: 72.5 });
    expect(parseLoad('@8')).toEqual({ kind: 'rpe', rpe: 8 });
    expect(parseLoad('RPE 7.5')).toEqual({ kind: 'rpe', rpe: 7.5 });
    expect(parseLoad('RIR 2')).toEqual({ kind: 'rpe', rpe: 8 });
    expect(parseLoad('120 kg')).toEqual({ kind: 'kg', kg: 120 });
    expect(parseLoad('fácil')).toBeUndefined();
  });
  it('parseRest', () => {
    expect(parseRest('3 min')).toBe(180);
    expect(parseRest("2'")).toBe(120);
    expect(parseRest('90 s')).toBe(90);
    expect(parseRest('2:30')).toBe(150);
  });
});

describe('parseExerciseLine', () => {
  it('varios esquemas, tipos y descanso', () => {
    const r = parseExerciseLine('Sentadilla: 1x3 @8 top, 3x5 @7 backoff descanso 4 min')!;
    expect(r.rawName).toBe('Sentadilla');
    expect(r.restSec).toBe(240);
    expect(r.sets).toHaveLength(4);
    expect(r.sets[0]).toEqual({ type: 'top', reps: 3, target: { kind: 'rpe', rpe: 8 } });
    expect(r.sets[3]).toEqual({ type: 'backoff', reps: 5, target: { kind: 'rpe', rpe: 7 } });
  });
  it('carga antes del esquema y “series de”', () => {
    expect(parseExerciseLine('Arrancada 80% 3x2')!.sets[0]).toEqual({ type: 'working', reps: 2, target: { kind: 'pct1rm', pct: 80 } });
    const r = parseExerciseLine('- Dominadas 4 series de 8')!;
    expect(r.sets).toHaveLength(4);
    expect(r.sets[0].reps).toBe(8);
  });
});

describe('parseRoutineText', () => {
  it('nombre, días y ejercicios desde texto de WhatsApp', () => {
    const d = parseRoutineText(
      `Mi bloque de fuerza

Lunes:
• Back squat 5x5 @75%
• Bench press 5x5 @75%
Miércoles:
1. Peso muerto 3x3 @85%
2. Burpees 3x10`,
      LIB,
    );
    expect(d.name).toBe('Mi bloque de fuerza');
    expect(d.days.map((x) => x.name)).toEqual(['Lunes', 'Miércoles']);
    expect(nameOf(d.days[0].exercises[0].exerciseId)).toBe('Sentadilla');
    expect(d.days[0].exercises[0].sets).toHaveLength(5);
    const burpees = d.days[1].exercises[1];
    expect(burpees.rawName).toBe('Burpees');
    expect(burpees.exerciseId).toBeUndefined(); // se creará
  });
  it('sin encabezados: todo en Día 1', () => {
    const d = parseRoutineText('Sentadilla 3x5\nPress banca 3x5', LIB);
    expect(d.days).toHaveLength(1);
    expect(d.days[0].name).toBe('Día 1');
    expect(d.name).toBe('Rutina importada');
  });
  it('celdas pegadas desde Excel (tabuladores)', () => {
    const d = parseRoutineText('Día\tEjercicio\tSeries\tReps\t%\n1\tSnatch\t5\t2\t70\n\tClean\t5\t2\t0,75', LIB);
    expect(d.days[0].name).toBe('Día 1');
    expect(nameOf(d.days[0].exercises[0].exerciseId)).toBe('Arrancada');
    expect(d.days[0].exercises[1].sets[0].target).toEqual({ kind: 'pct1rm', pct: 75 });
  });
});

describe('parseTable (CSV / Excel)', () => {
  it('ejemplo CSV: une filas del mismo ejercicio y respeta tipos', () => {
    const d = parseTable(splitDelimited(CSV_EXAMPLE), LIB, 'Desde Excel');
    expect(d.name).toBe('Desde Excel');
    expect(d.days.map((x) => x.name)).toEqual(['Día 1', 'Día 2']);
    const squat = d.days[0].exercises[0];
    expect(squat.exerciseId).toBe(idOf('Sentadilla'));
    expect(squat.sets).toHaveLength(4);
    expect(squat.sets[0].type).toBe('top');
    expect(squat.sets[1]).toEqual({ type: 'backoff', reps: 5, target: { kind: 'pct1rm', pct: 75 } });
    expect(squat.restSec).toBe(240);
    expect(d.days[1].exercises[0].sets[0].target).toEqual({ kind: 'kg', kg: 100 });
    expect(d.warnings).toEqual([]);
  });
  it('celdas numéricas de Excel y columna RPE', () => {
    const d = parseTable(
      [
        ['Semana 1'],
        ['Día', 'Ejercicio', 'Series', 'Reps', 'RPE', 'Descanso'],
        [1, 'Sentadilla', 3, 5, 8, 3],
        [null, 'Press militar', 3, 8, 7.5, 120],
      ],
      LIB,
    );
    expect(d.days[0].exercises[0].sets[0].target).toEqual({ kind: 'rpe', rpe: 8 });
    expect(d.days[0].exercises[0].restSec).toBe(180);
    expect(d.days[0].exercises[1].restSec).toBe(120);
  });
  it('sin encabezado avisa', () => {
    expect(parseTable([['a', 'b']], LIB).warnings[0]).toMatch(/Ejercicio/);
  });
});

describe('plantillas', () => {
  it.each(ROUTINE_TEMPLATES.map((t) => [t.name, t] as const))('%s: todos los ejercicios existen en el catálogo', (_, t) => {
    const d = parseRoutineText(t.text, LIB);
    expect(d.name).toBe(t.name);
    expect(d.warnings).toEqual([]);
    for (const day of d.days)
      for (const ex of day.exercises) {
        expect(ex.exerciseId, ex.rawName).toBeDefined();
        expect(ex.fuzzy, ex.rawName).toBe(false);
        expect(ex.sets.length).toBeGreaterThan(0);
      }
  });
});

describe('archivo de Fuerza', () => {
  it('ida y vuelta: conserva series y recrea ejercicios personales', () => {
    const custom: Exercise = { id: 999, name: 'Mi variante rara', category: 'squat', equipment: 'barbell', barWeight: 20, isCustom: true, archived: 0 };
    const routine: Routine = {
      id: 1,
      name: 'Compartida',
      updatedAt: 0,
      days: [
        {
          id: 'a',
          name: 'Día A',
          exercises: [
            { exerciseId: idOf('Arrancada'), restSec: 120, sets: [{ type: 'working', reps: 2, target: { kind: 'pct1rm', pct: 80 } }] },
            { exerciseId: 999, sets: [{ type: 'working', reps: 5 }] },
          ],
        },
      ],
    };
    const file = JSON.parse(JSON.stringify(toRoutineFile(routine, new Map([...LIB, custom].map((e) => [e.id, e])))));
    const d = draftFromRoutineFile(file, LIB); // otro teléfono: no tiene el ejercicio personal
    expect(d.name).toBe('Compartida');
    expect(d.days[0].exercises[0].exerciseId).toBe(idOf('Arrancada'));
    expect(d.days[0].exercises[0].restSec).toBe(120);
    expect(d.days[0].exercises[1].exerciseId).toBeUndefined();
    expect(d.days[0].exercises[1].definition?.name).toBe('Mi variante rara');
  });
});

describe('guessDefinition', () => {
  it('categoría y material por palabras clave', () => {
    expect(guessDefinition('arrancada con pausa en rodilla')).toMatchObject({ category: 'olympic', equipment: 'barbell', name: 'Arrancada con pausa en rodilla' });
    expect(guessDefinition('Remo con mancuerna en banco')).toMatchObject({ category: 'back', equipment: 'dumbbell' });
    expect(guessDefinition('Burpees')).toMatchObject({ category: 'legs' });
  });
});
