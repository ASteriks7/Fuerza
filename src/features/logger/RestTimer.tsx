import { useEffect, useRef } from 'react';
import { BellRing, SkipForward } from 'lucide-react';
import { useRestTimer } from '../../stores/restTimer';
import { useSettings } from '../../db/settings';
import { useNow } from '../../hooks/useNow';
import { fmtClock } from '../../lib/format';
import { beep, clearRestNotification, showRestNotification, vibrate, VIBRATE_REST_DONE } from '../../lib/alerts';

/** Si la app estuvo congelada y la alerta llega con más retraso que esto, no suena. */
const MAX_LATE_MS = 15_000;
const DONE_BANNER_MS = 8_000;

/**
 * Motor del temporizador (sin UI). Va montado en el Layout para que funcione
 * en cualquier pantalla.
 * - Un único setTimeout hasta endsAt (en Android, un timeout no encadenado no sufre
 *   el “intensive throttling” de pestañas en segundo plano).
 * - Al volver a la app (visibilitychange) se comprueba si ya terminó.
 * - Visible → pitido + vibración. Oculta → notificación del sistema vía SW.
 */
export function RestTimerEngine() {
  const endsAt = useRestTimer((s) => s.endsAt);
  const doneAt = useRestTimer((s) => s.doneAt);
  const settings = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!endsAt || doneAt) return;

    const fire = () => {
      const st = useRestTimer.getState();
      if (st.endsAt !== endsAt || st.doneAt) return;
      st.markDone();
      if (Date.now() - endsAt > MAX_LATE_MS) return;
      const cfg = settingsRef.current;
      if (document.visibilityState === 'visible') {
        if (cfg.restSound) beep();
        if (cfg.restVibrate) vibrate(VIBRATE_REST_DONE);
      } else if (cfg.restNotify) {
        void showRestNotification();
      } else if (cfg.restVibrate) {
        vibrate(VIBRATE_REST_DONE);
      }
    };

    const timeout = setTimeout(fire, Math.max(0, endsAt - Date.now()));
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() >= endsAt) fire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [endsAt, doneAt]);

  // Oculta el aviso de “terminado” tras unos segundos; al volver a la app, retira la notificación.
  useEffect(() => {
    if (!doneAt) return;
    const t = setTimeout(() => useRestTimer.getState().skip(), Math.max(0, DONE_BANNER_MS - (Date.now() - doneAt)));
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void clearRestNotification();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [doneAt]);

  return null;
}

export function RestTimerBar() {
  const endsAt = useRestTimer((s) => s.endsAt);
  const totalSec = useRestTimer((s) => s.totalSec);
  const doneAt = useRestTimer((s) => s.doneAt);
  const adjust = useRestTimer((s) => s.adjust);
  const skip = useRestTimer((s) => s.skip);
  const now = useNow(endsAt && !doneAt ? 250 : null);

  if (!endsAt) return null;

  if (doneAt) {
    return (
      <div className="mx-3 mb-2 flex h-14 items-center justify-between rounded-2xl bg-ok pl-4 font-semibold text-black shadow-lg">
        <span className="flex items-center gap-2">
          <BellRing size={20} /> ¡Descanso terminado!
        </span>
        <button onClick={skip} className="h-14 px-4">
          Cerrar
        </button>
      </div>
    );
  }

  const remaining = (endsAt - now) / 1000;
  const pct = Math.min(100, Math.max(0, (1 - remaining / totalSec) * 100));

  return (
    <div className="mx-3 mb-2 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-lg">
      <div className="h-1 bg-line">
        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2 p-2">
        <button onClick={() => adjust(-30)} className="btn h-12 w-16 bg-surface px-0 text-base">
          −30s
        </button>
        <div className="flex-1 text-center">
          <div className="text-[11px] font-semibold tracking-wider text-muted uppercase">Descanso</div>
          <div className="text-3xl leading-none font-bold tabular-nums">{fmtClock(remaining)}</div>
        </div>
        <button onClick={() => adjust(30)} className="btn h-12 w-16 bg-surface px-0 text-base">
          +30s
        </button>
        <button onClick={skip} className="btn h-12 w-12 bg-surface px-0" aria-label="Saltar descanso">
          <SkipForward size={20} />
        </button>
      </div>
    </div>
  );
}
