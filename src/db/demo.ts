import { DAY_MS, toDateKey } from '../domain/dates';
import type {
  ActiveTimer,
  Bodyweight,
  Day,
  DayExercise,
  Exercise,
  Session,
  SessionExercise,
  SetLog,
} from '../types';
import { db } from './db';
import { SEED_VERSION, seedExercises } from './seed';

/**
 * Development only: main.tsx loads it when the URL has ?demo, and production builds drop it.
 * It replaces every table with eight weeks of realistic training, for screenshots and design
 * review.
 *   ?demo            history only, day A next
 *   ?demo=workout    day A in progress, set 2 of 4 to do, rest running
 *   ?demo=rest-done  the same, with the rest finished 12 s ago
 */
export const DEMO_IDS = {
  program: 'demo-program',
  lastSession: 'demo-done',
  activeSession: 'demo-session',
} as const;

/** "Panca piana con bilanciere" → "demo-panca-piana-con-bilanciere": stable screenshot URLs. */
export const demoExerciseId = (name: string): string =>
  `demo-${name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

interface Row {
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  /** Load eight weeks ago in kg (0 for bodyweight), or seconds for timed holds. */
  start: number;
  /** Added every second time the day is trained. */
  step: number;
  superset?: string;
}

interface DemoDay {
  id: string;
  label: string;
  name: string;
  rows: Row[];
}

const DAYS: DemoDay[] = [
  {
    id: 'demo-day-a',
    label: 'A',
    name: 'Petto e tricipiti',
    rows: [
      {
        name: 'Panca piana con bilanciere',
        sets: 4,
        repMin: 6,
        repMax: 8,
        restSec: 180,
        start: 85,
        step: 2.5,
      },
      {
        name: 'Panca inclinata con manubri',
        sets: 3,
        repMin: 8,
        repMax: 10,
        restSec: 120,
        start: 26,
        step: 2,
      },
      {
        name: 'Croci ai cavi',
        sets: 3,
        repMin: 12,
        repMax: 15,
        restSec: 90,
        start: 15,
        step: 2.5,
        superset: 'demo-ss-a',
      },
      {
        name: 'Pushdown ai cavi',
        sets: 3,
        repMin: 10,
        repMax: 12,
        restSec: 90,
        start: 30,
        step: 2.5,
        superset: 'demo-ss-a',
      },
      {
        name: 'Estensioni sopra la testa con manubrio',
        sets: 3,
        repMin: 10,
        repMax: 12,
        restSec: 90,
        start: 20,
        step: 2,
      },
      {
        name: 'Dip alle parallele',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 120,
        start: 0,
        step: 0,
      },
    ],
  },
  {
    id: 'demo-day-b',
    label: 'B',
    name: 'Schiena e bicipiti',
    rows: [
      {
        name: 'Trazioni alla sbarra',
        sets: 4,
        repMin: 6,
        repMax: 10,
        restSec: 150,
        start: 0,
        step: 0,
      },
      {
        name: 'Rematore con bilanciere',
        sets: 4,
        repMin: 8,
        repMax: 10,
        restSec: 120,
        start: 70,
        step: 2.5,
      },
      { name: 'Lat machine', sets: 3, repMin: 10, repMax: 12, restSec: 90, start: 60, step: 2.5 },
      {
        name: 'Curl con bilanciere',
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSec: 90,
        start: 30,
        step: 2.5,
      },
      { name: 'Curl a martello', sets: 3, repMin: 10, repMax: 12, restSec: 60, start: 14, step: 2 },
    ],
  },
  {
    id: 'demo-day-c',
    label: 'C',
    name: 'Gambe',
    rows: [
      {
        name: 'Squat con bilanciere',
        sets: 4,
        repMin: 5,
        repMax: 8,
        restSec: 180,
        start: 110,
        step: 2.5,
      },
      {
        name: 'Stacco rumeno',
        sets: 3,
        repMin: 8,
        repMax: 10,
        restSec: 150,
        start: 90,
        step: 2.5,
      },
      { name: 'Leg press', sets: 3, repMin: 10, repMax: 12, restSec: 120, start: 180, step: 5 },
      { name: 'Leg curl', sets: 3, repMin: 10, repMax: 12, restSec: 90, start: 45, step: 5 },
      {
        name: 'Calf raise in piedi',
        sets: 4,
        repMin: 12,
        repMax: 15,
        restSec: 60,
        start: 80,
        step: 5,
      },
    ],
  },
  {
    id: 'demo-day-d',
    label: 'D',
    name: 'Spalle e addome',
    rows: [
      // 600 s: the widest rest clock ("10:00").
      {
        name: 'Military press',
        sets: 4,
        repMin: 6,
        repMax: 8,
        restSec: 600,
        start: 50,
        step: 2.5,
      },
      {
        name: 'Alzate laterali con manubri',
        sets: 4,
        repMin: 12,
        repMax: 15,
        restSec: 60,
        start: 10,
        step: 1,
      },
      { name: 'Face pull', sets: 3, repMin: 12, repMax: 15, restSec: 60, start: 25, step: 2.5 },
      { name: 'Crunch ai cavi', sets: 3, repMin: 12, repMax: 15, restSec: 60, start: 40, step: 5 },
      { name: 'Plank', sets: 3, repMin: 8, repMax: 12, restSec: 60, start: 45, step: 5 },
    ],
  },
];

const SESSIONS = 24; // eight weeks, three a week
const LONG_SESSION = 20; // lasts 1:02:15, the widest duration

type Values = Pick<SetLog, 'weightKg' | 'reps' | 'durationSec'>;

function workSets(row: Row, exercise: Exercise, steps: number): Values[] {
  const load = row.start + row.step * steps;
  return Array.from({ length: row.sets }, (_, i) => {
    if (exercise.trackingType === 'duration') return { durationSec: load };
    const reps = Math.max(row.repMin, row.repMax - i);
    return { weightKg: exercise.trackingType === 'bodyweight_reps' ? 0 : load, reps };
  });
}

/**
 * One session of a day: a warmup on a weighted first exercise, then the planned work sets.
 * done(order, index) says which sets are completed: they get completedAt spread up to endAt.
 */
function buildSession(
  sessionId: string,
  day: DemoDay,
  exercise: (name: string) => Exercise,
  steps: number,
  startedAt: number,
  endAt: number,
  done: (order: number, index: number) => boolean,
): { sessionExercises: SessionExercise[]; setLogs: SetLog[] } {
  const sessionExercises: SessionExercise[] = [];
  const setLogs: SetLog[] = [];
  day.rows.forEach((row, order) => {
    const ex = exercise(row.name);
    const seId = `${sessionId}-${order}`;
    const warmups: Values[] =
      order === 0 && ex.trackingType === 'weight_reps'
        ? [{ weightKg: Math.round((row.start * 0.6) / 5) * 5, reps: 10 }]
        : [];
    const all = [
      ...warmups.map((v) => ({ ...v, isWarmup: true })),
      ...workSets(row, ex, steps).map((v) => ({ ...v, isWarmup: false })),
    ];
    all.forEach((values, index) => {
      setLogs.push({
        id: `${seId}-${index}`,
        sessionId,
        sessionExerciseId: seId,
        exerciseId: ex.id,
        index,
        ...values,
        completedAt: done(order, index) ? 0 : undefined,
      });
    });
    sessionExercises.push({
      id: seId,
      sessionId,
      exerciseId: ex.id,
      order,
      plannedSets: row.sets,
      repMin: row.repMin,
      repMax: row.repMax,
      targetSec: ex.trackingType === 'duration' ? row.start : undefined,
      restSec: row.restSec,
      status: all.every((_, index) => done(order, index)) ? 'done' : 'pending',
      dayExerciseId: `${day.id}-${order}`,
      supersetKey: row.superset,
    });
  });
  const completed = setLogs.filter((s) => s.completedAt !== undefined);
  completed.forEach((s, i) => {
    s.completedAt = Math.round(
      startedAt + ((i + 1) * (endAt - startedAt)) / (completed.length + 1),
    );
  });
  return { sessionExercises, setLogs };
}

export async function seedDemo(mode: string, now = Date.now()): Promise<void> {
  const exercises = seedExercises(now).map((e) => ({ ...e, id: demoExerciseId(e.name) }));
  const byName = new Map(exercises.map((e) => [e.name, e]));
  const exercise = (name: string): Exercise => {
    const found = byName.get(name);
    if (!found) throw new Error(`Demo exercise not in the library: ${name}`);
    return found;
  };
  exercise('Panca piana con bilanciere').notes = 'Presa sugli anelli';

  const days: Day[] = DAYS.map((d, order) => ({
    id: d.id,
    programId: DEMO_IDS.program,
    label: d.label,
    name: d.name,
    order,
  }));
  const dayExercises: DayExercise[] = DAYS.flatMap((d) =>
    d.rows.map((row, order) => ({
      id: `${d.id}-${order}`,
      dayId: d.id,
      exerciseId: exercise(row.name).id,
      order,
      sets: row.sets,
      repMin: row.repMin,
      repMax: row.repMax,
      targetSec: exercise(row.name).trackingType === 'duration' ? row.start : undefined,
      restSec: row.restSec,
      notes: row.name === 'Panca piana con bilanciere' ? 'Un secondo di fermo al petto' : '',
      supersetKey: row.superset,
    })),
  );

  const sessions: Session[] = [];
  const sessionExercises: SessionExercise[] = [];
  const setLogs: SetLog[] = [];
  for (let k = 0; k < SESSIONS; k++) {
    const day = DAYS[k % DAYS.length];
    const last = k === SESSIONS - 1;
    const id = last ? DEMO_IDS.lastSession : `demo-s-${k}`;
    const startedAt = new Date(now - Math.round((SESSIONS - k) * 2.33) * DAY_MS).setHours(
      18,
      30,
      0,
      0,
    );
    const endedAt = startedAt + (k === LONG_SESSION ? 3_735_000 : (52 + (k % 5) * 3) * 60_000);
    // Loads go up every second round of a day; the last session beats every record.
    const steps = Math.floor(Math.floor(k / DAYS.length) / 2) + (last ? 1 : 0);
    sessions.push({
      id,
      programId: DEMO_IDS.program,
      dayId: day.id,
      dayLabel: day.label,
      dayName: day.name,
      status: 'completed',
      startedAt,
      endedAt,
      notes: last ? 'Spalle fresche, military pulita.' : '',
    });
    const built = buildSession(id, day, exercise, steps, startedAt, endedAt, () => true);
    sessionExercises.push(...built.sessionExercises);
    setLogs.push(...built.setLogs);
  }

  let activeTimer: ActiveTimer | null = null;
  if (mode === 'workout' || mode === 'rest-done') {
    const day = DAYS[0];
    const startedAt = now - 24 * 60_000 - 13_000; // "24:13" on the workout header
    sessions.push({
      id: DEMO_IDS.activeSession,
      programId: DEMO_IDS.program,
      dayId: day.id,
      dayLabel: day.label,
      dayName: day.name,
      status: 'in_progress',
      startedAt,
      notes: '',
    });
    // Bench press: the warmup and set 1 (a record, 92,5 kg) done, set 2 of 4 to do.
    const built = buildSession(
      DEMO_IDS.activeSession,
      day,
      exercise,
      3,
      startedAt,
      now - 110_000,
      (order, index) => order === 0 && index <= 1,
    );
    sessionExercises.push(...built.sessionExercises);
    setLogs.push(...built.setLogs);
    activeTimer = {
      sessionExerciseId: `${DEMO_IDS.activeSession}-0`,
      endAt: mode === 'workout' ? now + 72_000 : now - 12_000,
      durationMs: day.rows[0].restSec * 1000,
      label: 'Panca piana con bilanciere, serie 1 di 4',
    };
  }

  const bodyweights: Bodyweight[] = Array.from({ length: 8 }, (_, w) => w).map((w) => ({
    id: `demo-bw-${w}`,
    date: toDateKey(now - (7 - w) * 7 * DAY_MS),
    kg: Math.round((82.4 - w * 0.25 + (w % 2) * 0.1) * 10) / 10,
  }));

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.exercises.bulkAdd(exercises);
    await db.programs.add({
      id: DEMO_IDS.program,
      name: 'Forza 4 giorni',
      notes: 'Tre allenamenti a settimana, giornate a rotazione.',
      createdAt: now - 60 * DAY_MS,
      updatedAt: now - 60 * DAY_MS,
    });
    await db.days.bulkAdd(days);
    await db.dayExercises.bulkAdd(dayExercises);
    await db.sessions.bulkAdd(sessions);
    await db.sessionExercises.bulkAdd(sessionExercises);
    await db.setLogs.bulkAdd(setLogs);
    await db.bodyweights.bulkAdd(bodyweights);
    await db.settings.bulkPut([
      { key: 'seedVersion', value: SEED_VERSION },
      { key: 'activeProgramId', value: DEMO_IDS.program },
      { key: 'weeklyGoal', value: 3 },
      { key: 'lastBackupAt', value: now - 9 * DAY_MS },
      { key: 'activeTimer', value: activeTimer },
    ]);
  });
}
