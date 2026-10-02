import { useRegisterSW } from 'virtual:pwa-register/react';

/** Registers the service worker; shows the update notice. Never mount it in workout mode. */
export function UpdatePrompt({ hidden = false }: { hidden?: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh || hidden) return null;
  return (
    <div className="flex items-center gap-3 border-t border-steel/25 bg-iron px-4 py-1">
      <p className="flex-1 text-small">Nuova versione disponibile</p>
      <button
        type="button"
        className="min-h-11 px-2 font-semibold"
        onClick={() => void updateServiceWorker(true)}
      >
        Aggiorna
      </button>
    </div>
  );
}
