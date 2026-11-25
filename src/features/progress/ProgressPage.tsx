import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../../db/schema';
import type { Exercise, SbdSlot, Workout, WorkoutSet } from '../../db/types';
import {
  bestE1RMSet,
  DAY_MS,
  e1rmByDay,
  monthGrid,
  repPRs,
  startOfDay,
  weeklyTonnage,
  type E1rmPoint,
  type WeekTonnage,
} from '../../domain/analytics';
import { roundE1RM } from '../../domain/e1rm';
import { fmtNum } from '../../lib/format';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { MuscleProgressCard, VolumeTotalsCard } from './VolumeTab';
import { AchievementsCard, GoalsCard } from './GoalsTab';

type Tab = 'fuerza' | 'volumen' | 'logros';
const TABS: { id: Tab; label: string }[] = [
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'volumen', label: 'Volumen' },
  { id: 'logros', label: 'Metas y logros' },
];
const TAB_KEY = 'fuerza.progressTab';

// Colores de las gráficas (los atributos SVG no admiten var(--…)). Mismos valores que @theme.
const C = { accent: '#c6f432', line: '#2e2e36', muted: '#9b9ba6', surface: '#16161a' };
const REF_DAYS = 120;
const SLOTS: { slot: SbdSlot; label: string }[] = [
  { slot: 'S', label: 'Sentadilla' },
  { slot: 'B', label: 'Banca' },
  { slot: 'D', label: 'Peso muerto' },
];

const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
const monthName = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

export function ProgressPage() {
  const sets = useLiveQuery(() => db.sets.where('completedAt').above(0).toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const workouts = useLiveQuery(() => db.workouts.where('status').equals('done').toArray(), []);
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      const t = localStorage.getItem(TAB_KEY);
      return TABS.some((x) => x.id === t) ? (t as Tab) : 'fuerza';
    } catch {
      return 'fuerza';
    }
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* sin almacenamiento */
    }
  };

  const byExercise = useMemo(() => {
    const m = new Map<number, WorkoutSet[]>();
    for (const s of sets ?? []) {
      const list = m.get(s.exerciseId);
      if (list) list.push(s);
      else m.set(s.exerciseId, [s]);
    }
    return m;
  }, [sets]);

  const sbd = useMemo(() => {
    const out = {} as Record<SbdSlot, Exercise | undefined>;
    for (const { slot } of SLOTS) out[slot] = exercises?.find((e) => e.sbdSlot === slot && !e.archived);
    return out;
  }, [exercises]);

  if (!sets || !exercises || !workouts) return null;

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-3xl font-black">Progreso</h1>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-lg text-sm font-bold ${tab === t.id ? 'bg-surface-2 text-accent' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'logros' ? (
        <>
          <GoalsCard sets={sets} exercises={exercises} />
          <AchievementsCard sets={sets} exercises={exercises} workouts={workouts} />
        </>
      ) : sets.length === 0 ? (
        <p className="py-10 text-center text-muted">
          Completa algunas series y aquí verás tu total, récords y gráficas.
        </p>
      ) : tab === 'fuerza' ? (
        <>
          <SbdTotal sbd={sbd} byExercise={byExercise} />
          <ExerciseProgress sbd={sbd} exercises={exercises} byExercise={byExercise} />
        </>
      ) : (
        <>
          <VolumeTotalsCard sets={sets} />
          <TonnageCard sets={sets} />
          <MuscleProgressCard sets={sets} exercises={exercises} />
        </>
      )}
      {tab === 'fuerza' && <TrainingCalendar workouts={workouts} />}
    </div>
  );
}

/* ---------- Total SBD ---------- */

function SbdTotal({ sbd, byExercise }: { sbd: Record<SbdSlot, Exercise | undefined>; byExercise: Map<number, WorkoutSet[]> }) {
  const since = Date.now() - REF_DAYS * DAY_MS;
  const rows = SLOTS.map(({ slot, label }) => {
    const ex = sbd[slot];
    const sets = ex ? (byExercise.get(ex.id) ?? []) : [];
    const e1 = bestE1RMSet(sets, since)?.e1rm;
    const real = repPRs(sets, [1])[1]?.weight;
    return { slot, label, e1: e1 != null ? roundE1RM(e1) : undefined, real };
  });
  const sum = (k: 'e1' | 'real') => (rows.every((r) => r[k] != null) ? rows.reduce((t, r) => t + r[k]!, 0) : undefined);
  const totalE1 = sum('e1');
  const totalReal = sum('real');

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Total SBD estimado</h2>
        <span className="text-xs text-muted">últimos {REF_DAYS} días</span>
      </div>
      <p className="mt-1 text-5xl leading-none font-black tabular-nums">
        {totalE1 != null ? fmtNum(totalE1) : '—'}
        <span className="ml-1 text-xl font-bold text-muted">kg</span>
      </p>
      {totalE1 == null && <p className="mt-1 text-sm text-muted">Registra sentadilla, banca y peso muerto para ver el total.</p>}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.slot} className="rounded-xl bg-surface-2 p-2 text-center">
            <div className="truncate text-xs text-muted">{r.label}</div>
            <div className="text-xl font-bold tabular-nums">{r.e1 != null ? fmtNum(r.e1) : '—'}</div>
            <div className="text-[11px] text-muted tabular-nums">real {r.real != null ? fmtNum(r.real) : '—'}</div>
          </div>
        ))}
      </div>
      {totalReal != null && (
        <p className="mt-3 text-sm text-muted">
          Total real (mejores singles): <span className="font-semibold text-fg tabular-nums">{fmtNum(totalReal)} kg</span>
        </p>
      )}
    </section>
  );
}

