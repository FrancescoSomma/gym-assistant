import { MUSCLE_GROUPS, type MuscleGroup } from '../types';
import { lastWeekStarts, startOfWeek } from './dates';

export interface GroupEntry {
  startedAt: number;
  muscleGroup: MuscleGroup;
  secondaryGroups: MuscleGroup[];
}

/** Indicative weekly range shown on the charts (SPEC §8.2). */
export const GROUP_BAND = { min: 10, max: 20 };

/** SPEC §8.2: 1 for the main group, 0.5 for each secondary group. */
export function setsByGroup(
  entries: Pick<GroupEntry, 'muscleGroup' | 'secondaryGroups'>[],
): Record<MuscleGroup, number> {
  const totals = Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((g) => [g, 0])) as Record<
    MuscleGroup,
    number
  >;
  for (const entry of entries) {
    totals[entry.muscleGroup] += 1;
    for (const group of entry.secondaryGroups) totals[group] += 0.5;
  }
  return totals;
}

export function weeklySetsByGroup(
  entries: GroupEntry[],
  now: number,
  weeks = 12,
): { weekStart: number; totals: Record<MuscleGroup, number> }[] {
  const byWeek = Map.groupBy(entries, (e) => startOfWeek(e.startedAt));
  return lastWeekStarts(now, weeks).map((weekStart) => ({
    weekStart,
    totals: setsByGroup(byWeek.get(weekStart) ?? []),
  }));
}
