import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Header } from '../../components/Header';
import { Lights } from '../../components/Lights';
import { Sheet } from '../../components/Sheet';
import { SupersetBracket } from '../../components/SupersetBracket';
import { Tab } from '../../components/Tab';
import { useNow } from '../../components/useNow';
import {
  countCompletedSince,
  getActiveSession,
  getTodayPlan,
  getWorkout,
  lastCompletedSession,
  startSession,
  type Workout,
} from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { needsBackupReminder } from '../../domain/backup';
import { startOfWeek } from '../../domain/dates';
import {
  countLabel,
  formatClock,
  formatDate,
  formatSetsReps,
  formatTime,
  relativeDay,
} from '../../domain/format';
import { planTotals } from '../../domain/program';
import { supersetPosition } from '../../domain/superset';
import { resumeIndex } from '../../domain/workout';
import type { Session } from '../../types';
import { exportAndShare } from '../settings/exportBackup';

/** The day's bib wipes in once per launch, not on every return to the tab. */
let bibShown = false;

export function TodayScreen() {
  const navigate = useNavigate();
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null);
  const workout = useLiveQuery(
    async () => (active ? ((await getWorkout(active.id)) ?? null) : null),
    [active?.id],
  );
  const plan = useLiveQuery(getTodayPlan);
  const settings = useLiveQuery(getSettings);
  const weekCount = useLiveQuery(() => countCompletedSince(startOfWeek(Date.now())));
  const lastWorkout = useLiveQuery(async () => (await lastCompletedSession()) ?? null);
  const [choosing, setChoosing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [wipe] = useState(() => !bibShown);
  useEffect(() => {
    bibShown = true;
  }, []);
  const now = useNow(active ? 1000 : null);
  if (
    active === undefined ||
    plan === undefined ||
    !settings ||
    weekCount === undefined ||
    lastWorkout === undefined
  )
    return null;

  const start = async (dayId: string) => {
    setStarting(true);
    // A double tap can race with itself: the loser falls back to the session that won.
    const id = await startSession(dayId).catch(async () => (await getActiveSession())?.id);
    if (id) navigate(`/workout/${id}`);
    else setStarting(false);
  };

  const remindBackup = needsBackupReminder(
    settings.lastBackupAt,
    lastWorkout ? (lastWorkout.endedAt ?? lastWorkout.startedAt) : undefined,
    Date.now(),
  );
  const keys = plan?.items.map((item) => item.de.supersetKey) ?? [];
  const totals = plan ? planTotals(plan.items) : undefined;

  return (
    <>
      <Header
        large
        title="Oggi"
        right={
          <Link
            to="/settings"
            aria-label="Impostazioni"
            className="-mr-2 flex size-11 items-center justify-center text-fumo active:text-luce"
          >
            <SettingsIcon />
          </Link>
        }
      />
      <p className="-mt-1 px-4 text-small text-fumo first-letter:uppercase">
        {formatDate(Date.now())}
      </p>

      {active ? (
        <ActiveSummary session={active} workout={workout ?? null} now={now} />
      ) : !plan ? (
        <p className="px-4 pt-6">
          Nessun programma attivo. Crea il primo per iniziare ad allenarti.
        </p>
      ) : !plan.day ? (
        <p className="px-4 pt-6">
          Il programma {plan.program.name} non ha giornate. Aggiungine una per iniziare.
        </p>
      ) : (
        <section className="pt-6">
          {/* The bib: the day's letter on the scoreboard, its name in the plate face. */}
          <div className={`flex items-end gap-4 px-4 ${wipe ? 'animate-wipe' : ''}`}>
            <span aria-hidden="true" className="num text-bib">
              {plan.day.label}
            </span>
            <div className="min-w-0 flex-1 pb-1.5">
              <h2 className="plate text-name">
                <span className="sr-only">Giornata {plan.day.label}: </span>
                {plan.day.name || `Giornata ${plan.day.label}`}
              </h2>
              <p className="text-small text-fumo">{plan.program.name}</p>
            </div>
          </div>
          {plan.items.length === 0 ? (
            <p className="px-4 pt-4 text-fumo">
              Nessun esercizio in questa giornata: potrai aggiungerli durante l'allenamento.
            </p>
          ) : (
            <>
              <ol className="mt-4 rule-t">
                {plan.items.map(({ de, exercise }, i) => (
                  <li key={de.id} className="relative flex min-h-14 items-center gap-3 px-4 rule-b">
                    <SupersetBracket position={supersetPosition(keys, i)} />
                    <span className="num w-6 text-title text-fumo">{i + 1}</span>
                    <span className="min-w-0 flex-1">{exercise.name}</span>
                    <span className="num shrink-0 text-title">
                      {formatSetsReps(de, exercise.trackingType)}
                    </span>
                  </li>
                ))}
              </ol>
              {totals && (
                <p className="flex items-baseline justify-between px-4 py-3 text-small text-fumo">
                  <span>{countLabel(totals.exercises, 'esercizio', 'esercizi')}</span>
                  <span>
                    <span className="num text-title text-luce">{totals.sets}</span> serie
                  </span>
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section className="flex items-center gap-3 px-4 pt-6">
        <h2 className="flex-1 label-text text-fumo">Questa settimana</h2>
        <Lights total={Math.max(settings.weeklyGoal, weekCount)} lit={weekCount} />
        <p className="text-small text-fumo">
          <span className="num text-step text-luce">{weekCount}</span> di{' '}
          <span className="num text-step text-luce">{settings.weeklyGoal}</span>
        </p>
      </section>

      {remindBackup && (
        <section className="mx-4 mt-6 py-3 rule-t rule-b">
          <div className="flex items-start gap-3">
            <Tab className="py-1 label-text">Backup</Tab>
            <p className="flex-1 text-small">
              {settings.lastBackupAt
                ? `Ultimo backup ${relativeDay(settings.lastBackupAt)}.`
                : 'Non hai ancora un backup.'}{' '}
              I dati sono solo su questo iPhone.
            </p>
          </div>
          <button type="button" className="btn-text -ml-2 mt-1" onClick={() => exportAndShare()}>
            Esporta backup
          </button>
        </section>
      )}

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
                className="btn-text w-full justify-center text-fumo"
                onClick={() => setChoosing(true)}
              >
                Scegli un'altra giornata
              </button>
            )}
          </>
        )}
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Scegli la giornata">
        <ul className="rule-t">
          {plan?.days.map((day) => (
            <li key={day.id}>
              <button
                type="button"
                className="row"
                disabled={starting}
                onClick={() => start(day.id)}
              >
                <span className="num w-10 text-score">{day.label}</span>
                <span className="flex-1">{day.name || `Giornata ${day.label}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

/** Today while a workout is open: the day's bib, the elapsed time and where it stands. */
function ActiveSummary({
  session,
  workout,
  now,
}: {
  session: Session;
  workout: Workout | null;
  now: number;
}) {
  const index = workout ? resumeIndex(workout.items) : -1;
  const item = workout?.items[index];
  return (
    <section className="pt-6">
      <div className="flex items-end gap-4 px-4">
        <span aria-hidden="true" className="num text-bib">
          {session.dayLabel}
        </span>
        <div className="min-w-0 flex-1 pb-1.5">
          <h2 className="plate text-name">
            <span className="sr-only">Giornata {session.dayLabel}: </span>
            Allenamento in corso
          </h2>
          <p className="text-small text-fumo">
            {session.dayName || `Giornata ${session.dayLabel}`}, iniziato alle{' '}
            {formatTime(session.startedAt)}
          </p>
        </div>
      </div>
      <dl className="mx-4 mt-4 border-t border-luce">
        <div className="flex min-h-14 items-center justify-between rule-b">
          <dt className="text-small text-fumo">Durata</dt>
          <dd className="num text-score">{formatClock(now - session.startedAt)}</dd>
        </div>
        {item && workout && (
          <div className="flex min-h-14 items-center gap-3 rule-b">
            <dt className="sr-only">Esercizio</dt>
            <dd className="min-w-0 flex-1 truncate">{item.exercise.name}</dd>
            <dd className="shrink-0 text-small text-fumo">
              <span className="num text-title text-luce">{index + 1}</span> di{' '}
              <span className="num text-title text-luce">{workout.items.length}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
