import { summarize } from '../domain/stats';
import type { Session } from '../types';
import { db } from './db';

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
