import type { Bodyweight } from '../types';
import { db, uid } from './db';

export const listBodyweights = (): Promise<Bodyweight[]> =>
  db.bodyweights.orderBy('date').reverse().toArray();

/** One measurement per day: saving the same date replaces it. */
export async function saveBodyweight(date: string, kg: number): Promise<void> {
  await db.transaction('rw', db.bodyweights, async () => {
    const existing = await db.bodyweights.where('date').equals(date).first();
    await db.bodyweights.put({ id: existing?.id ?? uid(), date, kg });
  });
}

export async function deleteBodyweight(id: string): Promise<void> {
  await db.bodyweights.delete(id);
}
