import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Lock, Plus, Target, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import type { Exercise, Goal, Workout, WorkoutSet } from '../../db/types';
import { computeAchievements, goalProgress, type AchievementFamily } from '../../domain/achievements';
import { fmtNum } from '../../lib/format';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { NumInput } from '../../components/ui/NumInput';
import { ExercisePicker } from '../exercises/ExercisePicker';

const longDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

const GOAL_KINDS: { kind: Goal['kind']; label: string; hint: string }[] = [
  { kind: 'weight', label: 'Peso real', hint: 'Mover ese peso en una serie (cualquier nº de reps).' },
  { kind: 'e1rm', label: 'e1RM', hint: '1RM estimado a partir de cualquier serie.' },
  { kind: 'total', label: 'Total SBD', hint: 'Suma de tus mejores pesos en sentadilla, banca y peso muerto.' },
];

/* ---------- Metas ---------- */

export function GoalsCard({ sets, exercises }: { sets: WorkoutSet[]; exercises: Exercise[] }) {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [adding, setAdding] = useState(false);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  if (!goals) return null;

  const rows = goals
    .map((g) => ({ g, p: goalProgress(g, sets, exercises) }))
    .sort((a, b) => Number(!!a.p.achievedAt) - Number(!!b.p.achievedAt) || b.p.current / b.g.target - a.p.current / a.g.target);

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Mis metas</h2>
        <button onClick={() => setAdding(true)} className="flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-bold text-accent">
          <Plus size={18} /> Nueva
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          Ponte un objetivo, p. ej. “180 kg en sentadilla” o “500 kg de total”, y sigue tu avance.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-4">
          {rows.map(({ g, p }) => {
            const pct = Math.min(100, (p.current / g.target) * 100);
            const name = g.kind === 'total' ? 'Total SBD' : (byId.get(g.exerciseId!)?.name ?? 'Ejercicio');
            const kindLabel = g.kind === 'e1rm' ? 'e1RM' : g.kind === 'weight' ? 'peso' : '';
            return (
              <li key={g.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {p.achievedAt && <Check size={16} className="mr-1 inline text-accent" />}
                      {name}
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      {kindLabel && `${kindLabel} · `}
                      {fmtNum(Math.round(p.current * 2) / 2)} / {fmtNum(g.target)} kg
                      {p.achievedAt
                        ? ` · conseguida el ${longDate.format(p.achievedAt)}`
                        : p.current > 0 && ` · faltan ${fmtNum(Math.round((g.target - p.current) * 2) / 2)} kg`}
                    </p>
                  </div>
                  <button
                    onClick={() => void db.goals.delete(g.id)}
                    className="grid size-9 shrink-0 place-items-center text-muted"
                    aria-label={`Eliminar meta ${name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${p.achievedAt ? 'bg-accent' : 'bg-accent/70'}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <NewGoalSheet open={adding} onClose={() => setAdding(false)} byId={byId} />
    </section>
  );
}

function NewGoalSheet({ open, onClose, byId }: { open: boolean; onClose: () => void; byId: Map<number, Exercise> }) {
  const [kind, setKind] = useState<Goal['kind']>('weight');
  const [exerciseId, setExerciseId] = useState<number>();
  const [target, setTarget] = useState<number>();
  const [picking, setPicking] = useState(false);
  const valid = target != null && target > 0 && (kind === 'total' || exerciseId != null);

  const save = async () => {
    if (!valid) return;
    await db.goals.add({ kind, exerciseId: kind === 'total' ? undefined : exerciseId, target: target!, createdAt: Date.now() } as Goal);
    setTarget(undefined);
    onClose();
  };

  return (
    <>
      <BottomSheet open={open && !picking} onClose={onClose} title="Nueva meta">
        <div className="flex flex-col gap-4 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {GOAL_KINDS.map((k) => (
              <button
                key={k.kind}
                onClick={() => setKind(k.kind)}
                className={`h-11 rounded-xl text-sm font-bold ${kind === k.kind ? 'bg-accent text-accent-fg' : 'bg-surface-2'}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="-mt-2 text-xs text-muted">{GOAL_KINDS.find((k) => k.kind === kind)!.hint}</p>
          {kind !== 'total' && (
            <button onClick={() => setPicking(true)} className="btn justify-between bg-surface-2">
              <span className={exerciseId ? '' : 'text-muted'}>{exerciseId ? byId.get(exerciseId)?.name : 'Elegir ejercicio'}</span>
              <Target size={18} className="text-muted" />
            </button>
          )}
          <label className="flex items-center gap-3">
            <span className="flex-1 font-semibold">Objetivo (kg)</span>
            <NumInput value={target} onCommit={setTarget} ariaLabel="Objetivo en kg" placeholder="0" className="w-28" />
          </label>
          <button onClick={() => void save()} disabled={!valid} className="btn btn-primary w-full disabled:opacity-40">
            Guardar meta
          </button>
        </div>
      </BottomSheet>
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={(id) => {
          setExerciseId(id);
          setPicking(false);
        }}
      />
    </>
  );
}

/* ---------- Logros ---------- */

export function AchievementsCard({ sets, exercises, workouts }: { sets: WorkoutSet[]; exercises: Exercise[]; workouts: Workout[] }) {
  const families = useMemo(() => computeAchievements(workouts, sets, exercises), [workouts, sets, exercises]);
  const unlocked = families.reduce((t, f) => t + f.tiers.filter((x) => x.unlockedAt).length, 0);
  const total = families.reduce((t, f) => t + f.tiers.length, 0);
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Logros</h2>
      <p className="text-xs text-muted tabular-nums">
        {unlocked} de {total} desbloqueados
      </p>
      <ul className="mt-3 flex flex-col gap-4">
        {families.map((f) => (
          <FamilyRow key={f.id} f={f} />
        ))}
      </ul>
    </section>
  );
}

function FamilyRow({ f }: { f: AchievementFamily }) {
  const next = f.tiers.find((t) => !t.unlockedAt);
  const prevValue = [...f.tiers].reverse().find((t) => t.unlockedAt)?.value ?? 0;
  const pct = next ? Math.max(0, Math.min(100, ((f.current - prevValue) / (next.value - prevValue)) * 100)) : 100;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-bold">
          <span aria-hidden className="mr-1">
            {f.icon}
          </span>
          {f.title}
        </p>
        <span className="shrink-0 text-xs text-muted">{f.currentLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {f.tiers.map((t) => (
          <span
            key={t.value}
            title={t.unlockedAt ? `Conseguido el ${longDate.format(t.unlockedAt)}` : 'Bloqueado'}
            className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-bold tabular-nums ${
              t.unlockedAt ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted'
            }`}
          >
            {!t.unlockedAt && <Lock size={11} />}
            {t.label}
          </span>
        ))}
      </div>
      {next && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[11px] text-muted">siguiente: {next.label}</span>
        </div>
      )}
    </li>
  );
}
