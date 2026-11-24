import type { LoadTarget } from '../db/types';

/** Redondea al incremento de carga más cercano (p. ej. 2.5 kg). */
export function roundToIncrement(kg: number, increment: number): number {
  if (increment <= 0) return kg;
  return Math.round(Math.round(kg / increment) * increment * 100) / 100;
}

/**
 * Peso de trabajo para un objetivo de rutina.
 * - kg: el valor fijo.
 * - %1RM: 1RM × % redondeado al incremento (undefined si no hay 1RM de referencia).
 * - RPE: undefined (se elige en el momento; se muestra el peso de la sesión anterior).
 */
export function resolveTargetWeight(
  target: LoadTarget | undefined,
  oneRepMax: number | undefined,
  increment: number,
): number | undefined {
  if (!target) return undefined;
  switch (target.kind) {
    case 'kg':
      return target.kg;
    case 'pct1rm':
      return oneRepMax ? roundToIncrement((oneRepMax * target.pct) / 100, increment) : undefined;
    case 'rpe':
      return undefined;
  }
}
