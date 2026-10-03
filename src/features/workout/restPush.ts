import { getSettings } from '../../db/settings';
import { setTimerPushFailed } from '../../db/workout';
import { cancelRestPush, scheduleRestPush } from '../../platform/push';
import type { ActiveTimer } from '../../types';

async function sync(timer: ActiveTimer | null): Promise<void> {
  if (!(await getSettings()).pushEnabled) return;
  if (timer === null) return cancelRestPush();
  await setTimerPushFailed(timer.endAt, !(await scheduleRestPush(timer)));
}

// One request at a time, in call order: a quick "+15 s" or "Salta" never overtakes the POST before it.
let queue: Promise<void> = Promise.resolve();

/**
 * Mirrors a change of the in-app rest timer to the lock-screen notification (SPEC §7.2).
 * undefined = timer untouched, null = cancelled. Callers never await it.
 */
export function syncRestPush(timer: ActiveTimer | null | undefined): Promise<void> {
  if (timer === undefined) return Promise.resolve();
  queue = queue.then(() => sync(timer)).catch(() => {}); // a failure never blocks the next call
  return queue;
}
