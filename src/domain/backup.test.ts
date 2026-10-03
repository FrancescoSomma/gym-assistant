import { describe, expect, it } from 'vitest';
import { backupFileName, backupPreview, needsBackupReminder } from './backup';

const DAY = 86_400_000;
const now = new Date(2026, 9, 2, 18).getTime();

describe('needsBackupReminder (SPEC §9)', () => {
  it('stays quiet until a workout exists', () => {
    expect(needsBackupReminder(null, undefined, now)).toBe(false);
  });
  it('asks when no backup was ever made', () => {
    expect(needsBackupReminder(null, now - DAY, now)).toBe(true);
  });
  it('asks after 7 days only if a workout was completed since', () => {
    expect(needsBackupReminder(now - 3 * DAY, now - DAY, now)).toBe(false);
    expect(needsBackupReminder(now - 8 * DAY, now - DAY, now)).toBe(true);
    expect(needsBackupReminder(now - 8 * DAY, now - 9 * DAY, now)).toBe(false);
  });
});

describe('backup files', () => {
  it('names the file with the local date', () => {
    expect(backupFileName(now)).toBe('palestra-backup-2026-10-02.json');
  });
  it('previews programs, completed sessions and the last one', () => {
    const preview = backupPreview({
      data: {
        programs: [{}, {}],
        sessions: [
          { status: 'completed', startedAt: 10 },
          { status: 'completed', startedAt: 30 },
          { status: 'in_progress', startedAt: 50 },
        ],
      },
    });
    expect(preview).toEqual({ programs: 2, sessions: 2, lastSessionAt: 30 });
  });
});
