import type { ReactNode } from 'react';
import { Lights } from '../../components/Lights';
import { Sheet } from '../../components/Sheet';
import type { WorkoutItem } from '../../db/sessions';

interface Props {
  open: boolean;
  onClose: () => void;
  items: WorkoutItem[];
  current: number;
  onJump: (index: number) => void;
  /** Session actions (add, finish, discard). */
  children?: ReactNode;
}

/** The session's start list: current on the blue band, done with lit lights, skipped struck. */
export function SessionSheet({ open, onClose, items, current, onJump, children }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Esercizi">
      <ol className="border-t border-luce">
        {items.map(({ se, exercise, sets }, i) => {
          const work = sets.filter((s) => !s.isWarmup);
          const done = work.filter((s) => s.completedAt !== undefined).length;
          const isCurrent = i === current;
          return (
            <li key={se.id}>
              <button
                type="button"
                className={`row ${isCurrent ? 'bg-plate-blue active:bg-plate-blue' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onJump(i)}
              >
                <span className={`num w-6 text-title ${isCurrent ? 'text-luce' : 'text-fumo'}`}>
                  {i + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 ${isCurrent ? 'font-semibold' : ''} ${se.status === 'skipped' ? 'text-fumo line-through' : ''}`}
                >
                  {exercise.name}
                </span>
                {se.status === 'skipped' ? (
                  <span className="text-small text-fumo">Saltato</span>
                ) : se.status === 'done' ? (
                  <Lights total={3} lit={3} label="Completato" />
                ) : (
                  <span className="num text-title">
                    {done}/{work.length}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {children}
    </Sheet>
  );
}
