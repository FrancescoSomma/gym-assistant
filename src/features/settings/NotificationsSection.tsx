import { useState } from 'react';
import { setSetting } from '../../db/settings';
import { isStandalone, subscribePush } from '../../platform/push';

const ERRORS = {
  denied: 'Permesso negato. Riattivalo in Impostazioni di iOS, Notifiche, Palestra.',
  unsupported: 'Questo dispositivo non supporta le notifiche del timer.',
  'not-standalone': 'Apri Palestra dalla schermata Home per attivare le notifiche.',
} as const;

export function NotificationsSection({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const standalone = isStandalone();

  // Must stay a direct tap handler: iOS only shows the permission prompt in response to a tap.
  const enable = async () => {
    const result = await subscribePush();
    if (result === 'granted') {
      setError(null);
      await setSetting('pushEnabled', true);
    } else {
      setError(ERRORS[result]);
    }
  };

  return (
    <>
      <h2 className="section-title">Notifiche del timer</h2>
      {!standalone ? (
        <p className="px-4 text-small text-steel">
          Le notifiche funzionano solo con Palestra aperta dalla schermata Home. In Safari tocca
          Condividi, poi “Aggiungi alla schermata Home”, e apri l'app da lì.
        </p>
      ) : enabled ? (
        <div className="row">
          <span className="flex-1">Avviso a fine recupero, anche a schermo bloccato</span>
          <button
            type="button"
            className="btn-text"
            onClick={() => setSetting('pushEnabled', false)}
          >
            Disattiva
          </button>
        </div>
      ) : (
        <div className="space-y-2 px-4">
          <p className="text-small text-steel">
            Ricevi un avviso a fine recupero anche con lo schermo bloccato.
          </p>
          <button type="button" className="btn-secondary" onClick={enable}>
            Attiva notifiche
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="px-4 pt-2 text-small">
          {error}
        </p>
      )}
    </>
  );
}
