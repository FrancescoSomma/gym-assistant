import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { getWorkout } from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { discardSession, setSessionNotes, toggleWarmup } from '../../db/workout';
import {
  countLabel,
  formatClock,
  formatDateYear,
  formatNumber,
  formatTime,
} from '../../domain/format';
import { summarize } from '../../domain/stats';
import { setLabel, weightStep } from '../../domain/workout';
import { confirmAction } from '../../platform/confirm';
import { SetEditor, SetRow } from '../workout/SetRows';

/** SPEC §5.4: every value of a past session can be corrected. */
export function SessionDetail() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const settings = useLiveQuery(getSettings);
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
      <p className="px-4 text-small text-steel first-letter:uppercase">
        {formatDateYear(session.startedAt)}, alle {formatTime(session.startedAt)}
      </p>
      <p className="px-4 text-small text-steel tabular-nums">
        Durata {formatClock((session.endedAt ?? session.startedAt) - session.startedAt)},{' '}
        {countLabel(totals.sets, 'serie', 'serie')}
        {totals.volume > 0 && `, ${formatNumber(totals.volume)} kg`}
      </p>

      {items.map(({ se, exercise, sets }) => (
        <section key={se.id}>
          <h2 className="px-4 pt-6 pb-2 font-semibold">{exercise.name}</h2>
          {sets.length === 0 ? (
            <p className="px-4 text-small text-steel">Nessuna serie</p>
          ) : (
            <ul className="border-t border-steel/25">
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
