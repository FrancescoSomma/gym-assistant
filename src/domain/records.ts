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

/** A completed work set beating the history before this session. No history means no records. */
export function isRecordSet(set: LoggedSet, tracking: TrackingType, before: Records): boolean {
  if (!isWorkSetDone(set)) return false;
  if (tracking === 'weight_reps') {
    const estimate = e1rm(set.weightKg ?? 0, set.reps ?? 0);
    const beatsE1rm = estimate !== undefined && before.e1rm !== undefined && estimate > before.e1rm;
    const beatsLoad = before.maxWeight !== undefined && (set.weightKg ?? 0) > before.maxWeight;
    return beatsE1rm || beatsLoad;
  }
  if (tracking === 'bodyweight_reps')
    return before.maxReps !== undefined && (set.reps ?? 0) > before.maxReps;
  return before.maxDuration !== undefined && (set.durationSec ?? 0) > before.maxDuration;
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
