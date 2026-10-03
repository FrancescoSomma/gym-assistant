export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'biceps' | 'triceps' | 'abs';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';
export type TrackingType = 'weight_reps' | 'bodyweight_reps' | 'duration';

/** Key order is the display order. */
export const MUSCLE_GROUPS: Record<MuscleGroup, string> = {
  chest: 'Petto',
  back: 'Schiena',
  shoulders: 'Spalle',
  legs: 'Gambe',
  biceps: 'Bicipiti',
  triceps: 'Tricipiti',
  abs: 'Addome',
};

export const EQUIPMENT: Record<Equipment, string> = {
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  machine: 'Macchina',
  cable: 'Cavi',
  bodyweight: 'Corpo libero',
  other: 'Altro',
};

export const TRACKING_TYPES: Record<TrackingType, string> = {
  weight_reps: 'Peso e ripetizioni',
  bodyweight_reps: 'Solo ripetizioni',
  duration: 'Durata',
};

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryGroups: MuscleGroup[];
  equipment: Equipment;
  trackingType: TrackingType;
  weightStepKg?: number;
  notes: string;
  isBuiltIn: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Program {
  id: string;
  name: string;
  notes: string;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Day {
  id: string;
  programId: string;
  label: string;
  name: string;
  order: number;
}

export interface DayExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  targetSec?: number;
  restSec: number;
  notes: string;
  supersetKey?: string;
}

export interface Session {
  id: string;
  programId: string;
  dayId: string;
  dayLabel: string;
  dayName: string;
  status: 'in_progress' | 'completed';
  startedAt: number;
  endedAt?: number;
  notes: string;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  plannedSets: number;
  repMin: number;
  repMax: number;
  targetSec?: number;
  restSec: number;
  status: 'pending' | 'done' | 'skipped';
  dayExerciseId?: string;
  replacedExerciseId?: string;
  supersetKey?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  sessionExerciseId: string;
  exerciseId: string;
  index: number;
  isWarmup: boolean;
  weightKg?: number;
  reps?: number;
  durationSec?: number;
  completedAt?: number;
}

export interface Bodyweight {
  id: string;
  date: string;
  kg: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface ActiveTimer {
  sessionExerciseId: string;
  endAt: number;
  /** Full length including "+15 s" extensions; drives the draining line. */
  durationMs: number;
  label: string;
}

export interface Settings {
  activeProgramId: string | null;
  weeklyGoal: number;
  defaultRestSec: number;
  autoStartTimer: boolean;
  timerSound: boolean;
  weightSteps: Record<Equipment, number>;
  activeTimer: ActiveTimer | null;
  pushEnabled: boolean;
  lastBackupAt: number | null;
  seedVersion: number;
}
