import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Exercise, Routine } from '../../db/types';
import { muscleVolume } from '../../domain/muscles';
import { fmtNum } from '../../lib/format';
import { MUSCLE_LABELS, MUSCLES } from '../../lib/labels';

interface Props {
  routine: Routine;
  dayIdx: number;
  exercises: Map<number, Exercise>;
}

/** Recuento de series por músculo del día actual o de toda la rutina (una vuelta a todos los días). */
export function MuscleSummary({ routine, dayIdx, exercises }: Props) {
  const [scope, setScope] = useState<'day' | 'all'>('day');
  const [open, setOpen] = useState<string | null>(null);

  const planned = scope === 'day' ? routine.days[dayIdx].exercises : routine.days.flatMap((d) => d.exercises);
  const volume = muscleVolume(planned, exercises);
  const max = Math.max(1, ...volume.map((v) => v.sets));
  const untrained = MUSCLES.filter((mu) => !volume.some((v) => v.muscle === mu));
  const unknown = planned.filter((pe) => !exercises.get(pe.exerciseId)?.muscles).length;

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Músculos trabajados</h2>
        <div className="flex shrink-0 rounded-xl bg-surface-2 p-1">
          {(
            [
              ['day', routine.days[dayIdx].name],
              ['all', 'Rutina'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScope(k)}
              className={`h-9 max-w-[8rem] truncate rounded-lg px-3 text-sm font-semibold ${scope === k ? 'bg-surface text-fg' : 'text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        Series efectivas sin calentamientos · principal = 1, secundario = ½
        {scope === 'all' && routine.days.length > 1 && ` · suma de los ${routine.days.length} días`}
      </p>

      {volume.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Agrega ejercicios para ver el recuento.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {volume.map((v) => {
            const expanded = open === v.muscle;
            return (
              <li key={v.muscle}>
                <button
                  onClick={() => setOpen(expanded ? null : v.muscle)}
                  className="grid w-full grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 py-1 text-left"
                  aria-expanded={expanded}
                >
                  <span className="truncate text-sm">{MUSCLE_LABELS[v.muscle]}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(v.sets / max) * 100}%` }} />
                  </span>
                  <span className="flex items-center justify-end gap-0.5 text-sm font-semibold tabular-nums">
                    {fmtNum(v.sets)}
                    <ChevronDown size={14} className={`text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {expanded && (
                  <p className="pb-2 pl-1 text-xs text-muted">
                    {v.exercises.map((id) => exercises.get(id)?.name ?? 'Ejercicio').join(' · ')}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {volume.length > 0 && untrained.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold">Sin trabajar:</span> {untrained.map((mu) => MUSCLE_LABELS[mu]).join(', ')}
        </p>
      )}
      {unknown > 0 && (
        <p className="mt-2 text-xs text-muted">
          {unknown === 1 ? '1 ejercicio no tiene' : `${unknown} ejercicios no tienen`} músculos asignados: edítalos en
          Ejercicios para incluirlos.
        </p>
      )}
    </section>
  );
}
