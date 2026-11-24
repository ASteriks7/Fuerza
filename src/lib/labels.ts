import type { Equipment, ExerciseCategory, LoadTarget, SetType } from '../db/types';
import { fmtNum } from './format';

/** 80% · @8 · 100 kg */
export function describeTarget(t: LoadTarget | undefined): string {
  if (!t) return '';
  switch (t.kind) {
    case 'pct1rm':
      return `${fmtNum(t.pct)}%`;
    case 'rpe':
      return `@${fmtNum(t.rpe)}`;
    case 'kg':
      return `${fmtNum(t.kg)} kg`;
  }
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  squat: 'Sentadilla',
  bench: 'Press banca',
  deadlift: 'Peso muerto',
  ohp: 'Press militar',
  back: 'Espalda',
  legs: 'Piernas',
  upper: 'Brazos y hombros',
  core: 'Core',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
};

export const SET_TYPES: Record<SetType, { label: string; short: string; color: string }> = {
  warmup: { label: 'Calentamiento', short: 'C', color: 'text-warmup' },
  working: { label: 'Efectiva', short: '', color: 'text-fg' },
  top: { label: 'Top Set', short: 'T', color: 'text-top' },
  backoff: { label: 'Back-off', short: 'B', color: 'text-backoff' },
  failure: { label: 'Fallo', short: 'F', color: 'text-danger' },
};

export const SET_TYPE_ORDER: SetType[] = ['warmup', 'working', 'top', 'backoff', 'failure'];

/** Etiquetas de la columna “Serie”: efectivas numeradas, el resto con letra. */
export function setLabels(types: SetType[]): string[] {
  let n = 0;
  return types.map((t) => (t === 'working' ? String(++n) : SET_TYPES[t].short));
}
