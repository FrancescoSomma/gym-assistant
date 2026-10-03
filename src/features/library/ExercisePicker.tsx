import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import type { MuscleGroup } from '../../types';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseList } from './ExerciseList';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  title?: string;
  /** "Sostituisci" opens on the same muscle group; the "Tutti" chip widens it. */
  initialGroup?: MuscleGroup | 'all';
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = 'Aggiungi esercizio',
  initialGroup,
}: Props) {
  const [creating, setCreating] = useState(false);
  const pick = (id: string) => {
    onPick(id);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      <div className="px-4 pb-3">
        <button type="button" className="btn-secondary" onClick={() => setCreating(true)}>
          <Plus size={20} /> Nuovo esercizio
        </button>
      </div>
      <ExerciseList initialGroup={initialGroup} onSelect={(e) => pick(e.id)} />
      <ExerciseForm
        open={creating}
        onClose={() => setCreating(false)}
        defaultGroup={initialGroup === 'all' ? undefined : initialGroup}
        onSaved={pick}
      />
    </Sheet>
  );
}
