/** SPEC §5.2 defaults; targetSec (duration exercises) is not in the spec. */
export const DEFAULT_TARGET = { sets: 3, repMin: 8, repMax: 12, targetSec: 30 };

/** SPEC §8.4: the day after the last completed one, wrapping; the first one otherwise. */
export function nextDay<T extends { id: string; order: number }>(
  days: T[],
  lastDayId: string | undefined,
): T | undefined {
  const sorted = [...days].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((d) => d.id === lastDayId);
  return sorted[i === -1 ? 0 : (i + 1) % sorted.length];
}

export function nextDayLabel(used: string[]): string {
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode(65 + i);
    if (!used.includes(label)) return label;
  }
  return String(used.length + 1);
}

/** New order for every item after moving one up (-1) or down (1); empty at the edges. */
export function moveInList<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  dir: -1 | 1,
): { id: string; order: number }[] {
  const list = [...items].sort((a, b) => a.order - b.order);
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((x, order) => ({ id: x.id, order }));
}

/** "6 esercizi, 22 serie": the size of a day, under its start list on Today. */
export function planTotals(items: { de: { sets: number } }[]): { exercises: number; sets: number } {
  return { exercises: items.length, sets: items.reduce((n, item) => n + item.de.sets, 0) };
}
