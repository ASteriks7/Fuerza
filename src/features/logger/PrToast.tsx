import { useEffect } from 'react';
import { create } from 'zustand';
import { Trophy } from 'lucide-react';
import { describePRs, type PrHit } from '../../domain/records';

interface PrToastState {
  toast: { id: number; exercise: string; hits: PrHit[] } | null;
  show: (exercise: string, hits: PrHit[]) => void;
  hide: () => void;
}

export const usePrToast = create<PrToastState>()((set) => ({
  toast: null,
  show: (exercise, hits) => set({ toast: { id: Date.now(), exercise, hits } }),
  hide: () => set({ toast: null }),
}));

/** Aviso de récord al completar una serie. Se cierra solo o con un toque. */
export function PrToast() {
  const { toast, hide } = usePrToast();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 4500);
    return () => clearTimeout(t);
  }, [toast, hide]);
  if (!toast) return null;
  return (
    <button
      key={toast.id}
      onClick={hide}
      role="status"
      className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex animate-[prIn_.35s_ease-out] items-center gap-3 rounded-2xl border border-accent/60 bg-surface-2 p-3 text-left shadow-2xl"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg">
        <Trophy size={22} />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-accent">¡Nuevo récord!</span>
        <span className="block truncate text-sm font-semibold">{toast.exercise}</span>
        <span className="block text-xs text-muted">{describePRs(toast.hits).join(' · ')}</span>
      </span>
    </button>
  );
}
