import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Always registers the service worker and re-checks for updates when the app returns to the
 * foreground. `hidden` only suppresses the update notice (e.g. in workout mode).
 */
export function UpdatePrompt({ hidden = false }: { hidden?: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // A suspended iOS standalone app only checks for a new SW on cold launch.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration?.update();
      });
    },
  });
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
