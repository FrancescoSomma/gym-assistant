import type { TrackingType } from '../types';
import { computeRecords } from './records';
import { type LoggedSet, volume } from './stats';

export type Period = '3m' | '6m' | '1y' | 'all';

const MONTHS: Record<Exclude<Period, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

export interface SeriesPoint {
  sessionId: string;
  startedAt: number;
  /** Best e1RM, most reps or longest hold of the session, by tracking type. */
  value: number;
  volume: number;
  /** The session beat every earlier one. */
  record: boolean;
}

function sessionValue(sets: LoggedSet[], tracking: TrackingType): number | undefined {
  const r = computeRecords([sets], tracking);
  if (tracking === 'weight_reps') return r.e1rm;
  return tracking === 'bodyweight_reps' ? r.maxReps : r.maxDuration;
}

/** SPEC §8.7: oldest first; sessions without the metric (e.g. only sets above 12 reps) are skipped. */
export function exerciseSeries(
  history: { sessionId: string; startedAt: number; sets: LoggedSet[] }[],
  tracking: TrackingType,
): SeriesPoint[] {
  let best: number | undefined;
  return [...history]
    .sort((a, b) => a.startedAt - b.startedAt)
    .flatMap(({ sessionId, startedAt, sets }) => {
      const value = sessionValue(sets, tracking);
      if (value === undefined) return [];
      const record = best !== undefined && value > best;
      best = Math.max(best ?? value, value);
      return [{ sessionId, startedAt, value, volume: volume(sets, tracking), record }];
    });
}

export function periodStart(period: Period, now: number): number {
  if (period === 'all') return 0;
  const d = new Date(now);
  d.setMonth(d.getMonth() - MONTHS[period]);
  return d.getTime();
}
