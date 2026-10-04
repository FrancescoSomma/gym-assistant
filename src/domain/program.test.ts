import { describe, expect, it } from 'vitest';
import { moveInList, nextDay, nextDayLabel, planTotals } from './program';

const days = [
  { id: 'c', order: 2 },
  { id: 'a', order: 0 },
  { id: 'b', order: 1 },
];

describe('nextDay (SPEC §8.4)', () => {
  it('starts from the first day without history', () => {
    expect(nextDay(days, undefined)?.id).toBe('a');
  });
  it('follows the last completed day and wraps around', () => {
    expect(nextDay(days, 'a')?.id).toBe('b');
    expect(nextDay(days, 'c')?.id).toBe('a');
  });
  it('restarts when the last day no longer exists', () => {
    expect(nextDay(days, 'deleted')?.id).toBe('a');
  });
  it('is undefined for a program without days', () => {
    expect(nextDay([], 'a')).toBeUndefined();
  });
});

describe('nextDayLabel', () => {
  it('proposes the first unused letter', () => {
    expect(nextDayLabel([])).toBe('A');
    expect(nextDayLabel(['A', 'B'])).toBe('C');
    expect(nextDayLabel(['A', 'C'])).toBe('B');
  });
});

describe('moveInList', () => {
  it('swaps with the neighbour and renumbers', () => {
    expect(moveInList(days, 'b', -1)).toEqual([
      { id: 'b', order: 0 },
      { id: 'a', order: 1 },
      { id: 'c', order: 2 },
    ]);
  });
  it('does nothing at the edges', () => {
    expect(moveInList(days, 'a', -1)).toEqual([]);
    expect(moveInList(days, 'c', 1)).toEqual([]);
  });
});

describe('planTotals', () => {
  it('counts the exercises and the planned work sets of a day', () => {
    expect(planTotals([{ de: { sets: 4 } }, { de: { sets: 3 } }])).toEqual({
      exercises: 2,
      sets: 7,
    });
    expect(planTotals([])).toEqual({ exercises: 0, sets: 0 });
  });
});
