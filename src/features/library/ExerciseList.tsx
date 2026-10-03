import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { listExercises } from '../../db/exercises';
import { EQUIPMENT, type Exercise, MUSCLE_GROUPS, type MuscleGroup } from '../../types';

const GROUPS = Object.entries(MUSCLE_GROUPS) as [MuscleGroup, string][];

/** Case- and accent-insensitive search: "panca" also finds "Panca". */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

interface Props {
  onSelect: (exercise: Exercise) => void;
  initialGroup?: MuscleGroup | 'all';
}

export function ExerciseList({ onSelect, initialGroup = 'all' }: Props) {
  const exercises = useLiveQuery(listExercises);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>(initialGroup);
  if (!exercises) return null;

  const q = normalize(query);
  const visible = exercises.filter(
    (e) => (group === 'all' || e.muscleGroup === group) && normalize(e.name).includes(q),
  );

  return (
    <div>
      <div className="space-y-3 px-4 pb-2">
        <input
          type="search"
          className="field"
          placeholder="Cerca esercizio"
          aria-label="Cerca esercizio"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            className="chip"
            aria-pressed={group === 'all'}
            onClick={() => setGroup('all')}
          >
            Tutti
          </button>
          {GROUPS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={group === key}
              onClick={() => setGroup(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 && (
        <p className="px-4 py-6 text-steel">
          Nessun esercizio trovato. Crealo con "Nuovo esercizio".
        </p>
      )}
      {GROUPS.map(([key, label]) => {
        const items = visible.filter((e) => e.muscleGroup === key);
        if (items.length === 0) return null;
        return (
          <section key={key}>
            <h3 className="section-title">{label}</h3>
            <ul>
              {items.map((e) => (
                <li key={e.id}>
                  <button type="button" className="row" onClick={() => onSelect(e)}>
                    <span className="flex-1">{e.name}</span>
                    <span className="text-small text-steel">{EQUIPMENT[e.equipment]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
