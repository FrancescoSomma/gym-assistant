import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { RestPicker } from '../../components/RestPicker';
import { Sheet } from '../../components/Sheet';
import { Stepper } from '../../components/Stepper';
import {
  type DayExercisePatch,
  type DayItem,
  removeDayExercise,
  updateDayExercise,
} from '../../db/programs';

interface LinkProps {
  /** Name of the next exercise of the day, when there is one. */
  nextName?: string;
  linked: boolean;
  onToggleLink: () => void;
}

export function DayExerciseSheet({
  item,
  onClose,
  ...link
}: { item: DayItem | null; onClose: () => void } & LinkProps) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.exercise.name ?? ''}>
      {item && <Fields item={item} onClose={onClose} {...link} />}
    </Sheet>
  );
}

function Fields({
  item: { de, exercise },
  onClose,
  nextName,
  linked,
  onToggleLink,
}: { item: DayItem; onClose: () => void } & LinkProps) {
  const update = (patch: DayExercisePatch) => void updateDayExercise(de.id, patch);
  const remove = async () => {
    await removeDayExercise(de.id);
    onClose();
  };
  return (
    <div className="space-y-5 px-4">
      <Field label="Serie">
        <Stepper
          label="Serie"
          value={de.sets}
          step={1}
          min={1}
          max={10}
          onChange={(sets) => sets !== undefined && update({ sets })}
        />
      </Field>
      {exercise.trackingType === 'duration' ? (
        <Field label="Durata">
          <Stepper
            label="Durata"
            value={de.targetSec}
            step={5}
            min={5}
            max={600}
            unit="s"
            onChange={(targetSec) => targetSec !== undefined && update({ targetSec })}
          />
        </Field>
      ) : (
        <>
          <Field label="Ripetizioni minime">
            <Stepper
              label="Ripetizioni minime"
              value={de.repMin}
              step={1}
              min={1}
              max={50}
              onChange={(v) =>
                v !== undefined && update({ repMin: v, repMax: Math.max(v, de.repMax) })
              }
            />
          </Field>
          <Field label="Ripetizioni massime">
            <Stepper
              label="Ripetizioni massime"
              value={de.repMax}
              step={1}
              min={1}
              max={50}
              onChange={(v) =>
                v !== undefined && update({ repMax: v, repMin: Math.min(v, de.repMin) })
              }
            />
          </Field>
        </>
      )}
      <Field label="Recupero">
        <RestPicker value={de.restSec} onChange={(restSec) => update({ restSec })} />
      </Field>
      <label className="block">
        <span className="label">Nota di giornata</span>
        <textarea
          className="field"
          rows={2}
          defaultValue={de.notes}
          placeholder="Es. un secondo di fermo al petto"
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
      {nextName && (
        <label className="flex min-h-11 items-center gap-3">
          <span className="flex-1">In superserie con {nextName}</span>
          <input type="checkbox" className="switch" checked={linked} onChange={onToggleLink} />
        </label>
      )}
      <button type="button" className="btn-primary" onClick={onClose}>
        Fatto
      </button>
      <button type="button" className="btn-danger" onClick={remove}>
        <Trash2 size={20} /> Rimuovi dalla giornata
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      {children}
    </div>
  );
}
