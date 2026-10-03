import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tab } from './Tab';

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
    <div className="flex items-center gap-3 bg-tribuna py-1 pr-2 rule-t">
      <Tab className="self-stretch label-text">Nuova versione disponibile</Tab>
      <span className="flex-1" />
      <button type="button" className="btn-text" onClick={() => void updateServiceWorker(true)}>
        Aggiorna
      </button>
    </div>
  );
}
