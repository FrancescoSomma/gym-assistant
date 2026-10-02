# Palestra — Specifica

## 1. Obiettivo e principi

Diario di allenamento personale per iPhone, con due momenti d'uso distinti:

- **Pianificazione**, fuori dalla palestra: creare programmi, giornate ed esercizi, consultare storico e progressi.
- **Modalità allenamento**, in palestra: registrare le serie con una mano, tra una serie e l'altra, con il timer di recupero.

Principi:

- **Local-first e offline.** Tutto funziona senza rete. La rete serve solo per le notifiche del timer.
- **Un solo utente.** Niente account, login o sincronizzazione.
- **Velocità in palestra.** Se ripeti quello che hai fatto l'ultima volta, registrare una serie richiede un solo tocco.
- **Lo storico è intoccabile.** Nessuna modifica ai programmi può alterare le sessioni passate.
- Solo kg, solo italiano.

## 2. Glossario

- **Esercizio**: un movimento della libreria (es. Panca piana con bilanciere), con un gruppo muscolare principale.
- **Gruppo muscolare**: uno dei 7 gruppi fissi: petto, schiena, spalle, gambe, bicipiti, tricipiti, addome.
- **Programma**: insieme ordinato di giornate. Uno solo alla volta è attivo.
- **Giornata**: una seduta tipo del programma (A, B, C…), con una lista ordinata di esercizi e i relativi target.
- **Sessione**: una giornata eseguita in una data precisa. È uno snapshot indipendente dal programma.
- **Serie di lavoro / serie di riscaldamento**: nelle statistiche entrano solo le serie di lavoro completate.
- **Recupero**: pausa dopo una serie, con durata specifica per esercizio.
- **e1RM**: massimale stimato con la formula di Epley.
- **Volume**: tonnellaggio, cioè la somma di peso × ripetizioni delle serie di lavoro.

## 3. Architettura

```
iPhone (PWA avviata dalla Home)
├─ UI React
├─ Dexie → IndexedDB        tutti i dati
└─ Service worker           cache offline, ricezione delle push
        │
        │  POST / DELETE /api/timer   (solo durata del recupero + push subscription)
        ▼
Cloudflare Worker           stesso deploy degli asset statici
└─ Durable Object per subscription → alarm → Web Push → servizio push Apple → notifica
```

- **Fase 0–1**: deploy di soli asset statici, senza codice Worker.
- **Fase 2**: si aggiungono il Worker con le route `/api/*` e il Durable Object.

### 3.1 Struttura del progetto (indicativa)

```
gym-log/
├─ CLAUDE.md
├─ docs/SPEC.md
├─ index.html
├─ public/                  icone, apple-touch-icon, font
├─ scripts/gen-vapid.ts     (Fase 2)
├─ src/
│  ├─ main.tsx, App.tsx, routes.tsx
│  ├─ sw.ts                 service worker: precache + push
│  ├─ components/           primitive UI: Button, Stepper, Sheet, ListRow…
│  ├─ features/             today, programs, library, workout, history, progress, settings
│  ├─ db/                   schema, repository, seed, backup, migrazioni
│  ├─ domain/               funzioni pure + *.test.ts
│  ├─ platform/             wakeLock, storage, push, sound, standalone
│  └─ styles/index.css      Tailwind + @theme
├─ worker/                  (Fase 2) index.ts, timer-do.ts, web-push.ts
├─ vite.config.ts
└─ wrangler.jsonc
```

### 3.2 Hosting

- Asset statici su Cloudflare Workers, con fallback SPA per le richieste di navigazione. Verifica la sintassi attuale della configurazione (es. `not_found_handling`).
- Dominio stabile fin dal primo deploy (il sottodominio `workers.dev` del Worker `gym-log` va bene): i dati sono legati all'origine.
- In Fase 2 le richieste `/api/*` devono arrivare al Worker prima del fallback SPA (es. `run_worker_first`, da verificare). Il service worker deve escludere `/api/` dal `navigateFallback`.

## 4. Modello dati

