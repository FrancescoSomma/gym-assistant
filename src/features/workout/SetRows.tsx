import { Check, Trash2, Trophy } from 'lucide-react';
import { m } from 'motion/react';
import { Lights } from '../../components/Lights';
import { Stepper } from '../../components/Stepper';
import { deleteSet, updateSet } from '../../db/workout';
import { formatNumber, formatRange, formatSet, type SetValues } from '../../domain/format';
import { canComplete } from '../../domain/workout';
import { confirmAction } from '../../platform/confirm';
import type { Exercise, SessionExercise, SetLog, TrackingType } from '../../types';

const DASH = '–';
/** A set confirmed this recently lights up in sequence when its row appears. */
const FRESH_MS = 1500;
const setName = (set: SetLog, label: string) => (set.isWarmup ? 'Riscaldamento' : `Serie ${label}`);

/** The numbers of a row: weight on the scoreboard, then × reps (or seconds, or reps alone). */
function Values({ set, tracking }: { set: SetLog; tracking: TrackingType }) {
  const big = set.isWarmup ? 'text-title' : 'text-score';
  if (tracking === 'duration') {
    return (
      <>
        <span className={`num w-20 text-right ${big}`}>{set.durationSec ?? DASH}</span>
        <span className="label-text text-fumo">s</span>
      </>
    );
  }
  if (tracking === 'bodyweight_reps' && !set.weightKg) {
    return (
      <>
        <span className={`num w-20 text-right ${big}`}>{set.reps ?? DASH}</span>
        <span className="label-text text-fumo">rip</span>
      </>
    );
  }
  const weight =
    set.weightKg === undefined
      ? DASH
      : `${tracking === 'bodyweight_reps' ? '+' : ''}${formatNumber(set.weightKg)}`;
  return (
    <>
      <span className={`num w-20 text-right ${big}`}>{weight}</span>
      <span className="label-text w-6 text-fumo">kg</span>
      <span className="num text-title">× {set.reps ?? DASH}</span>
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

/** A row of the set board: number, values and the judges' lights. A tap opens it in the editor. */
export function SetRow({ set, label, tracking, record = false, onSelect }: RowProps) {
  const done = set.completedAt !== undefined;
  const fresh = done && Date.now() - (set.completedAt ?? 0) < FRESH_MS;
  const tone = record ? 'text-plate-yellow' : done && !set.isWarmup ? 'text-luce' : 'text-fumo';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${setName(set, label)}: ${formatSet(set, tracking)}${done ? ', completata' : ''}${record ? ', record' : ''}`}
      className="flex min-h-14 w-full items-center gap-2 px-4 text-left rule-b active:bg-fondale"
    >
      <span className="num w-7 text-title text-fumo">{label}</span>
      <span className={`flex flex-1 items-baseline gap-1 ${tone}`}>
        <Values set={set} tracking={tracking} />
        {record && <Trophy size={16} aria-hidden="true" className="ml-1 self-center" />}
      </span>
      <Lights
        total={set.isWarmup ? 1 : 3}
        lit={done ? (set.isWarmup ? 1 : 3) : 0}
        muted={set.isWarmup}
        sequence={fresh}
      />
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
  onToggleWarmup?: () => void;
  onShowPlates?: () => void;
}

/**
 * The current set (blue band) or a completed one being corrected (grey band), with 56pt
 * steppers. The band carries a layoutId: when the next set becomes current it slides down to it.
 */
export function SetEditor({
  set,
  label,
  se,
  exercise,
  step,
  onConfirm,
  onClose,
  onToggleWarmup,
  onShowPlates,
}: EditorProps) {
  const tracking = exercise.trackingType;
  const done = set.completedAt !== undefined;
  const save = (patch: SetValues) => void updateSet(set.id, patch);
  const remove = () => {
    if (done && !confirmAction('Eliminare questa serie completata?')) return;
    void deleteSet(set.id);
  };
  return (
    <div className="bg-tribuna rule-b">
      <m.div
        layoutId={`set-band-${se.id}`}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={`flex min-h-14 items-center pl-4 ${done ? 'bg-fondale' : 'bg-plate-blue'}`}
      >
        <span className="flex-1 font-semibold">
          {setName(set, label)}
          {done && ', completata'}
        </span>
        {onShowPlates && (
          <button type="button" className="btn-text min-h-14 text-small" onClick={onShowPlates}>
            Dischi
          </button>
        )}
        <button
          type="button"
          aria-label="Elimina serie"
          className="flex size-14 items-center justify-center active:opacity-60"
          onClick={remove}
        >
          <Trash2 size={20} />
        </button>
      </m.div>
      <div className="space-y-2 px-4 pt-3 pb-4">
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
        {onToggleWarmup && (
          <label className="flex min-h-11 items-center gap-3">
            <span className="flex-1">Serie di riscaldamento</span>
            <input
              type="checkbox"
              className="switch"
              checked={set.isWarmup}
              onChange={onToggleWarmup}
            />
          </label>
        )}
        <div className="pt-1">
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
    </div>
  );
}
