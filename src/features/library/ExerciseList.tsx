import { useLiveQuery } from 'dexie-react-hooks';
import { Search } from 'lucide-react';
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
        <label className="relative block">
          <span className="sr-only">Cerca esercizio</span>
          <Search
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fumo"
          />
          <input
            type="search"
            className="field pl-10"
            placeholder="Cerca esercizio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
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
        <p className="px-4 py-6 text-fumo">
          Nessun esercizio trovato. Crealo con "Nuovo esercizio".
        </p>
      )}
      {GROUPS.map(([key, label]) => {
        const items = visible.filter((e) => e.muscleGroup === key);
        if (items.length === 0) return null;
        return (
          <section key={key}>
            {/* Sticky under the status bar in a page, at the top inside a sheet (--sticky-top). */}
            <h3 className="sticky top-(--sticky-top) z-[1] flex items-baseline justify-between bg-(--surface) px-4 pt-5 pb-2 rule-b">
              <span className="plate text-title">{label}</span>
              <span className="num text-small text-fumo">{items.length}</span>
            </h3>
            <ul>
              {items.map((e) => (
                <li key={e.id}>
                  <button type="button" className="row" onClick={() => onSelect(e)}>
                    <span className="min-w-0 flex-1">{e.name}</span>
                    <span className="shrink-0 text-small text-fumo">{EQUIPMENT[e.equipment]}</span>
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
