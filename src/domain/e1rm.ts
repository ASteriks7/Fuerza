/** Valores RPE permitidos: 6 a 10 en pasos de 0.5. */
export const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export function rirFromRpe(rpe?: number): number {
  if (rpe == null) return 0;
  return Math.max(0, 10 - rpe);
}

/**
 * e1RM con Epley ajustada por RPE:
 *   e1RM = peso × (1 + (reps + RIR) / 30)
 * Caso especial: si reps + RIR ≤ 1 (single a RPE 10) el e1RM es el propio peso.
 * Sin RPE se asume RIR 0 (serie al fallo / máxima).
 */
export function estimate1RM(weight?: number, reps?: number, rpe?: number): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  const repsToFailure = reps + rirFromRpe(rpe);
  if (repsToFailure <= 1) return weight;
  return weight * (1 + repsToFailure / 30);
}

/** Redondeo para mostrar el e1RM (0.5 kg). */
export function roundE1RM(value: number): number {
  return Math.round(value * 2) / 2;
}
