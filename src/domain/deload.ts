import type { DeloadConfig, DeloadStyle, LoadTarget, PlannedSet } from '../db/types';
import { DAY_MS, startOfWeek } from './analytics';
import { roundToIncrement } from './load';

// Semanas de descarga: cada N semanas (la última del ciclo) la rutina se entrena reducida.

export const DELOAD_LOAD_FACTOR = 0.9; // −10 % de carga
export const DELOAD_RPE_DROP = 2; // RPE 8 → 6

export const DELOAD_STYLES: Record<DeloadStyle, { label: string; desc: string }> = {
  volume: { label: 'Menos series', desc: 'Mitad de series efectivas, misma carga.' },
  intensity: { label: 'Menos carga', desc: 'Mismas series con −10 % de peso o −2 de RPE.' },
  both: { label: 'Ambas', desc: 'Mitad de series y −10 % de carga.' },
};

export function newDeloadConfig(everyWeeks: number | null, now = Date.now()): DeloadConfig {
  return { everyWeeks, style: 'volume', anchor: startOfWeek(now) };
}

const weeksBetween = (a: number, b: number) => Math.round((b - a) / (7 * DAY_MS)); // round: tolera cambios de hora

/** Semana del ciclo (1…N) en la que cae `now`, o undefined si no hay ciclo automático. */
export function cycleWeek(cfg: DeloadConfig | undefined, now = Date.now()): { week: number; of: number } | undefined {
  if (!cfg?.everyWeeks || cfg.everyWeeks < 2) return undefined;
  const idx = Math.max(0, weeksBetween(cfg.anchor, startOfWeek(now)));
  return { week: (idx % cfg.everyWeeks) + 1, of: cfg.everyWeeks };
}

/** ¿Toca descarga esta semana? El ajuste manual de la semana manda sobre el ciclo. */
export function isDeloadWeek(cfg: DeloadConfig | undefined, now = Date.now()): boolean {
  if (!cfg) return false;
  if (cfg.override && cfg.override.week === startOfWeek(now)) return cfg.override.deload;
  const c = cycleWeek(cfg, now);
  return !!c && c.week === c.of;
}

/** Lunes de la próxima semana de descarga automática (para mostrarlo). */
export function nextDeloadWeek(cfg: DeloadConfig | undefined, now = Date.now()): number | undefined {
  const c = cycleWeek(cfg, now);
  if (!c) return undefined;
  const d = new Date(startOfWeek(now));
  d.setDate(d.getDate() + (c.of - c.week) * 7);
  return d.getTime();
}

/** Objetivo de carga reducido: % y kg −10 %, RPE −2 (mínimo 6). */
export function deloadTarget(t: LoadTarget | undefined, increment = 2.5): LoadTarget | undefined {
  if (!t) return t;
  switch (t.kind) {
    case 'pct1rm':
      return { kind: 'pct1rm', pct: Math.round(t.pct * DELOAD_LOAD_FACTOR) };
    case 'kg':
      return { kind: 'kg', kg: roundToIncrement(t.kg * DELOAD_LOAD_FACTOR, increment) };
    case 'rpe':
      return { kind: 'rpe', rpe: Math.max(6, t.rpe - DELOAD_RPE_DROP) };
  }
}

export const reducesVolume = (s: DeloadStyle) => s === 'volume' || s === 'both';
export const reducesLoad = (s: DeloadStyle) => s === 'intensity' || s === 'both';

/**
 * Series planificadas de un ejercicio en semana de descarga.
 * Volumen: se mantienen los calentamientos y la primera mitad (redondeando hacia arriba) de las
 * efectivas, así un top set se conserva y se recortan back-offs.
 */
export function deloadSets(sets: PlannedSet[], style: DeloadStyle, increment = 2.5): PlannedSet[] {
  let out = sets;
  if (reducesVolume(style)) {
    const work = sets.filter((s) => s.type !== 'warmup').length;
    let keep = Math.max(1, Math.ceil(work / 2));
    out = sets.filter((s) => s.type === 'warmup' || keep-- > 0);
  }
  if (reducesLoad(style)) out = out.map((s) => (s.type === 'warmup' ? s : { ...s, target: deloadTarget(s.target, increment) }));
  // Una serie "al fallo" no tiene sentido en descarga.
  return out.map((s) => (s.type === 'failure' ? { ...s, type: 'working' as const } : s));
}
