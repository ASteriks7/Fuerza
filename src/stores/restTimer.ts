import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearRestNotification } from '../lib/alerts';

// Basado en marca de tiempo (endsAt), no en un contador: si Android congela o
// ralentiza la pestaña, al volver el tiempo restante sigue siendo exacto.
interface RestTimerState {
  endsAt: number | null;
  totalSec: number;
  /** Momento en que se disparó la alerta (para mostrar “terminado”). */
  doneAt: number | null;
  start: (sec: number) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
  markDone: () => void;
}

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      totalSec: 0,
      doneAt: null,
      start: (sec) => {
        void clearRestNotification();
        set({ endsAt: Date.now() + sec * 1000, totalSec: sec, doneAt: null });
      },
      adjust: (deltaSec) => {
        const { endsAt, totalSec, doneAt } = get();
        if (!endsAt || doneAt) return;
        set({
          endsAt: Math.max(Date.now(), endsAt + deltaSec * 1000),
          totalSec: Math.max(1, totalSec + deltaSec),
        });
      },
      skip: () => {
        void clearRestNotification();
        set({ endsAt: null, doneAt: null });
      },
      markDone: () => set({ doneAt: Date.now() }),
    }),
    { name: 'fuerza-rest-timer' },
  ),
);
