import { describe, expect, it } from 'vitest';
import {
  countInMonth,
  dateKeyToTs,
  lastWeekStarts,
  monthCells,
  startOfWeek,
  toDateKey,
  weeklyCounts,
} from './dates';

describe('startOfWeek (Monday to Sunday, local time)', () => {
  it('puts Sunday night in the week that started the previous Monday', () => {
    expect(startOfWeek(new Date(2026, 9, 4, 23, 30).getTime())).toBe(
      new Date(2026, 8, 28).getTime(),
    );
  });
  it('starts a new week on Monday just after midnight', () => {
    expect(startOfWeek(new Date(2026, 9, 5, 0, 10).getTime())).toBe(new Date(2026, 9, 5).getTime());
  });
  it('is not shifted by the end of daylight saving time (25 October 2026)', () => {
    expect(startOfWeek(new Date(2026, 9, 25, 12).getTime())).toBe(new Date(2026, 9, 19).getTime());
  });
});

describe('toDateKey', () => {
  it('uses the local calendar date', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});

describe('lastWeekStarts', () => {
  it('lists Monday midnights, oldest first, across the end of daylight saving time', () => {
    expect(lastWeekStarts(new Date(2026, 9, 28, 12).getTime(), 2)).toEqual([
      new Date(2026, 9, 19).getTime(),
      new Date(2026, 9, 26).getTime(),
    ]);
  });
});

describe('monthCells', () => {
  it('lays October 2026 out from Monday, padded to whole weeks', () => {
    const cells = monthCells(2026, 9); // 1 October 2026 is a Thursday
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 4).map((c) => c.day)).toEqual([undefined, undefined, undefined, 1]);
    expect(cells[33]?.day).toBe(31);
    expect(cells[34]?.day).toBeUndefined();
    expect(new Set(cells.map((c) => c.key)).size).toBe(35);
  });
});

describe('weeklyCounts', () => {
  it('counts workouts per week over the last weeks', () => {
    const now = new Date(2026, 9, 2, 18).getTime();
    const counts = weeklyCounts([now, now - 3_600_000, now - 7 * 86_400_000], now, 3);
    expect(counts.map((c) => c.count)).toEqual([0, 1, 2]);
  });
});

describe('dateKeyToTs', () => {
  it('reads YYYY-MM-DD as local midnight, so the day never shifts', () => {
    expect(dateKeyToTs('2026-10-25')).toBe(new Date(2026, 9, 25).getTime());
    expect(toDateKey(dateKeyToTs('2026-03-29'))).toBe('2026-03-29');
  });
});

describe('countInMonth', () => {
  it('counts only the timestamps of that local calendar month', () => {
    const sept = new Date(2026, 8, 1).getTime();
    const oct = new Date(2026, 9, 1).getTime();
    expect(countInMonth([sept - 1, sept, oct - 1, oct], 2026, 8)).toBe(2);
  });
  it('December ends at the first of January', () => {
    const jan = new Date(2027, 0, 1).getTime();
    expect(countInMonth([jan - 1, jan], 2026, 11)).toBe(1);
  });
});
