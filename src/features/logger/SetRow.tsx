import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { Exercise, WorkoutSet } from '../../db/types';
import { completeSet, prsForSet, uncompleteSet, updateSet } from '../../db/workouts';
import { usePrToast } from './PrToast';
import { useSettings } from '../../db/settings';
import { useRestTimer } from '../../stores/restTimer';
import { estimate1RM, roundE1RM } from '../../domain/e1rm';
import { fmtNum, parseNum } from '../../lib/format';
import { unlockAudio, vibrate } from '../../lib/alerts';
import { describeTarget, SET_TYPES } from '../../lib/labels';

/** Columnas compartidas con la cabecera de ExerciseCard. */
export const SET_GRID = 'grid grid-cols-[2rem_minmax(0,1fr)_4.25rem_3.25rem_3rem_2.75rem] items-center gap-1';

interface Props {
  set: WorkoutSet;
  label: string;
  prev?: WorkoutSet;
  exercise: Exercise;
  /** Descanso definido en la rutina para este ejercicio (s). */
  restSec?: number;
  onOpenType: (setId: number) => void;
  onOpenRpe: (setId: number) => void;
}

export function SetRow({ set, label, prev, exercise, restSec, onOpenType, onOpenRpe }: Props) {
  const done = set.completedAt != null;
  const [w, setW] = useState(fmtNum(set.weight));
  const [r, setR] = useState(fmtNum(set.reps));
  const [error, setError] = useState(false);
  const wRef = useRef<HTMLInputElement>(null);
  const rRef = useRef<HTMLInputElement>(null);
  const settings = useSettings();
  const startRest = useRestTimer((s) => s.start);

  // Sincroniza con la BD (p. ej. al completar con valores de la sesión anterior),
  // salvo que el usuario esté escribiendo en ese campo.
  useEffect(() => {
    if (document.activeElement !== wRef.current) setW(fmtNum(set.weight));
  }, [set.weight]);
  useEffect(() => {
    if (document.activeElement !== rRef.current) setR(fmtNum(set.reps));
  }, [set.reps]);

  const parsedW = parseNum(w);
  const parsedR = parseReps(r);

  const commitW = () => {
    if (parsedW !== set.weight) void updateSet(set.id, { weight: parsedW });
  };
  const commitR = () => {
    if (parsedR !== set.reps) void updateSet(set.id, { reps: parsedR });
  };

  const copyPrev = () => {
    if (!prev || done) return;
    setW(fmtNum(prev.weight));
    setR(fmtNum(prev.reps));
    void updateSet(set.id, { weight: prev.weight, reps: prev.reps });
  };

  const toggle = async () => {
    if (done) {
      await uncompleteSet(set.id);
      return;
    }
    unlockAudio(); // gesto del usuario: habilita el pitido del descanso
    const ok = await completeSet({ ...set, weight: parsedW, reps: parsedR }, exercise, prev);
    if (!ok) {
      setError(true);
      setTimeout(() => setError(false), 500);
      const missingWeight = parsedW == null && prev?.weight == null && exercise.equipment !== 'bodyweight';
      (missingWeight ? wRef : rRef).current?.focus();
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (settings.restVibrate) vibrate(30);
    void prsForSet(set.id).then((hits) => {
      if (!hits.length) return;
      usePrToast.getState().show(exercise.name, hits);
      if (settings.restVibrate) vibrate([60, 60, 120]);
    });
    startRest(set.type === 'warmup' ? settings.restWarmupSec : (restSec ?? settings.restWorkingSec));
  };

  // e1RM en vivo con lo escrito o, si está vacío, con lo que se usaría al completar.
  const effW = parsedW ?? prev?.weight;
  const effR = parsedR ?? prev?.reps;
  const e1rm = estimate1RM(effW, effR, set.rpe);
  const typeMeta = SET_TYPES[set.type];

  const inputCls = `h-11 w-full min-w-0 rounded-lg text-center text-lg font-semibold tabular-nums outline-none placeholder:text-muted/50 focus:ring-2 focus:ring-accent ${
    done ? 'bg-transparent' : 'bg-surface-2'
  }`;

  return (
    <div
      className={`${SET_GRID} rounded-xl px-1 py-1 transition-colors ${done ? 'bg-ok/15' : ''} ${
        error ? 'animate-shake ring-2 ring-danger' : ''
      }`}
    >
      <button
        onClick={() => onOpenType(set.id)}
        className={`h-11 rounded-lg text-base font-bold ${typeMeta.color}`}
        aria-label={`Tipo de serie: ${typeMeta.label}`}
      >
        {label}
      </button>

      <button onClick={copyPrev} className="h-11 min-w-0 text-left leading-[13px]" aria-label="Copiar serie anterior">
        {set.target && (
          <span className="block truncate text-[11px] font-semibold text-top">obj. {describeTarget(set.target)}</span>
        )}
        <span className="block truncate text-xs text-muted">
          {prev ? `${fmtNum(prev.weight)}×${prev.reps}${prev.rpe ? ` @${fmtNum(prev.rpe)}` : ''}` : '—'}
        </span>
        {e1rm > 0 && (
          <span className={`block truncate text-[11px] font-semibold ${done ? 'text-ok' : 'text-accent/80'}`}>
            e1RM {fmtNum(roundE1RM(e1rm))}
          </span>
        )}
      </button>

      <input
        ref={wRef}
        value={w}
        onChange={(e) => setW(e.target.value)}
        onBlur={commitW}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => e.key === 'Enter' && rRef.current?.focus()}
        placeholder={fmtNum(prev?.weight)}
        inputMode="decimal"
        enterKeyHint="next"
        aria-label="Peso en kg"
        className={inputCls}
      />

      <input
        ref={rRef}
        value={r}
        onChange={(e) => setR(e.target.value)}
        onBlur={commitR}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={fmtNum(prev?.reps)}
        inputMode="numeric"
        enterKeyHint="done"
        aria-label="Repeticiones"
        className={inputCls}
      />

      <button
        onClick={() => onOpenRpe(set.id)}
        className={`h-11 rounded-lg text-base font-semibold tabular-nums ${done ? '' : 'bg-surface-2'} ${
          set.rpe == null ? 'text-muted/50' : ''
        }`}
        aria-label="RPE"
      >
        {set.rpe != null
          ? fmtNum(set.rpe)
          : set.target?.kind === 'rpe'
            ? fmtNum(set.target.rpe)
            : prev?.rpe != null
              ? fmtNum(prev.rpe)
              : '–'}
      </button>

      <button
        onClick={toggle}
        className={`grid h-11 place-items-center rounded-lg transition ${
          done ? 'bg-ok text-black' : 'bg-surface-2 text-muted'
        }`}
        aria-label={done ? 'Marcar como no completada' : 'Completar serie'}
      >
        <Check size={22} strokeWidth={3} />
      </button>
    </div>
  );
}

function parseReps(text: string): number | undefined {
  const n = parseNum(text);
  return n == null ? undefined : Math.round(n);
}
