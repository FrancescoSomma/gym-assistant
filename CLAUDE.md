# Palestra

PWA personale, per un solo utente, che serve a programmare e registrare gli allenamenti in palestra. Si usa installata sulla schermata Home di un iPhone ed è local-first: tutti i dati vivono in IndexedDB sul dispositivo. L'unico backend è un Cloudflare Worker che invia la notifica push di fine recupero (Fase 2) e non riceve mai dati di allenamento.

La specifica completa è in `docs/SPEC.md`: modello dati, schermate, regole di calcolo, design e roadmap con checklist. Prima di implementare o modificare una feature, leggi la sezione pertinente.

## Stack

- Bun come package manager e per gli script, Vite, TypeScript strict, React.
- Tailwind CSS v4 con i token in `@theme` (SPEC §11.2). Icone lucide-react. Nessuna libreria di componenti.
- Dexie.js con dexie-react-hooks (`useLiveQuery`) per IndexedDB.
- React Router. Zod per validare i backup importati e i payload delle API.
- Recharts, solo nelle route dei grafici, caricate in lazy.
- vite-plugin-pwa in modalità `injectManifest`: il service worker (`src/sw.ts`) è custom perché deve gestire le push.
- Cloudflare Workers con static assets per l'hosting; Durable Objects con alarm per il timer push.
- Vitest con fake-indexeddb per i test, Biome per lint e formattazione.

Non aggiungere dipendenze senza chiedere.

## Comandi (da creare in Fase 0)

- `bun run dev`: server di sviluppo
- `bun run build`, `bun run preview`
- `bun run test`: Vitest
- `bun run check`: typecheck, lint e test
- `bun run deploy`: build e deploy su Cloudflare

## Convenzioni

- Interfaccia in italiano. Codice, identificatori, commenti e messaggi di commit in inglese (Conventional Commits).
- I calcoli di dominio (e1RM, volume, rotazione delle giornate, precompilazione, progressione, settimane) sono funzioni pure in `src/domain/`, ognuna con i suoi test. I componenti non fanno calcoli.
- Il database si usa solo attraverso `src/db/`: i componenti non accedono direttamente alle tabelle Dexie.
- Timestamp in epoch ms (`number`), date di calendario come stringhe `YYYY-MM-DD`, pesi in kg (`number`), ID generati con `crypto.randomUUID()`.
- Numeri formattati con `Intl.NumberFormat('it-IT')`. L'input del peso accetta sia la virgola sia il punto: "82,5" e "82.5" valgono uguale.
- Nei riepiloghi le serie si separano con " / ", perché la virgola è già il separatore decimale: `80×10 / 80×9 / 77,5×8`.
- Testi dell'interfaccia secondo SPEC §11.4.

## Dati: regole non negoziabili

- Lo storico non si perde mai. Esercizi e programmi già usati si archiviano (`archivedAt`), non si cancellano.
- Le sessioni sono snapshot: modificare o eliminare un programma non cambia nulla nelle sessioni passate.
- Schema Dexie: non modificare mai una versione esistente. Ogni cambiamento è una nuova `db.version(n)` con `upgrade()`, insieme alla migrazione del formato di backup.
- In modalità allenamento ogni modifica si scrive subito in IndexedDB. Se iOS chiude l'app, alla riapertura si riprende dalla stessa serie.
- IndexedDB non indicizza booleani né valori `undefined`. Niente indici su flag: il programma attivo sta in `settings.activeProgramId`.
- Niente `localStorage` né `sessionStorage` per i dati dell'app.
- I dati sono legati all'origine (dominio). Il dominio di produzione resta sempre lo stesso; cambiarlo significa passare da export e import.

## Vincoli di iOS (Safari, PWA avviata dalla Home)

- In background il JavaScript viene sospeso. Ogni timer si calcola da un `endAt` salvato, mai decrementando un contatore, e si ricalcola a ogni `visibilitychange`.
- Il Wake Lock viene rilasciato quando la pagina si nasconde: durante l'allenamento va riacquisito a ogni ritorno in primo piano.
- Web Push funziona solo in `display-mode: standalone`. Il permesso si chiede solo in risposta a un tocco. Ogni push ricevuta deve mostrare una notifica, altrimenti Safari può revocare la subscription.
- `navigator.vibrate` non esiste: niente feedback aptico.
- Input con `font-size` di almeno 16px, altrimenti Safari ingrandisce la pagina al focus. `inputmode="decimal"` per i pesi, `"numeric"` per ripetizioni e secondi.
- `viewport-fit=cover` ed `env(safe-area-inset-*)` per tab bar e barra del timer.
- I dati della web app sono separati da quelli di Safari e spariscono se l'icona viene rimossa dalla Home. Per questo il backup è una funzione centrale, non un extra.
- Al primo avvio chiama `navigator.storage.persist()`.
- Service worker e `crypto.randomUUID()` richiedono un contesto sicuro: sull'iPhone si prova tramite deploy o tunnel HTTPS, mai su `http://<ip-locale>`.
- Aggiornamenti del service worker con `registerType: 'prompt'`. Mai ricaricare l'app durante un allenamento in corso.

## Come lavorare

- Segui le fasi della roadmap (SPEC §12), una feature alla volta, e spunta la checklist man mano.
- Per modifiche allo schema del DB o all'architettura, proponi prima un piano breve (file, tabelle, migrazioni) e aspetta conferma.
- Per configurazioni che cambiano spesso (wrangler e Workers static assets, @cloudflare/vite-plugin, vite-plugin-pwa, Web Push nel runtime Workers) consulta la documentazione aggiornata invece di andare a memoria.
- Una feature è completa quando `bun run check` passa.
