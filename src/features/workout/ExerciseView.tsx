import { useLiveQuery } from 'dexie-react-hooks';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { NamePlate } from '../../components/NamePlate';
import { RollingNumber } from '../../components/RollingNumber';
import { Tab } from '../../components/Tab';
import { exerciseHistory, updateExercise } from '../../db/exercises';
import type { WorkoutItem } from '../../db/sessions';
import { addSet, applyWeight, type CompleteResult, completeSet } from '../../db/workout';
import {
  formatList,
  formatNumber,
  formatSets,
  formatTarget,
  relativeDay,
} from '../../domain/format';
import { computeRecords, isRecordSet, type RecordKind, setRecord } from '../../domain/records';
import {
  firstPending,
  offeredWeight,
  setLabel,
  suggestWeight,
  weightStep,
  workSetCounter,
} from '../../domain/workout';
import type { Settings } from '../../types';
import { PlateSheet } from './PlateSheet';
import { syncRestPush } from './restPush';
import { SetEditor, SetRow } from './SetRows';

interface Props {
  item: WorkoutItem;
  settings: Settings;
  /** Called after a set is confirmed, with the outcome (where to go next). */
  onSetCompleted: (result: CompleteResult) => void;
  /** Names of the other members when the exercise is in a superset. */
  supersetWith?: string[];
  onMenu?: () => void;
  /** A confirmed set beat a personal record: the screen shows it over the board. */
  onRecord?: (record: { kind: RecordKind; value: number }) => void;
}

export function ExerciseView({
  item,
  settings,
  onSetCompleted,
  supersetWith,
  onMenu,
  onRecord,
}: Props) {
  const { se, exercise, sets, dayNote } = item;
  const tracking = exercise.trackingType;
  const history = useLiveQuery(() => exerciseHistory(exercise.id), [exercise.id]) ?? [];
  const last = history[0];
  const before = computeRecords(
    history.map((h) => h.sets),
    tracking,
  );
  const step = weightStep(exercise, settings.weightSteps);
  const suggestion = offeredWeight(
    tracking === 'weight_reps'
      ? suggestWeight(last?.sets, se.plannedSets, se.repMax, step)
      : undefined,
    sets,
  );
  const counter = workSetCounter(sets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [platesKg, setPlatesKg] = useState<number | null>(null);
  const selected = sets.find((s) => s.id === selectedId) ?? firstPending(sets);

  const confirm = async (setId: string) => {
    const set = sets.find((s) => s.id === setId);
    const result = await completeSet(setId);
    void syncRestPush(result.timer);
    setSelectedId(null);
    // Values were saved live while typing, so the set read before completing is the one confirmed.
    const record = set && setRecord({ ...set, completedAt: Date.now() }, tracking, before);
    if (record) onRecord?.(record);
    onSetCompleted(result);
  };

  return (
    <>
      <section className="px-4 pt-2 pb-4">
        <div className="flex items-start gap-1">
          {/* The lower third wipes in each time an exercise comes on (the view is keyed by it). */}
          <div className="flex min-w-0 flex-1 animate-wipe items-stretch">
            {counter && (
              <Tab className="num text-title">
                <span className="sr-only">
                  Serie {counter.current} di {counter.total}
                </span>
                <RollingNumber
                  value={counter.current}
                  text={`${counter.current}/${counter.total}`}
                />
              </Tab>
            )}
            <NamePlate>{exercise.name}</NamePlate>
          </div>
          {onMenu && (
            <button
              type="button"
              aria-label="Opzioni dell'esercizio"
              className="-mr-3 flex size-14 shrink-0 items-center justify-center text-fumo active:text-luce"
              onClick={onMenu}
            >
              <MoreHorizontal />
            </button>
          )}
        </div>
        <p className="mt-3 text-small text-fumo">
          {formatTarget({ ...se, sets: se.plannedSets }, tracking)}
        </p>
        {supersetWith && supersetWith.length > 0 && (
          <p className="text-small text-fumo">In superserie con {formatList(supersetWith)}</p>
        )}
        {se.status === 'skipped' && (
          <p className="text-small text-fumo">Saltato: completa una serie per riprenderlo.</p>
        )}
        <label className="mt-1 block">
          <span className="sr-only">Nota permanente</span>
          <textarea
            key={exercise.id}
            rows={1}
            className="field-sizing-content w-full resize-none bg-transparent outline-none placeholder:text-fumo"
            defaultValue={exercise.notes}
            placeholder="Aggiungi una nota, es. sedile al 4"
            onChange={(e) => void updateExercise(exercise.id, { notes: e.target.value })}
          />
        </label>
        {dayNote && <p className="text-small text-fumo">{dayNote}</p>}
        {last && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-small text-fumo first-letter:uppercase">
              {relativeDay(last.startedAt)}:{' '}
              <span className="num text-body text-luce">{formatSets(last.sets, tracking)}</span>
            </p>
            {suggestion !== undefined && (
              <button
                type="button"
                className="chip-action"
                aria-label={`Aumenta a ${formatNumber(suggestion)} kg le serie da fare`}
                onClick={() => void applyWeight(se.id, suggestion)}
              >
                Aumenta a {formatNumber(suggestion)} kg
              </button>
            )}
          </div>
        )}
      </section>

      <ul className="border-t border-luce">
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
                onShowPlates={
                  exercise.equipment === 'barbell' && (set.weightKg ?? 0) > 0
                    ? () => setPlatesKg(set.weightKg ?? 0)
                    : undefined
                }
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
          className="btn-text min-h-14 text-fumo"
          onClick={() => addSet(se.id, true)}
        >
          <Plus size={20} /> Aggiungi riscaldamento
        </button>
      </div>

      <PlateSheet
        weightKg={platesKg ?? 0}
        open={platesKg !== null}
        onClose={() => setPlatesKg(null)}
      />
    </>
  );
}
