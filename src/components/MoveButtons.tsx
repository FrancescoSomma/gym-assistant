import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  first: boolean;
  last: boolean;
  /** Used in the accessible names, e.g. "giornata A". */
  label: string;
  onMove: (dir: -1 | 1) => void;
}

/** SPEC §5.2: move up / move down instead of drag and drop. */
export function MoveButtons({ first, last, label, onMove }: Props) {
  const style =
    'flex size-11 items-center justify-center text-fumo active:text-luce disabled:opacity-30';
  return (
    <div className="flex pr-2">
      <button
        type="button"
        aria-label={`Sposta su: ${label}`}
        disabled={first}
        className={style}
        onClick={() => onMove(-1)}
      >
        <ChevronUp />
      </button>
      <button
        type="button"
        aria-label={`Sposta giù: ${label}`}
        disabled={last}
        className={style}
        onClick={() => onMove(1)}
      >
        <ChevronDown />
      </button>
    </div>
  );
}
