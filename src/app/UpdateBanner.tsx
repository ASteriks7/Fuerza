import { create } from 'zustand';
import { RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

// Aviso de nueva versión (solo web/PWA). En vez de recargar en mitad de un
// entrenamiento, el service worker nuevo espera hasta que el usuario pulse “Actualizar”.
interface UpdateState {
  needRefresh: boolean;
  update: () => void;
  dismiss: () => void;
}

const useUpdate = create<UpdateState>()((set) => ({
  needRefresh: false,
  update: () => {},
  dismiss: () => set({ needRefresh: false }),
}));

export function registerPwa() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => useUpdate.setState({ needRefresh: true }),
  });
  useUpdate.setState({ update: () => void updateSW(true) });
}

export function UpdateBanner() {
  const { needRefresh, update, dismiss } = useUpdate();
  if (!needRefresh) return null;
  return (
    <div className="mx-3 mb-2 flex h-14 items-center gap-2 rounded-2xl border border-line bg-surface-2 pl-4 shadow-lg">
      <span className="flex-1 text-sm font-semibold">Nueva versión disponible</span>
      <button onClick={update} className="btn btn-primary h-10 gap-1 px-3 text-sm">
        <RefreshCw size={16} /> Actualizar
      </button>
      <button onClick={dismiss} className="grid h-14 w-12 place-items-center text-muted" aria-label="Más tarde">
        <X size={20} />
      </button>
    </div>
  );
}
