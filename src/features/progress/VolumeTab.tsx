import { useMemo, useState } from 'react';
import type { Exercise, Muscle, WorkoutSet } from '../../db/types';
import { volumeTotals } from '../../domain/analytics';
import { weeklyMuscleSets } from '../../domain/muscles';
import { fmtNum } from '../../lib/format';
import { MUSCLE_LABELS, MUSCLES } from '../../lib/labels';

const WEEKS = 8;
const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

const tons = (kg: number) =>
  kg >= 10_000 ? `${fmtNum(Math.round(kg / 100) / 10)} t` : `${fmtNum(Math.round(kg))} kg`;

/** Volumen acumulado: semana, mes, año y total. */
export function VolumeTotalsCard({ sets }: { sets: WorkoutSet[] }) {
  const t = useMemo(() => volumeTotals(sets), [sets]);
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Volumen levantado</h2>
      <p className="mt-1 text-4xl font-black tabular-nums">{tons(t.all)}</p>
      <p className="text-xs text-muted">
        en total · {fmtNum(t.reps)} repeticiones efectivas
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            ['Esta semana', t.week],
            ['Este mes', t.month],
            ['Este año', t.year],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-xl bg-surface-2 p-2">
            <div className="text-xs text-muted">{label}</div>
            <div className="font-bold tabular-nums">{tons(v)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Series semanales por músculo con su evolución en las últimas 8 semanas. */
export function MuscleProgressCard({ sets, exercises }: { sets: WorkoutSet[]; exercises: Exercise[] }) {
  const [open, setOpen] = useState<Muscle | null>(null);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const weeks = useMemo(() => weeklyMuscleSets(sets, byId, WEEKS), [sets, byId]);

  const all = MUSCLES.map((m) => {
    const series = weeks.map((w) => w.sets.get(m) ?? 0);
    const current = series[WEEKS - 1];
    const prev4 = series.slice(WEEKS - 5, WEEKS - 1);
    const avg = prev4.reduce((a, b) => a + b, 0) / prev4.length;
    return { m, series, current, avg };
  }).sort((a, b) => b.current - a.current || b.avg - a.avg);
  const rows = all.filter((r) => r.series.some((v) => v > 0));
  const idle = all.filter((r) => r.series.every((v) => v === 0));
  const max = Math.max(1, ...rows.flatMap((r) => r.series));

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Series por músculo</h2>
      <p className="mt-1 text-xs text-muted">
        Esta semana vs. media de las 4 anteriores. Principal = 1 serie, secundario = ½. Referencia habitual para
        hipertrofia: 10–20 series semanales.
      </p>
      <ul className="mt-3 flex flex-col">
        {rows.map(({ m, series, current, avg }) => {
          const delta = current - avg;
          return (
            <li key={m} className="border-b border-line last:border-0">
              <button
                onClick={() => setOpen(open === m ? null : m)}
                className="flex min-h-12 w-full items-center gap-3 py-1 text-left"
                aria-expanded={open === m}
              >
                <span className="w-28 shrink-0 truncate text-sm font-semibold">{MUSCLE_LABELS[m]}</span>
                <span className="flex h-7 flex-1 items-end gap-[2px]" aria-hidden>
                  {series.map((v, i) => (
                    <span
                      key={i}
                      className={`flex-1 rounded-t-[3px] ${i === WEEKS - 1 ? 'bg-accent' : 'bg-muted/35'}`}
                      style={{ height: `${Math.max(v > 0 ? 8 : 3, (v / max) * 100)}%` }}
                    />
                  ))}
                </span>
                <span className="w-12 shrink-0 text-right">
                  <b className="tabular-nums">{fmtNum(current)}</b>
                  {avg > 0 && Math.abs(delta) >= 0.5 && (
                    <span className={`block text-[11px] tabular-nums ${delta > 0 ? 'text-accent' : 'text-amber-400'}`}>
                      {delta > 0 ? '+' : ''}
                      {fmtNum(Math.round(delta * 2) / 2)}
                    </span>
                  )}
                </span>
              </button>
              {open === m && (
                <div className="grid grid-cols-4 gap-1 pb-3 text-center text-xs">
                  {weeks.map((w, i) => (
                    <div key={w.weekStart} className={`rounded-lg p-1 ${i === WEEKS - 1 ? 'bg-accent/15' : 'bg-surface-2'}`}>
                      <div className="text-muted">{shortDate.format(w.weekStart)}</div>
                      <div className="font-bold tabular-nums">{fmtNum(series[i])}</div>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {idle.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Sin trabajar en {WEEKS} semanas: {idle.map((r) => MUSCLE_LABELS[r.m]).join(', ')}.
        </p>
      )}
    </section>
  );
}
