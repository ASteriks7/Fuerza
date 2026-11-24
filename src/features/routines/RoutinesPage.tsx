import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Copy, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import type { Routine } from '../../db/types';
import { createRoutine, deleteRoutine, duplicateRoutine } from '../../db/routines';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function RoutinesPage() {
  const navigate = useNavigate();
  const routines = useLiveQuery(() => db.routines.orderBy('updatedAt').reverse().toArray(), []);
  const [menu, setMenu] = useState<Routine | null>(null);
  const [toDelete, setToDelete] = useState<Routine | null>(null);

  const create = async () => navigate(`/routines/${await createRoutine()}`);

  return (
    <div className="flex flex-col gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/" className="-ml-2 flex h-11 items-center gap-1 text-muted">
        <ChevronLeft size={22} /> Entrenar
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Rutinas</h1>
        <button onClick={create} className="btn btn-primary h-11">
          <Plus size={20} /> Nueva
        </button>
      </div>

      {routines?.length === 0 && (
        <p className="py-10 text-center text-muted">Crea tu primera rutina organizada por días.</p>
      )}

      {routines?.map((r) => (
        <div key={r.id} className="card flex items-center gap-2 p-2 pl-4">
          <Link to={`/routines/${r.id}`} className="min-w-0 flex-1 py-2">
            <p className="truncate font-bold">{r.name}</p>
            <p className="truncate text-sm text-muted">{r.days.map((d) => d.name).join(' · ')}</p>
          </Link>
          <button onClick={() => setMenu(r)} className="grid size-11 place-items-center text-muted" aria-label="Opciones">
            <MoreVertical size={22} />
          </button>
        </div>
      ))}

      <BottomSheet open={menu !== null} onClose={() => setMenu(null)} title={menu?.name}>
        <div className="flex flex-col gap-2 pb-2">
          <button
            className="btn btn-ghost justify-start"
            onClick={() => {
              if (menu) navigate(`/routines/${menu.id}`);
            }}
          >
            <Pencil size={20} /> Editar
          </button>
          <button
            className="btn btn-ghost justify-start"
            onClick={async () => {
              if (menu) await duplicateRoutine(menu.id);
              setMenu(null);
            }}
          >
            <Copy size={20} /> Duplicar
          </button>
          <button
            className="btn btn-danger justify-start"
            onClick={() => {
              setToDelete(menu);
              setMenu(null);
            }}
          >
            <Trash2 size={20} /> Eliminar
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="¿Eliminar rutina?"
        message={`“${toDelete?.name}” se borrará. Los entrenamientos ya registrados no se pierden.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={() => toDelete && void deleteRoutine(toDelete.id)}
      />
    </div>
  );
}
