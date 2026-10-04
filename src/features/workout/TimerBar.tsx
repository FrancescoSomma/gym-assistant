import { BellOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNow } from '../../components/useNow';
import type { WorkoutItem } from '../../db/sessions';
import { clearTimer, extendTimer, startTimer } from '../../db/workout';
import { formatClock } from '../../domain/format';
import { restState } from '../../domain/workout';
import { beep } from '../../platform/sound';
import type { ActiveTimer } from '../../types';
import { syncRestPush } from './restPush';

interface Props {
  timer: ActiveTimer | null;
  sound: boolean;
  /** Exercise on screen: its rest is offered when no timer runs. */
  item: WorkoutItem | undefined;
}

const SAFE_BOTTOM = 'pb-[env(safe-area-inset-bottom)]';

/**
 * The competition clock (SPEC §7.1). Remaining time always comes from endAt, recomputed every
 * 250 ms and on visibility. The wood line on top shortens as the rest runs out; at zero the whole
 * band turns green and counts the extra time.
 */
export function TimerBar({ timer, sound, item }: Props) {
  const now = useNow(timer ? 250 : null);
  const beepedFor = useRef<number | null>(null);
  const state = timer ? restState(timer, now) : null;
  const finished = state?.finished ?? false;

  useEffect(() => {
    if (!timer || !finished || beepedFor.current === timer.endAt) return;
    beepedFor.current = timer.endAt;
    // Beep only when the end happens on screen, not when coming back from the background later.
    if (sound && Date.now() - timer.endAt < 2000 && document.visibilityState === 'visible') beep();
  }, [timer, finished, sound]);

  const stop = async () => {
    await clearTimer();
    void syncRestPush(null);
  };

  const live = (
    <p className="sr-only" aria-live="polite">
      {finished ? 'Recupero finito' : ''}
    </p>
  );

  // Every state: same root (live region first, safe-area padding outside) and an inner min-h-24 row,
  // so the lane keeps the same height with or without a home-indicator inset.
  if (!timer || !state) {
    if (!item) return <div className={SAFE_BOTTOM} />;
    return (
      <div className={`bg-tribuna ${SAFE_BOTTOM}`}>
        {live}
        <div className="flex min-h-24 items-center gap-3 px-4">
          <span className="flex flex-1 flex-col">
            <span className="label-text text-fumo">Recupero</span>
            <span className="num text-timer text-fumo">{formatClock(item.se.restSec * 1000)}</span>
          </span>
          <button
            type="button"
            className="btn-text min-h-14"
            onClick={async () => void syncRestPush(await startTimer(item.se.id))}
          >
            Avvia recupero
          </button>
        </div>
      </div>
    );
  }

  if (state.finished) {
    return (
      <div
        className={`animate-[enter-fade_240ms_var(--ease-out)_backwards] bg-plate-green text-arena ${SAFE_BOTTOM}`}
      >
        {live}
        <button
          type="button"
          onClick={stop}
          className="flex min-h-24 w-full items-center gap-3 px-4 text-left"
        >
          <span className="flex-1 text-body font-semibold">Recupero finito</span>
          <span className="num text-timer">+{formatClock(state.overtimeMs)}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-tribuna ${SAFE_BOTTOM}`} role="timer">
      {live}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-pedana transition-transform duration-250 ease-linear"
        style={{ transform: `scaleX(${state.progress})` }}
      />
      <div className="flex min-h-24 items-center gap-1 px-4">
        {/* Label above the time: "10:00" at 72px still fits a 375pt screen with both buttons. */}
        <span className="flex flex-1 flex-col">
          <span className="label-text text-fumo">Recupero</span>
          <span className="num text-timer">
            {formatClock(Math.ceil(state.remainingMs / 1000) * 1000)}
          </span>
        </span>
        {timer.pushFailed && (
          <span role="img" aria-label="Notifica non programmata" className="text-fumo">
            <BellOff size={20} />
          </span>
        )}
        <button
          type="button"
          className="btn-text min-h-14"
          onClick={async () => void syncRestPush(await extendTimer(15_000))}
        >
          +15 s
        </button>
        <button type="button" className="btn-text min-h-14" onClick={stop}>
          Salta
        </button>
      </div>
    </div>
  );
}
