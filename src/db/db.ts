import Dexie, { type Table } from 'dexie';
import type {
  Bodyweight,
  Day,
  DayExercise,
  Exercise,
  Program,
  Session,
  SessionExercise,
  SetLog,
  Setting,
} from '../types';

export const db = new Dexie('gym-log') as Dexie & {
  exercises: Table<Exercise, string>;
  programs: Table<Program, string>;
  days: Table<Day, string>;
  dayExercises: Table<DayExercise, string>;
  sessions: Table<Session, string>;
  sessionExercises: Table<SessionExercise, string>;
  setLogs: Table<SetLog, string>;
  bodyweights: Table<Bodyweight, string>;
  settings: Table<Setting, string>;
};

// Never edit an existing version. Schema changes go in db.version(n + 1) with an upgrade(),
// together with a migration of the backup format (src/db/backup.ts).
db.version(1).stores({
  exercises: 'id, name, muscleGroup',
  programs: 'id',
  days: 'id, programId',
  dayExercises: 'id, dayId, exerciseId',
  sessions: 'id, status, startedAt, programId, dayId',
  sessionExercises: 'id, sessionId, exerciseId',
  // Planned sets have no completedAt, so the compound index only sees performed sets.
  setLogs: 'id, sessionId, sessionExerciseId, [exerciseId+completedAt]',
  bodyweights: 'id, date',
  settings: 'key',
});

export const uid = (): string => crypto.randomUUID();
