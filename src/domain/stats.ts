import type { SetLog, TrackingType } from '../types';
import type { SetValues } from './format';

export type LoggedSet = SetValues & Pick<SetLog, 'isWarmup' | 'completedAt'>;

/** Epley (SPEC §8.2): a single is the weight itself; not computed above 12 reps. */
export function e1rm(weightKg: number, reps: number): number | undefined {
  if (weightKg <= 0 || reps < 1 || reps > 12) return undefined;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export const isWorkSetDone = (s: LoggedSet): boolean => s.completedAt !== undefined && !s.isWarmup;

/** Tonnage of completed work sets; bodyweight and duration exercises have none. */
export function volume(sets: LoggedSet[], tracking: TrackingType): number {
  if (tracking !== 'weight_reps') return 0;
  return sets.filter(isWorkSetDone).reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
}

function score(s: LoggedSet, tracking: TrackingType): [number, number] {
  if (tracking === 'duration') return [s.durationSec ?? 0, 0];
  if (tracking === 'bodyweight_reps') return [s.reps ?? 0, s.weightKg ?? 0];
  const weight = s.weightKg ?? 0;
  return [e1rm(weight, s.reps ?? 0) ?? weight, s.reps ?? 0];
}

/** Highest e1RM (weighted), most reps (bodyweight), longest hold (duration). */
export function bestSet<T extends LoggedSet>(sets: T[], tracking: TrackingType): T | undefined {
  let best: T | undefined;
  for (const s of sets.filter(isWorkSetDone)) {
    if (!best) {
      best = s;
      continue;
    }
    const [a1, a2] = score(s, tracking);
    const [b1, b2] = score(best, tracking);
    if (a1 > b1 || (a1 === b1 && a2 > b2)) best = s;
  }
  return best;
}

export function summarize(exercises: { trackingType: TrackingType; sets: LoggedSet[] }[]): {
  sets: number;
  volume: number;
} {
  return {
    sets: exercises.reduce((n, e) => n + e.sets.filter(isWorkSetDone).length, 0),
    volume: exercises.reduce((v, e) => v + volume(e.sets, e.trackingType), 0),
  };
}
