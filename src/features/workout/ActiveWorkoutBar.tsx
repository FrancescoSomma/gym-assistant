import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useNow } from '../../components/useNow';
import { formatClock } from '../../domain/format';
import { restState } from '../../domain/workout';
import type { ActiveTimer, Session } from '../../types';

/**
 * SPEC §5: above the tab bar while a workout is open and the user is outside it. Shows the rest
 * left when a rest runs, the elapsed workout time otherwise.
 */
export function ActiveWorkoutBar({
  session,
  timer,
}: {
  session: Session;
  timer: ActiveTimer | null;
}) {
  const now = useNow(timer ? 250 : 1000);
  const rest = timer ? restState(timer, now) : null;
  return (
    <Link
      to={`/workout/${session.id}`}
      className="flex min-h-14 items-center gap-3 bg-plate-blue px-4 text-luce active:brightness-110"
    >
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block font-semibold">Allenamento in corso</span>
        <span className="block text-tiny">Giornata {session.dayLabel}</span>
      </span>
      {rest?.finished ? (
        <span className="text-small font-semibold">Recupero finito</span>
      ) : rest ? (
        <span className="flex items-baseline gap-2">
          <span className="label-text">Recupero</span>
          <span className="num text-title">
            {formatClock(Math.ceil(rest.remainingMs / 1000) * 1000)}
          </span>
        </span>
      ) : (
        <span className="num text-title">{formatClock(now - session.startedAt)}</span>
      )}
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  );
}
