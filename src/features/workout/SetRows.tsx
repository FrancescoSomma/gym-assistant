import { Check, Trash2 } from 'lucide-react';
import { Stepper } from '../../components/Stepper';
import { deleteSet, updateSet } from '../../db/workout';
import { formatNumber, formatRange, formatSet, type SetValues } from '../../domain/format';
import { canComplete } from '../../domain/workout';
import { confirmAction } from '../../platform/confirm';
import type { Exercise, SessionExercise, SetLog, TrackingType } from '../../types';

const DASH = '–';
const setName = (set: SetLog, label: string) => (set.isWarmup ? 'Riscaldamento' : `Serie ${label}`);

export function Disc({ done }: { done: boolean }) {
  return done ? (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-plate-green text-rubber">
      <Check size={18} strokeWidth={3} />
    </span>
  ) : (
    <span className="size-8 shrink-0 rounded-full border-2 border-steel/60" />
  );
}

function Values({ set, tracking }: { set: SetLog; tracking: TrackingType }) {
  if (tracking === 'duration') {
    return (
      <>
        <span className="num w-20 text-right text-value">{set.durationSec ?? DASH}</span>
        <span className="text-small text-steel">s</span>
      </>
    );
  }
  const weight =
    tracking === 'bodyweight_reps'
      ? set.weightKg
        ? `+${formatNumber(set.weightKg)}`
        : ''
      : set.weightKg === undefined
        ? DASH
        : formatNumber(set.weightKg);
  return (
    <>
      <span className="num w-20 text-right text-value">{weight}</span>
      <span className="w-8 text-small text-steel">{weight && 'kg'}</span>
      <span className="num w-10 text-right text-value">{set.reps ?? DASH}</span>
      <span className="text-small text-steel">rip</span>
    </>
  );
}

interface RowProps {
  set: SetLog;
  label: string;
  tracking: TrackingType;
  record?: boolean;
  onSelect: () => void;
}

/** Compact row: values and status disc. A tap opens it in the editor. */
export function SetRow({ set, label, tracking, record = false, onSelect }: RowProps) {
  const done = set.completedAt !== undefined;
  const tone = record ? 'text-plate-yellow' : done && !set.isWarmup ? 'text-chalk' : 'text-steel';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${setName(set, label)}: ${formatSet(set, tracking)}${done ? ', completata' : ''}${record ? ', record' : ''}`}
      className="flex min-h-14 w-full items-center gap-2 border-b border-steel/25 px-4 text-left"
    >
      <span className="num w-6 text-title text-steel">{label}</span>
      <span className={`flex flex-1 items-baseline gap-1 ${tone}`}>
        <Values set={set} tracking={tracking} />
      </span>
      <Disc done={done} />
    </button>
  );
}

interface EditorProps {
  set: SetLog;
  label: string;
  se: SessionExercise;
  exercise: Exercise;
  step: number;
  onConfirm: () => void;
  onClose: () => void;
}

/** Expanded row with 56pt steppers: the current set, or a completed one being corrected. */
export function SetEditor({ set, label, se, exercise, step, onConfirm, onClose }: EditorProps) {
  const tracking = exercise.trackingType;
  const done = set.completedAt !== undefined;
  const save = (patch: SetValues) => void updateSet(set.id, patch);
  const remove = () => {
    if (done && !confirmAction('Eliminare questa serie completata?')) return;
    void deleteSet(set.id);
  };
  return (
    <div
      className={`border-b border-l-4 border-b-steel/25 bg-iron px-4 py-3 ${done ? 'border-l-steel' : 'border-l-plate-blue'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-small text-steel">
          {setName(set, label)}
          {done && ', completata'}
        </span>
        <button
          type="button"
          aria-label="Elimina serie"
          className="-mr-2 flex size-14 items-center justify-center text-steel"
          onClick={remove}
        >
          <Trash2 size={20} />
        </button>
      </div>
      <div className="mt-1 space-y-2">
        {tracking !== 'duration' && (
          <Stepper
            size="lg"
            live
            label={tracking === 'bodyweight_reps' ? 'Zavorra' : 'Peso'}
            decimal
            unit="kg"
            step={step}
            value={tracking === 'bodyweight_reps' ? (set.weightKg ?? 0) : set.weightKg}
            placeholder={DASH}
            onChange={(weightKg) => save({ weightKg })}
          />
        )}
        {tracking === 'duration' ? (
          <Stepper
            size="lg"
            live
            label="Durata"
            unit="s"
            step={5}
            value={set.durationSec}
            fallback={se.targetSec}
            placeholder={String(se.targetSec ?? '')}
            onChange={(durationSec) => save({ durationSec })}
          />
        ) : (
          <Stepper
            size="lg"
            live
            label="Ripetizioni"
            unit="rip"
            step={1}
            value={set.reps}
            fallback={se.repMin}
            placeholder={formatRange(se.repMin, se.repMax)}
            onChange={(reps) => save({ reps })}
          />
        )}
      </div>
      <div className="mt-3">
        {done ? (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fatto
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={!canComplete(set, tracking)}
            onClick={onConfirm}
          >
            <Check size={22} /> Conferma serie
          </button>
        )}
      </div>
    </div>
  );
}
