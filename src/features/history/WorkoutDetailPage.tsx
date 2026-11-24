import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import { deleteWorkout } from '../../db/workouts';
import { roundE1RM } from '../../domain/e1rm';
import { bestSet, tonnage } from '../../domain/volume';
import { fmtDate, fmtDuration, fmtNum, fmtTime } from '../../lib/format';
import { SET_TYPES, setLabels } from '../../lib/labels';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function WorkoutDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const workout = useLiveQuery(async () => (await db.workouts.get(id)) ?? null, [id]);
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(id).toArray(), [id]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  if (workout === null) {
    return (
      <div className="px-4 pt-10 text-center text-muted">
        Entrenamiento no encontrado. <Link to="/history" className="text-accent">Volver</Link>
      </div>
    );
  }
  if (!workout || !sets || !exercises) return null;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const duration = (workout.endedAt ?? Date.now()) - workout.startedAt;
  const completed = sets.filter((s) => s.completedAt != null);

  return (
    <div className="flex flex-col gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/history" className="-ml-2 flex h-11 items-center gap-1 text-muted">
        <ChevronLeft size={22} /> Historial
      </Link>
      <div>
        <h1 className="text-2xl font-black capitalize">{fmtDate(workout.startedAt)}</h1>
        <p className="text-muted">{fmtTime(workout.startedAt)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Duración" value={fmtDuration(duration)} />
        <Stat label="Series" value={String(completed.length)} />
        <Stat label="Tonelaje" value={`${fmtNum(Math.round(tonnage(sets)))} kg`} />
      </div>

      {workout.exerciseOrder.map((exId) => {
        const exSets = completed.filter((s) => s.exerciseId === exId).sort((a, b) => a.order - b.order);
        const labels = setLabels(exSets.map((s) => s.type));
        const best = bestSet(exSets);
        return (
          <section key={exId} className="card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate font-bold text-accent">{byId.get(exId)?.name ?? 'Ejercicio'}</h2>
              {best?.e1rm ? (
                <span className="shrink-0 text-sm text-muted">e1RM {fmtNum(roundE1RM(best.e1rm))}</span>
              ) : null}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {exSets.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 tabular-nums">
                  <span className={`w-6 text-center font-bold ${SET_TYPES[s.type].color}`}>{labels[i]}</span>
                  <span className="flex-1">
                    {fmtNum(s.weight)} kg × {s.reps}
                    {s.rpe != null && <span className="text-muted"> @ RPE {fmtNum(s.rpe)}</span>}
                  </span>
                  {s.e1rm ? <span className="text-sm text-muted">{fmtNum(roundE1RM(s.e1rm))}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <button onClick={() => setConfirmDelete(true)} className="btn btn-danger mt-2 w-full">
        <Trash2 size={20} /> Eliminar entrenamiento
      </button>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar entrenamiento?"
        message="Se borrarán todas sus series. No se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          await deleteWorkout(workout.id);
          navigate('/history', { replace: true });
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