/* ---------- Progreso por ejercicio ---------- */

const RANGES = [
  { key: '3m', label: '3M', days: 91 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1a', label: '1A', days: 365 },
  { key: 'all', label: 'Todo', days: Infinity },
] as const;

function ExerciseProgress({
  sbd,
  exercises,
  byExercise,
}: {
  sbd: Record<SbdSlot, Exercise | undefined>;
  exercises: Exercise[];
  byExercise: Map<number, WorkoutSet[]>;
}) {
  const [selected, setSelected] = useState<number | undefined>(() => {
    // Por defecto: el primer básico con datos, si no, el primero con datos.
    const withData = SLOTS.map((s) => sbd[s.slot]?.id).find((id) => id != null && byExercise.has(id));
    return withData ?? byExercise.keys().next().value;
  });
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('6m');
  const [picker, setPicker] = useState(false);

  const exercise = exercises.find((e) => e.id === selected);
  const sets = (selected != null && byExercise.get(selected)) || [];
  const days = RANGES.find((r) => r.key === range)!.days;
  const points = useMemo(() => {
    const from = days === Infinity ? 0 : Date.now() - days * DAY_MS;
    return e1rmByDay(sets).filter((p) => p.date >= startOfDay(from));
  }, [sets, days]);
  const prs = repPRs(sets);
  const best = bestE1RMSet(sets);
  const isSbd = SLOTS.some((s) => sbd[s.slot]?.id === selected);

  return (
    <section className="card p-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {SLOTS.map(({ slot, label }) => {
          const ex = sbd[slot];
          if (!ex) return null;
          return (
            <Chip key={slot} active={selected === ex.id} onClick={() => setSelected(ex.id)}>
              {label}
            </Chip>
          );
        })}
        {!isSbd && exercise && (
          <Chip active onClick={() => setPicker(true)}>
            {exercise.name}
          </Chip>
        )}
        <Chip active={false} onClick={() => setPicker(true)}>
          Otro…
        </Chip>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted uppercase">Mejor e1RM</div>
          <div className="text-3xl font-black tabular-nums">
            {best?.e1rm != null ? fmtNum(roundE1RM(best.e1rm)) : '—'}
            <span className="ml-1 text-base font-bold text-muted">kg</span>
          </div>
          {best && <div className="text-xs text-muted">{describeSet(best)} · {longDate.format(best.completedAt!)}</div>}
        </div>
        <div className="flex shrink-0 rounded-xl bg-surface-2 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`h-9 rounded-lg px-2.5 text-sm font-semibold ${range === r.key ? 'bg-surface text-fg' : 'text-muted'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <E1rmChart points={points} />

      <h3 className="mt-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted uppercase">
        <Trophy size={16} className="text-accent" /> Récords
      </h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[1, 3, 5].map((n) => {
          const pr = prs[n];
          const body = (
            <>
              <div className="text-xs text-muted">{n}RM</div>
              <div className="text-xl font-bold tabular-nums">{pr ? fmtNum(pr.weight) : '—'}</div>
              <div className="text-[11px] text-muted">{pr ? `${pr.reps} ${pr.reps === 1 ? 'rep' : 'reps'} · ${shortDate.format(pr.date)}` : 'sin datos'}</div>
            </>
          );
          return pr ? (
            <Link key={n} to={`/history/${pr.workoutId}`} className="rounded-xl bg-surface-2 p-2 text-center active:bg-line">
              {body}
            </Link>
          ) : (
            <div key={n} className="rounded-xl bg-surface-2 p-2 text-center">
              {body}
            </div>
          );
        })}
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={(id) => {
          setSelected(id);
          setPicker(false);
        }}
      />
    </section>
  );
}

function describeSet(s: WorkoutSet) {
  return `${fmtNum(s.weight)} × ${s.reps}${s.rpe ? ` @${fmtNum(s.rpe)}` : ''}`;
}

