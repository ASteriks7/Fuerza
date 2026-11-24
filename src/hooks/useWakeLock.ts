import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `enabled` sea true.
 * El sistema libera el wake lock al ocultar la pestaña, así que se vuelve a pedir
 * al regresar a la app.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        /* batería baja / no permitido */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release();
    };
  }, [enabled]);
}
