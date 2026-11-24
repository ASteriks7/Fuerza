import { useEffect, useState } from 'react';
import { db } from '../../db/schema';
import type { Equipment, Exercise, ExerciseCategory } from '../../db/types';
import { parseNum } from '../../lib/format';
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from '../../lib/labels';
import { BottomSheet } from '../../components/ui/BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se pasa, edita; si no, crea. */
  exercise?: Exercise;
  initialName?: string;
  onSaved?: (id: number) => void;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExerciseCategory[];
const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[];

export function ExerciseForm({ open, onClose, exercise, initialName = '', onSaved }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('squat');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [bar, setBar] = useState('20');

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? initialName);
    setCategory(exercise?.category ?? 'squat');
    setEquipment(exercise?.equipment ?? 'barbell');
    setBar(String(exercise?.barWeight ?? 20));
  }, [open, exercise, initialName]);

  const valid = name.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    const data = {
      name: name.trim(),
      category,
      equipment,
      barWeight: equipment === 'barbell' ? (parseNum(bar) ?? 20) : undefined,
    };
    let id: number;
    if (exercise) {
      await db.exercises.update(exercise.id, data);
      id = exercise.id;
    } else {
      id = await db.exercises.add({ ...data, isCustom: true, archived: 0 });
    }
    onSaved?.(id);
    onClose();
  };

  const hide = async () => {
    if (!exercise) return;
    // Se archiva en lugar de borrar: el historial sigue referenciándolo.
    await db.exercises.update(exercise.id, { archived: 1 });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
      <div className="flex flex-col gap-4 pb-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" autoFocus={!exercise} />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Grupo</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Equipo</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <button key={e} className="chip" data-active={equipment === e} onClick={() => setEquipment(e)}>
                {EQUIPMENT_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        {equipment === 'barbell' && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted">Peso de la barra (kg)</span>
            <input value={bar} onChange={(e) => setBar(e.target.value)} inputMode="decimal" className="field" />
          </label>
        )}

        <button onClick={save} disabled={!valid} className="btn btn-primary w-full">
          Guardar
        </button>
        {exercise && (
          <button onClick={hide} className="btn btn-danger w-full">
            Ocultar de la biblioteca
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