```ts
type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'biceps' | 'triceps' | 'abs';
type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';
type TrackingType = 'weight_reps' | 'bodyweight_reps' | 'duration';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryGroups: MuscleGroup[];  // usati dalla Fase 3, contano 0,5
  equipment: Equipment;
  trackingType: TrackingType;
  weightStepKg?: number;           // sostituisce l'incremento predefinito dell'attrezzo
  notes: string;                   // nota permanente, es. "sedile al 4"
  isBuiltIn: boolean;              // proviene dal seed
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface Program {
  id: string;
  name: string;
  notes: string;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface Day {
  id: string;
  programId: string;
  label: string;         // "A", "B", "C"…: proposta automatica, modificabile
  name: string;          // facoltativo, es. "Petto e tricipiti"
  order: number;
}

interface DayExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  sets: number;          // serie di lavoro previste
  repMin: number;        // ignorati per 'duration'
  repMax: number;
  targetSec?: number;    // solo per 'duration'
  restSec: number;
  notes: string;         // nota valida solo in questa giornata
  supersetKey?: string;  // Fase 3
}

interface Session {
  id: string;
  programId: string;
  dayId: string;
  dayLabel: string;      // snapshot
  dayName: string;       // snapshot
  status: 'in_progress' | 'completed';
  startedAt: number;
  endedAt?: number;
  notes: string;
}

interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  order: number;
  plannedSets: number;          // snapshot dei target al momento dell'avvio
  repMin: number;
  repMax: number;
  targetSec?: number;
  restSec: number;
  status: 'pending' | 'done' | 'skipped';
  dayExerciseId?: string;       // assente se aggiunto durante la sessione
  replacedExerciseId?: string;  // presente se è una sostituzione
  supersetKey?: string;
}

interface SetLog {
  id: string;
  sessionId: string;
  sessionExerciseId: string;
  exerciseId: string;
  index: number;          // ordine nella lista delle serie dell'esercizio
  isWarmup: boolean;
  weightKg?: number;      // per 'bodyweight_reps' è il carico aggiunto (0 = corpo libero)
  reps?: number;
  durationSec?: number;
  completedAt?: number;   // assente = serie prevista, precompilata ma non ancora eseguita
}

interface Bodyweight {    // Fase 3
  id: string;
  date: string;           // YYYY-MM-DD
  kg: number;
}

interface Setting {
  key: string;
  value: unknown;
}
```

### 4.1 Schema Dexie, versione 1

```ts
db.version(1).stores({
  exercises:        'id, name, muscleGroup',
  programs:         'id',
  days:             'id, programId',
  dayExercises:     'id, dayId, exerciseId',
  sessions:         'id, status, startedAt, programId, dayId',
  sessionExercises: 'id, sessionId, exerciseId',
  setLogs:          'id, sessionId, sessionExerciseId, [exerciseId+completedAt]',
  bodyweights:      'id, date',
  settings:         'key',
});
```

L'indice composto `[exerciseId+completedAt]` esclude automaticamente le serie previste (senza `completedAt`): le query sullo storico vedono solo le serie eseguite. È voluto.

### 4.2 Impostazioni

| Chiave | Tipo | Default |
|---|---|---|
| `activeProgramId` | string, null se assente | null |
| `weeklyGoal` | number (allenamenti a settimana) | 3 |
| `defaultRestSec` | number | 90 |
| `autoStartTimer` | boolean | true |
| `timerSound` | boolean | true |
| `weightSteps` | incremento in kg per attrezzo | bilanciere 2,5; manubri 2; macchina 5; cavi 2,5; corpo libero 2,5; altro 2,5 |
| `activeTimer` | `{ sessionExerciseId, endAt, label }`, null se assente | null |
| `pushEnabled` | boolean | false |
| `lastBackupAt` | number, null se mai fatto | null |
| `seedVersion` | number | versione del seed applicato |

### 4.3 Regole di integrità

- Può esistere una sola sessione `in_progress` alla volta.
- Quando una sessione termina, le serie senza `completedAt` vengono eliminate (con conferma se ce ne sono).
- "Scarta allenamento" elimina la sessione con le sue SessionExercise e SetLog, dopo conferma.
- Un esercizio si può eliminare solo se non compare in nessun programma né sessione. Altrimenti si archivia: sparisce dal selettore e resta nello storico.
- Un programma si può eliminare solo se nessuna sessione lo referenzia. Altrimenti si archivia. Il programma attivo non si può archiviare.
- Eliminare una giornata, o un esercizio da una giornata, non tocca le sessioni.
- Seed: al primo avvio si inserisce la libreria di §13. `seedVersion` evita i duplicati.

## 5. Navigazione e schermate

Tab bar con quattro sezioni: **Oggi**, **Programmi**, **Storico**, **Progressi**. Le impostazioni si aprono dall'icona in alto nella schermata Oggi. In modalità allenamento la tab bar sparisce.

Se c'è una sessione in corso e l'utente è uscito dalla modalità allenamento, sopra la tab bar compare una barra "Allenamento in corso" che riporta dentro con un tocco.

| Route | Schermata | Fase |
|---|---|---|
| `/` | Oggi | 1 |
| `/programs` | Programmi ed Esercizi (controllo segmentato) | 1 |
| `/programs/:programId` | Editor del programma | 1 |
| `/programs/:programId/days/:dayId` | Editor della giornata | 1 |
| `/exercises/:exerciseId` | Dettaglio esercizio | 1 base, 2 grafici |
| `/workout/:sessionId` | Modalità allenamento | 1 |
| `/workout/:sessionId/summary` | Riepilogo | 1 |
| `/history` | Storico | 2 |
| `/history/:sessionId` | Dettaglio sessione, modificabile | 2 |
| `/progress` | Progressi | 2–3 |
| `/settings` | Impostazioni | 1 |

