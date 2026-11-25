import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Copy, Download, FileJson, FileSpreadsheet, MessageSquareText, MoreVertical, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import type { Routine } from '../../db/types';
import { createRoutine, deleteRoutine, duplicateRoutine } from '../../db/routines';
import { shareRoutine, type ShareFormat } from '../../db/routineIO';
import type { ExportLang } from '../../domain/routineExport';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function RoutinesPage() {
  const navigate = useNavigate();
  const routines = useLiveQuery(() => db.routines.orderBy('updatedAt').reverse().toArray(), []);
  const [menu, setMenu] = useState<Routine | null>(null);
  const [toDelete, setToDelete] = useState<Routine | null>(null);
  const [sharing, setSharing] = useState<Routine | null>(null);

  const create = async () => navigate(`/routines/${await createRoutine()}`);

  return (
    <div className="flex flex-col gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/" className="-ml-2 flex h-11 items-center gap-1 text-muted">
        <ChevronLeft size={22} /> Entrenar
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Rutinas</h1>
        <div className="flex gap-2">
          <Link to="/routines/import" className="btn btn-ghost h-11 border border-line px-3">
            <Download size={20} /> Importar
          </Link>
          <button onClick={create} className="btn btn-primary h-11 px-3">
            <Plus size={20} /> Nueva
          </button>
        </div>
      </div>

      {routines?.length === 0 && (
        <p className="py-10 text-center text-muted">
          Crea tu primera rutina organizada por días o{' '}
          <Link to="/routines/import" className="font-semibold text-accent">
            importa una
          </Link>{' '}
          (plantillas de fuerza y halterofilia, texto, Excel o archivo).
        </p>
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
            className="btn btn-ghost justify-start"
            onClick={() => {
              setSharing(menu);
              setMenu(null);
            }}
          >
            <Share2 size={20} /> Compartir / exportar
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

      <ShareSheet routine={sharing} onClose={() => setSharing(null)} />

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

const LANG_KEY = 'fuerza.exportLang';

function ShareSheet({ routine, onClose }: { routine: Routine | null; onClose: () => void }) {
  const [lang, setLangState] = useState<ExportLang>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'es';
    } catch {
      return 'es';
    }
  });
  const [copied, setCopied] = useState(false);
  const setLang = (l: ExportLang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* sin almacenamiento */
    }
  };
  const share = async (format: ShareFormat) => {
    if (!routine) return;
    const res = await shareRoutine(routine, format, lang);
    if (res === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }
    onClose();
  };
  const opts: { format: ShareFormat; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      format: 'text',
      icon: <MessageSquareText size={22} />,
      title: lang === 'en' ? 'Texto en inglés' : 'Texto',
      desc: 'Para WhatsApp, notas o email. Se lee tal cual.',
    },
    {
      format: 'csv',
      icon: <FileSpreadsheet size={22} />,
      title: lang === 'en' ? 'Excel / CSV en inglés' : 'Excel / CSV',
      desc: 'Tabla con una fila por grupo de series.',
    },
    {
      format: 'fuerza',
      icon: <FileJson size={22} />,
      title: 'Archivo de Fuerza',
      desc: 'Para importarla en la app. Lleva los nombres en español e inglés.',
    },
  ];
  return (
    <BottomSheet open={routine !== null} onClose={onClose} title="Compartir rutina">
      <div className="flex flex-col gap-3 pb-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Idioma">
          {(
            [
              ['es', 'Español'],
              ['en', 'English'],
            ] as const
          ).map(([l, label]) => (
            <button
              key={l}
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={`h-10 rounded-lg text-sm font-bold ${lang === l ? 'bg-accent text-accent-fg' : 'text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {lang === 'en' && (
          <p className="-mt-1 text-xs text-muted">
            Los ejercicios del catálogo se traducen (Sentadilla → Back squat). Los que creaste tú van con su nombre.
          </p>
        )}
        {opts.map((o) => (
          <button key={o.format} onClick={() => void share(o.format)} className="btn h-auto justify-start gap-3 bg-surface-2 py-3 text-left">
            <span className="shrink-0 text-accent">{o.icon}</span>
            <span>
              <span className="block font-bold">{o.title}</span>
              <span className="block text-xs font-normal text-muted">{o.desc}</span>
            </span>
          </button>
        ))}
        {copied && <p className="text-center text-sm font-semibold text-accent">Copiado al portapapeles</p>}
      </div>
    </BottomSheet>
  );
}
