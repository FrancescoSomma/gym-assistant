import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useNow } from '../../components/useNow';
import { getWorkout } from '../../db/sessions';
import { getSettings } from '../../db/settings';
import {
  addSessionExercise,
  removeSessionExercise,
  replaceExercise,
  skipExercise,
} from '../../db/workout';
import { formatClock } from '../../domain/format';
import { supersetRun } from '../../domain/superset';
import { resumeIndex } from '../../domain/workout';
import { useWakeLock } from '../../platform/wakeLock';
import { ExercisePicker } from '../library/ExercisePicker';
import { ExerciseMenu } from './ExerciseMenu';
import { ExerciseView } from './ExerciseView';
import { discardWorkout, finishWorkout } from './finish';
import { SessionSheet } from './SessionSheet';
import { TimerBar } from './TimerBar';

type SheetName = 'list' | 'menu' | 'replace' | 'add';

export function WorkoutScreen() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const settings = useLiveQuery(getSettings);
  const [index, setIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const now = useNow(1000);
  useWakeLock();

  if (workout === undefined || !settings) return null;
  if (workout === null) return <Navigate to="/" replace />;
  const { session, items } = workout;
  // Also catches the live query refreshing right after "Termina allenamento".
  if (session.status === 'completed')
    return <Navigate to={`/workout/${session.id}/summary`} replace />;

  const current = Math.min(index ?? resumeIndex(items), Math.max(0, items.length - 1));
  const item = items[current];
  const isLast = current >= items.length - 1;
  const partners = item
    ? supersetRun(
        items.map((i) => i.se.supersetKey),
        current,
      )
        .filter((i) => i !== current)
        .map((i) => items[i]?.exercise.name ?? '')
    : [];
  const goTo = (i: number) => {
    setIndex(i);
    if (i !== current) window.scrollTo(0, 0); // a lone superset member stays where it is
  };
  const close = () => setSheet(null);
  const position = items.length > 0 ? current + 1 : 0;

  return (
    <div className="flex min-h-dvh animate-enter-rise flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 bg-arena px-2 pt-[env(safe-area-inset-top)] rule-b">
        <Link
          to="/"
          aria-label="Esci dall'allenamento"
          className="flex size-14 items-center justify-center text-fumo active:text-luce"
        >
          <X />
        </Link>
        <div className="flex flex-1 items-baseline justify-center gap-3">
          <span className="font-semibold">Giornata {session.dayLabel}</span>
          <span className="num text-title text-fumo">{formatClock(now - session.startedAt)}</span>
        </div>
        <button
          type="button"
          aria-label={`Elenco degli esercizi, ${position} di ${items.length}`}
          className="flex h-14 items-center gap-1 px-3 active:opacity-60"
          onClick={() => setSheet('list')}
        >
          <span className="num text-title">{position}</span>
          <span className="text-small text-fumo">di</span>
          <span className="num text-title">{items.length}</span>
          <ChevronDown size={18} aria-hidden="true" className="text-fumo" />
        </button>
      </header>

      <main className="flex-1 pb-4">
        {item ? (
          <>
            <ExerciseView
              key={item.se.id}
              item={item}
              settings={settings}
              onMenu={() => setSheet('menu')}
              supersetWith={partners}
              onSetCompleted={({ exerciseDone, next }) => {
                const target = next ? items.findIndex((i) => i.se.id === next) : -1;
                if (target !== -1) goTo(target);
                else if (exerciseDone && !isLast) goTo(current + 1);
              }}
            />
            {isLast && (
              <div className="px-2">
                <button type="button" className="btn-text min-h-14" onClick={() => setSheet('add')}>
                  <Plus size={20} /> Aggiungi esercizio
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 px-4 pt-8">
            <p className="text-fumo">
              Nessun esercizio in questa sessione. Aggiungine uno per iniziare.
            </p>
            <button type="button" className="btn-secondary" onClick={() => setSheet('add')}>
              <Plus size={20} /> Aggiungi esercizio
            </button>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-arena">
        <nav className="flex items-center px-2 rule-t">
          <button
            type="button"
            className="btn-text min-h-14"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft /> Precedente
          </button>
          <span className="flex-1" />
          {isLast ? (
            <button
              type="button"
              className="my-1 inline-flex min-h-14 items-center rounded-control bg-plate-blue px-4 font-semibold text-luce transition-transform duration-120 ease-out active:scale-[0.97]"
              onClick={() => finishWorkout(session.id, navigate)}
            >
              Termina allenamento
            </button>
          ) : (
            <button type="button" className="btn-text min-h-14" onClick={() => goTo(current + 1)}>
              Successivo <ChevronRight />
            </button>
          )}
        </nav>
        <TimerBar timer={settings.activeTimer} sound={settings.timerSound} item={item} />
      </footer>

      <SessionSheet
        open={sheet === 'list'}
        onClose={close}
        items={items}
        current={current}
        onJump={(i) => {
          goTo(i);
          close();
        }}
      >
        <div className="space-y-2 px-4 pt-4">
          <button type="button" className="btn-secondary" onClick={() => setSheet('add')}>
            <Plus size={20} /> Aggiungi esercizio
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => finishWorkout(session.id, navigate)}
          >
            Termina allenamento
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => discardWorkout(session.id, navigate)}
          >
            <Trash2 size={20} /> Scarta allenamento
          </button>
        </div>
      </SessionSheet>
      <ExerciseMenu
        item={item}
        open={sheet === 'menu'}
        onClose={close}
        onReplace={() => setSheet('replace')}
        onSkip={async () => {
          if (item) await skipExercise(item.se.id);
          close();
          if (!isLast) goTo(current + 1);
        }}
        onRemove={async () => {
          if (item) await removeSessionExercise(item.se.id);
          close();
        }}
      />
      <ExercisePicker
        open={sheet === 'replace'}
        onClose={close}
        title="Sostituisci con"
        initialGroup={item?.exercise.muscleGroup}
        onPick={async (exerciseId) => {
          if (item && (await replaceExercise(item.se.id, exerciseId)) === 'inserted')
            goTo(current + 1);
        }}
      />
      <ExercisePicker
        open={sheet === 'add'}
        onClose={close}
        onPick={async (exerciseId) => {
          await addSessionExercise(session.id, exerciseId);
          goTo(items.length); // the new last exercise
        }}
      />
    </div>
  );
}
