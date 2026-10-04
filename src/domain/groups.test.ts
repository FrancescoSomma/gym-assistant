import { describe, expect, it } from 'vitest';
import { startOfWeek } from './dates';
import { inGroupBand, setsByGroup, weeklySetsByGroup } from './groups';

const bench = { muscleGroup: 'chest', secondaryGroups: ['triceps', 'shoulders'] } as const;
const squat = { muscleGroup: 'legs', secondaryGroups: [] } as const;

describe('setsByGroup (SPEC §8.2)', () => {
  it('counts 1 for the main group and 0.5 for each secondary group', () => {
    const totals = setsByGroup(
      [bench, bench, bench, squat, squat].map((e) => ({
        ...e,
        secondaryGroups: [...e.secondaryGroups],
      })),
    );
    expect(totals).toEqual({
      chest: 3,
      triceps: 1.5,
      shoulders: 1.5,
      legs: 2,
      back: 0,
      biceps: 0,
      abs: 0,
    });
  });
});

describe('weeklySetsByGroup', () => {
  it('returns the last 12 weeks, oldest first, and ignores older sets', () => {
    const now = new Date(2026, 9, 2, 18).getTime();
    const lastWeek = now - 7 * 86_400_000;
    const longAgo = now - 13 * 7 * 86_400_000;
    const entry = (startedAt: number) => ({
      startedAt,
      muscleGroup: 'back' as const,
      secondaryGroups: [],
    });
    const weeks = weeklySetsByGroup([entry(now), entry(now), entry(lastWeek), entry(longAgo)], now);
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)?.weekStart).toBe(startOfWeek(now));
    expect(weeks.at(-1)?.totals.back).toBe(2);
    expect(weeks.at(-2)?.totals.back).toBe(1);
    expect(weeks.reduce((sum, w) => sum + w.totals.back, 0)).toBe(3);
  });
});

describe('inGroupBand', () => {
  it('includes both ends of the indicative 10–20 band', () => {
    expect(inGroupBand(10)).toBe(true);
    expect(inGroupBand(20)).toBe(true);
    expect(inGroupBand(9.5)).toBe(false);
    expect(inGroupBand(20.5)).toBe(false);
  });
});
