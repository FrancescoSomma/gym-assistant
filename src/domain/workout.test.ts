import { describe, expect, it } from 'vitest';
import type { SessionExercise } from '../types';
import {
  canComplete,
  firstPending,
  isStale,
  offeredWeight,
  prefill,
  propagateWeight,
  restState,
  resumeIndex,
  setLabel,
  suggestWeight,
  warmupIndex,
  weightStep,
  workSetCounter,
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
  /** An exercise whose work sets were completed at the given times (undefined = pending). */
  const ex = (
    status: SessionExercise['status'],
    completedAts: (number | undefined)[],
    supersetKey?: string,
  ) => ({
    se: { status, supersetKey },
    sets: completedAts.map((completedAt) => ({ isWarmup: false, completedAt })),
  });

  it('shows the first pending exercise, else the last one', () => {
    expect(
      resumeIndex([ex('done', [1]), ex('skipped', [undefined]), ex('pending', [undefined])]),
    ).toBe(2);
    expect(resumeIndex([ex('done', [1]), ex('done', [2])])).toBe(1);
    expect(resumeIndex([])).toBe(0);
  });
  it('after A1 the workout resumes on B, not on A2', () => {
    const items = [
      ex('pending', [1, undefined], 's'),
      ex('pending', [undefined, undefined], 's'),
      ex('pending', [undefined]),
    ];
    expect(resumeIndex(items)).toBe(1);
  });
  it('at the end of a round the workout resumes on the first member', () => {
    const items = [
      ex('pending', [1, undefined], 's'),
      ex('pending', [2, undefined], 's'),
      ex('pending', [undefined]),
    ];
    expect(resumeIndex(items)).toBe(0);
  });
  it('a finished superset goes on to the first pending exercise', () => {
    const items = [ex('done', [1, 3], 's'), ex('done', [2, 4], 's'), ex('pending', [undefined])];
    expect(resumeIndex(items)).toBe(2);
  });
  it('a warmup confirmed after A1 does not move the round', () => {
    const b = ex('pending', [undefined, undefined], 's');
    b.sets.unshift({ isWarmup: true, completedAt: 2 });
    expect(resumeIndex([ex('pending', [1, undefined], 's'), b])).toBe(1);
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

describe('setLabel', () => {
  it('numbers work sets and marks warmups with R', () => {
    const sets = [
      { id: 'w', isWarmup: true },
      { id: 'a', isWarmup: false },
      { id: 'b', isWarmup: false },
    ];
    expect(sets.map((s) => setLabel(sets, s))).toEqual(['R', '1', '2']);
  });
});

describe('suggestWeight (SPEC §8.6, double progression)', () => {
  const done = (weightKg: number, reps: number) => ({
    weightKg,
    reps,
    isWarmup: false,
    completedAt: 1,
  });
  it('adds one increment when every planned work set reached repMax', () => {
    expect(suggestWeight([done(80, 12), done(80, 12), done(80, 12)], 3, 12, 2.5)).toBe(82.5);
  });
  it('does not suggest when a set fell short of repMax', () => {
    expect(suggestWeight([done(80, 12), done(80, 11), done(80, 12)], 3, 12, 2.5)).toBeUndefined();
  });
  it('does not suggest when last time had fewer sets than planned', () => {
    expect(suggestWeight([done(80, 12), done(80, 12)], 3, 12, 2.5)).toBeUndefined();
  });
  it('does not suggest without history or without load', () => {
    expect(suggestWeight(undefined, 3, 12, 2.5)).toBeUndefined();
    expect(suggestWeight([done(0, 12)], 1, 12, 2.5)).toBeUndefined();
  });
});

describe('offeredWeight (SPEC §8.6, the chip)', () => {
  const set = (weightKg: number | undefined, completedAt?: number, isWarmup = false) => ({
    weightKg,
    completedAt,
    isWarmup,
  });
  it('offers the suggestion while a planned work set is still below it', () => {
    expect(offeredWeight(82.5, [set(80, 1), set(80)])).toBe(82.5);
    expect(offeredWeight(82.5, [set(undefined)])).toBe(82.5);
  });
  it('not once the planned work sets have it: completed sets and warmups do not count', () => {
    expect(offeredWeight(82.5, [set(80, 1), set(82.5), set(60, undefined, true)])).toBeUndefined();
  });
  it('nothing to offer without a suggestion', () => {
    expect(offeredWeight(undefined, [set(80)])).toBeUndefined();
  });
});

describe('workSetCounter (lower third "2/4")', () => {
  const s = (done: boolean, isWarmup = false) => ({ isWarmup, completedAt: done ? 1 : undefined });
  it('counts the next work set to do over the work sets, warmups aside', () => {
    expect(workSetCounter([s(true, true), s(true), s(false), s(false), s(false)])).toEqual({
      current: 2,
      total: 4,
    });
  });
  it('stays on the last set once all are done, and is undefined without work sets', () => {
    expect(workSetCounter([s(true), s(true)])).toEqual({ current: 2, total: 2 });
    expect(workSetCounter([s(false, true)])).toBeUndefined();
  });
});
