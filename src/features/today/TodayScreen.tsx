import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Header } from '../../components/Header';
import { Sheet } from '../../components/Sheet';
import {
  countCompletedSince,
  getActiveSession,
  getTodayPlan,
  startSession,
} from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { startOfWeek } from '../../domain/dates';
import { formatDate, formatSetsReps, formatTime } from '../../domain/format';

export function TodayScreen() {
  const navigate = useNavigate();
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null);
  const plan = useLiveQuery(getTodayPlan);
  const settings = useLiveQuery(getSettings);
  const weekCount = useLiveQuery(() => countCompletedSince(startOfWeek(Date.now())));
  const [choosing, setChoosing] = useState(false);
  const [starting, setStarting] = useState(false);
  if (active === undefined || plan === undefined || !settings || weekCount === undefined)
    return null;

  const start = async (dayId: string) => {
    setStarting(true);
    // A double tap can race with itself: the loser falls back to the session that won.
    const id = await startSession(dayId).catch(async () => (await getActiveSession())?.id);
    if (id) navigate(`/workout/${id}`);
    else setStarting(false);
  };

  const discs = Array.from({ length: Math.max(settings.weeklyGoal, weekCount) }, (_, i) => i + 1);

  return (
    <>
      <Header
        title="Oggi"
        right={
          <Link
            to="/settings"
            aria-label="Impostazioni"
            className="-mr-2 flex size-11 items-center justify-center text-steel"
          >
            <SettingsIcon />
          </Link>
        }
      />
      <p className="-mt-2 px-4 text-small text-steel first-letter:uppercase">
        {formatDate(Date.now())}
      </p>

      {active ? (
        <section className="px-4 pt-6">
          <h2 className="text-title font-semibold">Allenamento in corso</h2>
          <p className="text-small text-steel">
            Giornata {active.dayLabel}
            {active.dayName && `, ${active.dayName}`}, iniziato alle {formatTime(active.startedAt)}
          </p>
        </section>
      ) : !plan ? (
        <section className="px-4 pt-6">
          <p>Nessun programma attivo. Crea il primo per iniziare ad allenarti.</p>
        </section>
      ) : !plan.day ? (
        <section className="px-4 pt-6">
          <p>Il programma {plan.program.name} non ha giornate. Aggiungine una per iniziare.</p>
        </section>
      ) : (
        <section className="pt-6">
          <p className="px-4 text-small text-steel">Prossima giornata, {plan.program.name}</p>
          <h2 className="mt-1 flex items-baseline gap-3 px-4">
            <span className="num text-value">{plan.day.label}</span>
            <span className="text-title font-semibold">
              {plan.day.name || `Giornata ${plan.day.label}`}
            </span>
          </h2>
          {plan.items.length === 0 ? (
            <p className="px-4 pt-3 text-steel">
              Nessun esercizio in questa giornata: potrai aggiungerli durante l'allenamento.
            </p>
          ) : (
            <ul className="mt-3 border-t border-steel/25">
              {plan.items.map(({ de, exercise }) => (
                <li key={de.id} className="row">
                  <span className="flex-1">{exercise.name}</span>
                  <span className="text-small text-steel tabular-nums">
                    {formatSetsReps(de, exercise.trackingType)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="px-4 pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-small text-steel">Questa settimana</h2>
          <p className="num text-title">
            {weekCount} di {settings.weeklyGoal}
          </p>
        </div>
        <div className="mt-2 flex gap-2" aria-hidden="true">
          {discs.map((n) => (
            <span
              key={n}
              className={`size-3 rounded-full ${n <= weekCount ? 'bg-chalk' : 'border border-steel/60'}`}
            />
          ))}
        </div>
      </section>

      <div className="mt-auto space-y-1 px-4 pt-6 pb-4">
        {active ? (
          <Link to={`/workout/${active.id}`} className="btn-primary">
            Riprendi allenamento
          </Link>
        ) : !plan ? (
          <Link to="/programs" className="btn-primary">
            Vai ai programmi
          </Link>
        ) : !plan.day ? (
          <Link to={`/programs/${plan.program.id}`} className="btn-primary">
            Aggiungi una giornata
          </Link>
        ) : (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={starting}
              onClick={() => plan.day && start(plan.day.id)}
            >
              Inizia allenamento
            </button>
            {plan.days.length > 1 && (
              <button
                type="button"
                className="btn-text w-full justify-center text-steel"
                onClick={() => setChoosing(true)}
              >
                Scegli un'altra giornata
              </button>
            )}
          </>
        )}
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Scegli la giornata">
        <ul>
          {plan?.days.map((day) => (
            <li key={day.id}>
              <button
                type="button"
                className="row"
                disabled={starting}
                onClick={() => start(day.id)}
              >
                <span className="num w-8 text-value">{day.label}</span>
                <span className="flex-1">{day.name || `Giornata ${day.label}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
