import { describe, expect, it } from 'vitest';
import { db } from './db';
import { DEMO_IDS, demoExerciseId, seedDemo } from './demo';
import { listHistory } from './history';
import { getActiveSession, getTodayPlan, getWorkout } from './sessions';
import { getSettings } from './settings';

describe('seedDemo (development screenshots)', () => {
  it('builds eight weeks of history that ends with demo-done, with day A next', async () => {
    await seedDemo('');
    const history = await listHistory();
    expect(history).toHaveLength(24);
    expect(history[0]?.session.id).toBe(DEMO_IDS.lastSession);
    expect(await getActiveSession()).toBeUndefined();
    expect((await getTodayPlan())?.day?.label).toBe('A');
    expect((await getSettings()).activeTimer).toBeNull();
  });

  it('opens day A with set 2 of 4 to do and the rest running', async () => {
    const now = Date.now();
    await seedDemo('workout', now);
    const workout = await getWorkout(DEMO_IDS.activeSession);
    const bench = workout?.items[0];
    expect(bench?.exercise.id).toBe(demoExerciseId('Panca piana con bilanciere'));
    expect(bench?.sets.filter((s) => !s.isWarmup && s.completedAt !== undefined)).toHaveLength(1);
    expect((await getSettings()).activeTimer?.endAt).toBe(now + 72_000);
  });

  it('replaces previous data and ends the rest 12 s ago in rest-done mode', async () => {
    await seedDemo('workout');
    const now = Date.now();
    await seedDemo('rest-done', now);
    expect(await db.sessions.where('status').equals('in_progress').count()).toBe(1);
    expect((await getSettings()).activeTimer?.endAt).toBe(now - 12_000);
  });
});
