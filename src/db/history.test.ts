import { describe, expect, it } from 'vitest';
import { createExercise } from './exercises';
import { listHistory } from './history';
import { addDay, addDayExercise, createProgram } from './programs';
import { getWorkout, startSession } from './sessions';
import { completeSet, finishSession, updateSet } from './workout';

/** A completed session on `day` where every bench set is weight × reps. */
async function train(day: string, weightKg: number, reps: number) {
  const sessionId = await startSession(day);
  const [bench] = (await getWorkout(sessionId))?.items ?? [];
  for (const s of bench.sets) {
    await updateSet(s.id, { weightKg, reps });
    await completeSet(s.id);
  }
  await finishSession(sessionId);
  // The next session must start at a later millisecond, or ordering by startedAt is a tie.
  await new Promise((resolve) => setTimeout(resolve, 2));
  return sessionId;
}

async function benchDay() {
  const day = await addDay(await createProgram());
  const bench = await createExercise({
    name: 'Panca',
    muscleGroup: 'chest',
    equipment: 'barbell',
    trackingType: 'weight_reps',
    notes: '',
  });
  await addDayExercise(day, bench);
  return day;
}

describe('listHistory', () => {
  it('lists completed sessions newest first with sets and volume', async () => {
    const day = await benchDay();
    const first = await train(day, 80, 10);
    const second = await train(day, 82.5, 8);
    await startSession(day); // in progress: not history

    const rows = await listHistory();
    expect(rows.map((r) => r.session.id)).toEqual([second, first]);
    expect(rows[0]).toMatchObject({ sets: 3, volume: 1980 });
    expect(rows[1]).toMatchObject({ sets: 3, volume: 2400 });
    expect(rows[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
