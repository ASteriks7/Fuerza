import { describe, expect, it } from 'vitest';
import type { Exercise, PlannedExercise } from '../db/types';
import { muscleVolume } from './muscles';

const ex = (id: number, primary: Exercise['muscles']): Exercise => ({
  id,
  name: `E${id}`,
  category: 'squat',
  equipment: 'barbell',
  isCustom: false,
  archived: 0,
  muscles: primary,
});

const byId = new Map([
  [1, ex(1, { primary: ['quads', 'glutes'], secondary: ['adductors'] })],
  [2, ex(2, { primary: ['glutes'], secondary: ['hamstrings'] })],
  [3, ex(3, undefined)], // ejercicio personal sin músculos
]);

const plan = (exerciseId: number, types: ('warmup' | 'working')[]): PlannedExercise => ({
  exerciseId,
  sets: types.map((type) => ({ type, reps: 5 })),
});

describe('muscleVolume', () => {
  it('principal suma 1 serie, secundario 0,5; sin calentamientos', () => {
    const v = muscleVolume([plan(1, ['warmup', 'working', 'working', 'working']), plan(2, ['working', 'working'])], byId);
    const get = (m: string) => v.find((x) => x.muscle === m)?.sets;
    expect(get('glutes')).toBe(5);
    expect(get('quads')).toBe(3);
    expect(get('adductors')).toBe(1.5);
    expect(get('hamstrings')).toBe(1);
    expect(v[0].muscle).toBe('glutes'); // ordenado de más a menos
    expect(v.find((x) => x.muscle === 'glutes')?.exercises).toEqual([1, 2]);
  });
  it('ignora ejercicios sin músculos', () => {
    expect(muscleVolume([plan(3, ['working'])], byId)).toEqual([]);
  });
});
