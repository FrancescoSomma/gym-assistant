import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { MoveButtons } from '../../components/MoveButtons';
import {
  addDayExercise,
  deleteDay,
  getDay,
  listDayItems,
  moveDayExercise,
  toggleDayExerciseLink,
  updateDay,
} from '../../db/programs';
import { formatShortTarget } from '../../domain/format';
import { supersetRun } from '../../domain/superset';
import { confirmAction } from '../../platform/confirm';
import { ExercisePicker } from '../library/ExercisePicker';
import { DayExerciseSheet } from './DayExerciseSheet';

export function DayEditor() {
  const { programId = '', dayId = '' } = useParams();
  const navigate = useNavigate();
  const day = useLiveQuery(async () => (await getDay(dayId)) ?? null, [dayId]);
  const items = useLiveQuery(() => listDayItems(dayId), [dayId]);
  const [picking, setPicking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const back = `/programs/${programId}`;
  if (day === undefined || !items) return null;
  if (day === null) return <Navigate to={back} replace />;
  const editing = items.find((item) => item.de.id === editingId) ?? null;
  const keys = items.map((item) => item.de.supersetKey);
  const editingIndex = items.findIndex((item) => item.de.id === editingId);
  const linkedToNext = supersetRun(keys, editingIndex).includes(editingIndex + 1);

  const remove = async () => {
    if (
      !confirmAction(
        `Eliminare la giornata ${day.label}? Gli allenamenti già fatti restano nello storico.`,
      )
    )
      return;
    await deleteDay(day.id);
    navigate(back, { replace: true });
  };

  return (
    <>
      <Header title={`Giornata ${day.label}`} back={back} />
      <div className="flex gap-3 px-4">
        <label className="w-24">
          <span className="label">Etichetta</span>
          <input
            className="field"
            maxLength={3}
            defaultValue={day.label}
            onChange={(e) => {
              const label = e.target.value.trim();
              if (label) void updateDay(day.id, { label });
            }}
          />
        </label>
        <label className="flex-1">
          <span className="label">Nome</span>
          <input
            className="field"
            defaultValue={day.name}
            placeholder="Facoltativo, es. Petto e tricipiti"
            onChange={(e) => void updateDay(day.id, { name: e.target.value })}
          />
        </label>
      </div>

      <h2 className="section-title">Esercizi</h2>
      {items.length === 0 && (
        <p className="px-4 pb-2 text-steel">Nessun esercizio. Aggiungine uno dalla libreria.</p>
      )}
      <ul>
        {items.map(({ de, exercise }, i) => (
          <li
            key={de.id}
            className={`flex items-center border-b border-steel/25 ${supersetRun(keys, i).length > 1 ? 'border-l-2 border-l-steel' : ''}`}
          >
            <button
              type="button"
              className="flex min-h-16 flex-1 flex-col justify-center py-2 pl-4 text-left"
              onClick={() => setEditingId(de.id)}
            >
              <span>{exercise.name}</span>
              <span className="text-small text-steel tabular-nums">
                {formatShortTarget(de, exercise.trackingType)}
                {supersetRun(keys, i).length > 1 && ', in superserie'}
              </span>
            </button>
            <MoveButtons
              first={i === 0}
              last={i === items.length - 1}
              label={exercise.name}
              onMove={(dir) => moveDayExercise(de.id, dir)}
            />
          </li>
        ))}
      </ul>
      <div className="px-2 py-2">
        <button type="button" className="btn-text" onClick={() => setPicking(true)}>
          <Plus size={20} /> Aggiungi esercizio
        </button>
      </div>
      <div className="mt-auto px-4 py-6">
        <button type="button" className="btn-danger" onClick={remove}>
          <Trash2 size={20} /> Elimina giornata
        </button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(exerciseId) => void addDayExercise(day.id, exerciseId)}
      />
      <DayExerciseSheet
        item={editing}
        onClose={() => setEditingId(null)}
        nextName={items[editingIndex + 1]?.exercise.name}
        linked={linkedToNext}
        onToggleLink={() => void toggleDayExerciseLink(day.id, editingIndex)}
      />
    </>
  );
}