### 5.1 Oggi

- Se c'è una sessione in corso, in cima compare "Riprendi allenamento".
- Altrimenti mostra la prossima giornata del programma attivo (§8.4): etichetta, nome, elenco degli esercizi con serie × ripetizioni, e il pulsante "Inizia allenamento". Sotto, "Scegli un'altra giornata".
- Settimana corrente: allenamenti svolti rispetto all'obiettivo.
- Promemoria del backup, quando serve (§9).
- Senza programma attivo: "Nessun programma attivo. Crea il primo per iniziare ad allenarti."

### 5.2 Programmi

- Elenco dei programmi, con quello attivo in evidenza. Azioni: "Nuovo programma", "Duplica", "Attiva", "Archivia" o "Elimina" secondo §4.3. Gli archiviati stanno in una sezione richiudibile.
- **Editor del programma**: nome, note, elenco delle giornate con etichetta, nome e numero di esercizi. "Aggiungi giornata" propone la lettera successiva. Riordino con i pulsanti sposta su e sposta giù (niente drag and drop in Fase 1).
- **Editor della giornata**: esercizi in ordine con serie × range di ripetizioni (o secondi) e recupero. "Aggiungi esercizio" apre il selettore, con ricerca, filtri per gruppo muscolare e la possibilità di creare un esercizio nuovo. Un tocco su un esercizio apre il foglio di modifica: serie (1–10), ripetizioni minime e massime, recupero (60, 90, 120, 180 s o personalizzato), nota di giornata. Valori predefiniti: 3 serie da 8–12, recupero dalle impostazioni.

### 5.3 Esercizi

- Ricerca, filtri per gruppo, elenco raggruppato per gruppo muscolare.
- "Nuovo esercizio": nome, gruppo, attrezzo, tipo di registrazione (peso e ripetizioni, solo ripetizioni, durata), note. I gruppi secondari arrivano in Fase 3.
- Dettaglio: nota permanente modificabile, attrezzo, incremento del peso, ultime sessioni. Grafici e record in Fase 2.

### 5.4 Storico (Fase 2)

- Sessioni in ordine di data decrescente, raggruppate per mese: data, giornata, durata, serie, volume.
- Dettaglio: esercizi con le relative serie. Si possono modificare peso, ripetizioni e durata, attivare o togliere il riscaldamento, eliminare una serie, scrivere note ed eliminare la sessione, con conferma.

### 5.5 Progressi (Fase 2–3)

Tre segmenti: Esercizi, Gruppi muscolari, Costanza. Contenuti in §8.7.

### 5.6 Impostazioni

- Obiettivo settimanale, recupero predefinito, avvio automatico del timer, suono a fine recupero, incrementi di peso per attrezzo.
- Notifiche del timer (Fase 2): stato e pulsante "Attiva notifiche". Se l'app non è stata avviata dalla Home, spiega come aggiungerla.
- Backup: "Esporta backup", "Importa backup" e data dell'ultimo backup.
- Archiviazione: spazio usato (`navigator.storage.estimate()`) e stato della persistenza.
- Versione dell'app.

## 6. Modalità allenamento

### 6.1 Avvio

- "Inizia allenamento" crea, in un'unica transazione, la Session (`in_progress`), una SessionExercise per ogni DayExercise con lo snapshot dei target e, per ciascuna, le SetLog previste (`plannedSets`) precompilate secondo §8.3.
- Poi apre `/workout/:sessionId` e acquisisce il Wake Lock.

### 6.2 Layout

Wireframe in §11.5.

- **Intestazione**: pulsante per uscire (la sessione resta in corso), giornata, durata trascorsa, indice "3 di 6". Un tocco sull'indice apre l'elenco degli esercizi della sessione con lo stato di ciascuno, e permette di saltare a qualsiasi esercizio.
- **Corpo**: un esercizio alla volta. Nome in grande, target ("4 serie da 8–12, recupero 2 min"), nota permanente e nota di giornata, riga "Ultima volta". Un tocco sulla nota permanente la rende modificabile.
- **Serie**: numero (R per il riscaldamento), stepper del peso, stepper delle ripetizioni o della durata, pulsante di conferma. La prima serie non completata è quella corrente ed è evidenziata.
- Sotto le serie: "Aggiungi serie" e "Aggiungi riscaldamento".
- Menu dell'esercizio: "Sostituisci", "Salta", "Rimuovi".
- In basso: "Precedente" e "Successivo". Dopo l'ultimo esercizio: "Aggiungi esercizio" e "Termina allenamento".
- Barra del timer fissa in fondo (§7).

