import type { SessionExercise, SetLog } from '../types';

/** Indices of the contiguous run that shares the key at `index` ([index] when it has none). */
export function supersetRun(keys: (string | undefined)[], index: number): number[] {
  const key = keys[index];
  if (key === undefined) return [index];
  let start = index;
  while (start > 0 && keys[start - 1] === key) start--;
  let end = index;
  while (end < keys.length - 1 && keys[end + 1] === key) end++;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * After a work set of member `position`: the next member of this round with work left (no rest),
 * or, at the end of the round, the first member with work left (rest). null = superset done.
 */
export function supersetNext(
  hasWork: boolean[],
  position: number,
): { next: number | null; roundEnd: boolean } {
  const later = hasWork.findIndex((left, i) => i > position && left);
  if (later !== -1) return { next: later, roundEnd: false };
  const first = hasWork.indexOf(true);
  return { next: first === -1 ? null : first, roundEnd: true };
}

/** Links or unlinks items `index` and `index + 1`; every contiguous run gets its own key. */
export function toggleSupersetLink(
  keys: (string | undefined)[],
  index: number,
  newKey: () => string,
): (string | undefined)[] {
  const links = keys.slice(0, -1).map((key, i) => key !== undefined && key === keys[i + 1]);
  links[index] = !links[index];
  const result: (string | undefined)[] = [];
  const used = new Set<string>();
  let start = 0;
  for (let i = 0; i < keys.length; i++) {
    if (i < keys.length - 1 && links[i]) continue; // the run goes on
    let key: string | undefined;
    if (i > start) {
      key =
        keys.slice(start, i + 1).find((k): k is string => k !== undefined && !used.has(k)) ??
        newKey();
      used.add(key);
    }
    for (let j = start; j <= i; j++) result.push(key);
    start = i + 1;
  }
  return result;
}

/** A member with work left in the round: pending work sets, and not skipped. */
export const hasWorkLeft = (
  status: SessionExercise['status'],
  sets: Pick<SetLog, 'isWarmup' | 'completedAt'>[],
): boolean => status !== 'skipped' && sets.some((s) => !s.isWarmup && s.completedAt === undefined);

/** Where item `index` sits in its superset, for the bracket; undefined outside supersets. */
export function supersetPosition(
  keys: (string | undefined)[],
  index: number,
): 'first' | 'middle' | 'last' | undefined {
  const run = supersetRun(keys, index);
  if (run.length < 2) return undefined;
  if (index === run[0]) return 'first';
  return index === run[run.length - 1] ? 'last' : 'middle';
}
