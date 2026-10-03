import { exportBackup } from '../../db/backup';
import { setSetting } from '../../db/settings';
import { backupFileName } from '../../domain/backup';
import { shareOrDownload } from '../../platform/share';

/** lastBackupAt moves only when the file was actually shared or saved (SPEC §9). */
export async function exportAndShare(): Promise<boolean> {
  const backup = await exportBackup();
  const file = new File([JSON.stringify(backup)], backupFileName(Date.now()), {
    type: 'application/json',
  });
  const done = await shareOrDownload(file);
  if (done) await setSetting('lastBackupAt', Date.now());
  return done;
}
