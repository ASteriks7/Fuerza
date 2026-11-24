import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus, Search } from 'lucide-react';
import { db } from '../../db/schema';
import type { Exercise, ExerciseCategory } from '../../db/types';
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from '../../lib/labels';

interface Props {
  onSelect: (exercise: Exercise) => void;
  onCreate?: (name: string) => void;
  disabledIds?: number[];
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExerciseCategory[];
const SBD_RANK: Record<string, number> = { S: 0, B: 1, D: 2 };

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function ExerciseList({ onSelect, onCreate, disabledIds = [] }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ExerciseCategory | 'all'>('all');
  const exercises = useLiveQuery(() => db.exercises.where('archived').equals(0).toArray(), []);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    return (exercises ?? [])
      .filter((e) => (cat === 'all' || e.category === cat) && (!nq || normalize(e.name).includes(nq)))
      .sort((a, b) => {
        // Los tres levantamientos de competición primero, en orden S → B → D.
        const ra = SBD_RANK[a.sbdSlot ?? ''] ?? 9;
        const rb = SBD_RANK[b.sbdSlot ?? ''] ?? 9;
        return ra - rb || a.name.localeCompare(b.name, 'es');
      });
  }, [exercises, q, cat]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-surface px-4 pb-2">
        <label className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio"
            className="field pl-10"
            type="search"
            enterKeyHint="search"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <button className="chip" data-active={cat === 'all'} onClick={() => setCat('all')}>
            Todos
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" data-active={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col">
        {filtered.map((e) => {
          const disabled = disabledIds.includes(e.id);
          return (
            <li key={e.id}>
              <button
                disabled={disabled}
                onClick={() => onSelect(e)}
                className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-line py-2 text-left disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="block text-sm text-muted">
                    {CATEGORY_LABELS[e.category]} · {EQUIPMENT_LABELS[e.equipment]}
                    {e.isCustom && ' · Personal'}
                  </span>
                </span>
                {disabled && <Check size={20} className="shrink-0 text-ok" />}
              </button>
            </li>
          );
        })}
      </ul>

      {exercises && filtered.length === 0 && (
        <p className="py-6 text-center text-muted">No hay ejercicios que coincidan.</p>
      )}

      {onCreate && (
        <button onClick={() => onCreate(q.trim())} className="btn btn-ghost my-3 w-full text-accent">
          <Plus size={20} /> {q.trim() ? `Crear “${q.trim()}”` : 'Crear ejercicio'}
        </button>
      )}
    </div>
  );
}
