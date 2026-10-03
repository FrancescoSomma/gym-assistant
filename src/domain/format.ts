import type { SetLog, TrackingType } from '../types';
import { DAY_MS } from './dates';

export type SetValues = Pick<SetLog, 'weightKg' | 'reps' | 'durationSec'>;

export interface Target {
  sets: number;
  repMin: number;
  repMax: number;
  targetSec?: number;
  restSec: number;
}

const number = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const megabytes = new Intl.NumberFormat('it-IT', {
  style: 'unit',
  unit: 'megabyte',
  maximumFractionDigits: 1,
});
const relative = new Intl.RelativeTimeFormat('it', { numeric: 'auto' });
const longDate = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const timeOfDay = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

export const formatNumber = (n: number): string => number.format(n);
export const formatMegabytes = (bytes: number): string => megabytes.format(bytes / 1_000_000);
export const formatDate = (ts: number): string => longDate.format(ts);
export const formatTime = (ts: number): string => timeOfDay.format(ts);

/** "82,5", "82.5" and " 82 " are valid; negatives, "1e3" or "82 kg" give undefined. */
export function parseWeight(input: string): number | undefined {
  const text = input.trim();
  return /^\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : undefined;
}

export function parseInteger(input: string): number | undefined {
  const text = input.trim();
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

export const countLabel = (n: number, one: string, many: string): string =>
  `${number.format(n)} ${n === 1 ? one : many}`;

export function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  return sec % 60 ? `${min} min ${sec % 60} s` : `${min} min`;
}

/** 102_000 → "1:42", 3_723_000 → "1:02:03". */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export const formatRange = (min: number, max: number): string =>
  min === max ? `${min}` : `${min}–${max}`;

export function formatSet(set: SetValues, tracking: TrackingType): string {
  if (tracking === 'duration') return formatSeconds(set.durationSec ?? 0);
  const reps = set.reps ?? 0;
  if (tracking === 'bodyweight_reps') {
    return set.weightKg ? `+${number.format(set.weightKg)}×${reps}` : `${reps}`;
  }
  return `${number.format(set.weightKg ?? 0)}×${reps}`;
}

export const formatSets = (sets: SetValues[], tracking: TrackingType): string =>
  sets.map((s) => formatSet(s, tracking)).join(' / ');

const each = (t: Target, tracking: TrackingType) =>
  tracking === 'duration' ? formatSeconds(t.targetSec ?? 0) : formatRange(t.repMin, t.repMax);

/** "4 serie da 8–12, recupero 2 min" */
export const formatTarget = (t: Target, tracking: TrackingType): string =>
  `${t.sets} serie da ${each(t, tracking)}, recupero ${formatSeconds(t.restSec)}`;

/** "4 × 8–12": sets × reps, as listed on the Today screen. */
export const formatSetsReps = (t: Target, tracking: TrackingType): string =>
  `${t.sets} × ${each(t, tracking)}`;

/** "4 × 8–12, 2 min" for the day editor rows. */
export const formatShortTarget = (t: Target, tracking: TrackingType): string =>
  `${formatSetsReps(t, tracking)}, ${formatSeconds(t.restSec)}`;

const startOfDay = (ts: number) => new Date(ts).setHours(0, 0, 0, 0);

/** "oggi", "ieri", "4 giorni fa": calendar days in local time. */
export function relativeDay(ts: number, now = Date.now()): string {
  return relative.format(-Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS), 'day');
}

const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
export const formatMonth = (ts: number): string => monthYear.format(ts);

const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
export const formatShortDate = (ts: number): string => shortDate.format(ts);
