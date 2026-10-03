import type { SetValues } from '../domain/format';
import { DEFAULT_TARGET } from '../domain/program';
import { hasWorkLeft, supersetNext, supersetRun } from '../domain/superset';
import { propagateWeight, warmupIndex } from '../domain/workout';
import type { ActiveTimer, SessionExercise } from '../types';
import { db, uid } from './db';
import { insertPlannedSets, insertSessionExercise } from './sessions';
import { getSettings, setSetting } from './settings';

export interface CompleteResult {
  exerciseDone: boolean;
  /** Absent: timer untouched (warmup, correction). null: timer cleared. Phase 2 mirrors it to push. */
  timer?: ActiveTimer | null;
  /** Session exercise to show next, set only inside supersets. */
  next?: string;
}

/** done = has sets and all are completed; anything else is pending (a skipped one resumes). */
async function syncStatus(seId: string): Promise<boolean> {
  const sets = await db.setLogs.where('sessionExerciseId').equals(seId).toArray();
  const done = sets.length > 0 && sets.every((s) => s.completedAt !== undefined);
  await db.sessionExercises.update(seId, { status: done ? 'done' : 'pending' });
  return done;
}

async function restTimer(se: SessionExercise, exerciseName: string): Promise<ActiveTimer> {
  const work = (await db.setLogs.where('sessionExerciseId').equals(se.id).toArray()).filter(
    (s) => !s.isWarmup,
  );
  const done = work.filter((s) => s.completedAt !== undefined).length;
  const durationMs = se.restSec * 1000;
  return {
    sessionExerciseId: se.id,
    endAt: Date.now() + durationMs,
    durationMs,
    label: done > 0 ? `${exerciseName}, serie ${done} di ${work.length}` : exerciseName,
  };
}

/** SPEC §6.3: a weight change also updates later planned sets that had the same weight. */
export async function updateSet(setId: string, patch: SetValues): Promise<void> {
  await db.transaction('rw', db.setLogs, async () => {
    const set = await db.setLogs.get(setId);
    if (!set) return;
    const siblings = await db.setLogs
      .where('sessionExerciseId')
      .equals(set.sessionExerciseId)
      .toArray();
    const followers = 'weightKg' in patch ? propagateWeight(siblings, setId) : [];
    await db.setLogs.update(setId, patch);
    for (const id of followers) await db.setLogs.update(id, { weightKg: patch.weightKg });
  });
}

/** SPEC §6.3 and §7.1. Warmups and corrections never touch the timer. */
export async function completeSet(setId: string): Promise<CompleteResult> {
  return db.transaction(
    'rw',
    [db.setLogs, db.sessionExercises, db.exercises, db.settings],
    async () => {
      const set = await db.setLogs.get(setId);
      const se = set && (await db.sessionExercises.get(set.sessionExerciseId));
      const exercise = set && (await db.exercises.get(set.exerciseId));
      if (!set || !se || !exercise) throw new Error(`Set ${setId} not found`);
      const bodyweightDefault =
        exercise.trackingType === 'bodyweight_reps' && set.weightKg === undefined
          ? { weightKg: 0 }
          : {};
      await db.setLogs.update(setId, {
        completedAt: set.completedAt ?? Date.now(),
        ...bodyweightDefault,
      });
      const exerciseDone = await syncStatus(se.id);
      if (set.isWarmup || set.completedAt !== undefined) return { exerciseDone };

      const flow = await supersetFlow(se);
      const { autoStartTimer } = await getSettings();
      // Inside a superset the rest starts only at the end of the round (SPEC §7.1).
      const timer = autoStartTimer && flow.roundEnd ? await restTimer(se, exercise.name) : null;
      await setSetting('activeTimer', timer); // a new confirmation replaces the running timer
      return { exerciseDone, timer, next: flow.next };
    },
  );
}

export async function addSet(seId: string, isWarmup: boolean): Promise<void> {
  await db.transaction('rw', [db.setLogs, db.sessionExercises], async () => {
    const se = await db.sessionExercises.get(seId);
    if (!se) return;
    const sets = await db.setLogs.where('sessionExerciseId').equals(seId).sortBy('index');
    const work = sets.filter((s) => !s.isWarmup);
    const base = {
      id: uid(),
      sessionId: se.sessionId,
      sessionExerciseId: seId,
      exerciseId: se.exerciseId,
      isWarmup,
    };
    if (isWarmup) {
      const lastWarmup = sets.filter((s) => s.isWarmup).at(-1);
      await db.setLogs.add({ ...base, index: warmupIndex(lastWarmup?.index, work[0]?.index) });
    } else {
      const last = work.at(-1);
      await db.setLogs.add({
        ...base,
        index: (sets.at(-1)?.index ?? -1) + 1,
        weightKg: last?.weightKg,
        reps: last?.reps,
        durationSec: last?.durationSec,
      });
    }
    await syncStatus(seId);
  });
}

