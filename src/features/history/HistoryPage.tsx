import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, Weight } from 'lucide-react';
import { db } from '../../db/schema';
import type { Exercise, Workout } from '../../db/types';
import { bestSet, tonnage } from '../../domain/volume';
import { fmtDate, fmtDuration, fmtNum, fmtTime } from '../../lib/format';

export function HistoryPage() {
  const workouts = useLiveQuery(() => db.workouts.where('status').equals('done').reverse().sortBy('startedAt'), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const byId = new Map((exercises ?? []).map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-3 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-3xl font-black">Historial</h1>
      {workouts?.length === 0 && (
        <p className="py-10 text-center text-muted">Aún no hay entrenamientos terminados.</p>
      )}
      {workouts?.map((w) => <WorkoutCard key={w.id} workout={w} exercises={byId} />)}
    </div>
  );
}

function WorkoutCard({ workout, exercises }: { workout: Workout; exercises: Map<number, Exercise> }) {
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id).toArray(), [workout.id]) ?? [];
  const duration = (workout.endedAt ?? workout.startedAt) - workout.startedAt;

  return (
    <Link to={`/history/${workout.id}`} className="card block p-4 active:bg-surface-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold capitalize">{fmtDate(workout.startedAt)}</h2>
        <span className="text-sm text-muted">{fmtTime(workout.startedAt)}</span>
      </div>
      {workout.name && <p className="truncate text-sm font-semibold text-accent">{workout.name}</p>}
      <div className="mt-1 flex gap-4 text-sm text-muted">
        <span className="flex items-center gap-1">
          <Clock size={14} /> {fmtDuration(duration)}
        </span>
        <span className="flex items-center gap-1">
          <Weight size={14} /> {fmtNum(Math.round(tonnage(sets)))} kg
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {workout.exerciseOrder.map((exId) => {
          const exSets = sets.filter((s) => s.exerciseId === exId);
          const best = bestSet(exSets);
          return (
            <li key={exId} className="flex justify-between gap-2">
              <span className="truncate">
                {exSets.length} × {exercises.get(exId)?.name ?? 'Ejercicio'}
              </span>
              {best && (
                <span className="shrink-0 text-muted tabular-nums">
                  {fmtNum(best.weight)} × {best.reps}
                  {best.rpe ? ` @${fmtNum(best.rpe)}` : ''}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Link>
  );
}
