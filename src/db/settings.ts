import type { Settings } from '../types';
import { db } from './db';

export const DEFAULT_SETTINGS: Settings = {
  activeProgramId: null,
  weeklyGoal: 3,
  defaultRestSec: 90,
  autoStartTimer: true,
  timerSound: true,
  weightSteps: { barbell: 2.5, dumbbell: 2, machine: 5, cable: 2.5, bodyweight: 2.5, other: 2.5 },
  activeTimer: null,
  pushEnabled: false,
  lastBackupAt: null,
  seedVersion: 0,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
  } as Settings;
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await db.settings.put({ key, value });
}
