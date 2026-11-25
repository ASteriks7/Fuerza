import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { db } from '../../db/schema';
import type { WorkoutSet } from '../../db/types';
import { addExerciseToWorkout, deleteWorkout, finishWorkout, getActiveWorkout } from '../../db/workouts';
import { useSettings } from '../../db/settings';
import { useRestTimer } from '../../stores/restTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useNow } from '../../hooks/useNow';
import { fmtDuration, fmtNum } from '../../lib/format';
import { tonnage } from '../../domain/volume';
import { PrToast } from './PrToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { ExerciseCard } from './ExerciseCard';

type Confirm = 'finish' | 'empty' | 'discard' | null;

export function WorkoutPage() {
  const navigate = useNavigate();
  const leaving = useRef(false);
  const workout = useLiveQuery(async () => (await getActiveWorkout()) ?? null, []);
  const sets = useLiveQuery(
    () => (workout ? db.sets.where('workoutId').equals(workout.id).toArray() : Promise.resolve<WorkoutSet[]>([])),
    [workout?.id],
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const settings = useSettings();
  const now = useNow(1000);
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  useWakeLock(settings.keepScreenOn && !!workout);

  useEffect(() => {
    if (workout === null && !leaving.current) navigate('/', { replace: true });
  }, [workout, navigate]);

  const setsByExercise = useMemo(() => {
    const map = new Map<number, WorkoutSet[]>();
    for (const s of sets ?? []) {
      const list = map.get(s.exerciseId) ?? [];
      list.push(s);
      map.set(s.exerciseId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [sets]);

  if (!workout || !sets || !exercises) return null;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const completed = sets.filter((s) => s.completedAt != null).length;
  const pending = sets.length - completed;
  const volume = Math.round(tonnage(sets));

  const finish = async () => {
    leaving.current = true;
    await finishWorkout(workout.id);
    useRestTimer.getState().skip();
    navigate(`/history/${workout.id}?fin=1`, { replace: true });
  };
  const discard = async () => {
    leaving.current = true;
    await deleteWorkout(workout.id);
    useRestTimer.getState().skip();
    navigate('/', { replace: true });
  };

  return (
    <div>
      <PrToast />
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{workout.name ?? 'Entrenamiento'}</h1>
          <p className="text-sm text-muted tabular-nums">
            <span className="font-semibold text-accent">{fmtDuration(now - workout.startedAt)}</span> · {completed}{' '}
            {completed === 1 ? 'serie' : 'series'}
            {volume > 0 && <> · {fmtNum(volume)} kg</>}
          </p>
        </div>
        <button onClick={() => setConfirm(completed === 0 ? 'empty' : 'finish')} className="btn btn-primary h-11">
          Terminar
        </button>
      </header>

      <div className="flex flex-col gap-3 px-2 pt-3">
        {workout.exerciseOrder.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">Agrega tu primer ejercicio para empezar.</p>
        )}

        {workout.exerciseOrder.map((exId, i) => {
          const exercise = byId.get(exId);
          if (!exercise) return null;
          return (
            <ExerciseCard
              key={exId}
              workoutId={workout.id}
              exercise={exercise}
              sets={setsByExercise.get(exId) ?? []}
              isFirst={i === 0}
              isLast={i === workout.exerciseOrder.length - 1}
              restSec={workout.restByExercise?.[exId]}
            />
          );
        })}

        <button onClick={() => setPicker(true)} className="btn btn-ghost h-14 w-full text-accent">
          <Plus size={22} /> Agregar ejercicio
        </button>
        <button onClick={() => setConfirm('discard')} className="btn btn-danger w-full">
          Descartar entrenamiento
        </button>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        disabledIds={workout.exerciseOrder}
        onSelect={(id) => {
          void addExerciseToWorkout(workout.id, id);
          setPicker(false);
        }}
      />

      <ConfirmDialog
        open={confirm === 'finish'}
        onClose={() => setConfirm(null)}
        title="¿Terminar entrenamiento?"
        message={
          pending > 0
            ? `Hay ${pending} ${pending === 1 ? 'serie sin completar que se descartará' : 'series sin completar que se descartarán'}.`
            : undefined
        }
        confirmLabel="Terminar"
        onConfirm={() => void finish()}
      />
      <ConfirmDialog
        open={confirm === 'empty'}
        onClose={() => setConfirm(null)}
        title="No has completado ninguna serie"
        message="¿Quieres descartar este entrenamiento?"
        confirmLabel="Descartar"
        danger
        onConfirm={() => void discard()}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        onClose={() => setConfirm(null)}
        title="¿Descartar entrenamiento?"
        message="Se borrarán todas las series de esta sesión. No se puede deshacer."
        confirmLabel="Descartar"
        danger
        onConfirm={() => void discard()}
      />
    </div>
  );
}
