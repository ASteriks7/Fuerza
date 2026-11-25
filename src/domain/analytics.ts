import type { WorkoutSet } from '../db/types';

// Cálculos de progreso (puros, sin base de datos). Solo cuentan series completadas
// que no sean de calentamiento.

export const DAY_MS = 86_400_000;

export function isWorkSet(s: WorkoutSet): boolean {
  return s.completedAt != null && s.type !== 'warmup' && (s.reps ?? 0) > 0;
}

/** Medianoche local del día de ts. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Lunes 00:00 local de la semana de ts. */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts));
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export interface RepPR {
  weight: number;
  reps: number;
  date: number;
  workoutId: number;
}

/**
 * Récords por repeticiones: para cada n, el mayor peso movido en una serie de al
 * menos n reps (un 5RM también cuenta como 3RM si es más pesado). Ante empate, el más antiguo.
 */
export function repPRs(sets: WorkoutSet[], targets: number[] = [1, 3, 5]): Record<number, RepPR | undefined> {
  const out: Record<number, RepPR | undefined> = {};
  for (const n of targets) {
    let best: RepPR | undefined;
    for (const s of sets) {
      if (!isWorkSet(s) || s.weight == null || (s.reps ?? 0) < n) continue;
      const date = s.completedAt!;
      if (!best || s.weight > best.weight || (s.weight === best.weight && date < best.date)) {
        best = { weight: s.weight, reps: s.reps!, date, workoutId: s.workoutId };
      }
    }
    out[n] = best;
  }
  return out;
}

/** Serie con mayor e1RM (opcionalmente desde una fecha). */
export function bestE1RMSet(sets: WorkoutSet[], since = 0): WorkoutSet | undefined {
  let best: WorkoutSet | undefined;
  for (const s of sets) {
    if (!isWorkSet(s) || s.e1rm == null || s.completedAt! < since) continue;
    if (!best || s.e1rm > best.e1rm!) best = s;
  }
  return best;
}

export interface E1rmPoint {
  date: number;
  e1rm: number;
  set: WorkoutSet;
}

/** Mejor e1RM de cada día, en orden cronológico. */
export function e1rmByDay(sets: WorkoutSet[]): E1rmPoint[] {
  const byDay = new Map<number, E1rmPoint>();
  for (const s of sets) {
    if (!isWorkSet(s) || s.e1rm == null) continue;
    const day = startOfDay(s.completedAt!);
    const cur = byDay.get(day);
    if (!cur || s.e1rm > cur.e1rm) byDay.set(day, { date: day, e1rm: s.e1rm, set: s });
  }
  return [...byDay.values()].sort((a, b) => a.date - b.date);
}

export interface WeekTonnage {
  weekStart: number;
  kg: number;
}

/** Tonelaje (kg × reps) de las últimas `weeks` semanas, incluidas las semanas sin entrenar. */
export function weeklyTonnage(sets: WorkoutSet[], weeks: number, now = Date.now()): WeekTonnage[] {
  const thisWeek = startOfWeek(now);
  const out: WeekTonnage[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    out.push({ weekStart: d.getTime(), kg: 0 });
  }
  const index = new Map(out.map((w, i) => [w.weekStart, i]));
  for (const s of sets) {
    if (!isWorkSet(s)) continue;
    const i = index.get(startOfWeek(s.completedAt!));
    if (i != null) out[i].kg += (s.weight ?? 0) * s.reps!;
  }
  return out;
}

/** Celdas de un mes para un calendario que empieza en lunes (null = hueco). */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d).getTime());
  while (cells.length % 7) cells.push(null);
  return cells;
}

export interface VolumeTotals {
  week: number;
  month: number;
  year: number;
  all: number;
  reps: number;
}

/** Tonelaje acumulado (kg) de esta semana, este mes, este año y de siempre. */
export function volumeTotals(sets: WorkoutSet[], now = Date.now()): VolumeTotals {
  const d = new Date(now);
  const week = startOfWeek(now);
  const month = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const year = new Date(d.getFullYear(), 0, 1).getTime();
  const t: VolumeTotals = { week: 0, month: 0, year: 0, all: 0, reps: 0 };
  for (const s of sets) {
    if (!isWorkSet(s)) continue;
    const v = (s.weight ?? 0) * s.reps!;
    const at = s.completedAt!;
    t.all += v;
    t.reps += s.reps!;
    if (at >= year) t.year += v;
    if (at >= month) t.month += v;
    if (at >= week) t.week += v;
  }
  return t;
}
