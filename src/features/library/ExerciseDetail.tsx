import { useLiveQuery } from 'dexie-react-hooks';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import {
  deleteOrArchiveExercise,
  exerciseHistory,
  getExercise,
  isExerciseInUse,
  restoreExercise,
  updateExercise,
} from '../../db/exercises';
import { getSettings } from '../../db/settings';
import { formatNumber, formatSets, parseWeight, relativeDay } from '../../domain/format';
import { confirmAction } from '../../platform/confirm';
import { EQUIPMENT, MUSCLE_GROUPS, TRACKING_TYPES } from '../../types';
import { ExerciseForm } from './ExerciseForm';

const ExerciseCharts = lazy(() => import('./ExerciseCharts')); // Recharts stays out of the main bundle

const LIBRARY = '/programs?tab=exercises';

export function ExerciseDetail() {
  const { exerciseId = '' } = useParams();
  const navigate = useNavigate();
  // Opened from Progressi: the chevron goes back there, not to the library.
  const back = (useLocation().state as { back?: string } | null)?.back ?? LIBRARY;
  const exercise = useLiveQuery(async () => (await getExercise(exerciseId)) ?? null, [exerciseId]);
  const inUse = useLiveQuery(() => isExerciseInUse(exerciseId), [exerciseId]);
  const history = useLiveQuery(() => exerciseHistory(exerciseId), [exerciseId]);
  const settings = useLiveQuery(getSettings);
  const [editing, setEditing] = useState(false);

  if (exercise === undefined || inUse === undefined || !history || !settings) return null;
  if (exercise === null) return <Navigate to={LIBRARY} replace />;
  const { trackingType } = exercise;

  const remove = async () => {
    const message = inUse
      ? `Archiviare ${exercise.name}? Sparisce dal selettore ma resta nello storico.`
      : `Eliminare ${exercise.name}?`;
    if (!confirmAction(message)) return;
    await deleteOrArchiveExercise(exercise.id);
    navigate(LIBRARY, { replace: true });
  };

  return (
    <>
      <Header
        title={exercise.name}
        back={back}
        right={
          <button type="button" className="btn-text" onClick={() => setEditing(true)}>
            Modifica
          </button>
        }
      />
      <dl className="rule-t">
        <Info label="Gruppo muscolare" value={MUSCLE_GROUPS[exercise.muscleGroup]} />
        <Info label="Attrezzo" value={EQUIPMENT[exercise.equipment]} />
        <Info label="Registrazione" value={TRACKING_TYPES[trackingType]} />
      </dl>

      {trackingType !== 'duration' && (
        <label className="block px-4 pt-6">
          <span className="label">Incremento del peso (kg)</span>
          <input
            key={exercise.weightStepKg ?? 'default'}
            className="field"
            inputMode="decimal"
            defaultValue={
              exercise.weightStepKg === undefined ? '' : formatNumber(exercise.weightStepKg)
            }
            placeholder={`Predefinito: ${formatNumber(settings.weightSteps[exercise.equipment])}`}
            onBlur={(e) => {
              const text = e.target.value.trim();
              const step = parseWeight(text);
              if (text === '') void updateExercise(exercise.id, { weightStepKg: undefined });
              else if (step !== undefined && step > 0)
                void updateExercise(exercise.id, { weightStepKg: step });
            }}
          />
        </label>
      )}

      <label className="block px-4 pt-4">
        <span className="label">Nota permanente</span>
        <textarea
          className="field"
          rows={2}
          defaultValue={exercise.notes}
          placeholder="Es. sedile al 4"
          onChange={(e) => void updateExercise(exercise.id, { notes: e.target.value })}
        />
      </label>

      {history.length > 0 && (
        <Suspense fallback={null}>
          <ExerciseCharts history={history} tracking={trackingType} />
        </Suspense>
      )}

      <h2 className="section-title">Ultime sessioni</h2>
      {history.length === 0 ? (
        <p className="px-4 text-fumo">
          Nessuna serie registrata. Aggiungi l'esercizio a una giornata per iniziare.
        </p>
      ) : (
        <ul>
          {history.slice(0, 5).map((h) => (
            <li key={h.sessionId} className="row">
              <span className="w-28 shrink-0 text-small text-fumo first-letter:uppercase">
                {relativeDay(h.startedAt)}
              </span>
              <span className="num flex-1 text-right text-title">
                {formatSets(h.sets, trackingType)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto space-y-2 px-4 py-6">
        {exercise.archivedAt === undefined ? (
          <button type="button" className="btn-danger" onClick={remove}>
            <Trash2 size={20} /> {inUse ? 'Archivia esercizio' : 'Elimina esercizio'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => restoreExercise(exercise.id)}
          >
            <ArchiveRestore size={20} /> Ripristina esercizio
          </button>
        )}
      </div>

      <ExerciseForm
        open={editing}
        onClose={() => setEditing(false)}
        exercise={exercise}
        trackingLocked={inUse}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="row">
      <dt className="flex-1 text-fumo">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
