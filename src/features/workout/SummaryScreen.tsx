import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { getSummaryContext } from '../../db/history';
import { getWorkout } from '../../db/sessions';
import { setSessionNotes } from '../../db/workout';
import { formatChange, formatClock, formatNumber, formatSet } from '../../domain/format';
import { beatenRecords, formatRecord, RECORD_LABELS } from '../../domain/records';
import { bestSet, summarize } from '../../domain/stats';

/** SPEC §6.8: totals, records beaten and the comparison with the last session of the same day. */
export function SummaryScreen() {
  const { sessionId = '' } = useParams();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const context = useLiveQuery(() => getSummaryContext(sessionId), [sessionId]);
  if (workout === undefined) return null;
  if (workout === null) return <Navigate to="/" replace />;
  const { session, items } = workout;
  if (session.status === 'in_progress') return <Navigate to={`/workout/${session.id}`} replace />;
  if (!context) return null;

  const totalsOf = (list: typeof items) =>
    summarize(list.map((i) => ({ trackingType: i.exercise.trackingType, sets: i.sets })));
  const totals = totalsOf(items);
  const change =
    context.previous && formatChange(totals.volume, totalsOf(context.previous.items).volume);
  const beaten = items.flatMap(({ se, exercise, sets }) =>
    beatenRecords(sets, exercise.trackingType, context.recordsBefore.get(exercise.id) ?? {}).map(
      (r) => ({
        ...r,
        key: `${se.id}-${r.kind}`,
        name: exercise.name,
      }),
    ),
  );

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header title="Allenamento terminato" />
      <p className="px-4 text-small text-steel">
        Giornata {session.dayLabel}
        {session.dayName && `, ${session.dayName}`}
      </p>
      <dl className="grid grid-cols-3 gap-2 px-4 pt-6 pb-2">
        <Stat
          label="Durata"
          value={formatClock((session.endedAt ?? session.startedAt) - session.startedAt)}
        />
        <Stat label="Serie" value={formatNumber(totals.sets)} />
        <Stat label="Volume" value={formatNumber(totals.volume)} unit="kg" />
      </dl>
      {change && (
        <p className="px-4 pb-2 text-small text-steel">
          Volume {change} rispetto all'ultima giornata {session.dayLabel}
        </p>
      )}

      {beaten.length > 0 && (
        <>
          <h2 className="section-title">Record battuti</h2>
          <ul className="border-t border-steel/25">
            {beaten.map(({ key, name, kind, value }) => (
              <li key={key} className="row">
                <Trophy size={20} className="shrink-0 text-plate-yellow" />
                <span className="flex-1">
                  <span className="block">{name}</span>
                  <span className="block text-small text-steel">{RECORD_LABELS[kind]}</span>
                </span>
                <span className="num text-title">{formatRecord(kind, value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Esercizi</h2>
      <ul className="border-t border-steel/25">
        {items.map(({ se, exercise, sets }) => {
          const tracking = exercise.trackingType;
          const best = bestSet(sets, tracking);
          const previousItem = context.previous?.items.find((i) => i.exercise.id === exercise.id);
          const previousBest = previousItem && bestSet(previousItem.sets, tracking);
          return (
            <li key={se.id} className="row">
              <span className="flex-1">
                <span className="block">{exercise.name}</span>
                {best && previousBest && (
                  <span className="block text-small text-steel tabular-nums">
                    l'ultima volta {formatSet(previousBest, tracking)}
                  </span>
                )}
              </span>
              {best ? (
                <span className="num text-title">{formatSet(best, tracking)}</span>
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
