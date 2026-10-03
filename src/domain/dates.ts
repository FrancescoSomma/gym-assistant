export const DAY_MS = 86_400_000;

/** Monday 00:00 local time of the week that contains ts (SPEC §8.1). */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday 00:00 of the last `count` weeks, oldest first, the current week last. */
export function lastWeekStarts(now: number, count: number): number[] {
  const current = startOfWeek(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * (count - 1 - i)); // calendar days: DST-safe
    return d.getTime();
  });
}

export interface CalendarCell {
  key: string;
  /** Day of the month; absent for the padding before day 1 and after the last day. */
  day?: number;
}

/** A month laid out in Monday-first weeks (SPEC §8.1), padded to whole weeks. */
export function monthCells(year: number, month: number): CalendarCell[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [
    ...Array.from({ length: offset }, (_, i) => ({ key: `before-${i}` })),
    ...Array.from({ length: days }, (_, i) => ({ key: `day-${i + 1}`, day: i + 1 })),
  ];
  const after = (7 - (cells.length % 7)) % 7;
  return [...cells, ...Array.from({ length: after }, (_, i) => ({ key: `after-${i}` }))];
}

export function weeklyCounts(
  startedAts: number[],
  now: number,
  weeks = 12,
): { weekStart: number; count: number }[] {
  const byWeek = Map.groupBy(startedAts, (ts) => startOfWeek(ts));
  return lastWeekStarts(now, weeks).map((weekStart) => ({
    weekStart,
    count: byWeek.get(weekStart)?.length ?? 0,
  }));
}

/** YYYY-MM-DD as local midnight; new Date('YYYY-MM-DD') would be UTC and can shift the day. */
export function dateKeyToTs(key: string): number {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}
