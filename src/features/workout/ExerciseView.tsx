import { useLiveQuery } from 'dexie-react-hooks';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { exerciseHistory, updateExercise } from '../../db/exercises';
import type { WorkoutItem } from '../../db/sessions';
import { addSet, applyWeight, completeSet } from '../../db/workout';
import { formatNumber, formatSets, formatTarget, relativeDay } from '../../domain/format';
import { computeRecords, isRecordSet } from '../../domain/records';
import { firstPending, setLabel, suggestWeight, weightStep } from '../../domain/workout';
import type { Settings } from '../../types';
import { syncRestPush } from './restPush';
import { SetEditor, SetRow } from './SetRows';

interface Props {
  item: WorkoutItem;
  settings: Settings;
  /** Called after the last set of the exercise is confirmed. */
  onExerciseDone: () => void;
  onMenu?: () => void;
}

export function ExerciseView({ item, settings, onExerciseDone, onMenu }: Props) {
  const { se, exercise, sets, dayNote } = item;
  const tracking = exercise.trackingType;
  const history = useLiveQuery(() => exerciseHistory(exercise.id), [exercise.id]) ?? [];
  const last = history[0];
  const before = computeRecords(
    history.map((h) => h.sets),
    tracking,
  );
  const step = weightStep(exercise, settings.weightSteps);
  const suggestion =
    tracking === 'weight_reps'
      ? suggestWeight(last?.sets, se.plannedSets, se.repMax, step)
      : undefined;
  const offerSuggestion =
    suggestion !== undefined &&
    sets.some((s) => !s.isWarmup && s.completedAt === undefined && (s.weightKg ?? 0) < suggestion);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sets.find((s) => s.id === selectedId) ?? firstPending(sets);

  const confirm = async (setId: string) => {
    const { exerciseDone, timer } = await completeSet(setId);
    void syncRestPush(timer);
    setSelectedId(null);
    if (exerciseDone) onExerciseDone();
  };

  return (
    <>
      <section className="px-4 pt-2 pb-3">
        <div className="flex items-start gap-2">
          <h1 className="flex-1 text-name font-semibold">{exercise.name}</h1>
          {onMenu && (
            <button
              type="button"
              aria-label="Opzioni dell'esercizio"
              className="-mr-3 flex size-14 shrink-0 items-center justify-center"
              onClick={onMenu}
            >
              <MoreHorizontal />
            </button>
          )}
        </div>
        <p className="text-small text-steel">
          {formatTarget({ ...se, sets: se.plannedSets }, tracking)}
        </p>
        {se.status === 'skipped' && (
          <p className="text-small text-steel">Saltato: completa una serie per riprenderlo.</p>
        )}
        <label className="mt-1 block">
          <span className="sr-only">Nota permanente</span>
          <textarea
            key={exercise.id}
            rows={1}
            className="field-sizing-content w-full resize-none bg-transparent outline-none placeholder:text-steel"
            defaultValue={exercise.notes}
            placeholder="Aggiungi una nota, es. sedile al 4"
            onChange={(e) => void updateExercise(exercise.id, { notes: e.target.value })}
          />
        </label>
        {dayNote && <p className="text-small text-steel">{dayNote}</p>}
        {last && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-small text-steel tabular-nums">
              {relativeDay(last.startedAt)}: {formatSets(last.sets, tracking)}
            </p>
            {offerSuggestion && suggestion !== undefined && (
              <button
                type="button"
                className="chip min-h-14"
                aria-label={`Aumenta a ${formatNumber(suggestion)} kg le serie da fare`}
                onClick={() => applyWeight(se.id, suggestion)}
              >
                Aumenta a {formatNumber(suggestion)} kg
              </button>
            )}
          </div>
        )}
      </section>

      <ul className="border-t border-steel/25">
        {sets.map((set) => (
          <li key={set.id}>
            {set.id === selected?.id ? (
              <SetEditor
                set={set}
                label={setLabel(sets, set)}
                se={se}
                exercise={exercise}
                step={step}
                onConfirm={() => confirm(set.id)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <SetRow
                set={set}
                label={setLabel(sets, set)}
                tracking={tracking}
                record={isRecordSet(set, tracking, before)}
                onSelect={() => setSelectedId(set.id)}
              />
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-x-2 px-2 py-2">
        <button type="button" className="btn-text min-h-14" onClick={() => addSet(se.id, false)}>
          <Plus size={20} /> Aggiungi serie
        </button>
        <button
          type="button"
          className="btn-text min-h-14 text-steel"
          onClick={() => addSet(se.id, true)}
        >
          <Plus size={20} /> Aggiungi riscaldamento
        </button>
      </div>
    </>
  );
}
