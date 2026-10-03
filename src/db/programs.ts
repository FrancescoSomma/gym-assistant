import { DEFAULT_TARGET, moveInList, nextDayLabel } from '../domain/program';
import type { Day, DayExercise, Exercise, Program } from '../types';
import { db, uid } from './db';
import { getSettings, setSetting } from './settings';

export interface DayItem {
  de: DayExercise;
  exercise: Exercise;
}

export interface ProgramRow {
  program: Program;
  dayCount: number;
}

export type DayExercisePatch = Partial<
  Pick<
    DayExercise,
    'sets' | 'repMin' | 'repMax' | 'targetSec' | 'restSec' | 'notes' | 'supersetKey'
  >
>;

export async function listProgramRows(): Promise<ProgramRow[]> {
  const [programs, days] = await Promise.all([db.programs.toArray(), db.days.toArray()]);
  return programs
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
    .map((program) => ({
      program,
      dayCount: days.filter((d) => d.programId === program.id).length,
    }));
}

export const getProgram = (id: string): Promise<Program | undefined> => db.programs.get(id);

export async function createProgram(): Promise<string> {
  const id = uid();
  const now = Date.now();
  await db.transaction('rw', [db.programs, db.settings], async () => {
    await db.programs.add({
      id,
      name: 'Nuovo programma',
      notes: '',
      createdAt: now,
      updatedAt: now,
    });
    if (!(await getSettings()).activeProgramId) await setSetting('activeProgramId', id);
  });
  return id;
}

export async function updateProgram(
  id: string,
  patch: Partial<Pick<Program, 'name' | 'notes'>>,
): Promise<void> {
  await db.programs.update(id, { ...patch, updatedAt: Date.now() });
}

export async function duplicateProgram(id: string): Promise<string> {
  return db.transaction('rw', [db.programs, db.days, db.dayExercises], async () => {
    const program = await db.programs.get(id);
    if (!program) throw new Error(`Program ${id} not found`);
    const copyId = uid();
    const now = Date.now();
    await db.programs.add({
      id: copyId,
      name: `${program.name} (copia)`,
      notes: program.notes,
      createdAt: now,
      updatedAt: now,
    });
    for (const day of await db.days.where('programId').equals(id).toArray()) {
      const dayId = uid();
      await db.days.add({ ...day, id: dayId, programId: copyId });
      const items = await db.dayExercises.where('dayId').equals(day.id).toArray();
      await db.dayExercises.bulkAdd(items.map((de) => ({ ...de, id: uid(), dayId })));
    }
    return copyId;
  });
}

export const activateProgram = (id: string): Promise<void> => setSetting('activeProgramId', id);

export async function isProgramUsed(id: string): Promise<boolean> {
  return (await db.sessions.where('programId').equals(id).count()) > 0;
}

/** SPEC §4.3: delete only if no session references it; the active program is never archived. */
export async function deleteOrArchiveProgram(id: string): Promise<'deleted' | 'archived'> {
  return db.transaction(
    'rw',
    [db.programs, db.days, db.dayExercises, db.sessions, db.settings],
    async () => {
      const { activeProgramId } = await getSettings();
      if (await isProgramUsed(id)) {
        if (activeProgramId === id) throw new Error('The active program cannot be archived');
        await db.programs.update(id, { archivedAt: Date.now() });
        return 'archived';
      }
      const dayIds = await db.days.where('programId').equals(id).primaryKeys();
      await db.dayExercises.where('dayId').anyOf(dayIds).delete();
      await db.days.bulkDelete(dayIds);
      await db.programs.delete(id);
      if (activeProgramId === id) await setSetting('activeProgramId', null);
      return 'deleted';
    },
  );
}

export async function restoreProgram(id: string): Promise<void> {
  await db.programs.update(id, { archivedAt: undefined });
}

export const listDays = (programId: string): Promise<Day[]> =>
  db.days.where('programId').equals(programId).sortBy('order');

export const getDay = (id: string): Promise<Day | undefined> => db.days.get(id);

export async function addDay(programId: string): Promise<string> {
  return db.transaction('rw', db.days, async () => {
    const days = await listDays(programId);
    const id = uid();
    await db.days.add({
      id,
      programId,
      label: nextDayLabel(days.map((d) => d.label)),
      name: '',
      order: (days.at(-1)?.order ?? -1) + 1,
    });
    return id;
  });
}

export async function updateDay(
  id: string,
  patch: Partial<Pick<Day, 'label' | 'name'>>,
): Promise<void> {
  await db.days.update(id, patch);
}

/** Sessions keep their snapshot (dayLabel, dayName): nothing to update there. */
export async function deleteDay(id: string): Promise<void> {
  await db.transaction('rw', [db.days, db.dayExercises], async () => {
    await db.dayExercises.where('dayId').equals(id).delete();
    await db.days.delete(id);
  });
}

export async function moveDay(id: string, dir: -1 | 1): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const day = await db.days.get(id);
    if (!day) return;
    const changes = moveInList(await listDays(day.programId), id, dir);
    await db.days.bulkUpdate(changes.map(({ id: key, order }) => ({ key, changes: { order } })));
  });
}

export async function listDayItems(dayId: string): Promise<DayItem[]> {
  const items = await db.dayExercises.where('dayId').equals(dayId).sortBy('order');
  const exercises = await db.exercises.bulkGet(items.map((de) => de.exerciseId));
  return items.flatMap((de, i) => {
    const exercise = exercises[i];
    return exercise ? [{ de, exercise }] : [];
  });
}

export async function countDayExercises(programId: string): Promise<Record<string, number>> {
  const dayIds = await db.days.where('programId').equals(programId).primaryKeys();
  const items = await db.dayExercises.where('dayId').anyOf(dayIds).toArray();
  return Object.fromEntries(dayIds.map((id) => [id, items.filter((de) => de.dayId === id).length]));
}

export async function addDayExercise(dayId: string, exerciseId: string): Promise<string> {
  return db.transaction('rw', [db.dayExercises, db.exercises, db.settings], async () => {
    const existing = await db.dayExercises.where('dayId').equals(dayId).toArray();
    const exercise = await db.exercises.get(exerciseId);
    const { defaultRestSec } = await getSettings();
    const id = uid();
    await db.dayExercises.add({
      id,
      dayId,
      exerciseId,
      order: Math.max(-1, ...existing.map((de) => de.order)) + 1,
      sets: DEFAULT_TARGET.sets,
      repMin: DEFAULT_TARGET.repMin,
      repMax: DEFAULT_TARGET.repMax,
      ...(exercise?.trackingType === 'duration' ? { targetSec: DEFAULT_TARGET.targetSec } : {}),
      restSec: defaultRestSec,
      notes: '',
    });
    return id;
  });
}

export async function updateDayExercise(id: string, patch: DayExercisePatch): Promise<void> {
  await db.dayExercises.update(id, patch);
}

export async function removeDayExercise(id: string): Promise<void> {
  await db.dayExercises.delete(id);
}

export async function moveDayExercise(id: string, dir: -1 | 1): Promise<void> {
  await db.transaction('rw', db.dayExercises, async () => {
    const item = await db.dayExercises.get(id);
    if (!item) return;
    const siblings = await db.dayExercises.where('dayId').equals(item.dayId).toArray();
    const changes = moveInList(siblings, id, dir);
    await db.dayExercises.bulkUpdate(
      changes.map(({ id: key, order }) => ({ key, changes: { order } })),
    );
  });
}
