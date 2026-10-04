import { Download, Trash2, Upload } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { Sheet } from '../../components/Sheet';
import { type Backup, importBackup, parseBackup } from '../../db/backup';
import { backupPreview } from '../../domain/backup';
import { countLabel, formatDate, relativeDay } from '../../domain/format';
import { exportAndShare } from './exportBackup';

export function BackupSection({ lastBackupAt }: { lastBackupAt: number | null }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const preview = pending && backupPreview(pending);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // picking the same file again must fire onChange
    if (!file) return;
    try {
      const result = parseBackup(await file.text());
      setError(result.ok ? null : result.error);
      setPending(result.ok ? result.backup : null);
    } catch {
      setPending(null);
      setError('Impossibile leggere il file. Scegli un file esportato da Palestra.');
    }
  };

  const replace = async () => {
    if (!pending) return;
    try {
      await importBackup(pending);
      setPending(null);
      navigate('/', { replace: true });
    } catch {
      setPending(null);
      setError(
        'Importazione non riuscita: i dati di questo iPhone non sono cambiati. Riprova o scegli un altro file esportato da Palestra.',
      );
    }
  };

  return (
    <>
      <h2 className="section-title">Backup</h2>
      <p className="px-4 pb-3 text-small text-fumo">
        {lastBackupAt ? `Ultimo backup ${relativeDay(lastBackupAt)}.` : 'Nessun backup esportato.'}{' '}
        I dati sono solo su questo iPhone e spariscono se rimuovi l'app dalla Home.
      </p>
      <div className="space-y-2 px-4">
        <button type="button" className="btn-secondary" onClick={() => exportAndShare()}>
          <Download size={20} /> Esporta backup
        </button>
        <label className="btn-secondary cursor-pointer">
          <Upload size={20} /> Importa backup
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={onFile}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="px-4 pt-3 text-small">
          {error}
        </p>
      )}
      <Sheet open={pending !== null} onClose={() => setPending(null)} title="Importa backup">
        {preview && (
          <div className="space-y-3 px-4">
            <p>
              {countLabel(preview.programs, 'programma', 'programmi')},{' '}
              {countLabel(preview.sessions, 'allenamento', 'allenamenti')}
              {preview.lastSessionAt !== undefined &&
                `, l'ultimo ${formatDate(preview.lastSessionAt)}`}
              .
            </p>
            <p className="text-small text-fumo">
              Tutti i dati di questo iPhone verranno sostituiti da quelli del backup.
            </p>
            <button type="button" className="btn-danger" onClick={replace}>
              <Trash2 size={20} /> Sostituisci tutti i dati
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPending(null)}>
              Annulla
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
