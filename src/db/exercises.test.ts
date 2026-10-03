import { describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../types';
import { db } from './db';
import {
  createExercise,
  deleteOrArchiveExercise,
  exerciseHistory,
  isExerciseInUse,
  listArchivedExercises,
  listExercises,
  restoreExercise,
} from './exercises';

const bench = {
  name: 'Panca piana',
  muscleGroup: 'chest',
  equipment: 'barbell',
  trackingType: 'weight_reps',
  notes: '',
} as const;

const session = (
  id: string,
  startedAt: number,
  status: Session['status'] = 'completed',
): Session => ({
  id,
  programId: 'p',
  dayId: 'd',
  dayLabel: 'A',
  dayName: '',
  status,
  startedAt,
  notes: '',
});

const set = (sessionId: string, index: number, fields: Partial<SetLog>): SetLog => ({
  id: `${sessionId}:${index}`,
  sessionId,
  sessionExerciseId: `${sessionId}:se`,
  exerciseId: 'e1',
  index,
  isWarmup: false,
  ...fields,
});

describe('exercises', () => {
  it('lists active exercises in Italian alphabetical order', async () => {
    await createExercise({ ...bench, name: 'Squat' });
    await createExercise({ ...bench, name: 'alzate laterali' });
    const archived = await createExercise({ ...bench, name: 'Curl' });
    await db.exercises.update(archived, { archivedAt: 1 });
    expect((await listExercises()).map((e) => e.name)).toEqual(['alzate laterali', 'Squat']);
  });

  it('deletes an unused exercise', async () => {
    const id = await createExercise(bench);
    expect(await deleteOrArchiveExercise(id)).toBe('deleted');
    expect(await db.exercises.get(id)).toBeUndefined();
  });

  it('archives an exercise used in a day, keeping it in the database', async () => {
    const id = await createExercise(bench);
    await db.dayExercises.add({
      id: 'de',
      dayId: 'd',
      exerciseId: id,
      order: 0,
      sets: 3,
      repMin: 8,
      repMax: 12,
      restSec: 90,
      notes: '',
    });
    expect(await deleteOrArchiveExercise(id)).toBe('archived');
    expect((await db.exercises.get(id))?.archivedAt).toBeTypeOf('number');
    await restoreExercise(id);
    expect((await db.exercises.get(id))?.archivedAt).toBeUndefined();
  });

  it('lists archived exercises only, in Italian alphabetical order', async () => {
    const used = async (name: string) => {
      const id = await createExercise({ ...bench, name });
      await db.exercises.update(id, { archivedAt: 1 });
      return id;
    };
    await used('Zercher');
    await used('Èpaule');
    await createExercise({ ...bench, name: 'Attivo' });
    expect((await listArchivedExercises()).map((e) => e.name)).toEqual(['Èpaule', 'Zercher']);
    expect((await listExercises()).map((e) => e.name)).toEqual(['Attivo']);
  });

  it('counts an exercise replaced during a session as used', async () => {
    const id = await createExercise(bench);
    await db.sessionExercises.add({
      id: 'se',
      sessionId: 's',
      exerciseId: 'other',
      replacedExerciseId: id,
      order: 0,
      plannedSets: 3,
      repMin: 8,
      repMax: 12,
      restSec: 90,
      status: 'done',
    });
    expect(await isExerciseInUse(id)).toBe(true);
  });

  it('returns completed sessions, newest first, with completed work sets only', async () => {
    await db.sessions.bulkAdd([
      session('s1', 1000),
      session('s2', 2000),
      session('s3', 3000, 'in_progress'),
      session('s4', 2500),
    ]);
    await db.setLogs.bulkAdd([
      set('s1', -1, { isWarmup: true, weightKg: 40, reps: 10, completedAt: 1050 }),
      set('s1', 1, { weightKg: 80, reps: 9, completedAt: 1200 }),
      set('s1', 0, { weightKg: 80, reps: 10, completedAt: 1100 }),
      set('s2', 0, { weightKg: 82.5, reps: 8, completedAt: 2100 }),
      set('s2', 1, { weightKg: 82.5 }), // planned, never performed
      set('s3', 0, { weightKg: 85, reps: 5, completedAt: 3100 }), // workout still in progress
      set('s4', -1, { isWarmup: true, weightKg: 40, reps: 10, completedAt: 2600 }), // warmups only
    ]);

    const history = await exerciseHistory('e1');
    expect(history.map((h) => h.sessionId)).toEqual(['s2', 's1']);
    expect(history[1]?.sets.map((s) => s.reps)).toEqual([10, 9]);
    expect(await exerciseHistory('e1', 1)).toHaveLength(1);
  });
});
