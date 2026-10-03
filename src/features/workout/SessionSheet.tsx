import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sheet } from '../../components/Sheet';
import type { WorkoutItem } from '../../db/sessions';
import type { SessionExercise } from '../../types';

function StatusIcon({ status }: { status: SessionExercise['status'] }) {
  if (status === 'done') {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-plate-green text-rubber">
        <Check size={14} strokeWidth={3} />
      </span>
    );
  }
  if (status === 'skipped') return <Minus size={24} className="shrink-0 text-steel" />;
  return <span className="size-6 shrink-0 rounded-full border-2 border-steel/60" />;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: WorkoutItem[];
  current: number;
  onJump: (index: number) => void;
  /** Session actions (add, finish, discard), added by later tasks. */
  children?: ReactNode;
}

export function SessionSheet({ open, onClose, items, current, onJump, children }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Esercizi">
      <ul>
        {items.map(({ se, exercise, sets }, i) => {
          const work = sets.filter((s) => !s.isWarmup);
          const done = work.filter((s) => s.completedAt !== undefined).length;
          return (
            <li key={se.id}>
              <button
                type="button"
                className="row"
                aria-current={i === current ? 'step' : undefined}
                onClick={() => onJump(i)}
              >
                <StatusIcon status={se.status} />
                <span className={`flex-1 ${i === current ? 'font-semibold' : ''}`}>
                  {exercise.name}
                </span>
                {se.status === 'skipped' ? (
                  <span className="text-small text-steel">Saltato</span>
                ) : (
                  <span className="num text-title text-steel">
                    {done}/{work.length}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {children}
    </Sheet>
  );
}
