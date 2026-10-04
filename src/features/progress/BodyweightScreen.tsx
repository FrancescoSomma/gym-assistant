import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { type FormEvent, lazy, Suspense, useState } from 'react';
import { Header } from '../../components/Header';
import { deleteBodyweight, listBodyweights, saveBodyweight } from '../../db/bodyweights';
import { dateKeyToTs, toDateKey } from '../../domain/dates';
import { formatDateYear, formatNumber, parseWeight } from '../../domain/format';
import { isPlausibleBodyweight } from '../../domain/progress';
import { confirmAction } from '../../platform/confirm';

const BodyweightChart = lazy(() => import('./BodyweightChart'));

export function BodyweightScreen() {
  const entries = useLiveQuery(listBodyweights);
  const today = toDateKey(Date.now());
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState('');
  if (!entries) return null;
  const value = parseWeight(kg);
  const valid = isPlausibleBodyweight(value);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    await saveBodyweight(date, value);
    setKg('');
  };

  return (
    <>
      <Header title="Peso corporeo" back="/progress" />
      <form className="flex items-end gap-3 px-4" onSubmit={save}>
        <label className="flex-1">
          <span className="label">Data</span>
          <input
            type="date"
            className="field"
            value={date}
            max={today}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="w-28">
          <span className="label">Peso (kg)</span>
          <input
            className="field text-right"
            inputMode="decimal"
            placeholder="80,5"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary w-auto px-5" disabled={!valid}>
          Salva
        </button>
      </form>

      {entries.length >= 2 && (
        <Suspense fallback={null}>
          <BodyweightChart entries={entries} />
        </Suspense>
      )}

      <h2 className="section-title">Misurazioni</h2>
      {entries.length === 0 ? (
        <p className="px-4 text-fumo">
          Nessuna misurazione. Registra il peso di oggi per iniziare.
        </p>
      ) : (
        <ul className="rule-t">
          {entries.map((entry) => {
            const day = formatDateYear(dateKeyToTs(entry.date));
            return (
              <li key={entry.id} className="row">
                <span className="flex-1 first-letter:uppercase">{day}</span>
                <span className="num text-title">{formatNumber(entry.kg)} kg</span>
                <button
                  type="button"
                  aria-label={`Elimina la misurazione di ${day}`}
                  className="-mr-2 flex size-11 items-center justify-center text-plate-red"
                  onClick={() => {
                    if (confirmAction(`Eliminare la misurazione di ${day}?`)) {
                      void deleteBodyweight(entry.id);
                    }
                  }}
                >
                  <Trash2 size={20} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
