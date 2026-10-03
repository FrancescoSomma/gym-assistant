import { Link } from 'react-router';
import { useNow } from '../../components/useNow';
import { formatClock } from '../../domain/format';
import type { Session } from '../../types';

/** SPEC §5: above the tab bar while a workout is open and the user is outside it. */
export function ActiveWorkoutBar({ session }: { session: Session }) {
  const now = useNow(1000);
  return (
    <Link
      to={`/workout/${session.id}`}
      className="flex min-h-14 items-center gap-3 bg-plate-blue px-4 text-chalk"
    >
      <span className="flex-1 font-semibold">Allenamento in corso</span>
      <span className="text-small">Giornata {session.dayLabel}</span>
      <span className="num text-title">{formatClock(now - session.startedAt)}</span>
    </Link>
  );
}
