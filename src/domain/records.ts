import type { WorkoutSet } from '../db/types';
import { isWorkSet } from './analytics';

// Récords al momento: ¿esta serie supera todo lo anterior de ese ejercicio?

export type PrHit =
  | { kind: 'e1rm'; value: number; previous: number }
  | { kind: 'rm'; reps: 1 | 3 | 5; value: number; previous: number };

const RM_REPS = [1, 3, 5] as const;

/**
 * Compara una serie completada con las anteriores del mismo ejercicio (`prior`, sin incluirla).
 * Sin historial previo no hay récord (la primera vez no cuenta).
 */
export function detectPRs(set: WorkoutSet, prior: WorkoutSet[]): PrHit[] {
  if (!isWorkSet(set) || set.weight == null || set.weight <= 0) return [];
  const before = prior.filter((s) => s.id !== set.id && isWorkSet(s) && (s.weight ?? 0) > 0);
  if (!before.length) return [];
  const hits: PrHit[] = [];

  const prevE1 = Math.max(...before.map((s) => s.e1rm ?? 0));
  if (set.e1rm != null && prevE1 > 0 && set.e1rm > prevE1 + 0.01) hits.push({ kind: 'e1rm', value: set.e1rm, previous: prevE1 });

  for (const n of RM_REPS) {
    if ((set.reps ?? 0) < n) continue;
    const withN = before.filter((s) => (s.reps ?? 0) >= n).map((s) => s.weight!);
    if (!withN.length) continue;
    const prev = Math.max(...withN);
    if (set.weight > prev) hits.push({ kind: 'rm', reps: n, value: set.weight, previous: prev });
  }
  return hits;
}

export function describePR(h: PrHit): string {
  const f = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 1 });
  return h.kind === 'e1rm'
    ? `e1RM ${f(Math.round(h.value * 2) / 2)} kg (antes ${f(Math.round(h.previous * 2) / 2)})`
    : `${h.reps}RM ${f(h.value)} kg (antes ${f(h.previous)})`;
}

/** Texto compacto: agrupa los RM batidos con el mismo peso (“Récord de 1, 3 y 5 reps: 140 kg”). */
export function describePRs(hits: PrHit[]): string[] {
  const f = (n: number) => n.toLocaleString('es', { maximumFractionDigits: 1 });
  const out: string[] = [];
  const e1 = hits.find((h) => h.kind === 'e1rm');
  if (e1) out.push(describePR(e1));
  const byWeight = new Map<number, { reps: number[]; previous: number }>();
  for (const h of hits) {
    if (h.kind !== 'rm') continue;
    const g = byWeight.get(h.value) ?? { reps: [], previous: h.previous };
    g.reps.push(h.reps);
    g.previous = Math.max(g.previous, h.previous);
    byWeight.set(h.value, g);
  }
  for (const [w, g] of byWeight) {
    const list = g.reps.length > 1 ? `${g.reps.slice(0, -1).join(', ')} y ${g.reps.at(-1)}` : String(g.reps[0]);
    out.push(`Récord de ${list} ${g.reps.length === 1 && g.reps[0] === 1 ? 'rep' : 'reps'}: ${f(w)} kg (antes ${f(g.previous)})`);
  }
  return out;
}

/**
 * Récords de un entrenamiento agrupados por ejercicio: para cada tipo (e1RM, 1/3/5RM) el mejor
 * valor del día frente a lo que había antes de empezar (`before` = historial previo).
 */
export function workoutRecordSummary(workoutSets: WorkoutSet[], before: WorkoutSet[]): { exerciseId: number; hits: PrHit[] }[] {
  const out = new Map<number, Map<string, PrHit>>();
  for (const s of workoutSets) {
    if (s.completedAt == null) continue;
    const hits = detectPRs(s, before.filter((h) => h.exerciseId === s.exerciseId));
    for (const h of hits) {
      const key = h.kind === 'e1rm' ? 'e1rm' : `rm${h.reps}`;
      const m = out.get(s.exerciseId) ?? new Map<string, PrHit>();
      const cur = m.get(key);
      if (!cur || h.value > cur.value) m.set(key, h);
      out.set(s.exerciseId, m);
    }
  }
  return [...out].map(([exerciseId, m]) => ({ exerciseId, hits: [...m.values()] }));
}
