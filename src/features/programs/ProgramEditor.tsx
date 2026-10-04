import { useLiveQuery } from 'dexie-react-hooks';
import { ArchiveRestore, Copy, Plus, Trash2 } from 'lucide-react';
import { m } from 'motion/react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { MoveButtons } from '../../components/MoveButtons';
import { Tab } from '../../components/Tab';
import {
  activateProgram,
  addDay,
  countDayExercises,
  deleteOrArchiveProgram,
  duplicateProgram,
  getProgram,
  isProgramUsed,
  listDays,
  moveDay,
  restoreProgram,
  updateProgram,
} from '../../db/programs';
import { getSettings } from '../../db/settings';
import { countLabel } from '../../domain/format';
import { confirmAction } from '../../platform/confirm';

export function ProgramEditor() {
  const { programId = '' } = useParams();
  const navigate = useNavigate();
  const program = useLiveQuery(async () => (await getProgram(programId)) ?? null, [programId]);
  const days = useLiveQuery(() => listDays(programId), [programId]);
  const counts = useLiveQuery(() => countDayExercises(programId), [programId]);
  const used = useLiveQuery(() => isProgramUsed(programId), [programId]);
  const settings = useLiveQuery(getSettings);
  const [busy, setBusy] = useState(false);

  if (program === undefined || !days || !counts || used === undefined || !settings) return null;
  if (program === null) return <Navigate to="/programs" replace />;
  const active = settings.activeProgramId === program.id;
  const archived = program.archivedAt !== undefined;

  // A double tap must not create two days or two copies.
  const once = (action: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const addAndOpen = once(async () =>
    navigate(`/programs/${program.id}/days/${await addDay(program.id)}`),
  );
  const duplicate = once(async () => navigate(`/programs/${await duplicateProgram(program.id)}`));
  const remove = async () => {
    const message = used
      ? `Archiviare ${program.name}? Gli allenamenti fatti restano nello storico.`
      : `Eliminare ${program.name} con tutte le sue giornate?`;
    if (!confirmAction(message)) return;
    await deleteOrArchiveProgram(program.id);
    navigate('/programs', { replace: true });
  };

  return (
    <>
      <Header title={program.name || 'Senza nome'} back="/programs" />
      <div key={program.id} className="space-y-4 px-4">
        <label className="block">
          <span className="label">Nome</span>
          <input
            className="field plate text-name"
            defaultValue={program.name}
            onChange={(e) => void updateProgram(program.id, { name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="label">Note</span>
          <textarea
            className="field"
            rows={2}
            defaultValue={program.notes}
            onChange={(e) => void updateProgram(program.id, { notes: e.target.value })}
          />
        </label>
        {active && <Tab className="py-1 label-text">Programma attivo</Tab>}
      </div>

      <h2 className="section-title">
        <span>Giornate</span>
        <span className="num text-small text-luce">{days.length}</span>
      </h2>
      {days.length === 0 && (
        <p className="px-4 pb-2 text-fumo">
          Nessuna giornata. Aggiungi la prima per costruire il programma.
        </p>
      )}
      <ul className="rule-t">
        {days.map((day, i) => (
          <m.li
            layout
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            key={day.id}
            className="flex items-center bg-(--surface) rule-b"
          >
            <Link
              to={`/programs/${program.id}/days/${day.id}`}
              className="flex min-h-16 flex-1 items-center gap-4 py-2 pl-4 active:bg-fondale"
            >
              <span className="num w-10 text-score">{day.label}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{day.name || `Giornata ${day.label}`}</span>
                <span className="block text-small text-fumo">
                  {countLabel(counts[day.id] ?? 0, 'esercizio', 'esercizi')}
                </span>
              </span>
            </Link>
            <MoveButtons
              first={i === 0}
              last={i === days.length - 1}
              label={`giornata ${day.label}`}
              onMove={(dir) => moveDay(day.id, dir)}
            />
          </m.li>
        ))}
      </ul>
      <div className="px-2 py-2">
        <button type="button" className="btn-text" disabled={busy} onClick={addAndOpen}>
          <Plus size={20} /> Aggiungi giornata
        </button>
      </div>

      <div className="mt-auto space-y-2 px-4 py-6">
        {archived && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => restoreProgram(program.id)}
          >
            <ArchiveRestore size={20} /> Ripristina programma
          </button>
        )}
        {!archived && !active && (
          <button type="button" className="btn-primary" onClick={() => activateProgram(program.id)}>
            Attiva programma
          </button>
        )}
        <button type="button" className="btn-secondary" disabled={busy} onClick={duplicate}>
          <Copy size={20} /> Duplica programma
        </button>
        {!archived &&
          (active && used ? (
            <p className="pt-2 text-small text-fumo">
              È il programma attivo: attivane un altro per archiviarlo.
            </p>
          ) : (
            <button type="button" className="btn-danger" onClick={remove}>
              <Trash2 size={20} /> {used ? 'Archivia programma' : 'Elimina programma'}
            </button>
          ))}
      </div>
    </>
  );
}
