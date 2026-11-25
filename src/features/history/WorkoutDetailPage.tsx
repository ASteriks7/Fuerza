import { useMemo, useState } from 'react';
import Dexie from 'dexie';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, PartyPopper, Trash2, Trophy } from 'lucide-react';
import type { WorkoutSet } from '../../db/types';
import { describePRs, workoutRecordSummary } from '../../domain/records';
import { muscleSetsFromWorkoutSets } from '../../domain/muscles';
import { MUSCLE_LABELS } from '../../lib/labels';
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
  const finished = useSearchParams()[0].get('fin') === '1';
  // Historial anterior de los ejercicios de este entrenamiento (récords y comparación).
  const history = useLiveQuery(async () => {
    const w = await db.workouts.get(id);
    if (!w) return [] as WorkoutSet[];
    const lists = await Promise.all(
      w.exerciseOrder.map((exId) =>
        db.sets.where('[exerciseId+completedAt]').between([exId, Dexie.minKey], [exId, w.startedAt], true, false).toArray(),
      ),
    );
    return lists.flat();
  }, [id]);
  const prs = useMemo(() => (sets && history ? workoutRecordSummary(sets, history) : []), [sets, history]);

  if (workout === null) {
    return (
      <div className="px-4 pt-10 text-center text-muted">
        Entrenamiento no encontrado. <Link to="/history" className="text-accent">Volver</Link>
      </div>
    );
  }
  if (!workout || !sets || !exercises || !history) return null;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const duration = (workout.endedAt ?? Date.now()) - workout.startedAt;
  const completed = sets.filter((s) => s.completedAt != null);
  const work = completed.filter((s) => s.type !== 'warmup');
  const volume = tonnage(sets);
  const reps = work.reduce((t, s) => t + (s.reps ?? 0), 0);
  // Última sesión anterior de cada ejercicio → su volumen, para comparar.
  const prevVolume = new Map<number, number>();
  for (const exId of workout.exerciseOrder) {
    const before = history.filter((s) => s.exerciseId === exId);
    const lastWorkout = before.reduce<WorkoutSet | undefined>((a, s) => (!a || s.completedAt! > a.completedAt! ? s : a), undefined)?.workoutId;
    if (lastWorkout != null) prevVolume.set(exId, tonnage(before.filter((s) => s.workoutId === lastWorkout)));
  }
  const comparable = workout.exerciseOrder.filter((exId) => prevVolume.has(exId) && work.some((s) => s.exerciseId === exId));
  const volNow = comparable.reduce((t, exId) => t + tonnage(completed.filter((s) => s.exerciseId === exId)), 0);
  const volBefore = comparable.reduce((t, exId) => t + prevVolume.get(exId)!, 0);
  const volDelta = volBefore > 0 ? Math.round(((volNow - volBefore) / volBefore) * 100) : undefined;
  const muscles = [...muscleSetsFromWorkoutSets(completed, byId).entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/history" className="-ml-2 flex h-11 items-center gap-1 text-muted">
        <ChevronLeft size={22} /> Historial
      </Link>
      {finished && (
        <div className="flex items-center gap-2 text-accent">
          <PartyPopper size={22} /> <span className="font-black">¡Entrenamiento terminado!</span>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-black capitalize">{fmtDate(workout.startedAt)}</h1>
        <p className="text-muted">
          {fmtTime(workout.startedAt)}
          {workout.name ? ` · ${workout.name}` : ''}
        </p>
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Volumen levantado</h2>
        <p className="mt-1 text-4xl font-black tabular-nums">
          {fmtNum(Math.round(volume))}
          <span className="ml-1 text-lg font-bold text-muted">kg</span>
        </p>
        {volDelta != null && (
          <p className="text-sm">
            <span className={volDelta >= 0 ? 'font-bold text-accent' : 'font-bold text-amber-400'}>
              {volDelta >= 0 ? '+' : ''}
              {volDelta} %
            </span>{' '}
            <span className="text-muted">frente a la última vez en estos ejercicios</span>
          </p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Duración" value={fmtDuration(duration)} />
          <Stat label="Series" value={String(work.length)} />
          <Stat label="Reps" value={fmtNum(reps)} />
        </div>
        <p className="mt-2 text-xs text-muted">Volumen = kg × reps de las series efectivas (sin calentamientos).</p>
      </section>

      {prs.length > 0 && (
        <section className="card border border-accent/40 p-4">
          <h2 className="flex items-center gap-2 font-black text-accent">
            <Trophy size={20} /> {prs.length === 1 ? 'Récord en 1 ejercicio' : `Récords en ${prs.length} ejercicios`}
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {prs.map(({ exerciseId, hits }) => (
              <li key={exerciseId}>
                <span className="font-semibold">{byId.get(exerciseId)?.name}</span>
                {describePRs(hits).map((t) => (
                  <p key={t} className="text-sm text-muted">
                    {t}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {muscles.length > 0 && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">Músculos trabajados</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {muscles.map(([m, n]) => (
              <span key={m} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                {MUSCLE_LABELS[m]} <b className="tabular-nums">{fmtNum(n)}</b>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Series efectivas: principal = 1, secundario = ½.</p>
        </section>
      )}

      {workout.exerciseOrder.map((exId) => {
        const exSets = completed.filter((s) => s.exerciseId === exId).sort((a, b) => a.order - b.order);
        const labels = setLabels(exSets.map((s) => s.type));
        const best = bestSet(exSets);
        const exVol = tonnage(exSets);
        const prev = prevVolume.get(exId);
        return (
          <section key={exId} className="card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate font-bold text-accent">{byId.get(exId)?.name ?? 'Ejercicio'}</h2>
              {best?.e1rm ? (
                <span className="shrink-0 text-sm text-muted">e1RM {fmtNum(roundE1RM(best.e1rm))}</span>
              ) : null}
            </div>
            {exVol > 0 && (
              <p className="text-xs text-muted tabular-nums">
                Volumen {fmtNum(Math.round(exVol))} kg
                {prev != null && prev > 0 && (
                  <span className={exVol >= prev ? 'text-accent' : 'text-amber-400'}>
                    {' '}({exVol >= prev ? '+' : ''}
                    {fmtNum(Math.round(exVol - prev))} kg vs. anterior)
                  </span>
                )}
              </p>
            )}
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