export async function deleteSet(setId: string): Promise<void> {
  await db.transaction('rw', [db.setLogs, db.sessionExercises], async () => {
    const set = await db.setLogs.get(setId);
    if (!set) return;
    await db.setLogs.delete(setId);
    await syncStatus(set.sessionExerciseId);
  });
}

export async function startTimer(seId: string): Promise<ActiveTimer | null> {
  return db.transaction(
    'rw',
    [db.setLogs, db.sessionExercises, db.exercises, db.settings],
    async () => {
      const se = await db.sessionExercises.get(seId);
      const exercise = se && (await db.exercises.get(se.exerciseId));
      if (!se || !exercise) return null;
      const timer = await restTimer(se, exercise.name);
      await setSetting('activeTimer', timer);
      return timer;
    },
  );
}

/** SPEC §7.1 "+15 s": endAt moves; durationMs too, so the line keeps its proportion. */
export async function extendTimer(ms: number): Promise<ActiveTimer | null> {
  return db.transaction('rw', db.settings, async () => {
    const { activeTimer } = await getSettings();
    if (!activeTimer) return null;
    const timer = {
      ...activeTimer,
      endAt: activeTimer.endAt + ms,
      durationMs: activeTimer.durationMs + ms,
    };
    await setSetting('activeTimer', timer);
    return timer;
  });
}

export const clearTimer = (): Promise<void> => setSetting('activeTimer', null);

export const countPendingSets = (sessionId: string): Promise<number> =>
  db.setLogs
    .where('sessionId')
    .equals(sessionId)
    .filter((s) => s.completedAt === undefined)
    .count();

export const hasCompletedSets = async (sessionId: string): Promise<boolean> =>
  (await db.setLogs
    .where('sessionId')
    .equals(sessionId)
    .filter((s) => s.completedAt !== undefined)
    .count()) > 0;

/** SPEC §6.7; with atLastSet (stale session, §6.6) endedAt is the last completed set. */
export async function finishSession(sessionId: string, { atLastSet = false } = {}): Promise<void> {
  await db.transaction('rw', [db.sessions, db.setLogs, db.settings], async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return;
    const sets = await db.setLogs.where('sessionId').equals(sessionId).toArray();
    await db.setLogs.bulkDelete(sets.filter((s) => s.completedAt === undefined).map((s) => s.id));
    const lastSet = Math.max(session.startedAt, ...sets.map((s) => s.completedAt ?? 0));
    await db.sessions.update(sessionId, {
      status: 'completed',
      endedAt: atLastSet ? lastSet : Date.now(),
    });
    await setSetting('activeTimer', null);
  });
}

/** Deletes a session with its exercises and sets. Also used by history (Phase 2). */
export async function discardSession(sessionId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.setLogs, db.settings],
    async () => {
      const session = await db.sessions.get(sessionId);
      await db.setLogs.where('sessionId').equals(sessionId).delete();
      await db.sessionExercises.where('sessionId').equals(sessionId).delete();
      await db.sessions.delete(sessionId);
      // Deleting an old session from history must not stop the rest timer of the current one.
      if (session?.status === 'in_progress') await setSetting('activeTimer', null);
    },
  );
}

export async function setSessionNotes(sessionId: string, notes: string): Promise<void> {
  await db.sessions.update(sessionId, { notes });
}

export async function skipExercise(seId: string): Promise<void> {
  await db.sessionExercises.update(seId, { status: 'skipped' });
}

/** SPEC §6.5: possible only while the exercise has no completed sets. */
export async function removeSessionExercise(seId: string): Promise<boolean> {
  return db.transaction('rw', [db.setLogs, db.sessionExercises], async () => {
    const sets = await db.setLogs.where('sessionExerciseId').equals(seId).toArray();
    if (sets.some((s) => s.completedAt !== undefined)) return false;
    await db.setLogs.bulkDelete(sets.map((s) => s.id));
    await db.sessionExercises.delete(seId);
    return true;
  });
}

export async function addSessionExercise(sessionId: string, exerciseId: string): Promise<string> {
  return db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.setLogs, db.exercises, db.settings],
    async () => {
      const existing = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
      const exercise = await db.exercises.get(exerciseId);
      const { defaultRestSec } = await getSettings();
      return insertSessionExercise({
        sessionId,
        exerciseId,
        order: Math.max(-1, ...existing.map((se) => se.order)) + 1,
        plannedSets: DEFAULT_TARGET.sets,
        repMin: DEFAULT_TARGET.repMin,
        repMax: DEFAULT_TARGET.repMax,
        ...(exercise?.trackingType === 'duration' ? { targetSec: DEFAULT_TARGET.targetSec } : {}),
        restSec: defaultRestSec,
      });
    },
  );
}

