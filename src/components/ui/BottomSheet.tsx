import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Ocupa casi toda la pantalla (listas largas). */
  full?: boolean;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, full, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-sheet relative flex w-full max-w-lg flex-col rounded-t-3xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] ${
          full ? 'h-[92dvh]' : 'max-h-[85dvh]'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="-mr-2 grid size-11 place-items-center text-muted" aria-label="Cerrar">
            <X size={24} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
