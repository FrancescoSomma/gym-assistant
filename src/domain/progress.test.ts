import { describe, expect, it } from 'vitest';
import { exerciseSeries, isPlausibleBodyweight, periodStart } from './progress';

const work = (weightKg: number, reps: number) => ({
  weightKg,
  reps,
  isWarmup: false,
  completedAt: 1,
});
const session = (sessionId: string, startedAt: number, sets: ReturnType<typeof work>[]) => ({
  sessionId,
  startedAt,
  sets,
});

describe('exerciseSeries (SPEC §8.7)', () => {
  it('is oldest first, with the best e1RM, the volume and record flags', () => {
    const points = exerciseSeries(
      [
        session('c', 300, [work(85, 8)]),
        session('a', 100, [work(80, 10), work(80, 8)]),
        session('b', 200, [work(80, 9)]),
      ],
      'weight_reps',
    );
    expect(points.map((p) => p.sessionId)).toEqual(['a', 'b', 'c']);
    expect(points[0]?.value).toBeCloseTo(106.67, 2);
    expect(points[0]?.volume).toBe(1440);
    expect(points.map((p) => p.record)).toEqual([false, false, true]);
  });

  it('keeps sessions without an e1RM, with their volume and no value', () => {
    const points = exerciseSeries(
      [
        session('a', 100, [work(80, 10)]),
        session('b', 200, [work(40, 15)]),
        session('c', 300, [work(85, 8)]),
      ],
      'weight_reps',
    );
    expect(points.map((p) => p.sessionId)).toEqual(['a', 'b', 'c']);
    expect(points[1]).toMatchObject({ value: undefined, volume: 600, record: false });
    // c is compared with a: the session without a value does not reset the best.
    expect(points.map((p) => p.record)).toEqual([false, false, true]);
  });

  it('uses reps for bodyweight exercises and has no volume', () => {
    const [point] = exerciseSeries(
      [session('a', 100, [work(0, 12), work(10, 8)])],
      'bodyweight_reps',
    );
    expect(point).toMatchObject({ value: 12, volume: 0 });
  });

  it('uses the longest hold for duration exercises', () => {
    const holds = [
      { durationSec: 45, isWarmup: false, completedAt: 1 },
      { durationSec: 60, isWarmup: false, completedAt: 1 },
    ];
    expect(
      exerciseSeries([{ sessionId: 'a', startedAt: 1, sets: holds }], 'duration')[0]?.value,
    ).toBe(60);
  });
});

describe('periodStart', () => {
  const now = new Date(2026, 9, 2, 18).getTime();
  it('goes back by calendar months', () => {
    expect(periodStart('3m', now)).toBe(new Date(2026, 6, 2, 18).getTime());
    expect(periodStart('1y', now)).toBe(new Date(2025, 9, 2, 18).getTime());
  });
  it('starts at zero for the whole history', () => {
    expect(periodStart('all', now)).toBe(0);
  });
});

describe('isPlausibleBodyweight', () => {
  it('accepts 20 to 400 kg', () => {
    expect([20, 80.5, 400].map(isPlausibleBodyweight)).toEqual([true, true, true]);
  });
  it('rejects a forgotten comma, out-of-range values and empty input', () => {
    expect([805, 19.9, 400.1, 0, undefined].map(isPlausibleBodyweight)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
