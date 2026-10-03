import { describe, expect, it } from 'vitest';
import { firstPending, resumeIndex } from '../domain/workout';
import { db } from './db';
import { createExercise } from './exercises';
import { addDay, addDayExercise, createProgram, updateDayExercise } from './programs';
import { getWorkout, startSession, type WorkoutItem } from './sessions';
import { getSettings, setSetting } from './settings';
import {
  addSet,
  clearTimer,
  completeSet,
  deleteSet,
  extendTimer,
  startTimer,
  updateSet,
} from './workout';

async function setup() {
  const day = await addDay(await createProgram());
  const bench = await createExercise({
    name: 'Panca',
    muscleGroup: 'chest',
    equipment: 'barbell',
    trackingType: 'weight_reps',
    notes: '',
  });
  const pullup = await createExercise({
    name: 'Trazioni',
    muscleGroup: 'back',
    equipment: 'bodyweight',
    trackingType: 'bodyweight_reps',
    notes: '',
  });
  await updateDayExercise(await addDayExercise(day, bench), { restSec: 120 });
  await addDayExercise(day, pullup);
  return startSession(day);
}

const items = async (sessionId: string): Promise<WorkoutItem[]> =>
  (await getWorkout(sessionId))?.items ?? [];

/** Fills weight and reps of every planned bench set. */
async function fillBench(sessionId: string) {
  const [bench] = await items(sessionId);
  for (const s of bench.sets) await db.setLogs.update(s.id, { weightKg: 80, reps: 10 });
  return bench;
}

describe('completeSet', () => {
  it('marks the set and starts the rest timer of the exercise', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    const before = Date.now();
    const { exerciseDone, timer } = await completeSet(bench.sets[0].id);
    expect(exerciseDone).toBe(false);
    expect(timer).toMatchObject({ label: 'Panca, serie 1 di 3', durationMs: 120_000 });
    expect(timer?.endAt).toBeGreaterThanOrEqual(before + 120_000);
    expect((await db.setLogs.get(bench.sets[0].id))?.completedAt).toBeTypeOf('number');
    expect((await getSettings()).activeTimer).toEqual(timer);
  });

  it('marks the exercise done after its last set', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    for (const s of bench.sets.slice(0, 2)) await completeSet(s.id);
    expect((await completeSet(bench.sets[2].id)).exerciseDone).toBe(true);
    expect((await items(sessionId))[0].se.status).toBe('done');
  });

  it('leaves the timer alone for warmups', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await completeSet(bench.sets[0].id);
    const running = (await getSettings()).activeTimer;
    await addSet(bench.se.id, true);
    const warmup = (await items(sessionId))[0].sets.find((s) => s.isWarmup);
    await updateSet(warmup?.id ?? '', { weightKg: 40, reps: 10 });
    expect((await completeSet(warmup?.id ?? '')).timer).toBeUndefined();
    expect((await getSettings()).activeTimer).toEqual(running);
  });

  it('clears the running timer when automatic start is off', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await completeSet(bench.sets[0].id);
    await setSetting('autoStartTimer', false);
    expect((await completeSet(bench.sets[1].id)).timer).toBeNull();
    expect((await getSettings()).activeTimer).toBeNull();
  });

  it('records 0 kg for a bodyweight set without added load', async () => {
    const sessionId = await setup();
    const [, pullup] = await items(sessionId);
    await updateSet(pullup.sets[0].id, { reps: 12 });
    await completeSet(pullup.sets[0].id);
    expect((await db.setLogs.get(pullup.sets[0].id))?.weightKg).toBe(0);
  });

  it('timer survives a reload: everything is read back from IndexedDB', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    const { timer } = await completeSet(bench.sets[0].id);
    await completeSet(bench.sets[1].id);
    // A forced close loses React state only; the next start reads the same rows.
    const reopened = await items(sessionId);
    expect(resumeIndex(reopened.map((i) => i.se.status))).toBe(0);
    expect(firstPending(reopened[0].sets)?.id).toBe(bench.sets[2].id);
    expect((await getSettings()).activeTimer?.sessionExerciseId).toBe(timer?.sessionExerciseId);
  });
});

describe('updateSet', () => {
  it('propagates a new weight to later planned sets with the same old weight', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await completeSet(bench.sets[0].id);
    await updateSet(bench.sets[1].id, { weightKg: 82.5 });
    const weights = (await items(sessionId))[0].sets.map((s) => s.weightKg);
    expect(weights).toEqual([80, 82.5, 82.5]);
  });

  it('changes only the set itself for reps', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await updateSet(bench.sets[0].id, { reps: 8 });
    expect((await items(sessionId))[0].sets.map((s) => s.reps)).toEqual([8, 10, 10]);
  });
});

describe('addSet and deleteSet', () => {
  it('copies the last work set and reopens a finished exercise', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    for (const s of bench.sets) await completeSet(s.id);
    await addSet(bench.se.id, false);
    const [after] = await items(sessionId);
    expect(after.sets).toHaveLength(4);
    expect(after.sets[3]).toMatchObject({ weightKg: 80, reps: 10 });
    expect(after.sets[3].completedAt).toBeUndefined();
    expect(after.se.status).toBe('pending');
  });

  it('puts warmups after earlier warmups and before the work sets', async () => {
    const sessionId = await setup();
    const [bench] = await items(sessionId);
    await addSet(bench.se.id, true);
    await addSet(bench.se.id, true);
    const kinds = (await items(sessionId))[0].sets.map((s) => (s.isWarmup ? 'R' : 'W'));
    expect(kinds).toEqual(['R', 'R', 'W', 'W', 'W']);
  });

  it('re-evaluates the exercise status after deleting a set', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await completeSet(bench.sets[0].id);
    await completeSet(bench.sets[1].id);
    await deleteSet(bench.sets[2].id);
    expect((await items(sessionId))[0].se.status).toBe('done');
  });
});

describe('timer actions', () => {
  it('extends, clears and starts the rest by hand', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    const { timer } = await completeSet(bench.sets[0].id);
    const longer = await extendTimer(15_000);
    expect(longer?.endAt).toBe((timer?.endAt ?? 0) + 15_000);
    expect(longer?.durationMs).toBe(135_000);
    await clearTimer();
    expect(await extendTimer(15_000)).toBeNull();
    expect((await startTimer(bench.se.id))?.label).toBe('Panca, serie 1 di 3');
  });
});
