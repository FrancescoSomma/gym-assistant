import { describe, expect, it } from 'vitest';
import { db } from './db';
import { createExercise } from './exercises';
import { addDay, addDayExercise, createProgram, updateDayExercise } from './programs';
import {
  countCompletedSince,
  getActiveSession,
  getTodayPlan,
  getWorkout,
  startSession,
} from './sessions';

async function setup() {
  const programId = await createProgram();
  const a = await addDay(programId);
  const b = await addDay(programId); // stays empty
  const bench = await createExercise({
    name: 'Panca',
    muscleGroup: 'chest',
    equipment: 'barbell',
    trackingType: 'weight_reps',
    notes: '',
  });
  const de = await addDayExercise(a, bench);
  await updateDayExercise(de, {
    sets: 3,
    repMin: 6,
    repMax: 10,
    restSec: 120,
    notes: 'Fermo al petto',
  });
  return { programId, a, b, de };
}

/** Performs every planned set and closes the session (finishSession arrives in Task 19). */
async function perform(sessionId: string, reps = [10, 9, 8]) {
  const sets = await db.setLogs.where('sessionId').equals(sessionId).sortBy('index');
  await Promise.all(
    sets.map((s, i) =>
      db.setLogs.update(s.id, { weightKg: 80, reps: reps[i], completedAt: 1000 + i }),
    ),
  );
  await db.sessions.update(sessionId, { status: 'completed', endedAt: 2000 });
  // The next session must start at a later millisecond, or ordering by startedAt is a tie.
  await new Promise((resolve) => setTimeout(resolve, 2));
}

describe('startSession', () => {
  it('snapshots the day targets and plans empty sets without history', async () => {
    const { a, de } = await setup();
    const workout = await getWorkout(await startSession(a));
    expect(workout?.session).toMatchObject({ dayLabel: 'A', status: 'in_progress' });
    const [item] = workout?.items ?? [];
    expect(item?.se).toMatchObject({
      plannedSets: 3,
      repMin: 6,
      repMax: 10,
      restSec: 120,
      status: 'pending',
      dayExerciseId: de,
    });
    expect(item?.dayNote).toBe('Fermo al petto');
    expect(item?.sets.map((s) => s.weightKg)).toEqual([undefined, undefined, undefined]);
  });

  it('prefills from the last completed session of the exercise', async () => {
    const { a } = await setup();
    await perform(await startSession(a));
    const workout = await getWorkout(await startSession(a));
    expect(workout?.items[0]?.sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 10],
      [80, 9],
      [80, 8],
    ]);
  });

  it('keeps the session snapshot when the program changes afterwards', async () => {
    const { a, de } = await setup();
    const sessionId = await startSession(a);
    await updateDayExercise(de, { sets: 5 });
    expect((await getWorkout(sessionId))?.items[0]?.se.plannedSets).toBe(3);
  });

  it('rejects a second session while one is in progress, even on a double tap', async () => {
    const { a } = await setup();
    const results = await Promise.allSettled([startSession(a), startSession(a)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.sessions.where('status').equals('in_progress').count()).toBe(1);
    expect(await getActiveSession()).toBeDefined();
  });

  it('starts an empty day', async () => {
    const { b } = await setup();
    expect((await getWorkout(await startSession(b)))?.items).toEqual([]);
  });
});

describe('getTodayPlan', () => {
  it('is null without an active program', async () => {
    expect(await getTodayPlan()).toBeNull();
  });

  it('plan has no day when the active program has no days', async () => {
    await createProgram();
    const plan = await getTodayPlan();
    expect(plan?.day).toBeUndefined();
    expect(plan?.items).toEqual([]);
  });

  it('proposes the day after the last completed one, wrapping around', async () => {
    const { a, b } = await setup();
    expect((await getTodayPlan())?.day?.id).toBe(a);
    expect((await getTodayPlan())?.items).toHaveLength(1);
    await perform(await startSession(a));
    expect((await getTodayPlan())?.day?.id).toBe(b);
    await perform(await startSession(b));
    expect((await getTodayPlan())?.day?.id).toBe(a);
  });
});

describe('countCompletedSince', () => {
  it('counts completed sessions started from the given time', async () => {
    const { a } = await setup();
    const since = Date.now();
    await perform(await startSession(a));
    await startSession(a); // in progress: not counted
    expect(await countCompletedSince(since)).toBe(1);
    expect(await countCompletedSince(Date.now() + 1000)).toBe(0);
  });
});