### 6.3 Registrare una serie

- Lo stepper del peso usa l'incremento dell'esercizio o, in mancanza, quello dell'attrezzo. Un tocco sul valore apre l'inserimento diretto (`inputmode="decimal"`).
- Ripetizioni ±1, durata ±5 s.
- Se modifichi il peso della serie corrente, anche le serie successive non completate che avevano lo stesso valore si aggiornano.
- La conferma imposta `completedAt`, marca la serie come completata e, se `autoStartTimer` è attivo, avvia il timer. Dalla Fase 2, una serie da record si evidenzia in giallo.
- Una serie completata si riapre con un tocco per correggerla. La correzione non riavvia il timer.
- Completata l'ultima serie, l'esercizio passa a `done` e l'app mostra il successivo.

### 6.4 Riscaldamento

Le serie di riscaldamento sono attenuate e marcate con R. Non avviano il timer e sono escluse da statistiche, record e precompilazione.

### 6.5 Sostituire, saltare, aggiungere

- **Sostituisci**: selettore filtrato sullo stesso gruppo muscolare, con l'opzione "Tutti i gruppi".
  - Senza serie di lavoro completate: la SessionExercise cambia `exerciseId`, salva `replacedExerciseId` e rigenera le serie previste con la precompilazione del nuovo esercizio.
  - Con serie già completate: l'esercizio corrente passa a `done` e il sostituto viene inserito subito dopo.
  - Il programma non cambia.
- **Salta**: stato `skipped`, si passa al successivo. Dall'elenco degli esercizi si può riprendere.
- **Rimuovi**: possibile solo se l'esercizio non ha serie completate.
- **Aggiungi esercizio**: nuova SessionExercise in fondo, con target predefiniti (3 serie da 8–12, recupero predefinito) e precompilazione.

### 6.6 Uscire e riprendere

- Uscendo si torna all'app, con la barra "Allenamento in corso".
- Dopo una chiusura forzata, Oggi mostra "Riprendi allenamento" e il timer si ripristina da `settings.activeTimer`.
- Se all'apertura c'è una sessione iniziata da più di 6 ore, l'app chiede cosa farne: "Termina", con `endedAt` pari all'ultima serie completata, oppure "Scarta".

### 6.7 Terminare

- Con serie non completate compare la conferma "Hai N serie non completate. Termina comunque?". Le serie non completate vengono eliminate, poi `endedAt = now` e `status = 'completed'`. Si rilascia il Wake Lock, si cancella il timer (e la push) e si apre il riepilogo.
- "Scarta allenamento", dal menu, elimina tutto dopo conferma.

### 6.8 Riepilogo

- Fase 1: durata, serie completate, volume totale, elenco degli esercizi con la serie migliore di ciascuno.
- Fase 2: record battuti e confronto con l'ultima sessione della stessa giornata, cioè variazione del volume in percentuale e miglior serie per esercizio ("82,5×8, l'ultima volta 80×8").
- Campo note e pulsante "Fatto".

## 7. Timer di recupero

### 7.1 Timer in app (Fase 1)

- Stato salvato in `settings.activeTimer = { sessionExerciseId, endAt, label }`.
- Si avvia alla conferma di una serie di lavoro, se `autoStartTimer` è attivo, anche dopo l'ultima serie di un esercizio. Durata: `restSec` della SessionExercise. Nelle superserie (Fase 3) parte solo a fine giro.
- Tempo rimanente = `max(0, endAt − Date.now())`, ricalcolato ogni 250 ms e a ogni `visibilitychange`. Mai decrementare un contatore.
- Azioni: "+15 s" (`endAt += 15000`) e "Salta" (`activeTimer = null`). Una nuova conferma sostituisce il timer attivo.
- Allo zero la barra diventa verde (`plate-green`) con "Recupero finito" e il tempo extra che scorre ("+0:12"), finché non confermi la serie successiva o la tocchi. Se `timerSound` è attivo suona un segnale breve via Web Audio, con il contesto audio sbloccato al primo tocco dell'utente. Nessuna vibrazione.

### 7.2 Notifica push (Fase 2)

Flusso:

1. Impostazioni, "Attiva notifiche": verifica la modalità standalone, poi `Notification.requestPermission()` dentro il gestore del tocco, poi `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` con la chiave VAPID pubblica. Infine `pushEnabled = true`.
2. All'avvio del timer e a ogni "+15 s": `POST /api/timer` con la **durata residua**, non con un orario assoluto. Il Worker calcola la scadenza con il proprio orologio, così una differenza tra gli orologi di telefono e server non sposta la notifica.
3. "Salta" e "Termina allenamento": `DELETE /api/timer`. Un nuovo timer sostituisce semplicemente il precedente con un nuovo POST.
4. Il Durable Object imposta l'alarm; in `alarm()` invia la Web Push e cancella il proprio stato.
5. Service worker: sull'evento `push` chiama sempre `showNotification(title, { body, tag: 'rest-timer' })`. Su `notificationclick` porta in primo piano la finestra dell'app, o la apre.

