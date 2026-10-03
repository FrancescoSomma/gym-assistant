import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Sheet } from '../../components/Sheet';
import { formatTime, relativeDay } from '../../domain/format';
import { isStale } from '../../domain/workout';
import type { Session } from '../../types';
import { discardWorkout, finishWorkout } from './finish';

/** SPEC §6.6: a session opened more than 6 hours ago asks what to do with it. */
export function StaleSessionSheet({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (!session) return null;
  const open = !dismissed && isStale(session.startedAt, Date.now());

  const finish = async () => {
    if (await finishWorkout(session.id, navigate, { atLastSet: true })) setDismissed(true);
  };
  const discard = async () => {
    if (await discardWorkout(session.id, navigate)) setDismissed(true);
  };

  return (
    <Sheet open={open} onClose={() => setDismissed(true)} title="Allenamento ancora aperto">
      <div className="space-y-3 px-4">
        <p>
          Hai iniziato la giornata {session.dayLabel} {relativeDay(session.startedAt)} alle{' '}
          {formatTime(session.startedAt)} e non l'hai terminata.
        </p>
        <button type="button" className="btn-primary" onClick={finish}>
          Termina allenamento
        </button>
        <button type="button" className="btn-danger" onClick={discard}>
          <Trash2 size={20} /> Scarta allenamento
        </button>
      </div>
    </Sheet>
  );
}