function E1rmChart({ points }: { points: E1rmPoint[] }) {
  if (points.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">Sin series en este periodo.</p>;
  }
  const data = points.map((p) => ({ date: p.date, e1rm: roundE1RM(p.e1rm), set: p.set }));
  const single = data.length === 1;
  return (
    <div className="mt-3 h-52" role="img" aria-label="Evolución del e1RM">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={single ? [data[0].date - 7 * DAY_MS, data[0].date + 7 * DAY_MS] : ['dataMin', 'dataMax']}
            tickFormatter={(v: number) => shortDate.format(v)}
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[(min: number) => Math.floor((min - 5) / 5) * 5, (max: number) => Math.ceil((max + 5) / 5) * 5]}
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: C.muted, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !p) return null;
              return (
                <TooltipBox title={longDate.format(p.date)}>
                  <b className="tabular-nums">{fmtNum(p.e1rm)} kg</b> e1RM
                  <div className="text-muted">{describeSet(p.set)}</div>
                </TooltipBox>
              );
            }}
          />
          <Line
            dataKey="e1rm"
            stroke={C.accent}
            strokeWidth={2}
            // Con muchos puntos los marcadores parten la línea: solo se muestran si hay pocos.
            dot={data.length <= 12 ? { r: 4, fill: C.accent, stroke: C.surface, strokeWidth: 2 } : false}
            activeDot={{ r: 6, fill: C.accent, stroke: C.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Tonelaje semanal ---------- */

function TonnageCard({ sets }: { sets: WorkoutSet[] }) {
  const weeks: WeekTonnage[] = useMemo(() => weeklyTonnage(sets, 12), [sets]);
  const current = weeks[weeks.length - 1].kg;
  const prev = weeks[weeks.length - 2].kg;
  const delta = prev > 0 ? Math.round(((current - prev) / prev) * 100) : undefined;

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Tonelaje semanal</h2>
      <p className="mt-1 text-3xl font-black tabular-nums">
        {fmtNum(Math.round(current))}
        <span className="ml-1 text-base font-bold text-muted">kg esta semana</span>
      </p>
      <p className="text-xs text-muted">
        Semana pasada: {fmtNum(Math.round(prev))} kg
        {delta != null && ` (${delta >= 0 ? '+' : ''}${delta} %)`} · sin calentamientos
      </p>
      <div className="mt-3 h-44" role="img" aria-label="Tonelaje de las últimas 12 semanas">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis
              dataKey="weekStart"
              tickFormatter={(v: number) => shortDate.format(v)}
              tick={{ fill: C.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={(v: number) => (v >= 1000 ? `${fmtNum(Math.round(v / 100) / 10)}t` : String(v))}
              tick={{ fill: C.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: C.line, opacity: 0.5 }}
              content={({ active, payload }) => {
                const w = payload?.[0]?.payload as WeekTonnage | undefined;
                if (!active || !w) return null;
                return (
                  <TooltipBox title={`Semana del ${shortDate.format(w.weekStart)}`}>
                    <b className="tabular-nums">{fmtNum(Math.round(w.kg))} kg</b>
                  </TooltipBox>
                );
              }}
            />
            <Bar dataKey="kg" fill={C.accent} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ---------- Calendario ---------- */

function TrainingCalendar({ workouts }: { workouts: Workout[] }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const byDay = useMemo(() => {
    const m = new Map<number, Workout[]>();
    for (const w of workouts) {
      const k = startOfDay(w.startedAt);
      m.set(k, [...(m.get(k) ?? []), w]);
    }
    return m;
  }, [workouts]);

  const cells = monthGrid(month.y, month.m);
  const today = startOfDay(Date.now());
  const count = cells.reduce((n: number, c) => n + (c != null ? (byDay.get(c)?.length ?? 0) : 0), 0);
  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="grid size-10 place-items-center rounded-xl bg-surface-2" aria-label="Mes anterior">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-bold first-letter:uppercase">{monthName.format(new Date(month.y, month.m, 1))}</div>
          <div className="text-xs text-muted">
            {count} {count === 1 ? 'entrenamiento' : 'entrenamientos'}
          </div>
        </div>
        <button onClick={() => shift(1)} className="grid size-10 place-items-center rounded-xl bg-surface-2" aria-label="Mes siguiente">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d} className="text-xs font-semibold text-muted">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          if (c == null) return <div key={i} />;
          const ws = byDay.get(c);
          const day = new Date(c).getDate();
          const isToday = c === today;
          return (
            <button
              key={i}
              disabled={!ws}
              onClick={() => ws && navigate(`/history/${ws[0].id}`)}
              aria-label={ws ? `${day}: ${ws.map((w) => w.name ?? 'Entrenamiento').join(', ')}` : String(day)}
              className={`mx-auto grid size-10 place-items-center rounded-full text-sm tabular-nums ${
                ws ? 'bg-accent font-bold text-accent-fg' : 'text-muted'
              } ${isToday ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Piezas ---------- */

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-10 max-w-[12rem] shrink-0 truncate rounded-full px-4 text-sm font-semibold ${
        active ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg'
      }`}
    >
      {children}
    </button>
  );
}

function TooltipBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm shadow-lg">
      <div className="text-xs text-muted">{title}</div>
      {children}
    </div>
  );
}
