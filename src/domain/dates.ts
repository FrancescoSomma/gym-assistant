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