- All'avvio dell'app, se `pushEnabled` è attivo ma `getSubscription()` restituisce null e il permesso è ancora concesso, rifai la subscription in silenzio.
- Se la richiesta fallisce (per esempio offline), il timer in app funziona comunque e la barra mostra un'icona "notifica non programmata".

Contratto delle API:

```
POST /api/timer
{
  "subscription": { ...PushSubscriptionJSON },
  "durationMs": 90000,
  "title": "Recupero finito",
  "body": "Panca piana con bilanciere, serie 3 di 4"
}
→ 204

DELETE /api/timer
{ "endpoint": "https://web.push.apple.com/..." }
→ 204
```

Worker:

- Validazione con Zod: `durationMs` tra 1 000 e 3 600 000, `title` fino a 60 caratteri, `body` fino a 120.
- L'`endpoint` deve essere `https` con host in allowlist: `*.push.apple.com`, più `fcm.googleapis.com` e `updates.push.services.mozilla.com` per i test da desktop. Così il Worker non può essere usato per inviare richieste verso URL arbitrari.
- Istanza del Durable Object: `idFromName(sha256(endpoint))`. Solo chi conosce la subscription può programmare notifiche verso quel dispositivo, quindi non serve autenticazione.
- Ogni Durable Object ha al massimo un alarm; un nuovo POST lo sostituisce.
- Web Push: VAPID (RFC 8292) e payload cifrato `aes128gcm` (RFC 8291) con Web Crypto. Usa una libreria compatibile con il runtime Workers se ne esiste una mantenuta, altrimenti implementa. Header `TTL: 60`, perché una notifica di recupero in ritardo di minuti non serve, e `Urgency: high`.
- Se il servizio push risponde 404 o 410, la subscription è scaduta: il Durable Object cancella il proprio stato.
- Non loggare subscription né payload.
- Chiavi: `scripts/gen-vapid.ts` genera la coppia. La pubblica va in `VITE_VAPID_PUBLIC_KEY`, la privata come secret del Worker (`VAPID_PRIVATE_KEY`), insieme a `VAPID_SUBJECT` (`mailto:`).

## 8. Calcoli e statistiche

Tutto in `src/domain/`, come funzioni pure con test.

### 8.1 Definizioni

- **Serie valida** per le statistiche: ha `completedAt`, non è di riscaldamento e appartiene a una sessione `completed`.
- **Settimana**: da lunedì a domenica, in ora locale.

### 8.2 Formule

- **e1RM (Epley)**: `peso × (1 + rip / 30)` per ripetizioni da 2 a 12. Con 1 ripetizione vale il peso stesso; oltre 12 non si calcola. Solo per `weight_reps` con peso maggiore di zero. Per ogni sessione si prende il valore massimo.
- **Volume**: somma di peso × ripetizioni sulle serie valide degli esercizi `weight_reps`. Gli esercizi `bodyweight_reps` e `duration` non entrano nel tonnellaggio: per loro si mostrano ripetizioni totali o durata totale.
- **Serie settimanali per gruppo**: ogni serie valida conta 1 per il gruppo principale e, dalla Fase 3, 0,5 per ogni gruppo secondario. Il grafico mostra una fascia di riferimento di 10–20 serie, etichettata come indicativa.

### 8.3 Precompilazione

- Per l'esercizio E si cerca l'ultima sessione completata con serie valide di E (indice `[exerciseId+completedAt]` in ordine decrescente) e se ne prendono le serie valide ordinate per `index`.
- La serie prevista i riceve i valori della serie i dell'ultima volta. Se l'ultima volta le serie erano meno, si ripete l'ultima.
- Senza storico: peso e ripetizioni vuoti, con il target come placeholder. Per confermare bisogna inserire i valori.
- Riga "Ultima volta": data relativa e serie, per esempio `4 giorni fa: 80×10 / 80×9 / 80×8`.
- La precompilazione segue l'esercizio, non la giornata: lo storico della panca continua anche cambiando programma.

### 8.4 Rotazione delle giornate

Le giornate del programma attivo sono ordinate per `order`. La prossima è quella che segue la giornata dell'ultima sessione completata di quel programma, ripartendo dall'inizio dopo l'ultima. Se non ci sono sessioni, o la giornata non esiste più, si parte dalla prima.

### 8.5 Record personali (Fase 2)

