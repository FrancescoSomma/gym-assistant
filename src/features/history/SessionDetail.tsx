import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { getSummaryContext } from '../../db/history';
import { getWorkout } from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { discardSession, setSessionNotes, toggleWarmup } from '../../db/workout';
import { formatClock, formatDateYear, formatNumber, formatTime } from '../../domain/format';
import { isRecordSet } from '../../domain/records';
import { summarize } from '../../domain/stats';
import { setLabel, weightStep } from '../../domain/workout';
import { confirmAction } from '../../platform/confirm';
import { SetEditor, SetRow } from '../workout/SetRows';

/** Every value of a past session can be corrected. */
export function SessionDetail() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const settings = useLiveQuery(getSettings);
  const context = useLiveQuery(() => getSummaryContext(sessionId), [sessionId]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (workout === undefined || !settings) return null;
  if (workout === null) return <Navigate to="/history" replace />;
  const { session, items } = workout;
  if (session.status === 'in_progress') return <Navigate to={`/workout/${session.id}`} replace />;
  const totals = summarize(
    items.map((i) => ({ trackingType: i.exercise.trackingType, sets: i.sets })),
  );

  const remove = async () => {
    if (
      !confirmAction(
        'Eliminare questo allenamento? Le sue serie spariscono da storico e progressi.',
      )
    )
      return;
    await discardSession(session.id);
    navigate('/history', { replace: true });
  };

  return (
    <>
      <Header title={`Giornata ${session.dayLabel}`} back="/history" />
      <p className="-mt-1 px-4 text-small text-fumo first-letter:uppercase">
        {formatDateYear(session.startedAt)}, alle {formatTime(session.startedAt)}
      </p>
      <dl
        className={`mx-4 mt-4 grid border-t border-luce ${totals.volume > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}
      >
        <SmallStat
          label="Durata"
          value={formatClock((session.endedAt ?? session.startedAt) - session.startedAt)}
        />
        <SmallStat
          label="Serie"
          value={formatNumber(totals.sets)}
          className="border-l-[0.5px] border-filetto pl-3"
        />
        {totals.volume > 0 && (
          <SmallStat
            label="Volume"
            value={formatNumber(totals.volume)}
            unit="kg"
            className="border-l-[0.5px] border-filetto pl-3"
          />
        )}
      </dl>

      {items.map(({ se, exercise, sets }) => (
        <section key={se.id}>
          <h2 className="plate px-4 pt-6 pb-2 text-title">{exercise.name}</h2>
          {sets.length === 0 ? (
            <p className="px-4 text-small text-fumo">Nessuna serie</p>
          ) : (
            <ul className="border-t border-luce">
              {sets.map((set) => (
                <li key={set.id}>
                  {set.id === selectedId ? (
                    <SetEditor
                      set={set}
                      label={setLabel(sets, set)}
                      se={se}
                      exercise={exercise}
                      step={weightStep(exercise, settings.weightSteps)}
                      onConfirm={() => setSelectedId(null)}
                      onClose={() => setSelectedId(null)}
                      onToggleWarmup={() => toggleWarmup(set.id)}
                    />
                  ) : (
                    <SetRow
                      set={set}
                      label={setLabel(sets, set)}
                      tracking={exercise.trackingType}
                      record={isRecordSet(
                        set,
                        exercise.trackingType,
                        context?.recordsBefore.get(exercise.id) ?? {},
                      )}
                      onSelect={() => setSelectedId(set.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <label className="block px-4 pt-6">
        <span className="label">Note</span>
        <textarea
          className="field"
          rows={3}
          defaultValue={session.notes}
          onChange={(e) => void setSessionNotes(session.id, e.target.value)}
        />
      </label>
      <div className="mt-auto px-4 py-6">
        <button type="button" className="btn-danger" onClick={remove}>
          <Trash2 size={20} /> Elimina allenamento
        </button>
      </div>
    </>
  );
}

function SmallStat({
  label,
  value,
  unit,
  className = '',
}: {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 py-2 ${className}`}>
      <dt className="label-text text-fumo">{label}</dt>
      <dd className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="num text-title">{value}</span>
        {unit && <span className="label-text text-fumo">{unit}</span>}
      </dd>
    </div>
  );
}
