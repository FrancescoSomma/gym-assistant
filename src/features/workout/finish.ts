import type { NavigateFunction } from 'react-router';
import { countPendingSets, discardSession, finishSession } from '../../db/workout';
import { confirmAction } from '../../platform/confirm';

/** SPEC §6.7: confirm when sets are left, then open the summary. */
export async function finishWorkout(sessionId: string, navigate: NavigateFunction): Promise<void> {
  const pending = await countPendingSets(sessionId);
  const left = pending === 1 ? '1 serie non completata' : `${pending} serie non completate`;
  if (pending > 0 && !confirmAction(`Hai ${left}. Termina comunque?`)) return;
  await finishSession(sessionId);
  navigate(`/workout/${sessionId}/summary`, { replace: true });
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