- `weight_reps`: miglior e1RM, carico massimo, volume massimo in una sessione.
- `bodyweight_reps`: massimo di ripetizioni in una serie.
- `duration`: durata massima.
- Si rilevano alla conferma della serie, confrontando con lo storico precedente alla sessione corrente.

### 8.6 Suggerimento di progressione (Fase 3)

Doppia progressione: se nell'ultima sessione tutte le serie di lavoro previste hanno raggiunto `repMax`, l'app suggerisce di aumentare il peso di un incremento. Il suggerimento compare accanto alla riga "Ultima volta" e non si applica mai da solo: un tocco lo applica alle serie previste.

### 8.7 Grafici

- **Esercizio**: e1RM per sessione (linea), volume per sessione (barre), tabella dei record. Periodi: 3 mesi, 6 mesi, 1 anno, tutto.
- **Gruppi muscolari**: serie della settimana per gruppo (barre orizzontali con la fascia 10–20) e andamento delle ultime 12 settimane.
- **Costanza**: calendario mensile dei giorni di allenamento e allenamenti per settimana rispetto all'obiettivo.
- Gli aggregati si calcolano al volo da `src/domain/`: con i volumi di dati di un solo utente non serve una cache.

## 9. Backup e ripristino

Formato:

```json
{
  "app": "gym-log",
  "schemaVersion": 1,
  "exportedAt": "2026-09-10T18:30:00.000Z",
  "data": {
    "exercises": [], "programs": [], "days": [], "dayExercises": [],
    "sessions": [], "sessionExercises": [], "setLogs": [],
    "bodyweights": [], "settings": []
  }
}
```

- **Export**: file `palestra-backup-AAAA-MM-GG.json`. Se `navigator.canShare({ files })` è vero si usa `navigator.share({ files })`, così il file si salva su iCloud Drive; altrimenti si scarica. `lastBackupAt` si aggiorna solo se la condivisione va a buon fine (un `AbortError` significa annullata). Dalle impostazioni esportate si escludono `activeTimer` e `pushEnabled`.
- **Import**: validazione con Zod e migrazione se `schemaVersion` è più vecchia. Poi un'anteprima (numero di programmi e di sessioni, data dell'ultima sessione) e la conferma "Sostituisci tutti i dati". Svuotamento e reinserimento avvengono in un'unica transazione. Nessuna fusione tra dati vecchi e nuovi.
- **Promemoria**: in Oggi, se `lastBackupAt` manca o ha più di 7 giorni e dopo di esso c'è almeno una sessione completata.
- **Test**: export, import e nuovo export devono produrre dati identici, a parte `exportedAt`.

## 10. PWA e iOS

Manifest:

- `name` e `short_name`: "Palestra" (provvisorio), `lang: "it"`, `display: "standalone"`, `orientation: "portrait"`, `start_url` e `scope`: `"/"`.
- `background_color` e `theme_color`: `#1F1E1C`. Icone 192, 512 e 512 maskable.

`index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1F1E1C">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">  <!-- 180×180, senza trasparenza -->
```

CSS di base:

- `overscroll-behavior: none` su `html` e `body`.
- `touch-action: manipulation` sugli elementi interattivi.
- `-webkit-user-select: none` e `-webkit-touch-callout: none` sui controlli, non sui testi.
- Margini con `env(safe-area-inset-*)`.

Service worker:

- Precache di tutti gli asset di build, font compresi. `navigateFallback` su `index.html`, con `/api/` escluso. Nessuna cache delle risposte `/api`.
- Aggiornamenti con `registerType: 'prompt'`: un avviso "Nuova versione disponibile" con "Aggiorna", mostrato solo fuori dalla modalità allenamento.

Modalità standalone: `matchMedia('(display-mode: standalone)').matches || navigator.standalone`.

Test sull'iPhone: servono HTTPS e un dominio diverso da quello di produzione, per non mescolare i dati. Si usa un deploy di anteprima oppure un tunnel HTTPS verso il server di sviluppo, aggiungendo l'host del tunnel a `server.allowedHosts` di Vite. Safari Web Inspector richiede un Mac; in alternativa una console in pagina caricata solo con `?debug`, mai nel bundle principale.

## 11. Design

### 11.1 Principi

- **Il numero è l'interfaccia.** In allenamento peso, ripetizioni e timer sono gli elementi più grandi dello schermo; tutto il resto è secondario.
- **Un solo elemento audace: la barra del timer.** Numeri grandi, una linea sottile che si svuota, il verde a fine recupero. Il resto dell'interfaccia è sobrio.
- **Zona del pollice.** Le azioni principali stanno nella metà inferiore, le informazioni in alto.
- **Righe, non card.** Elenchi a righe con separatori; la gerarchia nasce da tipografia e spazio, non da riquadri e ombre.
- Testi allineati a sinistra; numeri in colonne allineate a destra, con cifre tabellari.
- Target touch di almeno 44 pt, 56 pt in modalità allenamento.
- Movimento solo in risposta a un'azione (conferma della serie, fine del recupero), rispettando `prefers-reduced-motion`. Niente animazioni di ingresso né gradienti decorativi.
- Solo tema scuro, pensato per la palestra e per ridurre i riflessi.

