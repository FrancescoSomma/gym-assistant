import { describe, expect, it } from 'vitest';
import { db } from './db';
import { createExercise } from './exercises';
import {
  addDay,
  addDayExercise,
  countDayExercises,
  createProgram,
  deleteDay,
  deleteOrArchiveProgram,
  duplicateProgram,
  listDayItems,
  listDays,
  moveDay,
} from './programs';
import { getSettings, setSetting } from './settings';

const exercise = (name: string, trackingType: 'weight_reps' | 'duration' = 'weight_reps') =>
  createExercise({ name, muscleGroup: 'chest', equipment: 'barbell', trackingType, notes: '' });

const useProgram = (programId: string) =>
  db.sessions.add({
    id: 's',
    programId,
    dayId: 'd',
    dayLabel: 'A',
    dayName: '',
    status: 'completed',
    startedAt: 1,
    notes: '',
  });

describe('programs', () => {
  it('activates the first program only', async () => {
    const first = await createProgram();
    await createProgram();
    expect((await getSettings()).activeProgramId).toBe(first);
  });

  it('labels days with the next free letter and reorders them', async () => {
    const p = await createProgram();
    const a = await addDay(p);
    const b = await addDay(p);
    expect((await listDays(p)).map((d) => d.label)).toEqual(['A', 'B']);
    await moveDay(b, -1);
    expect((await listDays(p)).map((d) => d.id)).toEqual([b, a]);
  });

  it('adds day exercises with the default target and the default rest', async () => {
    await setSetting('defaultRestSec', 120);
    const day = await addDay(await createProgram());
    await addDayExercise(day, await exercise('Panca'));
    await addDayExercise(day, await exercise('Plank', 'duration'));
    const [bench, plank] = await listDayItems(day);
    expect(bench?.de).toMatchObject({ sets: 3, repMin: 8, repMax: 12, restSec: 120, order: 0 });
    expect(bench?.de.targetSec).toBeUndefined();
    expect(plank?.de).toMatchObject({ targetSec: 30, order: 1 });
    expect(bench?.exercise.name).toBe('Panca');
  });

  it('duplicates days and day exercises with new ids', async () => {
    const p = await createProgram();
    const day = await addDay(p);
    await addDayExercise(day, await exercise('Panca'));
    const copy = await duplicateProgram(p);
    const [copiedDay] = await listDays(copy);
    expect((await db.programs.get(copy))?.name).toBe('Nuovo programma (copia)');
    expect(copiedDay?.id).not.toBe(day);
    expect(copiedDay?.label).toBe('A');
    expect(await countDayExercises(copy)).toEqual({ [copiedDay?.id ?? '']: 1 });
  });

  it('deletes an unused program with its days and day exercises', async () => {
    const p = await createProgram();
    const day = await addDay(p);
    await addDayExercise(day, await exercise('Panca'));
    expect(await deleteOrArchiveProgram(p)).toBe('deleted');
    expect(await db.days.count()).toBe(0);
    expect(await db.dayExercises.count()).toBe(0);
    expect((await getSettings()).activeProgramId).toBeNull();
  });

  it('archives a used program but refuses to archive the active one', async () => {
    const active = await createProgram();
    const other = await createProgram();
    await useProgram(active);
    await expect(deleteOrArchiveProgram(active)).rejects.toThrow();
    await db.sessions.update('s', { programId: other });
    expect(await deleteOrArchiveProgram(other)).toBe('archived');
    expect((await db.programs.get(other))?.archivedAt).toBeTypeOf('number');
  });

  it('deleting a day removes its exercises but not the sessions', async () => {
    const p = await createProgram();
    const day = await addDay(p);
    await addDayExercise(day, await exercise('Panca'));
    await useProgram(p);
    await deleteDay(day);
    expect(await db.dayExercises.count()).toBe(0);
    expect(await db.sessions.count()).toBe(1);
  });
});
