import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ensureSeed } from './db/seed';
import { requestPersistentStorage } from './platform/storage';
import './styles/index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

ensureSeed()
  .then(() => {
    void requestPersistentStorage();
    root.render(
      <StrictMode>
        <App />
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
