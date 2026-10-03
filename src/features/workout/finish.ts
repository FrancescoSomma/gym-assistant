import type { NavigateFunction } from 'react-router';
import {
  countPendingSets,
  discardSession,
  finishSession,
  hasCompletedSets,
} from '../../db/workout';
import { confirmAction } from '../../platform/confirm';

/**
 * SPEC §6.7: confirm when sets are left, then open the summary. atLastSet ends a stale session
 * (§6.6) at its last completed set. A workout without completed sets would still count for the
 * week and the day rotation, so it is discarded instead. Returns true when the session closed.
 */
export async function finishWorkout(
  sessionId: string,
  navigate: NavigateFunction,
  { atLastSet = false } = {},
): Promise<boolean> {
  if (!(await hasCompletedSets(sessionId))) {
    if (!confirmAction("Nessuna serie completata. Scartare l'allenamento?")) return false;
    await discardSession(sessionId);
    navigate('/', { replace: true });
    return true;
  }
  const pending = await countPendingSets(sessionId);
  const left = pending === 1 ? '1 serie non completata' : `${pending} serie non completate`;
  if (pending > 0 && !confirmAction(`Hai ${left}. Termina comunque?`)) return false;
  await finishSession(sessionId, { atLastSet });
  navigate(`/workout/${sessionId}/summary`, { replace: true });
  return true;
}

export async function discardWorkout(
  sessionId: string,
  navigate: NavigateFunction,
): Promise<boolean> {
  if (
    !confirmAction("Scartare l'allenamento? Serie e note di questa sessione verranno eliminate.")
  ) {
    return false;
  }
  await discardSession(sessionId);
  navigate('/', { replace: true });
  return true;
}
