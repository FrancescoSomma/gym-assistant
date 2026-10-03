import type {
  ActiveTimer,
  Equipment,
  Exercise,
  SessionExercise,
  SetLog,
  TrackingType,
} from '../types';
import type { SetValues } from './format';
import { isWorkSetDone, type LoggedSet } from './stats';
import { hasWorkLeft, supersetNext, supersetRun } from './superset';

export const STALE_SESSION_MS = 6 * 3_600_000;

/** SPEC §8.3: planned set i gets set i of last time; with fewer sets last time, repeat the last. */
export function prefill(last: SetValues[], count: number): SetValues[] {
  return Array.from({ length: count }, (_, i) => {
    const s = last[Math.min(i, last.length - 1)];
    return s ? { weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec } : {};
  });
}

type PlannedSet = Pick<SetLog, 'id' | 'index' | 'isWarmup' | 'weightKg' | 'completedAt'>;

/** SPEC §6.3: ids of later uncompleted work sets that still have the changed set's old weight. */
export function propagateWeight(sets: PlannedSet[], changedId: string): string[] {
  const changed = sets.find((s) => s.id === changedId);
  if (!changed || changed.isWarmup || changed.completedAt !== undefined) return [];
  return sets
    .filter(
      (s) =>
        s.index > changed.index &&
        !s.isWarmup &&
        s.completedAt === undefined &&
        s.weightKg === changed.weightKg,
    )
    .map((s) => s.id);
}

/** Warmups go after the existing warmups and before the first work set. */
export function warmupIndex(lastWarmup: number | undefined, firstWork: number | undefined): number {
  if (lastWarmup === undefined) return firstWork === undefined ? 0 : firstWork - 1;
  return firstWork === undefined ? lastWarmup + 1 : (lastWarmup + firstWork) / 2;
}

export function canComplete(set: SetValues, tracking: TrackingType): boolean {
  if (tracking === 'duration') return (set.durationSec ?? 0) > 0;
  if (tracking === 'bodyweight_reps') return (set.reps ?? 0) > 0;
  return set.weightKg !== undefined && (set.reps ?? 0) > 0;
}

export const firstPending = <T extends Pick<SetLog, 'completedAt'>>(sets: T[]): T | undefined =>
  sets.find((s) => s.completedAt === undefined);

interface ResumeItem {
  se: Pick<SessionExercise, 'status' | 'supersetKey'>;
  sets: Pick<SetLog, 'isWarmup' | 'completedAt'>[];
}

/**
 * Exercise to show when (re)opening a workout. Inside a superset it is where the last confirmed
 * work set led (as completeSet decided); otherwise the first still pending, else the last.
 */
export function resumeIndex(items: ResumeItem[]): number {
  let last = -1;
  let lastAt = -Infinity;
  items.forEach((item, i) => {
    for (const s of item.sets) {
      // >= : on a tie the later member wins, as it was confirmed after the earlier one.
      if (!s.isWarmup && s.completedAt !== undefined && s.completedAt >= lastAt) {
        last = i;
        lastAt = s.completedAt;
      }
    }
  });
  const keys = items.map((item) => item.se.supersetKey);
  const run = last === -1 ? [] : supersetRun(keys, last);
  if (run.length >= 2) {
    const hasWork = run.map((i) => hasWorkLeft(items[i].se.status, items[i].sets));
    const { next } = supersetNext(hasWork, run.indexOf(last));
    if (next !== null) return run[next];
  }
  const i = items.findIndex((item) => item.se.status === 'pending');
  return i === -1 ? Math.max(0, items.length - 1) : i;
}

export const weightStep = (
  exercise: Pick<Exercise, 'weightStepKg' | 'equipment'>,
  steps: Record<Equipment, number>,
): number => exercise.weightStepKg ?? steps[exercise.equipment];

/** SPEC §7.1: always derived from endAt, never from a decremented counter. */
export function restState(timer: Pick<ActiveTimer, 'endAt' | 'durationMs'>, now: number) {
  const remainingMs = Math.max(0, timer.endAt - now);
  return {
    remainingMs,
    overtimeMs: Math.max(0, now - timer.endAt),
    finished: remainingMs === 0,
    progress: timer.durationMs > 0 ? Math.min(1, remainingMs / timer.durationMs) : 0,
  };
}

export const isStale = (startedAt: number, now: number): boolean =>
  now - startedAt > STALE_SESSION_MS;

/** "R" for warmups, 1-based position among work sets otherwise. */
export function setLabel(
  sets: Pick<SetLog, 'id' | 'isWarmup'>[],
  set: Pick<SetLog, 'id' | 'isWarmup'>,
): string {
  if (set.isWarmup) return 'R';
  return String(sets.filter((s) => !s.isWarmup).findIndex((s) => s.id === set.id) + 1);
}

/**
 * SPEC §8.6: if every planned work set of last time reached repMax, suggest one increment more
 * than the heaviest of them. Never applied automatically.
 */
export function suggestWeight(
  last: LoggedSet[] | undefined,
  plannedSets: number,
  repMax: number,
  stepKg: number,
): number | undefined {
  const work = (last ?? []).filter(isWorkSetDone).slice(0, plannedSets);
  if (work.length < plannedSets || !work.every((s) => (s.reps ?? 0) >= repMax)) return undefined;
  const top = Math.max(...work.map((s) => s.weightKg ?? 0));
  return top > 0 ? Math.round((top + stepKg) * 100) / 100 : undefined;
}

/** SPEC §8.6 chip: the suggestion is offered while some planned work set is still below it. */
export function offeredWeight(
  suggestion: number | undefined,
  sets: Pick<SetLog, 'isWarmup' | 'completedAt' | 'weightKg'>[],
): number | undefined {
  if (suggestion === undefined) return undefined;
  const below = sets.some(
    (s) => !s.isWarmup && s.completedAt === undefined && (s.weightKg ?? 0) < suggestion,
  );
  return below ? suggestion : undefined;
}

/** "2/4" on the workout lower third: the next work set to do (the last when all are done). */
export function workSetCounter(
  sets: Pick<SetLog, 'isWarmup' | 'completedAt'>[],
): { current: number; total: number } | undefined {
  const work = sets.filter((s) => !s.isWarmup);
  if (work.length === 0) return undefined;
  const next = work.findIndex((s) => s.completedAt === undefined);
  return { current: next === -1 ? work.length : next + 1, total: work.length };
}
