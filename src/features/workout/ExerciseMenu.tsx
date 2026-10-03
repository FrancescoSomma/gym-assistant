import { ArrowLeftRight, SkipForward, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import type { WorkoutItem } from '../../db/sessions';

interface Props {
  item: WorkoutItem | undefined;
  open: boolean;
  onClose: () => void;
  onReplace: () => void;
  onSkip: () => void;
  onRemove: () => void;
}

export function ExerciseMenu({ item, open, onClose, onReplace, onSkip, onRemove }: Props) {
  const hasCompleted = item?.sets.some((s) => s.completedAt !== undefined) ?? false;
  return (
    <Sheet open={open} onClose={onClose} title={item?.exercise.name ?? ''}>
      <div className="space-y-2 px-4">
        <button type="button" className="btn-secondary" onClick={onReplace}>
          <ArrowLeftRight size={20} /> Sostituisci esercizio
        </button>
        <button type="button" className="btn-secondary" onClick={onSkip}>
          <SkipForward size={20} /> Salta esercizio
        </button>
        <button type="button" className="btn-danger" disabled={hasCompleted} onClick={onRemove}>
          <Trash2 size={20} /> Rimuovi esercizio
        </button>
        {hasCompleted && (
          <p className="text-small text-fumo">
            Ha già serie completate: puoi saltarlo o sostituirlo, non rimuoverlo.
          </p>
        )}
      </div>
    </Sheet>
  );
}
