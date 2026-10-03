import { type FormEvent, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { createExercise, type NewExercise, updateExercise } from '../../db/exercises';
import {
  EQUIPMENT,
  type Equipment,
  type Exercise,
  MUSCLE_GROUPS,
  type MuscleGroup,
  TRACKING_TYPES,
  type TrackingType,
} from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing exercise. */
  exercise?: Exercise;
  /** The tracking type gives meaning to logged sets: it is locked once the exercise is used. */
  trackingLocked?: boolean;
  defaultGroup?: MuscleGroup;
  onSaved?: (id: string) => void;
}

export function ExerciseForm({
  open,
  onClose,
  exercise,
  trackingLocked = false,
  defaultGroup,
  onSaved,
}: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise ? 'Modifica esercizio' : 'Nuovo esercizio'}
    >
      <Form
        exercise={exercise}
        trackingLocked={trackingLocked}
        defaultGroup={defaultGroup ?? 'chest'}
        onDone={(id) => {
          onSaved?.(id);
          onClose();
        }}
      />
    </Sheet>
  );
}

const defaultTracking = (equipment: Equipment): TrackingType =>
  equipment === 'bodyweight' ? 'bodyweight_reps' : 'weight_reps';

interface FormProps {
  exercise?: Exercise;
  trackingLocked: boolean;
  defaultGroup: MuscleGroup;
  onDone: (id: string) => void;
}

function Form({ exercise, trackingLocked, defaultGroup, onDone }: FormProps) {
  const [draft, setDraft] = useState<NewExercise>(() =>
    exercise
      ? {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          trackingType: exercise.trackingType,
          notes: exercise.notes,
        }
      : {
          name: '',
          muscleGroup: defaultGroup,
          equipment: 'barbell',
          trackingType: 'weight_reps',
          notes: '',
        },
  );
  const name = draft.name.trim();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name) return;
    if (exercise) {
      await updateExercise(exercise.id, { ...draft, name });
      onDone(exercise.id);
    } else {
      onDone(await createExercise({ ...draft, name }));
    }
  };

  return (
    <form className="space-y-4 px-4" onSubmit={save}>
      <label className="block">
        <span className="label">Nome</span>
        <input
          className="field"
          required
          value={draft.name}
          placeholder="Es. Panca piana con bilanciere"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="label">Gruppo muscolare</span>
        <select
          className="field"
          value={draft.muscleGroup}
          onChange={(e) => setDraft({ ...draft, muscleGroup: e.target.value as MuscleGroup })}
        >
          {Object.entries(MUSCLE_GROUPS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Attrezzo</span>
        <select
          className="field"
          value={draft.equipment}
          onChange={(e) => {
            const equipment = e.target.value as Equipment;
            // New exercises follow the equipment (SPEC §13); edits keep what was chosen.
            setDraft({
              ...draft,
              equipment,
              trackingType: exercise ? draft.trackingType : defaultTracking(equipment),
            });
          }}
        >
          {Object.entries(EQUIPMENT).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Tipo di registrazione</span>
        <select
          className="field disabled:opacity-50"
          value={draft.trackingType}
          disabled={trackingLocked}
          onChange={(e) => setDraft({ ...draft, trackingType: e.target.value as TrackingType })}
        >
          {Object.entries(TRACKING_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {trackingLocked && (
          <span className="mt-1 block text-small text-steel">
            Non modificabile: l'esercizio è già in un programma o in un allenamento.
          </span>
        )}
      </label>
      <label className="block">
        <span className="label">Note</span>
        <textarea
          className="field"
          rows={2}
          value={draft.notes}
          placeholder="Es. sedile al 4"
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </label>
      <button type="submit" className="btn-primary" disabled={!name}>
        {exercise ? 'Salva esercizio' : 'Crea esercizio'}
      </button>
    </form>
  );
}
