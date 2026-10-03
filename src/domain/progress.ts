import type { TrackingType } from '../types';
import { computeRecords } from './records';
import { type LoggedSet, volume } from './stats';

export type Period = '3m' | '6m' | '1y' | 'all';

const MONTHS: Record<Exclude<Period, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

export interface SeriesPoint {
  sessionId: string;
  startedAt: number;
  /** Best e1RM, most reps or longest hold of the session; no e1RM when every set is above 12 reps. */
  value?: number;
  volume: number;
  /** The value beat every earlier one. */
  record: boolean;
}

function sessionValue(sets: LoggedSet[], tracking: TrackingType): number | undefined {
  const r = computeRecords([sets], tracking);
  if (tracking === 'weight_reps') return r.e1rm;
  return tracking === 'bodyweight_reps' ? r.maxReps : r.maxDuration;
}

/**
 * SPEC §8.7: one point per session, oldest first. A session without the metric (e.g. only sets
 * above 12 reps) keeps its volume and has no value.
 */
export function exerciseSeries(
  history: { sessionId: string; startedAt: number; sets: LoggedSet[] }[],
  tracking: TrackingType,
): SeriesPoint[] {
  let best: number | undefined;
  return [...history]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map(({ sessionId, startedAt, sets }) => {
      const value = sessionValue(sets, tracking);
      const record = value !== undefined && best !== undefined && value > best;
      if (value !== undefined) best = Math.max(best ?? value, value);
      return { sessionId, startedAt, value, volume: volume(sets, tracking), record };
    });
}

export function periodStart(period: Period, now: number): number {
  if (period === 'all') return 0;
  const d = new Date(now);
  d.setMonth(d.getMonth() - MONTHS[period]);
  return d.getTime();
}

const BODYWEIGHT_KG = { min: 20, max: 400 };

/** A body weight worth saving: catches "805" typed for "80,5". */
export const isPlausibleBodyweight = (kg: number | undefined): kg is number =>
  kg !== undefined && kg >= BODYWEIGHT_KG.min && kg <= BODYWEIGHT_KG.max;
