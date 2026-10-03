import { getSettings } from '../../db/settings';
import { setTimerPushFailed } from '../../db/workout';
import { cancelRestPush, scheduleRestPush } from '../../platform/push';
import type { ActiveTimer } from '../../types';

/**
 * Mirrors a change of the in-app rest timer to the lock-screen notification (SPEC §7.2).
 * undefined = timer untouched, null = cancelled. Callers never await it.
 */
export async function syncRestPush(timer: ActiveTimer | null | undefined): Promise<void> {
  if (timer === undefined) return;
  if (!(await getSettings()).pushEnabled) return;
  if (timer === null) return cancelRestPush();
  await setTimerPushFailed(timer.endAt, !(await scheduleRestPush(timer)));
}
