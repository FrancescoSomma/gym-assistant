import { describe, expect, it } from 'vitest';
import { db } from './db';
import { ensureSeed } from './seed';

const byName = async (name: string) => db.exercises.where('name').equals(name).first();

describe('ensureSeed', () => {
  it('inserts the §13 library exactly once, even when called concurrently', async () => {
    await Promise.all([ensureSeed(), ensureSeed()]);
    await ensureSeed();
    expect(await db.exercises.count()).toBe(61);
  });

  it('derives the tracking type from the equipment', async () => {
    await ensureSeed();
    expect(await byName('Plank')).toMatchObject({
      trackingType: 'duration',
      equipment: 'bodyweight',
    });
    expect(await byName('Trazioni alla sbarra')).toMatchObject({
      trackingType: 'bodyweight_reps',
      secondaryGroups: ['biceps'],
    });
    expect(await byName('Panca piana con bilanciere')).toMatchObject({
      trackingType: 'weight_reps',
      muscleGroup: 'chest',
      secondaryGroups: ['triceps', 'shoulders'],
      isBuiltIn: true,
    });
  });
});
