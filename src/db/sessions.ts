import { nextDay } from '../domain/program';
import { prefill } from '../domain/workout';
import type { Day, Exercise, Program, Session, SessionExercise, SetLog } from '../types';
import { db, uid } from './db';
import { exerciseHistory } from './exercises';
import { type DayItem, listDayItems, listDays } from './programs';
import { getSettings } from './settings';

export interface TodayPlan {
  program: Program;
  /** Undefined when the program has no days yet. */
  day: Day | undefined;
  days: Day[];
  items: DayItem[];
}

export interface WorkoutItem {
  se: SessionExercise;
  exercise: Exercise;
  /** Live from the program day: notes are guidance, not history. */
  dayNote: string;
  sets: SetLog[];
}

export interface Workout {
  session: Session;
  items: WorkoutItem[];
}

export const getActiveSession = (): Promise<Session | undefined> =>
  db.sessions.where('status').equals('in_progress').first();

export async function getTodayPlan(): Promise<TodayPlan | null> {
  const { activeProgramId } = await getSettings();
  const program = activeProgramId ? await db.programs.get(activeProgramId) : undefined;
  if (!program) return null;
  const days = await listDays(program.id);
  const completed = await db.sessions
    .where('programId')
    .equals(program.id)
    .filter((s) => s.status === 'completed')
    .sortBy('startedAt');
  const day = nextDay(days, completed.at(-1)?.dayId);
  return { program, day, days, items: day ? await listDayItems(day.id) : [] };
}

export const countCompletedSince = (ts: number): Promise<number> =>
  db.sessions
    .where('startedAt')
    .aboveOrEqual(ts)
    .filter((s) => s.status === 'completed')
    .count();

/** Planned sets prefilled from the last completed session of the exercise (SPEC §8.3). */
export async function insertPlannedSets(
  se: Pick<SessionExercise, 'id' | 'sessionId' | 'exerciseId' | 'plannedSets'>,
): Promise<void> {
  const [last] = await exerciseHistory(se.exerciseId, 1);
  const values = prefill(last?.sets ?? [], se.plannedSets);
  await db.setLogs.bulkAdd(
    values.map((v, index) => ({
      ...v,
      id: uid(),
      sessionId: se.sessionId,
      sessionExerciseId: se.id,
      exerciseId: se.exerciseId,
      index,
      isWarmup: false,
    })),
  );
}

export async function insertSessionExercise(
  fields: Omit<SessionExercise, 'id' | 'status'>,
): Promise<string> {
  const id = uid();
  await db.sessionExercises.add({ ...fields, id, status: 'pending' });
  await insertPlannedSets({ ...fields, id });
  return id;
}

/** SPEC §6.1: one transaction; at most one session in progress (SPEC §4.3). */
export async function startSession(dayId: string): Promise<string> {
  return db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.setLogs, db.days, db.dayExercises],
    async () => {
      if (await getActiveSession()) throw new Error('A workout is already in progress');
      const day = await db.days.get(dayId);
      if (!day) throw new Error(`Day ${dayId} not found`);
      const sessionId = uid();
      await db.sessions.add({
        id: sessionId,
        programId: day.programId,
        dayId,
        dayLabel: day.label,
        dayName: day.name,
        status: 'in_progress',
        startedAt: Date.now(),
        notes: '',
      });
      const planned = await db.dayExercises.where('dayId').equals(dayId).sortBy('order');
      for (const [order, de] of planned.entries()) {
        await insertSessionExercise({
          sessionId,
          exerciseId: de.exerciseId,
          order,
          plannedSets: de.sets,
          repMin: de.repMin,
          repMax: de.repMax,
          targetSec: de.targetSec,
          restSec: de.restSec,
          dayExerciseId: de.id,
          supersetKey: de.supersetKey,
        });
      }
      return sessionId;
    },
  );
}

export async function getWorkout(sessionId: string): Promise<Workout | undefined> {
  const session = await db.sessions.get(sessionId);
  if (!session) return undefined;
  const ses = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order');
  const [exercises, dayExercises, sets] = await Promise.all([
    db.exercises.bulkGet(ses.map((se) => se.exerciseId)),
    db.dayExercises.bulkGet(ses.map((se) => se.dayExerciseId ?? '')),
    db.setLogs.where('sessionId').equals(sessionId).sortBy('index'),
  ]);
  const items = ses.flatMap((se, i) => {
    const exercise = exercises[i];
    if (!exercise) return [];
    const own = sets.filter((s) => s.sessionExerciseId === se.id);
    return [{ se, exercise, dayNote: dayExercises[i]?.notes ?? '', sets: own }];
  });
  return { session, items };
}

export const lastCompletedSession = (): Promise<Session | undefined> =>
  db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.status === 'completed')
    .first();
