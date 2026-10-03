import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { RestPicker } from '../../components/RestPicker';
import { Stepper } from '../../components/Stepper';
import { getSettings, setSetting } from '../../db/settings';
import { formatMegabytes, formatNumber, parseWeight } from '../../domain/format';
import { getStorageInfo, type StorageInfo } from '../../platform/storage';
import { EQUIPMENT, type Equipment } from '../../types';
import { BackupSection } from './BackupSection';

const EQUIPMENT_ENTRIES = Object.entries(EQUIPMENT) as [Equipment, string][];

export function SettingsScreen() {
  const settings = useLiveQuery(getSettings);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  useEffect(() => {
    void getStorageInfo().then(setStorage);
  }, []);
  if (!settings) return null;

  return (
    <>
      <Header title="Impostazioni" back="/" />

      <h2 className="section-title">Allenamento</h2>
      <div className="row">
        <span className="flex-1">Obiettivo settimanale</span>
        <div className="w-40">
          <Stepper
            label="Obiettivo settimanale"
            value={settings.weeklyGoal}
            step={1}
            min={1}
            max={14}
            onChange={(goal) => goal !== undefined && setSetting('weeklyGoal', goal)}
          />
        </div>
      </div>
      <div className="border-b border-steel/25 px-4 py-3">
        <p className="mb-2">Recupero predefinito</p>
        <RestPicker
          value={settings.defaultRestSec}
          onChange={(sec) => setSetting('defaultRestSec', sec)}
        />
      </div>
      <label className="row">
        <span className="flex-1">Avvia il recupero dopo ogni serie</span>
        <input
          type="checkbox"
          className="switch"
          checked={settings.autoStartTimer}
          onChange={(e) => setSetting('autoStartTimer', e.target.checked)}
        />
      </label>
      <label className="row">
        <span className="flex-1">Suono a fine recupero</span>
        <input
          type="checkbox"
          className="switch"
          checked={settings.timerSound}
          onChange={(e) => setSetting('timerSound', e.target.checked)}
        />
      </label>

      <h2 className="section-title">Incrementi di peso</h2>
      {EQUIPMENT_ENTRIES.map(([key, label]) => (
        <label key={key} className="row">
          <span className="flex-1">{label}</span>
          <input
            className="field w-24 text-right"
            inputMode="decimal"
            defaultValue={formatNumber(settings.weightSteps[key])}
            onBlur={(e) => {
              const step = parseWeight(e.target.value);
              if (step !== undefined && step > 0) {
                void setSetting('weightSteps', { ...settings.weightSteps, [key]: step });
              } else {
                e.target.value = formatNumber(settings.weightSteps[key]);
              }
            }}
          />
          <span className="text-steel">kg</span>
        </label>
      ))}

      <BackupSection lastBackupAt={settings.lastBackupAt} />

      <h2 className="section-title">Archiviazione</h2>
      <div className="row">
        <span className="flex-1">Spazio usato</span>
        <span className="tabular-nums">
          {storage?.usage === undefined ? '–' : formatMegabytes(storage.usage)}
        </span>
      </div>
      <div className="row">
        <span className="flex-1">Archiviazione persistente</span>
        <span>{storage?.persisted ? 'Attiva' : 'Non attiva'}</span>
      </div>
      {storage && !storage.persisted && (
        <p className="px-4 pt-2 text-small text-steel">
          Senza archiviazione persistente iOS può cancellare i dati. Apri Palestra dalla schermata
          Home ed esporta un backup ogni settimana.
        </p>
      )}

      <h2 className="section-title">Versione</h2>
      <p className="px-4 pb-8 tabular-nums">Palestra {__APP_VERSION__}</p>
    </>
  );
}
