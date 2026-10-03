import { describe, expect, it } from 'vitest';
import {
  countLabel,
  formatChange,
  formatClock,
  formatMegabytes,
  formatMonth,
  formatNumber,
  formatSeconds,
  formatSet,
  formatSets,
  formatSetsReps,
  formatShortDate,
  formatShortTarget,
  formatTarget,
  formatTime,
  parseInteger,
  parseWeight,
  relativeDay,
} from './format';

describe('parseWeight', () => {
  it.each([
    ['82,5', 82.5],
    ['82.5', 82.5],
    [' 80 ', 80],
    ['0', 0],
    ['1,25', 1.25],
  ])('reads %j as %d', (input, expected) => {
    expect(parseWeight(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '82,', ',5', '8,2,5', '1e3', '82 kg'])('rejects %j', (input) => {
    expect(parseWeight(input)).toBeUndefined();
  });
});

describe('parseInteger', () => {
  it('reads whole numbers only', () => {
    expect(parseInteger(' 10 ')).toBe(10);
    expect(parseInteger('8,5')).toBeUndefined();
    expect(parseInteger('')).toBeUndefined();
  });
});

describe('numbers', () => {
  it('uses the Italian format', () => {
    expect(formatNumber(82.5)).toBe('82,5');
    expect(formatNumber(80)).toBe('80');
    expect(formatNumber(12345.6)).toBe('12.345,6');
    expect(formatMegabytes(1_234_567)).toBe('1,2 MB');
  });

  it('pluralizes counts', () => {
    expect(countLabel(1, 'giornata', 'giornate')).toBe('1 giornata');
    expect(countLabel(3, 'giornata', 'giornate')).toBe('3 giornate');
  });
});

describe('durations', () => {
  it('formats rest and duration targets', () => {
    expect(formatSeconds(45)).toBe('45 s');
    expect(formatSeconds(120)).toBe('2 min');
    expect(formatSeconds(90)).toBe('1 min 30 s');
  });

  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(102_000)).toBe('1:42');
    expect(formatClock(3_723_000)).toBe('1:02:03');
  });
});

describe('sets', () => {
  it('formats one set per tracking type', () => {
    expect(formatSet({ weightKg: 77.5, reps: 8 }, 'weight_reps')).toBe('77,5×8');
    expect(formatSet({ weightKg: 0, reps: 12 }, 'bodyweight_reps')).toBe('12');
    expect(formatSet({ weightKg: 10, reps: 8 }, 'bodyweight_reps')).toBe('+10×8');
    expect(formatSet({ durationSec: 45 }, 'duration')).toBe('45 s');
  });

  it('joins sets with " / " because the comma is the decimal separator', () => {
    const sets = [
      { weightKg: 80, reps: 10 },
      { weightKg: 80, reps: 9 },
      { weightKg: 77.5, reps: 8 },
    ];
    expect(formatSets(sets, 'weight_reps')).toBe('80×10 / 80×9 / 77,5×8');
  });

  it('describes targets', () => {
    const target = { sets: 4, repMin: 8, repMax: 12, restSec: 120 };
    expect(formatTarget(target, 'weight_reps')).toBe('4 serie da 8–12, recupero 2 min');
    expect(formatTarget({ ...target, repMin: 5, repMax: 5 }, 'weight_reps')).toBe(
      '4 serie da 5, recupero 2 min',
    );
    expect(formatTarget({ ...target, targetSec: 45, restSec: 60 }, 'duration')).toBe(
      '4 serie da 45 s, recupero 1 min',
    );
    expect(formatSetsReps(target, 'weight_reps')).toBe('4 × 8–12');
    expect(formatShortTarget(target, 'weight_reps')).toBe('4 × 8–12, 2 min');
  });
});

describe('relativeDay', () => {
  const now = new Date(2026, 8, 10, 9, 0).getTime();
  it('counts calendar days, not 24-hour blocks', () => {
    expect(relativeDay(new Date(2026, 8, 10, 7, 0).getTime(), now)).toBe('oggi');
    expect(relativeDay(new Date(2026, 8, 9, 23, 59).getTime(), now)).toBe('ieri');
    expect(relativeDay(new Date(2026, 8, 6, 22, 0).getTime(), now)).toBe('4 giorni fa');
  });
  it('formats times of day', () => {
    expect(formatTime(new Date(2026, 8, 10, 18, 5).getTime())).toBe('18:05');
  });
});

describe('formatMonth', () => {
  it('names month and year', () => {
    expect(formatMonth(new Date(2026, 8, 23).getTime())).toBe('settembre 2026');
  });
});

describe('formatShortDate', () => {
  it('uses day and short month', () => {
    expect(formatShortDate(new Date(2026, 8, 23).getTime())).toBe('23 set');
  });
});

describe('formatChange', () => {
  it('shows a signed percentage', () => {
    expect(formatChange(1050, 1000)).toBe('+5%');
    expect(formatChange(880, 1000)).toBe('-12%');
    expect(formatChange(1000, 1000)).toBe('0%');
  });
  it('is undefined without a previous value', () => {
    expect(formatChange(500, 0)).toBeUndefined();
  });
});