### 11.2 Colori

La palette nasce dal codice colore dei dischi olimpici (25 kg rosso, 20 blu, 15 giallo, 10 verde). Ogni colore dei dischi ha un solo significato e non si usa mai come decorazione.

| Token | Hex | Uso |
|---|---|---|
| `rubber` | `#1F1E1C` | sfondo, come il pavimento in gomma |
| `iron` | `#2E2C29` | superfici, fogli, riga della serie corrente |
| `chalk` | `#EDEBE6` | testo principale |
| `steel` | `#9C978E` | testo secondario; separatori al 25% di opacità |
| `plate-blue` | `#2B5DD8` | azione primaria, serie corrente |
| `plate-yellow` | `#F0C419` | record personali |
| `plate-green` | `#2FA45A` | recupero finito, serie completate |
| `plate-red` | `#D93A2F` | azioni distruttive |

- Il testo sui pulsanti blu è `chalk` (contrasto di circa 4,6:1).
- Il calcolatore dei dischi (Fase 3) usa i colori reali: 25 rosso, 20 blu, 15 giallo, 10 verde, 5 bianco, 2,5 e 1,25 acciaio.

### 11.3 Tipografia

- **Numeri** (peso, ripetizioni, timer, statistiche): Big Shoulders Display, semibold o bold, con `font-variant-numeric: tabular-nums`. Verifica che il font abbia le cifre tabellari; se non le ha, usa Barlow Condensed. Font self-hosted in woff2 e inclusi nel precache, così funzionano offline.
- **Testo dell'interfaccia**: font di sistema (`system-ui`, cioè SF Pro su iPhone), per leggibilità e coerenza con iOS.
- **Scala**: timer 64 px; valori negli stepper 32 px; nome dell'esercizio 28 px; titoli 22 px; testo 17 px; secondario 15 px; minimo 13 px.

### 11.4 Testi

- Italiano, frasi con la sola iniziale maiuscola. Niente etichette tutte in maiuscolo.
- Verbi attivi che dicono cosa succede: "Inizia allenamento", "Termina allenamento", "Scarta allenamento", "Esporta backup". La stessa azione ha lo stesso nome in tutto il flusso: il pulsante "Termina allenamento" porta al riepilogo intitolato "Allenamento terminato".
- Errori specifici che indicano la soluzione, senza scuse: "Backup non valido: manca l'elenco degli esercizi. Scegli un file esportato da Palestra."
- Stati vuoti come invito all'azione: "Nessun allenamento registrato. Inizia il primo dalla schermata Oggi."
- Nomi dal punto di vista dell'utente: "Notifiche del timer", non "Web Push".

### 11.5 Wireframe della modalità allenamento

```
┌───────────────────────────────────────┐
│ ✕     Giornata A     24:13     3 di 6  │
│                                       │
│ Panca piana con bilanciere            │
│ 4 serie da 8–12, recupero 2 min       │
│ Sedile al 4                           │
│ 4 giorni fa: 80×10 / 80×9 / 80×8      │
│                                       │
│  R     60 kg          10         ✓    │  riscaldamento, attenuato
│  1   − 80 kg +     − 10 +        ✓    │  completata
│  2   − 80 kg +     −  9 +       [ ]   │  serie corrente, evidenziata
│  3   − 80 kg +     −  8 +       [ ]   │
│  4   − 80 kg +     −  8 +       [ ]   │
│                                       │
│  Aggiungi serie    Aggiungi riscald.  │
│                                       │
│  ‹ Precedente            Successivo › │
├───────────────────────────────────────┤
│  Recupero    1:42      +15 s   Salta  │  barra fissa, linea che si svuota
└───────────────────────────────────────┘
```

## 12. Roadmap

### Fase 0: scaffold

- [x] Progetto Vite + React + TypeScript strict con Bun; Tailwind v4 con i token di §11.2; Biome; Vitest
- [x] vite-plugin-pwa (`injectManifest`) con `src/sw.ts`, manifest e icone come in §10
- [ ] Deploy su Cloudflare Workers con soli asset statici e fallback SPA
- [ ] Criterio: l'app si installa dalla Home dell'iPhone e si apre in modalità aereo

### Fase 1: MVP da palestra

