import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { getWorkout } from '../../db/sessions';
import { setSessionNotes } from '../../db/workout';
import { formatClock, formatNumber, formatSet } from '../../domain/format';
import { bestSet, summarize } from '../../domain/stats';

/** SPEC §6.8, Phase 1: duration, sets, volume and the best set of each exercise. */
export function SummaryScreen() {
  const { sessionId = '' } = useParams();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  if (workout === undefined) return null;
  if (workout === null) return <Navigate to="/" replace />;
  const { session, items } = workout;
  if (session.status === 'in_progress') return <Navigate to={`/workout/${session.id}`} replace />;
  const totals = summarize(
    items.map((i) => ({ trackingType: i.exercise.trackingType, sets: i.sets })),
  );

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header title="Allenamento terminato" />
      <p className="px-4 text-small text-steel">
        Giornata {session.dayLabel}
        {session.dayName && `, ${session.dayName}`}
      </p>
      <dl className="grid grid-cols-3 gap-2 px-4 py-6">
        <Stat
          label="Durata"
          value={formatClock((session.endedAt ?? session.startedAt) - session.startedAt)}
        />
        <Stat label="Serie" value={formatNumber(totals.sets)} />
        <Stat label="Volume" value={formatNumber(totals.volume)} unit="kg" />
      </dl>
      <ul className="border-t border-steel/25">
        {items.map(({ se, exercise, sets }) => {
          const best = bestSet(sets, exercise.trackingType);
          return (
            <li key={se.id} className="row">
              <span className="flex-1">{exercise.name}</span>
              {best ? (
                <span className="num text-title">{formatSet(best, exercise.trackingType)}</span>
              ) : (
                <span className="text-small text-steel">Nessuna serie</span>
              )}
            </li>
          );
        })}
      </ul>
      <label className="block px-4 pt-6">
        <span className="label">Note</span>
        <textarea
          className="field"
          rows={3}
          defaultValue={session.notes}
          placeholder="Come è andata?"
          onChange={(e) => void setSessionNotes(session.id, e.target.value)}
        />
      </label>
      <div className="mt-auto px-4 pt-6 pb-4">
        <Link to="/" replace className="btn-primary">
          Fatto
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-tiny text-steel">{label}</dt>
      <dd className="num text-value">
        {value}
        {unit && <span className="pl-1 font-sans text-small font-normal text-steel">{unit}</span>}
      </dd>
    </div>
  );
}
