import { describe, expect, it } from 'vitest';
import {
  beatenRecords,
  computeRecords,
  formatRecord,
  headlineRecord,
  isRecordSet,
  recordTable,
} from './records';

const set = (
  weightKg: number,
  reps: number,
  extra: { isWarmup?: boolean; durationSec?: number } = {},
) => ({
  weightKg,
  reps,
  isWarmup: false,
  completedAt: 1,
  ...extra,
});

describe('computeRecords (SPEC §8.5)', () => {
  it('tracks best e1RM, heaviest load and biggest session volume for weighted exercises', () => {
    const records = computeRecords(
      [
        [set(80, 10), set(80, 8)],
        [set(90, 3), set(40, 20, { isWarmup: true })],
      ],
      'weight_reps',
    );
    expect(records.e1rm).toBeCloseTo(106.67, 2);
    expect(records.maxWeight).toBe(90);
    expect(records.maxVolume).toBe(1440);
  });

  it('uses reps for bodyweight and duration for timed exercises', () => {
    expect(computeRecords([[set(0, 12), set(10, 8)]], 'bodyweight_reps')).toEqual({ maxReps: 12 });
    const holds = [[{ durationSec: 60, isWarmup: false, completedAt: 1 }]];
    expect(computeRecords(holds, 'duration')).toEqual({ maxDuration: 60 });
  });

  it('has no e1RM when every set is above 12 reps', () => {
    expect(computeRecords([[set(40, 15)]], 'weight_reps')).toEqual({
      maxWeight: 40,
      maxVolume: 600,
    });
  });
});

describe('isRecordSet', () => {
  const before = computeRecords([[set(80, 10)]], 'weight_reps');
  it('flags a set that beats the e1RM or the load of earlier sessions', () => {
    expect(isRecordSet(set(80, 11), 'weight_reps', before)).toBe(true);
    expect(isRecordSet(set(82.5, 1), 'weight_reps', before)).toBe(true);
    expect(isRecordSet(set(80, 10), 'weight_reps', before)).toBe(false);
  });
  it('ignores warmups and sets still to do', () => {
    expect(isRecordSet(set(100, 10, { isWarmup: true }), 'weight_reps', before)).toBe(false);
    expect(isRecordSet({ ...set(100, 10), completedAt: undefined }, 'weight_reps', before)).toBe(
      false,
    );
  });
  it('no history, no records', () => {
    expect(isRecordSet(set(100, 10), 'weight_reps', {})).toBe(false);
    expect(beatenRecords([set(100, 10)], 'weight_reps', {})).toEqual([]);
  });
});

describe('beatenRecords and recordTable', () => {
  it('lists the records a session improved', () => {
    const before = computeRecords([[set(80, 10)]], 'weight_reps');
    expect(beatenRecords([set(80, 10), set(80, 10)], 'weight_reps', before)).toEqual([
      { kind: 'maxVolume', value: 1600 },
    ]);
  });

  it('keeps the first session that reached each best', () => {
    const table = recordTable(
      [
        { startedAt: 200, sets: [set(90, 5)] },
        { startedAt: 100, sets: [set(80, 10)] },
        { startedAt: 300, sets: [set(90, 5)] },
      ],
      'weight_reps',
    );
    expect(table.find((r) => r.kind === 'maxWeight')).toEqual({
      kind: 'maxWeight',
      value: 90,
      startedAt: 200,
    });
    expect(table.find((r) => r.kind === 'maxVolume')?.startedAt).toBe(100);
  });

  it('formats each kind with its unit', () => {
    expect(formatRecord('e1rm', 106.666)).toBe('106,7 kg');
    expect(formatRecord('maxVolume', 12345)).toBe('12.345 kg');
    expect(formatRecord('maxReps', 15)).toBe('15 rip');
    expect(formatRecord('maxDuration', 90)).toBe('1 min 30 s');
  });
});

describe('headlineRecord', () => {
  it('prefers the e1RM, then the load, for weighted exercises', () => {
    expect(headlineRecord({ e1rm: 106, maxWeight: 90 }, 'weight_reps')).toEqual({
      kind: 'e1rm',
      value: 106,
    });
    expect(headlineRecord({ maxWeight: 40 }, 'weight_reps')).toEqual({
      kind: 'maxWeight',
      value: 40,
    });
  });
  it('uses reps or duration otherwise', () => {
    expect(headlineRecord({ maxReps: 15 }, 'bodyweight_reps')).toEqual({
      kind: 'maxReps',
      value: 15,
    });
    expect(headlineRecord({}, 'duration')).toBeUndefined();
  });
});
