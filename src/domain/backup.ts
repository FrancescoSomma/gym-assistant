import { DAY_MS, toDateKey } from './dates';

const REMINDER_AFTER_MS = 7 * DAY_MS;

/** SPEC §9: never backed up, or more than 7 days ago, and a workout completed since then. */
export function needsBackupReminder(
  lastBackupAt: number | null,
  lastWorkoutAt: number | undefined,
  now: number,
): boolean {
  if (lastWorkoutAt === undefined) return false;
  if (lastBackupAt === null) return true;
  return now - lastBackupAt > REMINDER_AFTER_MS && lastWorkoutAt > lastBackupAt;
}

export const backupFileName = (now: number): string => `palestra-backup-${toDateKey(now)}.json`;

export function backupPreview(backup: {
  data: { programs: unknown[]; sessions: { status: string; startedAt: number }[] };
}): { programs: number; sessions: number; lastSessionAt?: number } {
  const completed = backup.data.sessions.filter((s) => s.status === 'completed');
  return {
    programs: backup.data.programs.length,
    sessions: completed.length,
    lastSessionAt: completed.length ? Math.max(...completed.map((s) => s.startedAt)) : undefined,
  };
}
