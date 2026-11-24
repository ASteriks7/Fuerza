import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { BellRing, CalendarDays, ChevronRight, Disc3, Play, Plus, X } from 'lucide-react';
import { db } from '../../db/schema';
import { getActiveWorkout, startEmptyWorkout } from '../../db/workouts';
import { startWorkoutFromRoutine } from '../../db/routines';
import { PlateCalculator } from '../plates/PlateCalculator';
import { saveSetting, useSettings } from '../../db/settings';
import { notificationsSupported, requestNotifyPermission, unlockAudio } from '../../lib/alerts';
import { useNow } from '../../hooks/useNow';
import { fmtDuration } from '../../lib/format';

export function TrainPage() {
  const navigate = useNavigate();
  const active = useLiveQuery(async () => (await getActiveWorkout()) ?? null, []);
  const now = useNow(active ? 1000 : null);
  const routines = useLiveQuery(() => db.routines.orderBy('updatedAt').reverse().toArray(), []);
  const [plates, setPlates] = useState(false);

  const start = async () => {
    unlockAudio();
    await startEmptyWorkout();
    navigate('/workout');
  };

  const startDay = async (routineId: number, dayId: string) => {
    unlockAudio();
    await startWorkoutFromRoutine(routineId, dayId);
    navigate('/workout');
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-3xl font-black">Entrenar</h1>

      {active === undefined ? null : active ? (
        <Link to="/workout" className="card flex items-center justify-between border border-accent/40 p-4">
          <div>
            <p className="font-bold">Entrenamiento en curso</p>
            <p className="text-sm text-muted tabular-nums">{fmtDuration(now - active.startedAt)}</p>
          </div>
          <span className="btn btn-primary h-11">
            <Play size={18} /> Continuar
          </span>
        </Link>
      ) : (
        <button onClick={start} className="btn btn-primary h-16 w-full text-lg">
          <Plus size={24} /> Empezar entrenamiento vacío
        </button>
      )}

      <NotifyPrompt />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CalendarDays size={22} /> Rutinas
          </h2>
          <Link to="/routines" className="flex h-11 items-center text-sm font-semibold text-accent">
            Gestionar <ChevronRight size={18} />
          </Link>
        </div>

        {routines?.length === 0 && (
          <Link to="/routines" className="card block p-4 text-muted">
            Aún no tienes rutinas. <span className="text-accent">Crea una</span> organizada por días.
          </Link>
        )}

        {routines?.map((r) => (
          <div key={r.id} className="card p-3">
            <Link to={`/routines/${r.id}`} className="mb-2 block truncate px-1 font-bold">
              {r.name}
            </Link>
            <div className="grid grid-cols-2 gap-2">
              {r.days.map((d) => (
                <button
                  key={d.id}
                  disabled={!!active || d.exercises.length === 0}
                  onClick={() => startDay(r.id, d.id)}
                  className="btn btn-ghost h-auto min-h-12 flex-col items-start gap-0 py-2 text-left"
                >
                  <span className="flex w-full items-center gap-1 truncate">
                    <Play size={14} className="shrink-0 text-accent" /> {d.name}
                  </span>
                  <span className="w-full truncate text-xs font-normal text-muted">
                    {d.exercises.length} ejercicios
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <button onClick={() => setPlates(true)} className="btn btn-ghost w-full">
        <Disc3 size={20} /> Calculadora de discos
      </button>
      <PlateCalculator open={plates} onClose={() => setPlates(false)} />
    </div>
  );
}

const DISMISS_KEY = 'fuerza-notify-prompt-dismissed';

/** Invita a activar las notificaciones del descanso (pantalla bloqueada en Android). */
function NotifyPrompt() {
  const settings = useSettings();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || settings.restNotify || !notificationsSupported() || Notification.permission === 'denied') {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
  };

  const enable = async () => {
    const granted = await requestNotifyPermission();
    await saveSetting('restNotify', granted);
    if (!granted) dismiss();
  };

  return (
    <section className="card relative p-4 pr-12">
      <button onClick={dismiss} className="absolute top-2 right-2 grid size-10 place-items-center text-muted" aria-label="Descartar">
        <X size={20} />
      </button>
      <h2 className="flex items-center gap-2 font-bold">
        <BellRing size={20} className="text-accent" /> Aviso de descanso con pantalla bloqueada
      </h2>
      <p className="mt-1 text-sm text-muted">
        Recibe una notificación con vibración cuando termine el descanso, aunque bloquees el móvil.
      </p>
      <button onClick={enable} className="btn btn-primary mt-3 h-11">
        Activar avisos
      </button>
    </section>
  );
}
