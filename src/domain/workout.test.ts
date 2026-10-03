import { describe, expect, it } from 'vitest';
import {
  canComplete,
  firstPending,
  isStale,
  prefill,
  propagateWeight,
  restState,
  resumeIndex,
  warmupIndex,
  weightStep,
} from './workout';

describe('prefill (SPEC §8.3)', () => {
  const last = [
    { weightKg: 80, reps: 10 },
    { weightKg: 80, reps: 9 },
  ];
  it('copies set i from set i of last time and repeats the last one', () => {
    expect(prefill(last, 3)).toEqual([
      { weightKg: 80, reps: 10, durationSec: undefined },
      { weightKg: 80, reps: 9, durationSec: undefined },
      { weightKg: 80, reps: 9, durationSec: undefined },
    ]);
  });
  it('drops extra sets of last time', () => {
    expect(prefill(last, 1)).toHaveLength(1);
  });
  it('leaves values empty without history', () => {
    expect(prefill([], 2)).toEqual([{}, {}]);
  });
});

describe('propagateWeight (SPEC §6.3)', () => {
  const sets = [
    { id: 'w', index: -1, isWarmup: true, weightKg: 60 },
    { id: 'a', index: 0, isWarmup: false, weightKg: 80, completedAt: 1 },
    { id: 'b', index: 1, isWarmup: false, weightKg: 80 },
    { id: 'c', index: 2, isWarmup: false, weightKg: 80 },
    { id: 'd', index: 3, isWarmup: false, weightKg: 77.5 },
  ];
  it('returns later uncompleted work sets with the same old weight', () => {
    expect(propagateWeight(sets, 'b')).toEqual(['c']);
  });
  it('does not propagate from completed sets or warmups', () => {
    expect(propagateWeight(sets, 'a')).toEqual([]);
    expect(propagateWeight(sets, 'w')).toEqual([]);
  });
  it('treats empty weights as equal, so the first entry fills the planned sets', () => {
    const empty = [
      { id: 'x', index: 0, isWarmup: false },
      { id: 'y', index: 1, isWarmup: false },
    ];
    expect(propagateWeight(empty, 'x')).toEqual(['y']);
  });
});

describe('warmupIndex', () => {
  it('places warmups after earlier warmups and before the first work set', () => {
    expect(warmupIndex(undefined, 0)).toBe(-1);
    expect(warmupIndex(-1, 0)).toBe(-0.5);
    expect(warmupIndex(undefined, undefined)).toBe(0);
    expect(warmupIndex(2, undefined)).toBe(3);
  });
});

describe('canComplete', () => {
  it('needs weight and reps for weighted sets', () => {
    expect(canComplete({ reps: 10 }, 'weight_reps')).toBe(false);
    expect(canComplete({ weightKg: 0, reps: 10 }, 'weight_reps')).toBe(true);
  });
  it('needs only reps for bodyweight and seconds for duration', () => {
    expect(canComplete({ reps: 12 }, 'bodyweight_reps')).toBe(true);
    expect(canComplete({ durationSec: 0 }, 'duration')).toBe(false);
  });
});

describe('resuming after a forced close', () => {
  it('shows the first pending exercise, else the last one', () => {
    expect(resumeIndex(['done', 'skipped', 'pending', 'pending'])).toBe(2);
    expect(resumeIndex(['done', 'done'])).toBe(1);
    expect(resumeIndex([])).toBe(0);
  });
  it('the current set is the first one not completed', () => {
    const sets = [{ completedAt: 1 }, { completedAt: 2 }, {}, {}];
    expect(firstPending(sets)).toBe(sets[2]);
  });
  it('recomputes the timer from endAt, with overtime once it has expired', () => {
    const timer = { endAt: 100_000, durationMs: 90_000 };
    expect(restState(timer, 55_000)).toEqual({
      remainingMs: 45_000,
      overtimeMs: 0,
      finished: false,
      progress: 0.5,
    });
    expect(restState(timer, 112_000)).toMatchObject({
      finished: true,
      overtimeMs: 12_000,
      progress: 0,
    });
  });
});

describe('weightStep and isStale', () => {
  const steps = { barbell: 2.5, dumbbell: 2, machine: 5, cable: 2.5, bodyweight: 2.5, other: 2.5 };
  it('prefers the exercise increment over the equipment one', () => {
    expect(weightStep({ equipment: 'machine' }, steps)).toBe(5);
    expect(weightStep({ equipment: 'machine', weightStepKg: 2 }, steps)).toBe(2);
  });
  it('flags sessions started more than 6 hours ago', () => {
    expect(isStale(0, 6 * 3_600_000)).toBe(false);
    expect(isStale(0, 6 * 3_600_000 + 1)).toBe(true);
  });
});
