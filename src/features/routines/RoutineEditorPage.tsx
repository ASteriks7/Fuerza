import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Copy, MoreVertical, Play, Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import type { Routine } from '../../db/types';
import { newDay, newId, saveRoutine, startWorkoutFromRoutine } from '../../db/routines';
import { getActiveWorkout } from '../../db/workouts';
import { unlockAudio } from '../../lib/alerts';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { PlannedExerciseCard } from './PlannedExerciseCard';
import { MuscleSummary } from './MuscleSummary';
import { DeloadCard } from './DeloadCard';
import { isDeloadWeek } from '../../domain/deload';

export function RoutineEditorPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);
  const [dayIdx, setDayIdx] = useState(0);
  const [picker, setPicker] = useState(false);
  const [dayMenu, setDayMenu] = useState(false);
  const [confirmDeleteDay, setConfirmDeleteDay] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const active = useLiveQuery(async () => (await getActiveWorkout()) ?? null, []);

  // Carga inicial; después la página trabaja sobre su copia local y guarda sola.
  const loaded = useRef(false);
  const pending = useRef<Routine | null>(null);
  useEffect(() => {
    loaded.current = false;
    void db.routines.get(id).then((r) => setRoutine(r ?? null));
  }, [id]);

  // Autoguardado con debounce + guardado al salir de la página.
  useEffect(() => {
    if (!routine) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    pending.current = routine;
    const t = setTimeout(() => {
      void saveRoutine(routine);
      pending.current = null;
    }, 300);
    return () => clearTimeout(t);
  }, [routine]);
  useEffect(
    () => () => {
      if (pending.current) void saveRoutine(pending.current);
    },
    [],
  );

  const update = useCallback(
    (fn: (r: Routine) => void) =>
      setRoutine((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        fn(next);
        return next;
      }),
    [],
  );

  if (routine === null) {
    return (
      <div className="px-4 pt-10 text-center text-muted">
        Rutina no encontrada. <Link to="/routines" className="text-accent">Volver</Link>
      </div>
    );
  }
  if (!routine || !exercises) return null;

  const idx = Math.min(dayIdx, routine.days.length - 1);
  const day = routine.days[idx];
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const start = async () => {
    if (pending.current) {
      await saveRoutine(pending.current);
      pending.current = null;
    } else {
      await saveRoutine(routine);
    }
    unlockAudio();
    await startWorkoutFromRoutine(routine.id, day.id);
    navigate('/workout');
  };

  return (
    <div className="flex flex-col gap-3 px-3 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/routines" className="-ml-1 flex h-11 items-center gap-1 text-muted">
        <ChevronLeft size={22} /> Rutinas
      </Link>

      <input
        value={routine.name}
        onChange={(e) => update((r) => void (r.name = e.target.value))}
        onFocus={(e) => e.target.select()}
        aria-label="Nombre de la rutina"
        className="rounded-lg bg-transparent px-1 text-2xl font-black outline-none focus:bg-surface-2"
      />

      {/* Días */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {routine.days.map((d, i) => (
            <button key={d.id} className="chip h-10" data-active={i === idx} onClick={() => setDayIdx(i)}>
              {d.name}
            </button>
          ))}
          <button
            className="chip h-10 text-accent"
            onClick={() => {
              update((r) => void r.days.push(newDay(r.days.length + 1)));
              setDayIdx(routine.days.length);
            }}
            aria-label="Agregar día"
          >
            <Plus size={18} />
          </button>
        </div>
        <button onClick={() => setDayMenu(true)} className="grid size-10 shrink-0 place-items-center text-muted" aria-label="Opciones del día">
          <MoreVertical size={22} />
        </button>
      </div>

      {day.exercises.length === 0 && (
        <p className="py-6 text-center text-muted">Agrega ejercicios a {day.name}.</p>
      )}

      {day.exercises.map((pe, i) => (
        <PlannedExerciseCard
          key={`${day.id}-${pe.exerciseId}-${i}`}
          pe={pe}
          exercise={byId.get(pe.exerciseId)}
          isFirst={i === 0}
          isLast={i === day.exercises.length - 1}
          onChange={(next) => update((r) => void (r.days[idx].exercises[i] = next))}
          onMove={(dir) =>
            update((r) => {
              const list = r.days[idx].exercises;
              const j = i + dir;
              if (j < 0 || j >= list.length) return;
              [list[i], list[j]] = [list[j], list[i]];
            })
          }
          onRemove={() => update((r) => void r.days[idx].exercises.splice(i, 1))}
        />
      ))}

      <button onClick={() => setPicker(true)} className="btn btn-ghost h-14 w-full text-accent">
        <Plus size={22} /> Agregar ejercicio
      </button>

      <button
        onClick={start}
        disabled={!!active || day.exercises.length === 0}
        className="btn btn-primary h-14 w-full text-lg"
      >
        <Play size={22} /> Empezar {day.name}
        {isDeloadWeek(routine.deload) && <span className="font-semibold"> · descarga</span>}
      </button>
      {active && (
        <p className="text-center text-sm text-muted">Termina el entrenamiento en curso para empezar otro.</p>
      )}

      <DeloadCard routine={routine} update={update} />

      <MuscleSummary routine={routine} dayIdx={idx} exercises={byId} />

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        disabledIds={day.exercises.map((e) => e.exerciseId)}
        onSelect={(exerciseId) => {
          update((r) =>
            void r.days[idx].exercises.push({
              exerciseId,
              sets: [1, 2, 3].map(() => ({ type: 'working' as const, reps: 5 })),
            }),
          );
          setPicker(false);
        }}
      />

      <BottomSheet open={dayMenu} onClose={() => setDayMenu(false)} title="Día">
        <div className="flex flex-col gap-3 pb-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Nombre del día</span>
            <input
              value={day.name}
              onChange={(e) => update((r) => void (r.days[idx].name = e.target.value))}
              className="field"
            />
          </label>
          <button
            className="btn btn-ghost justify-start"
            onClick={() => {
              update((r) => void r.days.splice(idx + 1, 0, { ...structuredClone(day), id: newId(), name: `${day.name} (copia)` }));
              setDayIdx(idx + 1);
              setDayMenu(false);
            }}
          >
            <Copy size={20} /> Duplicar día
          </button>
          <button
            className="btn btn-danger justify-start"
            disabled={routine.days.length <= 1}
            onClick={() => {
              setDayMenu(false);
              setConfirmDeleteDay(true);
            }}
          >
            <Trash2 size={20} /> Eliminar día
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDeleteDay}
        onClose={() => setConfirmDeleteDay(false)}
        title={`¿Eliminar ${day.name}?`}
        message={day.exercises.length ? `Tiene ${day.exercises.length} ejercicios planificados.` : undefined}
        confirmLabel="Eliminar"
        danger
        onConfirm={() => {
          update((r) => void r.days.splice(idx, 1));
          setDayIdx(Math.max(0, idx - 1));
        }}
      />
    </div>
  );
}
