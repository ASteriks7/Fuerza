import type { Exercise, Goal, SbdSlot, Workout, WorkoutSet } from '../db/types';
import { isWorkSet, startOfWeek } from './analytics';

// Logros calculados a partir del historial (no se guardan: siempre coinciden con los datos).

export interface Tier {
  value: number;
  label: string;
  unlockedAt?: number;
}

export interface AchievementFamily {
  id: string;
  icon: string;
  title: string;
  /** Valor actual (para la barra hacia el siguiente nivel). */
  current: number;
  currentLabel: string;
  tiers: Tier[];
}

const kg = (n: number) => `${n.toLocaleString('es', { maximumFractionDigits: 1 })} kg`;
const tons = (n: number) => `${(n / 1000).toLocaleString('es', { maximumFractionDigits: n < 10_000 ? 1 : 0 })} t`;

/** Marca cada nivel con el momento en que el valor acumulado lo alcanzó. */
function tiersFromTimeline(timeline: { at: number; value: number }[], values: number[], label: (v: number) => string): Tier[] {
  return values.map((v) => ({ value: v, label: label(v), unlockedAt: timeline.find((p) => p.value >= v)?.at }));
}

/** Máximo peso movido (≥ 1 rep) a lo largo del tiempo para un ejercicio. */
function maxWeightTimeline(sets: WorkoutSet[]): { at: number; value: number }[] {
  let max = 0;
  const out: { at: number; value: number }[] = [];
  for (const s of sets) {
    if (!isWorkSet(s) || (s.weight ?? 0) <= max) continue;
    max = s.weight!;
    out.push({ at: s.completedAt!, value: max });
  }
  return out;
}

const LIFT_TIERS: { key: string; icon: string; title: string; find: (e: Exercise) => boolean; tiers: number[] }[] = [
  { key: 'S', icon: '🦵', title: 'Club de sentadilla', find: (e) => e.sbdSlot === 'S', tiers: [60, 100, 140, 180, 220, 260] },
  { key: 'B', icon: '💪', title: 'Club de press banca', find: (e) => e.sbdSlot === 'B', tiers: [40, 60, 100, 140, 180] },
  { key: 'D', icon: '🏋️', title: 'Club de peso muerto', find: (e) => e.sbdSlot === 'D', tiers: [100, 140, 180, 220, 260, 300] },
  { key: 'snatch', icon: '⚡', title: 'Club de arrancada', find: (e) => e.name === 'Arrancada', tiers: [40, 60, 80, 100, 120] },
  { key: 'cj', icon: '🔥', title: 'Club de dos tiempos', find: (e) => e.name === 'Dos tiempos (cargada y envión)', tiers: [50, 80, 100, 130, 160] },
];

