import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { ensureSeed } from './db/seed';
import { getSettings } from './db/settings';
import { renewSubscription } from './platform/push';
import { unlockAudio } from './platform/sound';
import { requestPersistentStorage } from './platform/storage';
import { router } from './routes';
import './styles/index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

document.addEventListener('pointerup', unlockAudio, { capture: true, passive: true });

ensureSeed()
  .then(() => {
    void requestPersistentStorage();
    void getSettings().then((settings) => {
      if (settings.pushEnabled) void renewSubscription().catch(() => {}); // retried at next start
    });
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    root.render(
      <p className="p-4">
        Impossibile aprire i dati sul dispositivo ({String(error)}). Chiudi e riapri l'app.
      </p>,
    );
  });
