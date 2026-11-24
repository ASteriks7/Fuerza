import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Minus, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import { db } from '../../db/schema';
import type { Exercise, LoadTarget, PlannedExercise, PlannedSet, SetType } from '../../db/types';
import { getReference1RM } from '../../db/routines';
import { useSettings } from '../../db/settings';
import { resolveTargetWeight } from '../../domain/load';
import { roundE1RM } from '../../domain/e1rm';
import { fmtClock, fmtNum, parseNum } from '../../lib/format';
import { SET_TYPE_ORDER, SET_TYPES, setLabels } from '../../lib/labels';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { NumInput } from '../../components/ui/NumInput';

interface Props {
  pe: PlannedExercise;
  exercise: Exercise | undefined;
  isFirst: boolean;
  isLast: boolean;
  onChange: (pe: PlannedExercise) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

type Kind = LoadTarget['kind'] | 'none';
const KINDS: Kind[] = ['none', 'pct1rm', 'rpe', 'kg'];
const KIND_LABEL: Record<Kind, string> = { none: '—', pct1rm: '%1RM', rpe: 'RPE', kg: 'kg' };

const ROW = 'grid grid-cols-[2rem_3.25rem_3.75rem_minmax(0,1fr)_2.25rem] items-center gap-1';

export function PlannedExerciseCard({ pe, exercise, isFirst, isLast, onChange, onMove, onRemove }: Props) {
  const { loadIncrement, restWorkingSec } = useSettings();
  const ref = useLiveQuery(() => getReference1RM(pe.exerciseId), [pe.exerciseId]);
  const [menu, setMenu] = useState(false);
  const [oneRmSheet, setOneRmSheet] = useState(false);
  const [oneRmText, setOneRmText] = useState('');

  const labels = setLabels(pe.sets.map((s) => s.type));

  const setSets = (sets: PlannedSet[]) => onChange({ ...pe, sets });
  const patchSet = (i: number, patch: Partial<PlannedSet>) =>
    setSets(pe.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const cycleType = (i: number) => {
    const cur = SET_TYPE_ORDER.indexOf(pe.sets[i].type);
    patchSet(i, { type: SET_TYPE_ORDER[(cur + 1) % SET_TYPE_ORDER.length] as SetType });
  };

  const cycleKind = (i: number) => {
    const t = pe.sets[i].target;
    const cur: Kind = t?.kind ?? 'none';
    const next = KINDS[(KINDS.indexOf(cur) + 1) % KINDS.length];
    // Valor por defecto razonable al cambiar de tipo, reutilizando el del set anterior si coincide.
    const prev = pe.sets[i - 1]?.target;
    let target: LoadTarget | undefined;
    if (next === 'pct1rm') target = { kind: 'pct1rm', pct: prev?.kind === 'pct1rm' ? prev.pct : 75 };
    else if (next === 'rpe') target = { kind: 'rpe', rpe: prev?.kind === 'rpe' ? prev.rpe : 8 };
    else if (next === 'kg') target = { kind: 'kg', kg: prev?.kind === 'kg' ? prev.kg : 60 };
    patchSet(i, { target });
  };

  const setTargetValue = (i: number, v: number | undefined) => {
    const t = pe.sets[i].target;
    if (!t || v == null) return;
    if (t.kind === 'pct1rm') patchSet(i, { target: { kind: 'pct1rm', pct: Math.min(120, v) } });
    if (t.kind === 'rpe') patchSet(i, { target: { kind: 'rpe', rpe: Math.min(10, Math.max(6, Math.round(v * 2) / 2)) } });
    if (t.kind === 'kg') patchSet(i, { target: { kind: 'kg', kg: v } });
  };

  const addSet = () => {
    const last = pe.sets.at(-1);
    setSets([...pe.sets, last ? structuredClone(last) : { type: 'working', reps: 5 }]);
  };

  const rest = pe.restSec;
  const setRest = (v: number | undefined) => onChange({ ...pe, restSec: v == null ? undefined : Math.min(900, Math.max(15, v)) });

  const saveOneRm = async (v: number | undefined) => {
    await db.exercises.update(pe.exerciseId, { oneRepMax: v });
    setOneRmSheet(false);
  };

  return (
    <section className="card p-2">
      <header className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-accent">{exercise?.name ?? 'Ejercicio'}</h3>
          <button
            onClick={() => {
              setOneRmText(fmtNum(exercise?.oneRepMax));
              setOneRmSheet(true);
            }}
            className="text-left text-xs text-muted underline decoration-dotted underline-offset-2"
          >
            {ref
              ? `1RM ref.: ${fmtNum(roundE1RM(ref.value))} kg (${ref.source === 'manual' ? 'manual' : 'e1RM'})`
              : 'Sin 1RM de referencia · fijar'}
          </button>
        </div>
        <button onClick={() => setMenu(true)} className="grid size-11 shrink-0 place-items-center text-muted" aria-label="Opciones">
          <MoreVertical size={22} />
        </button>
      </header>

      <div className={`${ROW} px-1 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase`}>
        <span className="text-center">Serie</span>
        <span className="text-center">Reps</span>
        <span className="text-center">Carga</span>
        <span className="text-center">Objetivo</span>
        <span />
      </div>

      <div className="flex flex-col gap-1">
        {pe.sets.map((s, i) => {
          const kind: Kind = s.target?.kind ?? 'none';
          const value =
            s.target?.kind === 'pct1rm' ? s.target.pct : s.target?.kind === 'rpe' ? s.target.rpe : s.target?.kind === 'kg' ? s.target.kg : undefined;
          const preview = kind === 'pct1rm' ? resolveTargetWeight(s.target, ref?.value, loadIncrement) : undefined;
          return (
            <div key={i}>
              <div className={`${ROW} px-1`}>
                <button
                  onClick={() => cycleType(i)}
                  className={`h-11 rounded-lg text-base font-bold ${SET_TYPES[s.type].color}`}
                  aria-label={`Tipo: ${SET_TYPES[s.type].label}. Toca para cambiar`}
                >
                  {labels[i]}
                </button>
                <NumInput value={s.reps} onCommit={(v) => patchSet(i, { reps: v ?? 0 })} integer ariaLabel="Repeticiones" />
                <button
                  onClick={() => cycleKind(i)}
                  className="h-11 rounded-lg bg-surface-2 text-sm font-semibold"
                  aria-label="Tipo de carga. Toca para cambiar"
                >
                  {KIND_LABEL[kind]}
                </button>
                <NumInput
                  value={value}
                  onCommit={(v) => setTargetValue(i, v)}
                  disabled={kind === 'none'}
                  placeholder={kind === 'none' ? 'libre' : ''}
                  ariaLabel="Valor del objetivo"
                />
                <button
                  onClick={() => setSets(pe.sets.filter((_, j) => j !== i))}
                  className="grid h-11 place-items-center text-muted"
                  aria-label="Eliminar serie"
                >
                  <X size={18} />
                </button>
              </div>
              {kind === 'pct1rm' && (
                <p className="pr-12 text-right text-xs text-muted">
                  {preview != null ? `≈ ${fmtNum(preview)} kg` : 'Fija un 1RM para calcular los kg'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <span className="text-sm text-muted">Descanso</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setRest((rest ?? restWorkingSec) - 15)} className="btn btn-ghost size-10 px-0" aria-label="Menos descanso">
            <Minus size={16} />
          </button>
          <span className="w-16 text-center font-semibold tabular-nums">{rest ? fmtClock(rest) : 'Auto'}</span>
          <button onClick={() => setRest((rest ?? restWorkingSec) + 15)} className="btn btn-ghost size-10 px-0" aria-label="Más descanso">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <button onClick={addSet} className="btn btn-ghost mt-2 h-11 w-full text-sm">
        <Plus size={18} /> Agregar serie
      </button>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={exercise?.name}>
        <div className="flex flex-col gap-2 pb-2">
          <button disabled={isFirst} onClick={() => { onMove(-1); setMenu(false); }} className="btn btn-ghost justify-start">
            <ArrowUp size={20} /> Mover arriba
          </button>
          <button disabled={isLast} onClick={() => { onMove(1); setMenu(false); }} className="btn btn-ghost justify-start">
            <ArrowDown size={20} /> Mover abajo
          </button>
          {rest != null && (
            <button onClick={() => { setRest(undefined); setMenu(false); }} className="btn btn-ghost justify-start">
              Descanso automático (Ajustes)
            </button>
          )}
          <button onClick={() => { onRemove(); setMenu(false); }} className="btn btn-danger justify-start">
            <Trash2 size={20} /> Quitar de este día
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={oneRmSheet} onClose={() => setOneRmSheet(false)} title="1RM de referencia">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-sm text-muted">
            Se usa para convertir %1RM en kg. Si lo dejas vacío se usa tu mejor e1RM de los últimos 120 días.
          </p>
          <input
            value={oneRmText}
            onChange={(e) => setOneRmText(e.target.value)}
            inputMode="decimal"
            placeholder={ref?.source === 'e1rm' ? `e1RM actual: ${fmtNum(roundE1RM(ref.value))}` : 'kg'}
            className="field h-14 text-center text-2xl font-bold"
            aria-label="1RM en kg"
          />
          <button onClick={() => saveOneRm(parseNum(oneRmText) || undefined)} className="btn btn-primary w-full">
            Guardar
          </button>
          {exercise?.oneRepMax != null && (
            <button onClick={() => saveOneRm(undefined)} className="btn btn-ghost w-full">
              Usar e1RM automático
            </button>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
