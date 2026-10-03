import { describe, expect, it } from 'vitest';
import { lastWeekStarts, startOfWeek, toDateKey } from './dates';

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