- [ ] Schema Dexie v1, repository, seed della libreria (§13)
- [ ] Libreria esercizi: elenco, ricerca, filtri, creazione, modifica, archiviazione
- [ ] Programmi: creazione, modifica, duplicazione, attivazione, archiviazione; giornate ed esercizi di giornata
- [ ] Oggi: prossima giornata, avvio, ripresa
- [ ] Modalità allenamento completa (§6) con Wake Lock
- [ ] Timer in app (§7.1)
- [ ] Riepilogo base
- [ ] Backup: export, import, promemoria; `storage.persist()`
- [ ] Impostazioni, escluse le notifiche
- [ ] Test di dominio: precompilazione, rotazione, volume, e1RM, lettura del peso con virgola e punto
- [ ] Criteri: un allenamento completo in modalità aereo; chiusura forzata a metà e ripresa dalla stessa serie; export, import ed export di nuovo producono dati identici

### Fase 2: notifiche e storico

- [ ] Worker, Durable Object e Web Push (§7.2), script VAPID, allowlist degli endpoint
- [ ] Impostazioni delle notifiche e gestione della subscription
- [ ] Storico con modifica delle sessioni
- [ ] Record personali e loro rilevamento in allenamento
- [ ] Dettaglio esercizio con grafici
- [ ] Riepilogo con record e confronto con l'ultima volta
- [ ] Criteri: a schermo bloccato la notifica arriva entro pochi secondi dalla fine del recupero; "+15 s" la sposta; "Salta" e "Termina allenamento" la annullano; offline il timer in app funziona comunque

### Fase 3: analisi e rifiniture

- [ ] Gruppi secondari negli esercizi e serie settimanali per gruppo
- [ ] Costanza: calendario e obiettivo settimanale
- [ ] Suggerimento di progressione (§8.6)
- [ ] Superserie (`supersetKey`): esercizi alternati, timer solo a fine giro
- [ ] Peso corporeo
- [ ] Calcolatore dei dischi, con bilanciere da 20 kg di default

## 13. Libreria esercizi iniziale

Tra parentesi l'attrezzo e, dopo il punto e virgola, gli eventuali gruppi secondari. Il tipo di registrazione deriva dall'attrezzo: "corpo libero" diventa `bodyweight_reps`, "durata" diventa `duration` (con attrezzo corpo libero), tutto il resto `weight_reps`.

**Petto**: Panca piana con bilanciere (bilanciere; tricipiti, spalle), Panca inclinata con bilanciere (bilanciere; spalle), Panca piana con manubri (manubri), Panca inclinata con manubri (manubri), Croci con manubri (manubri), Croci ai cavi (cavi), Chest press (macchina), Pectoral machine (macchina), Dip alle parallele (corpo libero; tricipiti), Piegamenti (corpo libero; tricipiti).

**Schiena**: Stacco da terra (bilanciere; gambe), Trazioni alla sbarra (corpo libero; bicipiti), Lat machine (cavi; bicipiti), Rematore con bilanciere (bilanciere), Rematore con manubrio (manubri), Pulley basso (cavi), Pulldown a braccia tese (cavi), T-bar row (macchina), Hyperextension (corpo libero).

**Spalle**: Military press (bilanciere; tricipiti), Lento avanti con manubri (manubri), Shoulder press (macchina), Alzate laterali con manubri (manubri), Alzate laterali ai cavi (cavi), Alzate frontali (manubri), Alzate posteriori (manubri), Face pull (cavi), Tirate al mento (bilanciere).

**Gambe**: Squat con bilanciere (bilanciere), Front squat (bilanciere), Leg press (macchina), Hack squat (macchina), Affondi con manubri (manubri), Bulgarian split squat (manubri), Stacco rumeno (bilanciere), Leg extension (macchina), Leg curl (macchina), Hip thrust (bilanciere), Calf raise in piedi (macchina).

**Bicipiti**: Curl con bilanciere (bilanciere), Curl con manubri (manubri), Curl a martello (manubri), Curl alla panca Scott (bilanciere), Curl su panca inclinata (manubri), Curl concentrato (manubri), Curl ai cavi (cavi).

**Tricipiti**: French press (bilanciere), Pushdown ai cavi (cavi), Estensioni sopra la testa ai cavi (cavi), Estensioni sopra la testa con manubrio (manubri), Kickback (manubri), Panca presa stretta (bilanciere; petto), Dip alla panca (corpo libero).

**Addome**: Crunch (corpo libero), Crunch ai cavi (cavi), Crunch inverso (corpo libero), Leg raise alla sbarra (corpo libero), Russian twist (corpo libero), Ab wheel (corpo libero), Plank (durata), Plank laterale (durata).

## 14. Fuori ambito

Account e login, sincronizzazione tra dispositivi, funzioni social, integrazione con Salute e Apple Watch, più utenti, libbre, lingue diverse dall'italiano, tema chiaro.
