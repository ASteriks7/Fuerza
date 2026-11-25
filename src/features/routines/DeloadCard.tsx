import { BatteryLow } from 'lucide-react';
import type { DeloadConfig, DeloadStyle, Routine } from '../../db/types';
import { startOfWeek } from '../../domain/analytics';
import { cycleWeek, DELOAD_STYLES, isDeloadWeek, newDeloadConfig, nextDeloadWeek } from '../../domain/deload';

const CYCLES = [null, 3, 4, 5, 6] as const;
const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

interface Props {
  routine: Routine;
  update: (fn: (r: Routine) => void) => void;
}

/** Configuración de las semanas de descarga de una rutina. */
export function DeloadCard({ routine, update }: Props) {
  const cfg = routine.deload;
  const now = Date.now();
  const thisWeek = startOfWeek(now);
  const deloadNow = isDeloadWeek(cfg, now);
  const cycle = cycleWeek(cfg, now);
  const next = nextDeloadWeek(cfg, now);
  const style = cfg?.style ?? 'volume';
  const showStyle = !!cfg?.everyWeeks || deloadNow;

  const set = (fn: (d: DeloadConfig) => void) =>
    update((r) => {
      r.deload ??= newDeloadConfig(null, now);
      fn(r.deload);
    });

  const setCycle = (n: number | null) =>
    set((d) => {
      if (n !== d.everyWeeks) d.anchor = thisWeek; // el ciclo empieza esta semana
      d.everyWeeks = n;
      delete d.override;
    });

  return (
    <section className={`card p-4 ${deloadNow ? 'border border-sky-400/50' : ''}`}>
      <h2 className="flex items-center gap-2 font-bold">
        <BatteryLow size={20} className="text-sky-400" /> Semanas de descarga
      </h2>
      <p className="mt-1 text-xs text-muted">
        Cada cierto número de semanas, una semana más suave para recuperar y seguir progresando. La última semana del ciclo es la
        de descarga.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Ciclo de descarga">
        {CYCLES.map((n) => {
          const on = (cfg?.everyWeeks ?? null) === n;
          return (
            <button key={String(n)} role="radio" aria-checked={on} className="chip h-10" data-active={on} onClick={() => setCycle(n)}>
              {n == null ? 'Sin ciclo' : `Cada ${n} sem.`}
            </button>
          );
        })}
      </div>

      {cycle && (
        <p className="mt-2 text-sm tabular-nums">
          Esta es la <b>semana {cycle.week} de {cycle.of}</b>
          {cycle.week !== cycle.of && next && <> · descarga la semana del {shortDate.format(next)}</>}
          <button
            onClick={() =>
              set((d) => {
                d.anchor = thisWeek;
                delete d.override;
              })
            }
            className="ml-2 text-xs font-semibold text-accent"
          >
            Reiniciar ciclo aquí
          </button>
        </p>
      )}

      {showStyle && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Tipo de descarga">
            {(Object.keys(DELOAD_STYLES) as DeloadStyle[]).map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={style === s}
                onClick={() => set((d) => void (d.style = s))}
                className={`h-10 rounded-lg text-sm font-bold ${style === s ? 'bg-sky-400 text-black' : 'text-muted'}`}
              >
                {DELOAD_STYLES[s].label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{DELOAD_STYLES[style].desc}</p>
        </>
      )}

      <button
        onClick={() => set((d) => void (d.override = { week: thisWeek, deload: !deloadNow }))}
        className={`btn mt-3 w-full ${deloadNow ? 'bg-sky-400/15 text-sky-300' : 'btn-ghost'}`}
      >
        {deloadNow ? 'Esta semana es de descarga · quitar' : 'Hacer descarga esta semana'}
      </button>
    </section>
  );
}
