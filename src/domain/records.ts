import type { TrackingType } from '../types';
import { formatNumber, formatSeconds } from './format';
import { e1rm, isWorkSetDone, type LoggedSet, volume } from './stats';

export interface Records {
  e1rm?: number;
  maxWeight?: number;
  maxVolume?: number;
  maxReps?: number;
  maxDuration?: number;
}

export type RecordKind = keyof Records;

export interface RecordEntry {
  kind: RecordKind;
  value: number;
  startedAt: number;
}

export const RECORD_LABELS: Record<RecordKind, string> = {
  e1rm: 'Massimale stimato',
  maxWeight: 'Carico massimo',
  maxVolume: 'Volume in una sessione',
  maxReps: 'Ripetizioni in una serie',
  maxDuration: 'Durata massima',
};

const max = (a: number | undefined, b: number | undefined) =>
  b === undefined ? a : a === undefined ? b : Math.max(a, b);

/** SPEC §8.5, over completed work sets; each inner list is one session. */
export function computeRecords(sessions: LoggedSet[][], tracking: TrackingType): Records {
  const records: Records = {};
  for (const sets of sessions) {
    const work = sets.filter(isWorkSetDone);
    for (const s of work) {
      if (tracking === 'weight_reps') {
        records.e1rm = max(records.e1rm, e1rm(s.weightKg ?? 0, s.reps ?? 0));
        if ((s.weightKg ?? 0) > 0) records.maxWeight = max(records.maxWeight, s.weightKg);
      } else if (tracking === 'bodyweight_reps') {
        records.maxReps = max(records.maxReps, s.reps);
      } else {
        records.maxDuration = max(records.maxDuration, s.durationSec);
      }
    }
    if (tracking === 'weight_reps' && work.length > 0) {
      records.maxVolume = max(records.maxVolume, volume(sets, tracking));
    }
  }
  return records;
}

/**
 * The record a completed work set beats, against the history before this session: the e1RM
 * first, then the load. No history means no records.
 */
export function setRecord(
  set: LoggedSet,
  tracking: TrackingType,
  before: Records,
): { kind: RecordKind; value: number } | undefined {
  if (!isWorkSetDone(set)) return undefined;
  if (tracking === 'weight_reps') {
    const estimate = e1rm(set.weightKg ?? 0, set.reps ?? 0);
    if (estimate !== undefined && before.e1rm !== undefined && estimate > before.e1rm)
      return { kind: 'e1rm', value: estimate };
    const load = set.weightKg ?? 0;
    return before.maxWeight !== undefined && load > before.maxWeight
      ? { kind: 'maxWeight', value: load }
      : undefined;
  }
  if (tracking === 'bodyweight_reps') {
    const reps = set.reps ?? 0;
    return before.maxReps !== undefined && reps > before.maxReps
      ? { kind: 'maxReps', value: reps }
      : undefined;
  }
  const duration = set.durationSec ?? 0;
  return before.maxDuration !== undefined && duration > before.maxDuration
    ? { kind: 'maxDuration', value: duration }
    : undefined;
}

/**
 * What the record flash compares against: earlier sessions plus the sets already completed in this
 * one, so a set equal to one that just set a record does not flash again. No history, no records.
 */
export function flashBaseline(
  history: LoggedSet[][],
  current: LoggedSet[],
  tracking: TrackingType,
): Records {
  const earlier = computeRecords(history, tracking);
  return Object.keys(earlier).length === 0
    ? earlier
    : computeRecords([...history, current], tracking);
}

/** A completed work set beating the history before this session. No history means no records. */
export function isRecordSet(set: LoggedSet, tracking: TrackingType, before: Records): boolean {
  return setRecord(set, tracking, before) !== undefined;
}

/** Records improved by one session (summary, SPEC §6.8). */
export function beatenRecords(
  sets: LoggedSet[],
  tracking: TrackingType,
  before: Records,
): { kind: RecordKind; value: number }[] {
  const now = computeRecords([sets], tracking);
  return (Object.keys(now) as RecordKind[]).flatMap((kind) => {
    const value = now[kind];
    const previous = before[kind];
    return value !== undefined && previous !== undefined && value > previous
      ? [{ kind, value }]
      : [];
  });
}

/** Each record with the first session that reached it (exercise detail). */
export function recordTable(
  history: { startedAt: number; sets: LoggedSet[] }[],
  tracking: TrackingType,
): RecordEntry[] {
  const best = new Map<RecordKind, RecordEntry>();
  for (const { startedAt, sets } of [...history].sort((a, b) => a.startedAt - b.startedAt)) {
    const records = computeRecords([sets], tracking);
    for (const kind of Object.keys(records) as RecordKind[]) {
      const value = records[kind];
      const current = best.get(kind);
      if (value !== undefined && (!current || value > current.value))
        best.set(kind, { kind, value, startedAt });
    }
  }
  return [...best.values()];
}

export function formatRecord(kind: RecordKind, value: number): string {
  if (kind === 'maxReps') return `${value} rip`;
  if (kind === 'maxDuration') return formatSeconds(value);
  return `${formatNumber(Math.round(value * 10) / 10)} kg`;
}

/** The one number shown per exercise on the Progress list. */
export function headlineRecord(
  records: Records,
  tracking: TrackingType,
): { kind: RecordKind; value: number } | undefined {
  const order: RecordKind[] =
    tracking === 'weight_reps'
      ? ['e1rm', 'maxWeight']
      : tracking === 'bodyweight_reps'
        ? ['maxReps']
        : ['maxDuration'];
  const kind = order.find((k) => records[k] !== undefined);
  const value = kind && records[kind];
  return kind && value !== undefined ? { kind, value } : undefined;
}