/**
 * SPEC §6.5. Without completed work sets the exercise is swapped in place; otherwise it is
 * closed and the substitute takes the remaining sets right after it. The program never changes.
 */
export async function replaceExercise(
  seId: string,
  exerciseId: string,
): Promise<'replaced' | 'inserted'> {
  return db.transaction(
    'rw',
    [db.sessions, db.sessionExercises, db.setLogs, db.exercises],
    async () => {
      const se = await db.sessionExercises.get(seId);
      if (!se) throw new Error(`Session exercise ${seId} not found`);
      const sets = await db.setLogs.where('sessionExerciseId').equals(seId).toArray();
      const doneWork = sets.filter((s) => s.completedAt !== undefined && !s.isWarmup).length;
      // A duration substitute for a reps exercise has no target time yet: use the default one.
      const substitute = await db.exercises.get(exerciseId);
      const targetSec =
        se.targetSec ??
        (substitute?.trackingType === 'duration' ? DEFAULT_TARGET.targetSec : undefined);

      // Any completed set (warmups included) is history: keep it by taking the 'inserted' branch.
      if (!sets.some((s) => s.completedAt !== undefined)) {
        await db.setLogs.bulkDelete(sets.map((s) => s.id));
        await db.sessionExercises.update(seId, {
          exerciseId,
          replacedExerciseId: se.replacedExerciseId ?? se.exerciseId,
          status: 'pending',
          targetSec,
        });
        await insertPlannedSets({ ...se, exerciseId });
        return 'replaced';
      }

      await db.setLogs.bulkDelete(sets.filter((s) => s.completedAt === undefined).map((s) => s.id));
      await db.sessionExercises.update(seId, { status: 'done' });
      const later = await db.sessionExercises
        .where('sessionId')
        .equals(se.sessionId)
        .filter((x) => x.order > se.order)
        .toArray();
      for (const x of later) await db.sessionExercises.update(x.id, { order: x.order + 1 });
      await insertSessionExercise({
        sessionId: se.sessionId,
        exerciseId,
        order: se.order + 1,
        plannedSets: Math.max(1, se.plannedSets - doneWork),
        repMin: se.repMin,
        repMax: se.repMax,
        targetSec,
        restSec: se.restSec,
        replacedExerciseId: se.exerciseId,
        supersetKey: se.supersetKey,
      });
      return 'inserted';
    },
  );
}

/** Records whether the push for the timer ending at endAt was scheduled; ignores replaced timers. */
export async function setTimerPushFailed(endAt: number, failed: boolean): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const { activeTimer } = await getSettings();
    if (activeTimer?.endAt === endAt) {
      await setSetting('activeTimer', { ...activeTimer, pushFailed: failed });
    }
  });
}

/** SPEC §5.4: history can turn a set into a warmup (excluded from stats) and back. */
export async function toggleWarmup(setId: string): Promise<void> {
  await db.transaction('rw', db.setLogs, async () => {
    const set = await db.setLogs.get(setId);
    if (set) await db.setLogs.update(setId, { isWarmup: !set.isWarmup });
  });
}

/** Applies a weight to the planned (not yet completed) work sets of an exercise. */
export async function applyWeight(seId: string, weightKg: number): Promise<void> {
  await db.setLogs
    .where('sessionExerciseId')
    .equals(seId)
    .filter((s) => !s.isWarmup && s.completedAt === undefined)
    .modify({ weightKg });
}

/** For a work set inside a superset: where to go next and whether the round ended. */
async function supersetFlow(se: SessionExercise): Promise<{ next?: string; roundEnd: boolean }> {
  if (!se.supersetKey) return { roundEnd: true };
  const siblings = await db.sessionExercises
    .where('sessionId')
    .equals(se.sessionId)
    .sortBy('order');
  const run = supersetRun(
    siblings.map((s) => s.supersetKey),
    siblings.findIndex((s) => s.id === se.id),
  );
  if (run.length < 2) return { roundEnd: true };
  const members = run.map((i) => siblings[i]);
  const sets = await db.setLogs.where('sessionId').equals(se.sessionId).toArray();
  // A skipped member has no work left: the round must not send the user back to it.
  const setsOf = Map.groupBy(sets, (s) => s.sessionExerciseId);
  const hasWork = members.map((m) => hasWorkLeft(m.status, setsOf.get(m.id) ?? []));
  const { next, roundEnd } = supersetNext(
    hasWork,
    members.findIndex((m) => m.id === se.id),
  );
  const after = siblings[(run.at(-1) ?? 0) + 1];
  return { next: next === null ? after?.id : members[next]?.id, roundEnd };
}
