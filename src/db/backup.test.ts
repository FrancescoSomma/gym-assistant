import { describe, expect, it } from 'vitest';
import { exportBackup, importBackup, parseBackup } from './backup';
import { db } from './db';
import { createExercise } from './exercises';
import { addDay, addDayExercise, createProgram } from './programs';
import { ensureSeed } from './seed';
import { getWorkout, startSession } from './sessions';
import { getSettings, setSetting } from './settings';
import { completeSet, finishSession, updateSet } from './workout';

async function realisticData() {
  await ensureSeed();
  const day = await addDay(await createProgram());
  await addDayExercise(
    day,
    await createExercise({
      name: 'Panca',
      muscleGroup: 'chest',
      equipment: 'barbell',
      trackingType: 'weight_reps',
      notes: 'Sedile al 4',
    }),
  );
  const sessionId = await startSession(day);
  const [bench] = (await getWorkout(sessionId))?.items ?? [];
  await updateSet(bench.sets[0].id, { weightKg: 82.5, reps: 8 });
  await completeSet(bench.sets[0].id);
  await finishSession(sessionId);
  await db.bodyweights.add({ id: 'bw', date: '2026-10-02', kg: 80.4 });
  await setSetting('lastBackupAt', 123);
  await setSetting('pushEnabled', true);
}

const clearAll = () => Promise.all(db.tables.map((t) => t.clear()));

describe('backup round trip (SPEC §9)', () => {
  it('export, import and export again give identical data, apart from exportedAt', async () => {
    await realisticData();
    const first = await exportBackup(new Date('2026-10-02T18:00:00Z'));
    const parsed = parseBackup(JSON.stringify(first));
    if (!parsed.ok) throw new Error(parsed.error);
    await clearAll();
    await importBackup(parsed.backup);
    const second = await exportBackup(new Date('2026-10-03T08:00:00Z'));
    expect({ ...second, exportedAt: '' }).toEqual({ ...first, exportedAt: '' });
    expect(first.data.exercises).toHaveLength(62);
    expect(first.data.setLogs).toHaveLength(1);
  });

  it('never exports the device-only settings', async () => {
    await realisticData();
    await setSetting('activeTimer', { sessionExerciseId: 'x', endAt: 1, durationMs: 1, label: '' });
    const keys = (await exportBackup()).data.settings.map((s) => s.key);
    expect(keys).not.toContain('activeTimer');
    expect(keys).not.toContain('pushEnabled');
    expect(keys).toContain('lastBackupAt');
  });

  it('replaces everything on import but keeps this device push setting', async () => {
    await realisticData();
    const backup = await exportBackup();
    await createProgram(); // data that is not in the backup
    await importBackup(backup);
    expect(await db.programs.count()).toBe(backup.data.programs.length);
    expect((await getSettings()).pushEnabled).toBe(true);
  });
});

describe('parseBackup', () => {
  const valid = async () => JSON.parse(JSON.stringify(await exportBackup()));

  it('rejects text that is not JSON', () => {
    expect(parseBackup('ciao')).toEqual({
      ok: false,
      error:
        'Backup non valido: il file non è in formato JSON. Scegli un file esportato da Palestra.',
    });
  });

  it('rejects a JSON file from another app', () => {
    expect(parseBackup('{"name":"altro"}')).toMatchObject({
      ok: false,
      error:
        'Backup non valido: il file non è stato esportato da Palestra. Scegli un file esportato da Palestra.',
    });
  });

  it('names the missing list', async () => {
    const backup = await valid();
    delete backup.data.exercises;
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({
      ok: false,
      error:
        "Backup non valido: manca l'elenco degli esercizi. Scegli un file esportato da Palestra.",
    });
  });

  it('names the list with an invalid item', async () => {
    const backup = await valid();
    backup.data.setLogs = [{ id: 1 }];
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({
      ok: false,
      error:
        "Backup non valido: l'elenco delle serie contiene dati non riconosciuti. Scegli un file esportato da Palestra.",
    });
  });

  it('asks to update the app for a backup from a newer version', async () => {
    const backup = await valid();
    backup.schemaVersion = 99;
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({
      ok: false,
      error: "Backup creato da una versione più recente di Palestra. Aggiorna l'app e riprova.",
    });
  });

  it('leaves data untouched when an import fails halfway', async () => {
    await realisticData();
    const before = await exportBackup();
    const broken = structuredClone(before);
    broken.data.setLogs.push(...broken.data.setLogs); // duplicate keys: bulkAdd fails after the clear
    await expect(importBackup(broken)).rejects.toThrow();
    expect({ ...(await exportBackup()), exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
  });
});
