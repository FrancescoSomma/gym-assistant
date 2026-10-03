import { computeRecords, type Records } from '../domain/records';
import { summarize } from '../domain/stats';
import type { Exercise, Session } from '../types';
import { db } from './db';
import { exerciseHistory } from './exercises';
import { getWorkout, type Workout } from './sessions';

export interface HistoryRow {
  session: Session;
  durationMs: number;
  sets: number;
  volume: number;
}

/** SPEC §5.4: completed sessions, newest first, with duration, work sets and volume. */
export async function listHistory(): Promise<HistoryRow[]> {
  // ponytail: whole-table reads, fine for one person's years of training. If it ever lags,
  // read sessions by the startedAt index one page at a time.
  const [sessions, sessionExercises, setLogs, exercises] = await Promise.all([
    db.sessions.where('status').equals('completed').toArray(),
    db.sessionExercises.toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);
  const tracking = new Map(exercises.map((e) => [e.id, e.trackingType]));
  const setsBySessionExercise = Map.groupBy(setLogs, (s) => s.sessionExerciseId);
  const exercisesBySession = Map.groupBy(sessionExercises, (se) => se.sessionId);
  return sessions
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((session) => {
      const items = (exercisesBySession.get(session.id) ?? []).map((se) => ({
        trackingType: tracking.get(se.exerciseId) ?? 'weight_reps',
        sets: setsBySessionExercise.get(se.id) ?? [],
      }));
      return {
        session,
        durationMs: (session.endedAt ?? session.startedAt) - session.startedAt,
        ...summarize(items),
      };
    });
}

export interface SummaryContext {
  /** Last completed session of the same day before this one (SPEC §6.8). */
  previous?: Workout;
  /** Records by exercise id, from the sessions before this one. */
  recordsBefore: Map<string, Records>;
}

export async function getSummaryContext(sessionId: string): Promise<SummaryContext | undefined> {
  const workout = await getWorkout(sessionId);
  if (!workout) return undefined;
  const { session, items } = workout;
  const earlier = await db.sessions
    .where('dayId')
    .equals(session.dayId)
    .filter((s) => s.status === 'completed' && s.startedAt < session.startedAt)
    .sortBy('startedAt');
  const previousId = earlier.at(-1)?.id;

  const recordsBefore = new Map<string, Records>();
  for (const { exercise } of items) {
    if (recordsBefore.has(exercise.id)) continue;
    const before = (await exerciseHistory(exercise.id)).filter(
      (h) => h.startedAt < session.startedAt,
    );
    recordsBefore.set(
      exercise.id,
      computeRecords(
        before.map((h) => h.sets),
        exercise.trackingType,
      ),
    );
  }
  return { previous: previousId ? await getWorkout(previousId) : undefined, recordsBefore };
}

export interface TrainedExercise {
  exercise: Exercise;
  lastAt: number;
  best: Records;
}

export async function listTrainedExercises(): Promise<TrainedExercise[]> {
  const [sessions, setLogs, exercises] = await Promise.all([
    db.sessions.where('status').equals('completed').toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);
  const completed = new Map(sessions.map((s) => [s.id, s]));
  const valid = setLogs.filter(
    (s) => completed.has(s.sessionId) && s.completedAt !== undefined && !s.isWarmup,
  );
  const byExercise = Map.groupBy(valid, (s) => s.exerciseId);
  return exercises
    .flatMap((exercise) => {
      const sets = byExercise.get(exercise.id);
      if (!sets) return [];
      const lastAt = Math.max(...sets.map((s) => completed.get(s.sessionId)?.startedAt ?? 0));
      const bySession = [...Map.groupBy(sets, (s) => s.sessionId).values()];
      return [{ exercise, lastAt, best: computeRecords(bySession, exercise.trackingType) }];
    })
    .sort((a, b) => b.lastAt - a.lastAt);
}
