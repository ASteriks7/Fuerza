import type { WorkoutSet } from '../db/types';
import { rirFromRpe } from './e1rm';
import { roundToIncrement } from './load';

// Progresión de cargas: qué peso usar la próxima vez a partir de la última sesión.

export interface Suggestion {
  weight: number;
  /** Reps objetivo (para peso corporal sugiere reps en vez de peso). */
  reps: number;
  delta: number;
  kind: 'up' | 'same' | 'down';
  reason: string;
}

/**
 * Peso para hacer `reps` repeticiones a un RPE dado, según un e1RM.
 * Es la inversa de la fórmula de e1RM de la app (Epley ajustada por RIR), así que es coherente con ella.
 */
export function weightForRpe(e1rm: number, reps: number, rpe: number, increment: number): number {
  return roundToIncrement(e1rm / (1 + (reps + rirFromRpe(rpe)) / 30), increment);
}

interface Options {
  increment: number;
  /** Reps planificadas para hoy (si no, las de la última sesión). */
  plannedReps?: number;
  /** RPE objetivo de la rutina: activa la autorregulación por e1RM. */
  targetRpe?: number;
  /** Sentadilla/peso muerto: si fue fácil (RPE ≤ 7) sube el doble. */
  bigLift?: boolean;
}

const fmt = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 2 });

/**
 * - Con RPE objetivo: peso = e1RM de la última sesión → reps @RPE objetivo.
 * - Sin RPE objetivo (progresión doble):
 *     · todas las reps hechas y RPE ≤ 8,5 (o sin RPE) → sube un incremento (dos si fue muy fácil en un básico de pierna);
 *     · todas hechas pero RPE ≥ 9 → repite el peso;
 *     · faltaron reps → repite; si faltaron muchas o hubo fallo → baja ~5 %.
 */
export function suggestNext(lastSession: WorkoutSet[], opts: Options): Suggestion | undefined {
  const work = lastSession.filter((s) => s.completedAt != null && s.type !== 'warmup' && (s.reps ?? 0) > 0 && s.weight != null);
  if (!work.length) return undefined;

  const top = Math.max(...work.map((s) => s.weight!));
  const atTop = work.filter((s) => s.weight === top);
  const targetReps = opts.plannedReps ?? Math.max(...atTop.map((s) => s.reps!));
  const inc = opts.increment;

  // Peso corporal: progresa en repeticiones.
  if (top === 0) {
    const hit = atTop.every((s) => s.reps! >= targetReps);
    return hit
      ? { weight: 0, reps: targetReps + 1, delta: 0, kind: 'up', reason: 'Completaste todas las series: suma 1 repetición.' }
      : { weight: 0, reps: targetReps, delta: 0, kind: 'same', reason: 'Repite hasta completar todas las repeticiones.' };
  }

  // Autorregulación por RPE objetivo.
  if (opts.targetRpe != null) {
    const e1rm = Math.max(...work.map((s) => s.e1rm ?? 0));
    if (e1rm > 0) {
      const weight = weightForRpe(e1rm, targetReps, opts.targetRpe, inc);
      const delta = Math.round((weight - top) * 100) / 100;
      return {
        weight,
        reps: targetReps,
        delta,
        kind: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same',
        reason: `Con tu e1RM de la última sesión (${fmt(Math.round(e1rm))} kg), ${targetReps} reps @${fmt(opts.targetRpe)} ≈ ${fmt(weight)} kg.`,
      };
    }
  }

  const rpes = atTop.map((s) => s.rpe).filter((r): r is number => r != null);
  const maxRpe = rpes.length ? Math.max(...rpes) : undefined;
  const missed = atTop.filter((s) => s.reps! < targetReps);
  const failed = atTop.some((s) => s.type === 'failure') && missed.length > 0;
  const bigMiss = missed.some((s) => targetReps - s.reps! >= 2) || missed.length > atTop.length / 2;

  if (missed.length) {
    if (failed || bigMiss) {
      const weight = roundToIncrement(top * 0.95, inc);
      return { weight, reps: targetReps, delta: weight - top, kind: 'down', reason: 'Faltaron varias repeticiones: baja ~5 % y vuelve a construir.' };
    }
    return { weight: top, reps: targetReps, delta: 0, kind: 'same', reason: 'Faltó alguna repetición: repite el peso hasta completarlas todas.' };
  }
  if (maxRpe != null && maxRpe >= 9) {
    return { weight: top, reps: targetReps, delta: 0, kind: 'same', reason: `Completaste todo pero muy exigente (RPE ${fmt(maxRpe)}): repite para consolidar.` };
  }
  const steps = opts.bigLift && maxRpe != null && maxRpe <= 7 ? 2 : 1;
  const weight = roundToIncrement(top + inc * steps, inc);
  return {
    weight,
    reps: targetReps,
    delta: weight - top,
    kind: 'up',
    reason:
      maxRpe != null
        ? `Completaste todas las series a RPE ≤ ${fmt(maxRpe)}: sube ${fmt(weight - top)} kg.`
        : `Completaste todas las series: sube ${fmt(weight - top)} kg.`,
  };
}
