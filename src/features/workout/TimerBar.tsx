import { BellOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNow } from '../../components/useNow';
import type { WorkoutItem } from '../../db/sessions';
import { clearTimer, extendTimer, startTimer } from '../../db/workout';
import { formatClock, formatSeconds } from '../../domain/format';
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

/** SPEC §7.1. Remaining time always comes from endAt, recomputed every 250 ms and on visibility. */
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

  if (!timer || !state) {
    if (!item) return <div className={SAFE_BOTTOM} />;
    return (
      <div className={`flex min-h-18 items-center gap-3 bg-iron px-4 ${SAFE_BOTTOM}`}>
        <span className="flex-1 text-small text-steel">
          Recupero {formatSeconds(item.se.restSec)}
        </span>
        <button
          type="button"
          className="btn-text min-h-14"
          onClick={async () => void syncRestPush(await startTimer(item.se.id))}
        >
          Avvia recupero
        </button>
      </div>
    );
  }

  if (state.finished) {
    return (
      <button
        type="button"
        onClick={stop}
        className={`flex min-h-22 w-full items-center gap-3 bg-plate-green px-4 text-left text-rubber transition-colors ${SAFE_BOTTOM}`}
      >
        <span className="flex-1 font-semibold">Recupero finito</span>
        <span className="num text-timer">+{formatClock(state.overtimeMs)}</span>
      </button>
    );
  }

  return (
    <div className={`relative bg-iron ${SAFE_BOTTOM}`} role="timer">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left bg-chalk transition-transform duration-250 ease-linear"
        style={{ transform: `scaleX(${state.progress})` }}
      />
      <div className="flex min-h-22 items-center gap-1 px-4">
        <span className="text-small text-steel">Recupero</span>
        <span className="num flex-1 pl-3 text-timer">
          {formatClock(Math.ceil(state.remainingMs / 1000) * 1000)}
        </span>
        {timer.pushFailed && (
          <span role="img" aria-label="Notifica non programmata" className="text-steel">
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
