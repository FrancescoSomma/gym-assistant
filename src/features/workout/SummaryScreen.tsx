import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { CountUp } from '../../components/CountUp';
import { Header } from '../../components/Header';
import { Tab } from '../../components/Tab';
import { getSummaryContext } from '../../db/history';
import { getWorkout } from '../../db/sessions';
import { setSessionNotes } from '../../db/workout';
import { formatChange, formatClock, formatNumber, formatSet } from '../../domain/format';
import { beatenRecords, formatRecord, RECORD_LABELS } from '../../domain/records';
import { bestSet, summarize } from '../../domain/stats';

const whole = (n: number) => formatNumber(Math.round(n));
/** The records wipe in after the totals have counted up. */
const RECORDS_DELAY_MS = 600;

/** Totals, records beaten and the comparison with the last session of the same day. */
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
  const duration = (session.endedAt ?? session.startedAt) - session.startedAt;

  return (
    <div className="flex min-h-dvh animate-enter-fade flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header large title="Allenamento terminato" />
      <p className="-mt-1 px-4 text-small text-fumo">
        Giornata {session.dayLabel}
        {session.dayName && `, ${session.dayName}`}
      </p>

      {/* The results scoreboard: duration and sets side by side, the volume on its own row. */}
      <dl className="mx-4 mt-6 grid grid-cols-2 border-t border-luce">
        <Stat label="Durata" value={duration} format={formatClock} />
        <Stat
          label="Serie"
          value={totals.sets}
          format={whole}
          className="border-l-[0.5px] border-filetto pl-4"
        />
        <div className="col-span-2 py-3 rule-t">
          <dt className="label-text text-fumo">Volume</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="sr-only">{formatNumber(totals.volume)} kg</span>
            <span className="num text-value">
              <CountUp
                value={totals.volume}
                format={(n) => formatNumber(n === totals.volume ? n : Math.round(n))}
              />
            </span>
            <span aria-hidden="true" className="label-text text-fumo">
              kg
            </span>
          </dd>
          {change && (
            <dd className="mt-1 text-small text-fumo">
              Volume <span className="num text-luce">{change}</span> rispetto all'ultima giornata{' '}
              {session.dayLabel}
            </dd>
          )}
        </div>
      </dl>

      {beaten.length > 0 && (
        <section>
          <h2 className="section-title">
            <span>Record battuti</span>
            <span className="num text-small text-luce">{beaten.length}</span>
          </h2>
          <ul className="border-t border-luce">
            {beaten.map(({ key, name, kind, value }, i) => (
              <li
                key={key}
                className="flex min-h-16 animate-wipe items-stretch rule-b"
                style={{ animationDelay: `${RECORDS_DELAY_MS + i * 120}ms` }}
              >
                <Tab tone="record">
                  <Trophy size={18} aria-hidden="true" />
                </Tab>
                <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
                  <span className="truncate">{name}</span>
                  <span className="text-small text-fumo">{RECORD_LABELS[kind]}</span>
                </span>
                <span className="num flex shrink-0 items-center pr-4 text-step text-plate-yellow">
                  {formatRecord(kind, value)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="section-title">
        <span>Esercizi</span>
        <span className="num text-small text-luce">{items.length}</span>
      </h2>
      <ul className="rule-t">
        {items.map(({ se, exercise, sets }) => {
          const tracking = exercise.trackingType;
          const best = bestSet(sets, tracking);
          const previousItem = context.previous?.items.find((i) => i.exercise.id === exercise.id);
          const previousBest = previousItem && bestSet(previousItem.sets, tracking);
          return (
            <li key={se.id} className="row">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{exercise.name}</span>
                {best && previousBest && (
                  <span className="block text-small text-fumo">
                    l'ultima volta <span className="num">{formatSet(previousBest, tracking)}</span>
                  </span>
                )}
              </span>
              {best ? (
                <span className="num shrink-0 text-title">{formatSet(best, tracking)}</span>
              ) : (
                <span className="text-small text-fumo">Nessuna serie</span>
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

function Stat({
  label,
  value,
  format,
  className = '',
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  return (
    <div className={`py-3 ${className}`}>
      <dt className="label-text text-fumo">{label}</dt>
      <dd className="num text-score">
        <span className="sr-only">{format(value)}</span>
        <CountUp value={value} format={format} />
      </dd>
    </div>
  );
}
