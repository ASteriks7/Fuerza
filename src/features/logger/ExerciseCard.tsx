import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Disc3, Minus, MoreVertical, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useSettings } from '../../db/settings';
import { suggestNext } from '../../domain/progression';
import { PlateCalculator } from '../plates/PlateCalculator';
import type { Exercise, SetType, WorkoutSet } from '../../db/types';
import { addSet, deleteSet, getPreviousSets, moveExercise, removeExercise, updateSet } from '../../db/workouts';
import { RPE_VALUES, rirFromRpe, roundE1RM } from '../../domain/e1rm';
import { bestSet } from '../../domain/volume';
import { fmtNum } from '../../lib/format';
import { SET_TYPE_ORDER, SET_TYPES, setLabels } from '../../lib/labels';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SET_GRID, SetRow } from './SetRow';

interface Props {
  workoutId: number;
  exercise: Exercise;
  sets: WorkoutSet[];
  isFirst: boolean;
  isLast: boolean;
  restSec?: number;
  /** Sesión de descarga: no se sugiere subir carga. */
  deload?: boolean;
}

type Sheet =
  | { kind: 'type'; setId: number }
  | { kind: 'rpe'; setId: number }
  | { kind: 'menu' }
  | { kind: 'plates' }
  | null;

export function ExerciseCard({ workoutId, exercise, sets, isFirst, isLast, restSec, deload }: Props) {
  const prevSets = useLiveQuery(() => getPreviousSets(exercise.id, workoutId), [exercise.id, workoutId]) ?? [];
  const [sheet, setSheet] = useState<Sheet>(null);
  const isBarbell = exercise.equipment === 'barbell';
  // Peso para la calculadora: la siguiente serie pendiente (o su valor de la sesión anterior).
  const nextIdx = sets.findIndex((s) => s.completedAt == null);
  const plateWeight =
    nextIdx >= 0 ? (sets[nextIdx].weight ?? prevSets[nextIdx]?.weight) : sets.at(-1)?.weight;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const close = useCallback(() => setSheet(null), []);
  const { loadIncrement } = useSettings();

  // Progresión de cargas: sugerencia para las series principales pendientes.
  const mainPending = sets.filter((s) => s.completedAt == null && (s.type === 'working' || s.type === 'top' || s.type === 'failure'));
  const firstMain = sets.find((s) => s.type === 'working' || s.type === 'top' || s.type === 'failure');
  const suggestion = useMemo(
    () =>
      suggestNext(prevSets, {
        increment: loadIncrement,
        plannedReps: firstMain?.reps,
        targetRpe: firstMain?.target?.kind === 'rpe' ? firstMain.target.rpe : undefined,
        bigLift: exercise.sbdSlot === 'S' || exercise.sbdSlot === 'D',
      }),
    [prevSets, loadIncrement, firstMain?.reps, firstMain?.target, exercise.sbdSlot],
  );
  const bodyweight = suggestion?.weight === 0;
  const alreadyApplied =
    !!suggestion &&
    mainPending.every((s) => (bodyweight ? s.reps === suggestion.reps : s.weight === suggestion.weight && s.reps === suggestion.reps));
  const showSuggestion = !deload && !!suggestion && mainPending.length > 0;
  const applySuggestion = () => {
    if (!suggestion) return;
    for (const s of mainPending) void updateSet(s.id, bodyweight ? { reps: suggestion.reps } : { weight: suggestion.weight, reps: suggestion.reps });
  };

  const labels = setLabels(sets.map((s) => s.type));
  const best = bestSet(sets);
  const sheetSet = sheet && 'setId' in sheet ? sets.find((s) => s.id === sheet.setId) : undefined;

  const pickType = (type: SetType) => {
    if (sheetSet) void updateSet(sheetSet.id, { type });
    close();
  };
  const pickRpe = (rpe: number | undefined) => {
    if (sheetSet) void updateSet(sheetSet.id, { rpe });
    close();
  };

  return (
    <section className="card p-2">
      <header className="flex items-center justify-between gap-2 px-1 pb-1">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-accent">{exercise.name}</h3>
          {best?.e1rm ? (
            <p className="text-xs text-muted">Mejor e1RM hoy: {fmtNum(roundE1RM(best.e1rm))} kg</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center">
          {isBarbell && (
            <button
              onClick={() => setSheet({ kind: 'plates' })}
              className="flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-muted"
              aria-label="Calculadora de discos"
            >
              <Disc3 size={20} /> Discos
            </button>
          )}
          <button
            onClick={() => setSheet({ kind: 'menu' })}
            className="grid size-11 place-items-center text-muted"
            aria-label="Opciones del ejercicio"
          >
            <MoreVertical size={22} />
          </button>
        </div>
      </header>

      {showSuggestion && (
        <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
          {suggestion.kind === 'up' ? (
            <TrendingUp size={18} className="shrink-0 text-accent" />
          ) : suggestion.kind === 'down' ? (
            <TrendingDown size={18} className="shrink-0 text-amber-400" />
          ) : (
            <Minus size={18} className="shrink-0 text-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tabular-nums">
              Hoy: {bodyweight ? `${suggestion.reps} reps` : `${fmtNum(suggestion.weight)} kg × ${suggestion.reps}`}
              {suggestion.delta !== 0 && (
                <span className={suggestion.delta > 0 ? 'text-accent' : 'text-amber-400'}>
                  {' '}({suggestion.delta > 0 ? '+' : ''}{fmtNum(suggestion.delta)} kg)
                </span>
              )}
            </p>
            <p className="text-xs leading-snug text-muted">{suggestion.reason}</p>
          </div>
          {alreadyApplied ? (
            <span className="shrink-0 text-xs font-semibold text-muted">Aplicado</span>
          ) : (
            <button onClick={applySuggestion} className="h-9 shrink-0 rounded-lg bg-accent px-3 text-sm font-bold text-accent-fg">
              Aplicar
            </button>
          )}
        </div>
      )}

      <div className={`${SET_GRID} px-1 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase`}>
        <span className="text-center">Serie</span>
        <span>Anterior</span>
        <span className="text-center">kg</span>
        <span className="text-center">Reps</span>
        <span className="text-center">RPE</span>
        <span />
      </div>

      <div className="flex flex-col gap-1">
        {sets.map((s, i) => (
          <SetRow
            key={s.id}
            set={s}
            label={labels[i]}
            prev={prevSets[i]}
            exercise={exercise}
            restSec={restSec}
            onOpenType={(setId) => setSheet({ kind: 'type', setId })}
            onOpenRpe={(setId) => setSheet({ kind: 'rpe', setId })}
          />
        ))}
      </div>

      <button onClick={() => addSet(workoutId, exercise.id)} className="btn btn-ghost mt-2 h-11 w-full text-sm">
        <Plus size={18} /> Agregar serie
      </button>

      {/* Tipo de serie */}
      <BottomSheet open={sheet?.kind === 'type'} onClose={close} title="Tipo de serie">
        <div className="flex flex-col gap-2 pb-2">
          {SET_TYPE_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => pickType(t)}
              className={`btn justify-start bg-surface-2 ${sheetSet?.type === t ? 'ring-2 ring-accent' : ''}`}
            >
              <span className={`w-6 text-center font-bold ${SET_TYPES[t].color}`}>{SET_TYPES[t].short || '#'}</span>
              {SET_TYPES[t].label}
            </button>
          ))}
          <button
            onClick={() => {
              if (sheetSet) void deleteSet(sheetSet.id);
              close();
            }}
            className="btn btn-danger mt-2 justify-start"
          >
            <Trash2 size={20} /> Eliminar serie
          </button>
        </div>
      </BottomSheet>

      {/* RPE */}
      <BottomSheet open={sheet?.kind === 'rpe'} onClose={close} title="RPE">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {RPE_VALUES.map((v) => (
            <button
              key={v}
              onClick={() => pickRpe(v)}
              className={`flex h-16 flex-col items-center justify-center rounded-xl ${
                sheetSet?.rpe === v ? 'bg-accent text-accent-fg' : 'bg-surface-2'
              }`}
            >
              <span className="text-xl font-bold tabular-nums">{fmtNum(v)}</span>
              <span className="text-[11px] opacity-70">RIR {fmtNum(rirFromRpe(v))}</span>
            </button>
          ))}
          <button onClick={() => pickRpe(undefined)} className="btn btn-ghost col-span-3 mt-1">
            Sin RPE
          </button>
        </div>
      </BottomSheet>

      {/* Menú del ejercicio */}
      <BottomSheet open={sheet?.kind === 'menu'} onClose={close} title={exercise.name}>
        <div className="flex flex-col gap-2 pb-2">
          <button
            disabled={isFirst}
            onClick={() => {
              void moveExercise(workoutId, exercise.id, -1);
              close();
            }}
            className="btn btn-ghost justify-start"
          >
            <ArrowUp size={20} /> Mover arriba
          </button>
          <button
            disabled={isLast}
            onClick={() => {
              void moveExercise(workoutId, exercise.id, 1);
              close();
            }}
            className="btn btn-ghost justify-start"
          >
            <ArrowDown size={20} /> Mover abajo
          </button>
          <button
            onClick={() => {
              close();
              setConfirmRemove(true);
            }}
            className="btn btn-danger justify-start"
          >
            <Trash2 size={20} /> Quitar ejercicio
          </button>
        </div>
      </BottomSheet>

      <PlateCalculator
        open={sheet?.kind === 'plates'}
        onClose={close}
        initialWeight={plateWeight}
        barWeight={exercise.barWeight ?? 20}
      />

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="¿Quitar ejercicio?"
        message={`Se eliminarán las ${sets.length} series de ${exercise.name} de esta sesión.`}
        confirmLabel="Quitar"
        danger
        onConfirm={() => void removeExercise(workoutId, exercise.id)}
      />
    </section>
  );
}
