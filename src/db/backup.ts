import { z } from 'zod';
import {
  type Bodyweight,
  type Day,
  type DayExercise,
  EQUIPMENT,
  type Equipment,
  type Exercise,
  MUSCLE_GROUPS,
  type MuscleGroup,
  type Program,
  type Session,
  type SessionExercise,
  type SetLog,
  type Setting,
  TRACKING_TYPES,
  type TrackingType,
} from '../types';
import { db } from './db';

export const BACKUP_VERSION = 1;

const TABLES = [
  'exercises',
  'programs',
  'days',
  'dayExercises',
  'sessions',
  'sessionExercises',
  'setLogs',
  'bodyweights',
  'settings',
] as const;
type TableName = (typeof TABLES)[number];

/** Device state, never exported (SPEC §9). On import pushEnabled is kept and activeTimer dropped. */
const DEVICE_SETTINGS = ['activeTimer', 'pushEnabled'];

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];
const group = z.enum(keys<MuscleGroup>(MUSCLE_GROUPS));

const exercise: z.ZodType<Exercise> = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroup: group,
  secondaryGroups: z.array(group),
  equipment: z.enum(keys<Equipment>(EQUIPMENT)),
  trackingType: z.enum(keys<TrackingType>(TRACKING_TYPES)),
  weightStepKg: z.number().optional(),
  notes: z.string(),
  isBuiltIn: z.boolean(),
  archivedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const program: z.ZodType<Program> = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string(),
  archivedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const day: z.ZodType<Day> = z.object({
  id: z.string(),
  programId: z.string(),
  label: z.string(),
  name: z.string(),
  order: z.number(),
});

const dayExercise: z.ZodType<DayExercise> = z.object({
  id: z.string(),
  dayId: z.string(),
  exerciseId: z.string(),
  order: z.number(),
  sets: z.number(),
  repMin: z.number(),
  repMax: z.number(),
  targetSec: z.number().optional(),
  restSec: z.number(),
  notes: z.string(),
  supersetKey: z.string().optional(),
});

const session: z.ZodType<Session> = z.object({
  id: z.string(),
  programId: z.string(),
  dayId: z.string(),
  dayLabel: z.string(),
  dayName: z.string(),
  status: z.enum(['in_progress', 'completed']),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  notes: z.string(),
});

const sessionExercise: z.ZodType<SessionExercise> = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  order: z.number(),
  plannedSets: z.number(),
  repMin: z.number(),
  repMax: z.number(),
  targetSec: z.number().optional(),
  restSec: z.number(),
  status: z.enum(['pending', 'done', 'skipped']),
  dayExerciseId: z.string().optional(),
  replacedExerciseId: z.string().optional(),
  supersetKey: z.string().optional(),
});

const setLog: z.ZodType<SetLog> = z.object({
  id: z.string(),
  sessionId: z.string(),
  sessionExerciseId: z.string(),
  exerciseId: z.string(),
  index: z.number(),
  isWarmup: z.boolean(),
  weightKg: z.number().optional(),
  reps: z.number().optional(),
  durationSec: z.number().optional(),
  completedAt: z.number().optional(),
});

const bodyweight: z.ZodType<Bodyweight> = z.object({
  id: z.string(),
  date: z.string(),
  kg: z.number(),
});
const setting: z.ZodType<Setting> = z.object({ key: z.string(), value: z.unknown() });

const backupSchema = z.object({
  app: z.literal('gym-log'),
  schemaVersion: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  data: z.object({
    exercises: z.array(exercise),
    programs: z.array(program),
    days: z.array(day),
    dayExercises: z.array(dayExercise),
    sessions: z.array(session),
    sessionExercises: z.array(sessionExercise),
    setLogs: z.array(setLog),
    bodyweights: z.array(bodyweight),
    settings: z.array(setting),
  }),
});

export type Backup = z.infer<typeof backupSchema>;
export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

const LISTS: Record<TableName, string> = {
  exercises: 'degli esercizi',
  programs: 'dei programmi',
  days: 'delle giornate',
  dayExercises: 'degli esercizi delle giornate',
  sessions: 'degli allenamenti',
  sessionExercises: 'degli esercizi degli allenamenti',
  setLogs: 'delle serie',
  bodyweights: 'dei pesi corporei',
  settings: 'delle impostazioni',
};

const invalid = (reason: string): ParseResult => ({
  ok: false,
  error: `Backup non valido: ${reason}. Scegli un file esportato da Palestra.`,
});

export async function exportBackup(now = new Date()): Promise<Backup> {
  const rows = await db.transaction('r', db.tables, () =>
    Promise.all(TABLES.map((name) => db.table(name).toArray())),
  );
  const data = Object.fromEntries(TABLES.map((name, i) => [name, rows[i]])) as Backup['data'];
  data.settings = data.settings.filter((s) => !DEVICE_SETTINGS.includes(s.key));
  return { app: 'gym-log', schemaVersion: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

/** Pure: validation never writes, so a rejected file leaves the data untouched. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return invalid('il file non è in formato JSON');
  }
  const version = (json as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return {
      ok: false,
      error: "Backup creato da una versione più recente di Palestra. Aggiorna l'app e riprova.",
    };
  }
  // ponytail: v1 is the only format. With Dexie v2, migrate older backups here before parsing.
  const result = backupSchema.safeParse(json);
  if (result.success) return { ok: true, backup: result.data };
  const [root, list, index] = result.error.issues[0]?.path ?? [];
  if (root === 'app') return invalid('il file non è stato esportato da Palestra');
  if (root === 'data' && typeof list === 'string' && list in LISTS) {
    const name = LISTS[list as TableName];
    return invalid(
      index === undefined
        ? `manca l'elenco ${name}`
        : `l'elenco ${name} contiene dati non riconosciuti`,
    );
  }
  return invalid('la struttura del file non è riconosciuta');
}

/** SPEC §9: replace everything in one transaction, no merge. */
export async function importBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    const pushEnabled = await db.settings.get('pushEnabled');
    await Promise.all(db.tables.map((table) => table.clear()));
    for (const name of TABLES) {
      const rows =
        name === 'settings'
          ? backup.data.settings.filter((s) => !DEVICE_SETTINGS.includes(s.key))
          : backup.data[name];
      await db.table(name).bulkAdd(rows);
    }
    if (pushEnabled) await db.settings.put(pushEnabled);
  });
}
