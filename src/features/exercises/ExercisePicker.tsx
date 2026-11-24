import { useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseList } from './ExerciseList';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (exerciseId: number) => void;
  disabledIds?: number[];
}

export function ExercisePicker({ open, onClose, onSelect, disabledIds }: Props) {
  const [createName, setCreateName] = useState<string | null>(null);

  return (
    <>
      <BottomSheet open={open && createName === null} onClose={onClose} title="Agregar ejercicio" full>
        <ExerciseList onSelect={(e) => onSelect(e.id)} onCreate={setCreateName} disabledIds={disabledIds} />
      </BottomSheet>
      <ExerciseForm
        open={open && createName !== null}
        initialName={createName ?? ''}
        onClose={() => setCreateName(null)}
        onSaved={(id) => {
          setCreateName(null);
          onSelect(id);
        }}
      />
    </>
  );
}
