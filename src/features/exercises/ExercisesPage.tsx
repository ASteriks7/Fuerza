import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../db/types';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseList } from './ExerciseList';

export function ExercisesPage() {
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Ejercicios</h1>
        <button onClick={() => setCreating('')} className="btn btn-primary h-11">
          <Plus size={20} /> Nuevo
        </button>
      </div>

      {/* ExerciseList usa bg-surface en la cabecera fija; aquí la envolvemos en una tarjeta. */}
      <div className="card px-4 pt-3">
        <ExerciseList onSelect={setEditing} onCreate={setCreating} />
      </div>

      <ExerciseForm open={editing !== null} exercise={editing ?? undefined} onClose={() => setEditing(null)} />
      <ExerciseForm open={creating !== null} initialName={creating ?? ''} onClose={() => setCreating(null)} />
    </div>
  );
}
