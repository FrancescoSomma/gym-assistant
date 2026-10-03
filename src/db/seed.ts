import type { Equipment, Exercise, MuscleGroup } from '../types';
import { db, uid } from './db';
import { setSetting } from './settings';

export const SEED_VERSION = 1;

/** [name, equipment or 'duration', secondary groups] — SPEC §13. */
type Row = [string, Equipment | 'duration', MuscleGroup[]?];

const LIBRARY: Record<MuscleGroup, Row[]> = {
  chest: [
    ['Panca piana con bilanciere', 'barbell', ['triceps', 'shoulders']],
    ['Panca inclinata con bilanciere', 'barbell', ['shoulders']],
    ['Panca piana con manubri', 'dumbbell'],
    ['Panca inclinata con manubri', 'dumbbell'],
    ['Croci con manubri', 'dumbbell'],
    ['Croci ai cavi', 'cable'],
    ['Chest press', 'machine'],
    ['Pectoral machine', 'machine'],
    ['Dip alle parallele', 'bodyweight', ['triceps']],
    ['Piegamenti', 'bodyweight', ['triceps']],
  ],
  back: [
    ['Stacco da terra', 'barbell', ['legs']],
    ['Trazioni alla sbarra', 'bodyweight', ['biceps']],
    ['Lat machine', 'cable', ['biceps']],
    ['Rematore con bilanciere', 'barbell'],
    ['Rematore con manubrio', 'dumbbell'],
    ['Pulley basso', 'cable'],
    ['Pulldown a braccia tese', 'cable'],
    ['T-bar row', 'machine'],
    ['Hyperextension', 'bodyweight'],
  ],
  shoulders: [
    ['Military press', 'barbell', ['triceps']],
    ['Lento avanti con manubri', 'dumbbell'],
    ['Shoulder press', 'machine'],
    ['Alzate laterali con manubri', 'dumbbell'],
    ['Alzate laterali ai cavi', 'cable'],
    ['Alzate frontali', 'dumbbell'],
    ['Alzate posteriori', 'dumbbell'],
    ['Face pull', 'cable'],
    ['Tirate al mento', 'barbell'],
  ],
  legs: [
    ['Squat con bilanciere', 'barbell'],
    ['Front squat', 'barbell'],
    ['Leg press', 'machine'],
    ['Hack squat', 'machine'],
    ['Affondi con manubri', 'dumbbell'],
    ['Bulgarian split squat', 'dumbbell'],
    ['Stacco rumeno', 'barbell'],
    ['Leg extension', 'machine'],
    ['Leg curl', 'machine'],
    ['Hip thrust', 'barbell'],
    ['Calf raise in piedi', 'machine'],
  ],
  biceps: [
    ['Curl con bilanciere', 'barbell'],
    ['Curl con manubri', 'dumbbell'],
    ['Curl a martello', 'dumbbell'],
    ['Curl alla panca Scott', 'barbell'],
    ['Curl su panca inclinata', 'dumbbell'],
    ['Curl concentrato', 'dumbbell'],
    ['Curl ai cavi', 'cable'],
  ],
  triceps: [
    ['French press', 'barbell'],
    ['Pushdown ai cavi', 'cable'],
    ['Estensioni sopra la testa ai cavi', 'cable'],
    ['Estensioni sopra la testa con manubrio', 'dumbbell'],
    ['Kickback', 'dumbbell'],
    ['Panca presa stretta', 'barbell', ['chest']],
    ['Dip alla panca', 'bodyweight'],
  ],
  abs: [
    ['Crunch', 'bodyweight'],
    ['Crunch ai cavi', 'cable'],
    ['Crunch inverso', 'bodyweight'],
    ['Leg raise alla sbarra', 'bodyweight'],
    ['Russian twist', 'bodyweight'],
    ['Ab wheel', 'bodyweight'],
    ['Plank', 'duration'],
    ['Plank laterale', 'duration'],
  ],
};

export function seedExercises(now: number): Exercise[] {
  return (Object.entries(LIBRARY) as [MuscleGroup, Row[]][]).flatMap(([muscleGroup, rows]) =>
    rows.map(([name, kind, secondaryGroups = []]) => ({
      id: uid(),
      name,
      muscleGroup,
      secondaryGroups,
      equipment: kind === 'duration' ? 'bodyweight' : kind,
      trackingType:
        kind === 'duration'
          ? 'duration'
          : kind === 'bodyweight'
            ? 'bodyweight_reps'
            : 'weight_reps',
      notes: '',
      isBuiltIn: true,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

/** Read and write in one transaction, so concurrent calls (React StrictMode) seed once. */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', [db.exercises, db.settings], async () => {
    const row = await db.settings.get('seedVersion');
    if (((row?.value as number | undefined) ?? 0) >= SEED_VERSION) return;
    await db.exercises.bulkAdd(seedExercises(Date.now()));
    await setSetting('seedVersion', SEED_VERSION);
  });
}
