import { describe, expect, it } from 'vitest';
import { bestSet, e1rm, summarize, volume } from './stats';

const work = (weightKg: number, reps: number, done = true) => ({
  weightKg,
  reps,
  isWarmup: false,
  completedAt: done ? 1 : undefined,
});

describe('e1rm', () => {
  it('uses Epley between 2 and 12 reps', () => {
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2);
  });
  it('is the weight itself for a single', () => {
    expect(e1rm(100, 1)).toBe(100);
  });
  it('is not computed above 12 reps or without load', () => {
    expect(e1rm(60, 13)).toBeUndefined();
    expect(e1rm(0, 5)).toBeUndefined();
  });
});

describe('volume', () => {
  const sets = [work(80, 10), { ...work(40, 10), isWarmup: true }, work(80, 8, false)];
  it('sums completed work sets only', () => {
    expect(volume(sets, 'weight_reps')).toBe(800);
  });
  it('is zero for bodyweight and duration exercises', () => {
    expect(volume(sets, 'bodyweight_reps')).toBe(0);
    expect(volume(sets, 'duration')).toBe(0);
  });
});

describe('bestSet', () => {
  it('picks the highest e1RM among completed work sets', () => {
    const sets = [
      work(80, 10),
      work(85, 6),
      { ...work(120, 5), isWarmup: true },
      work(90, 8, false),
    ];
    expect(bestSet(sets, 'weight_reps')).toEqual(work(80, 10));
  });
  it('picks the most reps for bodyweight and the longest for duration', () => {
    expect(bestSet([work(0, 12), work(0, 15)], 'bodyweight_reps')?.reps).toBe(15);
    const holds = [
      { durationSec: 45, isWarmup: false, completedAt: 1 },
      { durationSec: 60, isWarmup: false, completedAt: 1 },
    ];
    expect(bestSet(holds, 'duration')?.durationSec).toBe(60);
  });
  it('is undefined without completed work sets', () => {
    expect(bestSet([work(80, 10, false)], 'weight_reps')).toBeUndefined();
  });
});

describe('summarize', () => {
  it('counts completed work sets and sums volume of weighted exercises', () => {
    const result = summarize([
      { trackingType: 'weight_reps', sets: [work(80, 10), work(80, 8)] },
      { trackingType: 'bodyweight_reps', sets: [work(0, 12)] },
    ]);
    expect(result).toEqual({ sets: 3, volume: 1440 });
  });
});