export function computeAchievements(workouts: Workout[], sets: WorkoutSet[], exercises: Exercise[]): AchievementFamily[] {
  const done = workouts.filter((w) => w.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  const chrono = sets.filter((s) => s.completedAt != null).sort((a, b) => a.completedAt! - b.completedAt!);
  const out: AchievementFamily[] = [];

  // Constancia
  out.push({
    id: 'workouts',
    icon: '📅',
    title: 'Entrenamientos completados',
    current: done.length,
    currentLabel: `${done.length}`,
    tiers: [1, 10, 25, 50, 100, 250, 500].map((n) => ({ value: n, label: `${n}`, unlockedAt: done[n - 1]?.startedAt })),
  });

  // Racha de semanas seguidas con al menos un entrenamiento
  const weekFirst = new Map<number, number>();
  for (const w of done) {
    const k = startOfWeek(w.startedAt);
    if (!weekFirst.has(k)) weekFirst.set(k, w.startedAt);
  }
  const weeks = [...weekFirst.keys()].sort((a, b) => a - b);
  const streakTimeline: { at: number; value: number }[] = [];
  let run = 0;
  let best = 0;
  weeks.forEach((wk, i) => {
    const prev = weeks[i - 1];
    // 6–8 días entre lunes = semana consecutiva (tolera cambios de horario).
    run = prev != null && wk - prev <= 8 * 86_400_000 ? run + 1 : 1;
    if (run > best) {
      best = run;
      streakTimeline.push({ at: weekFirst.get(wk)!, value: best });
    }
  });
  out.push({
    id: 'streak',
    icon: '🔗',
    title: 'Racha de semanas entrenando',
    current: best,
    currentLabel: `mejor racha: ${best} ${best === 1 ? 'semana' : 'semanas'}`,
    tiers: tiersFromTimeline(streakTimeline, [4, 8, 12, 26, 52], (n) => `${n} sem.`),
  });

  // Tonelaje acumulado
  let acc = 0;
  const tonTimeline: { at: number; value: number }[] = [];
  for (const s of chrono) {
    if (!isWorkSet(s)) continue;
    acc += (s.weight ?? 0) * s.reps!;
    tonTimeline.push({ at: s.completedAt!, value: acc });
  }
  out.push({
    id: 'tonnage',
    icon: '🏗️',
    title: 'Tonelaje total levantado',
    current: acc,
    currentLabel: tons(acc),
    tiers: tiersFromTimeline(tonTimeline, [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000], tons),
  });

  // Clubes por levantamiento (peso real, cualquier número de reps)
  const bySlot: Partial<Record<SbdSlot, { at: number; value: number }[]>> = {};
  for (const lift of LIFT_TIERS) {
    const ex = exercises.find((e) => lift.find(e) && !e.archived) ?? exercises.find(lift.find);
    if (!ex) continue;
    const timeline = maxWeightTimeline(chrono.filter((s) => s.exerciseId === ex.id));
    if (lift.key === 'S' || lift.key === 'B' || lift.key === 'D') bySlot[lift.key] = timeline;
    const current = timeline.at(-1)?.value ?? 0;
    out.push({
      id: `lift-${lift.key}`,
      icon: lift.icon,
      title: lift.title,
      current,
      currentLabel: current ? `mejor: ${kg(current)}` : 'sin registros',
      tiers: tiersFromTimeline(timeline, lift.tiers, kg),
    });
  }

  // Total SBD con los mejores pesos
  const totalTimeline = sbdTotalTimeline(bySlot);
  const totalNow = totalTimeline.at(-1)?.value ?? 0;
  out.push({
    id: 'total',
    icon: '🏆',
    title: 'Total SBD (mejores pesos)',
    current: totalNow,
    currentLabel: totalNow ? `actual: ${kg(totalNow)}` : 'registra los tres básicos',
    tiers: tiersFromTimeline(totalTimeline, [200, 300, 400, 500, 600, 700, 800], kg),
  });

  return out;
}

function sbdTotalTimeline(bySlot: Partial<Record<SbdSlot, { at: number; value: number }[]>>): { at: number; value: number }[] {
  const events = (['S', 'B', 'D'] as const).flatMap((slot) => (bySlot[slot] ?? []).map((p) => ({ ...p, slot })));
  events.sort((a, b) => a.at - b.at);
  const cur: Partial<Record<SbdSlot, number>> = {};
  const out: { at: number; value: number }[] = [];
  for (const e of events) {
    cur[e.slot] = e.value;
    if (cur.S != null && cur.B != null && cur.D != null) out.push({ at: e.at, value: cur.S + cur.B + cur.D });
  }
  return out;
}

/* ---------- Metas ---------- */

export interface GoalProgress {
  current: number;
  achievedAt?: number;
}

/** Valor actual de una meta y, si se cumplió, cuándo. */
export function goalProgress(goal: Goal, sets: WorkoutSet[], exercises: Exercise[]): GoalProgress {
  const chrono = sets.filter((s) => s.completedAt != null).sort((a, b) => a.completedAt! - b.completedAt!);
  let timeline: { at: number; value: number }[];
  if (goal.kind === 'total') {
    const bySlot: Partial<Record<SbdSlot, { at: number; value: number }[]>> = {};
    for (const slot of ['S', 'B', 'D'] as const) {
      const ex = exercises.find((e) => e.sbdSlot === slot);
      if (ex) bySlot[slot] = maxWeightTimeline(chrono.filter((s) => s.exerciseId === ex.id));
    }
    timeline = sbdTotalTimeline(bySlot);
  } else {
    const exSets = chrono.filter((s) => s.exerciseId === goal.exerciseId);
    if (goal.kind === 'weight') timeline = maxWeightTimeline(exSets);
    else {
      let max = 0;
      timeline = [];
      for (const s of exSets) {
        if (!isWorkSet(s) || (s.e1rm ?? 0) <= max) continue;
        max = s.e1rm!;
        timeline.push({ at: s.completedAt!, value: max });
      }
    }
  }
  return { current: timeline.at(-1)?.value ?? 0, achievedAt: timeline.find((p) => p.value >= goal.target)?.at };
}
