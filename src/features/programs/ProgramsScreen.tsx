import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Header } from '../../components/Header';
import { Segmented } from '../../components/Segmented';
import { listArchivedExercises } from '../../db/exercises';
import { createProgram, listProgramRows, type ProgramRow } from '../../db/programs';
import { getSettings } from '../../db/settings';
import { countLabel } from '../../domain/format';
import { ExerciseForm } from '../library/ExerciseForm';
import { ExerciseList } from '../library/ExerciseList';

type Tab = 'programs' | 'exercises';

export function ProgramsScreen() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'exercises' ? 'exercises' : 'programs';
  return (
    <>
      <Header title={tab === 'programs' ? 'Programmi' : 'Esercizi'} />
      <div className="px-4 pb-2">
        <Segmented<Tab>
          options={[
            ['programs', 'Programmi'],
            ['exercises', 'Esercizi'],
          ]}
          value={tab}
          onChange={(next) =>
            setParams(next === 'exercises' ? { tab: next } : {}, { replace: true })
          }
        />
      </div>
      {tab === 'programs' ? <ProgramList /> : <ExerciseLibrary />}
    </>
  );
}

function ProgramList() {
  const navigate = useNavigate();
  const rows = useLiveQuery(listProgramRows);
  const settings = useLiveQuery(getSettings);
  if (!rows || !settings) return null;

  const isActive = (row: ProgramRow) => row.program.id === settings.activeProgramId;
  const current = rows
    .filter((row) => row.program.archivedAt === undefined)
    .sort((a, b) => Number(isActive(b)) - Number(isActive(a)));
  const archived = rows.filter((row) => row.program.archivedAt !== undefined);

  return (
    <>
      {current.length === 0 && (
        <p className="px-4 py-6 text-steel">
          Nessun programma. Crea il primo per iniziare ad allenarti.
        </p>
      )}
      <ul>
        {current.map((row) => (
          <ProgramLink key={row.program.id} row={row} active={isActive(row)} />
        ))}
      </ul>
      <div className="px-4 py-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => navigate(`/programs/${await createProgram()}`)}
        >
          <Plus size={20} /> Nuovo programma
        </button>
      </div>
      {archived.length > 0 && (
        <details>
          <summary className="section-title min-h-11 cursor-pointer">
            Archiviati ({archived.length})
          </summary>
          <ul>
            {archived.map((row) => (
              <ProgramLink key={row.program.id} row={row} active={false} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function ProgramLink({ row, active }: { row: ProgramRow; active: boolean }) {
  return (
    <li>
      <Link to={`/programs/${row.program.id}`} className="row">
        <span className="flex-1">
          <span className="block">{row.program.name || 'Senza nome'}</span>
          <span className="block text-small text-steel">
            {countLabel(row.dayCount, 'giornata', 'giornate')}
          </span>
        </span>
        {active && <span className="text-small font-semibold">Attivo</span>}
        <ChevronRight size={20} className="text-steel" />
      </Link>
    </li>
  );
}

function ExerciseLibrary() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const archived = useLiveQuery(listArchivedExercises) ?? [];
  return (
    <>
      <div className="px-4 pb-2">
        <button type="button" className="btn-secondary" onClick={() => setCreating(true)}>
          <Plus size={20} /> Nuovo esercizio
        </button>
      </div>
      <ExerciseList onSelect={(e) => navigate(`/exercises/${e.id}`)} />
      {archived.length > 0 && (
        <details>
          <summary className="section-title min-h-11 cursor-pointer">
            Archiviati ({archived.length})
          </summary>
          <ul>
            {archived.map((e) => (
              <li key={e.id}>
                <Link to={`/exercises/${e.id}`} className="row">
                  <span className="flex-1">{e.name}</span>
                  <ChevronRight size={20} className="text-steel" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      <ExerciseForm
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(id) => navigate(`/exercises/${id}`)}
      />
    </>
  );
}
