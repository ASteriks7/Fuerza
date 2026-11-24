import { BottomSheet } from './BottomSheet';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {message && <p className="mb-5 text-muted">{message}</p>}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className={`btn ${danger ? 'bg-danger text-white' : 'btn-primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
