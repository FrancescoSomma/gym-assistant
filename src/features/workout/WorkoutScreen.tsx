import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useNow } from '../../components/useNow';
import { getWorkout } from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { formatClock } from '../../domain/format';
import { resumeIndex } from '../../domain/workout';
import { useWakeLock } from '../../platform/wakeLock';
import { ExerciseView } from './ExerciseView';
import { SessionSheet } from './SessionSheet';
import { TimerBar } from './TimerBar';

export function WorkoutScreen() {
  const { sessionId = '' } = useParams();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const settings = useLiveQuery(getSettings);
  const [index, setIndex] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const now = useNow(1000);
  useWakeLock();

  if (workout === undefined || !settings) return null;
  if (workout === null) return <Navigate to="/" replace />;
  const { session, items } = workout;
  // Also catches the live query refreshing right after "Termina allenamento".
  if (session.status === 'completed')
    return <Navigate to={`/workout/${session.id}/summary`} replace />;

  const current = Math.min(
    index ?? resumeIndex(items.map((i) => i.se.status)),
    Math.max(0, items.length - 1),
  );
  const item = items[current];
  const isLast = current >= items.length - 1;
  const goTo = (i: number) => {
    setIndex(i);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 bg-rubber px-2 pt-[env(safe-area-inset-top)]">
        <Link
          to="/"
          aria-label="Esci dall'allenamento"
          className="flex size-14 items-center justify-center"
        >
          <X />
        </Link>
        <div className="flex flex-1 items-baseline justify-center gap-3">
          <span className="font-semibold">Giornata {session.dayLabel}</span>
          <span className="num text-title text-steel">{formatClock(now - session.startedAt)}</span>
        </div>
        <button
          type="button"
          aria-label="Elenco degli esercizi"
          className="num flex h-14 items-center px-3 text-title"
          onClick={() => setListOpen(true)}
        >
          {items.length > 0 ? `${current + 1} di ${items.length}` : '0 di 0'}
        </button>
      </header>

      <main className="flex-1 pb-4">
        {item ? (
          <ExerciseView
            key={item.se.id}
            item={item}
            settings={settings}
            onExerciseDone={() => {
              if (!isLast) goTo(current + 1);
            }}
          />
        ) : (
          <p className="px-4 pt-8 text-steel">
            Nessun esercizio in questa sessione. Aggiungine uno per iniziare.
          </p>
        )}
      </main>

      <footer className="sticky bottom-0 bg-rubber">
        <nav className="flex items-center border-t border-steel/25 px-2">
          <button
            type="button"
            className="btn-text min-h-14"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft /> Precedente
          </button>
          <span className="flex-1" />
          {!isLast && (
            <button type="button" className="btn-text min-h-14" onClick={() => goTo(current + 1)}>
              Successivo <ChevronRight />
            </button>
          )}
        </nav>
        <TimerBar timer={settings.activeTimer} sound={settings.timerSound} item={item} />
      </footer>

      <SessionSheet
        open={listOpen}
        onClose={() => setListOpen(false)}
        items={items}
        current={current}
        onJump={(i) => {
          goTo(i);
          setListOpen(false);
        }}
      />
    </div>
  );
}
