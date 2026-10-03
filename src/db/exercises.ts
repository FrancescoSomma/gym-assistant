import Dexie from 'dexie';
import type { Exercise, MuscleGroup, SetLog } from '../types';
import { db, uid } from './db';

export type NewExercise = Pick<
  Exercise,
  'name' | 'muscleGroup' | 'equipment' | 'trackingType' | 'notes'
> & {
  secondaryGroups?: MuscleGroup[];
};
export type ExercisePatch = Partial<
  Pick<
    Exercise,
    | 'name'
    | 'muscleGroup'
    | 'secondaryGroups'
    | 'equipment'
    | 'trackingType'
    | 'weightStepKg'
    | 'notes'
  >
>;

export interface ExerciseSession {
  sessionId: string;
  startedAt: number;
  sets: SetLog[];
}

export async function listExercises(): Promise<Exercise[]> {
  const all = await db.exercises.toArray();
  return all
    .filter((e) => e.archivedAt === undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export async function listArchivedExercises(): Promise<Exercise[]> {
  const all = await db.exercises.toArray();
  return all
    .filter((e) => e.archivedAt !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export const getExercise = (id: string): Promise<Exercise | undefined> => db.exercises.get(id);

export async function createExercise(input: NewExercise): Promise<string> {
  const id = uid();
  const now = Date.now();
  await db.exercises.add({
    ...input,
    id,
    name: input.name.trim(),
    secondaryGroups: input.secondaryGroups ?? [],
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateExercise(id: string, patch: ExercisePatch): Promise<void> {
  await db.exercises.update(id, { ...patch, updatedAt: Date.now() });
}

/** Used = referenced by a program day or by any session, also as the replaced exercise. */
export async function isExerciseInUse(id: string): Promise<boolean> {
  const counts = await Promise.all([
    db.dayExercises.where('exerciseId').equals(id).count(),
    db.sessionExercises.where('exerciseId').equals(id).count(),
    db.sessionExercises.filter((se) => se.replacedExerciseId === id).count(),
  ]);
  return counts.some((n) => n > 0);
}

/** SPEC §4.3: delete only if unused, otherwise archive so history keeps its name. */
export async function deleteOrArchiveExercise(id: string): Promise<'deleted' | 'archived'> {
  return db.transaction('rw', [db.exercises, db.dayExercises, db.sessionExercises], async () => {
    if (await isExerciseInUse(id)) {
      await db.exercises.update(id, { archivedAt: Date.now() });
      return 'archived';
    }
    await db.exercises.delete(id);
    return 'deleted';
  });
}

export async function restoreExercise(id: string): Promise<void> {
  await db.exercises.update(id, { archivedAt: undefined });
}

/** Completed sessions of one exercise, newest first, with their completed work sets. */
export async function exerciseHistory(
  exerciseId: string,
  limit = Number.POSITIVE_INFINITY,
): Promise<ExerciseSession[]> {
  // ponytail: loads every performed set of one exercise; fine for one person's history.
  // Upgrade path: walk the index with .each() and stop at `limit` sessions.
  const done = await db.setLogs
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .toArray();
  const sessionIds = [...new Set(done.map((s) => s.sessionId))]; // newest first
  const sessions = await db.sessions.bulkGet(sessionIds);
  const result: ExerciseSession[] = [];
  for (const session of sessions) {
    if (session?.status !== 'completed') continue;
    const sets = done
      .filter((s) => s.sessionId === session.id && !s.isWarmup)
      .sort((a, b) => a.index - b.index);
    if (sets.length === 0) continue;
    result.push({ sessionId: session.id, startedAt: session.startedAt, sets });
    if (result.length >= limit) break;
  }
  return result;
}
