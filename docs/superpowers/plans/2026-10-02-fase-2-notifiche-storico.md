# Fase 2 — Notifiche e storico: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** notifica push di fine recupero a schermo bloccato, storico modificabile, record personali evidenziati in allenamento, grafici per esercizio, riepilogo con record e confronto, schermata Progressi.

**Architecture:**
- **Worker.** Lo stesso deploy degli asset riceve un Worker (`worker/index.ts`), raggiunto solo dalle richieste `/api/*`. Valida con Zod e inoltra a un Durable Object per subscription, il cui nome è `sha256(endpoint)`. Il Durable Object imposta un alarm e, allo scadere, invia una Web Push cifrata `aes128gcm` con VAPID tramite `@block65/webcrypto-web-push`.
- **Client.** Rispecchia ogni cambio del timer in app con una POST o una DELETE "fire and forget": il timer in app resta la fonte di verità.
- **Storico, record e grafici.** Funzioni pure in `src/domain/`, calcolate al volo. I grafici (Recharts) stanno in componenti caricati in lazy.

**Tech Stack:** Cloudflare Workers + Durable Objects (SQLite) + alarm, Wrangler 4.147, `@block65/webcrypto-web-push` 2.0.0, Zod 4, Recharts 3.10.1.

**Spec:** `docs/SPEC.md` §3, §5.4, §5.5, §6.3, §6.8, §7.2, §8.5, §8.7, §12 "Fase 2". Prerequisito: Fase 1 completata (`2026-10-02-fase-1-mvp.md`).

## Versioni e fatti verificati (2026-10-02)

- **Durable Objects.**
  - Sul piano Free solo backend SQLite. La configurazione dichiarativa è `"exports": { "TimerDO": { "type": "durable-object", "storage": "sqlite" } }` e sostituisce l'array `migrations`, da Wrangler 4.107. Dopo il primo deploy con `exports` non si torna a `migrations`.
  - Lo stub si ottiene con `env.TIMER.getByName(name)` e i metodi pubblici si chiamano via RPC.
  - `setAlarm` sostituisce l'alarm esistente. Con `compatibility_date` dal 2026-02-24, `deleteAll()` cancella anche l'alarm.
- **Routing.** `assets.run_worker_first: ["/api/*"]` manda al Worker solo `/api/*`. Tutto il resto va agli asset, con il fallback SPA.
- **Tipi e segreti.**
  - `wrangler types` genera `worker-configuration.d.ts` con `Env`: non serve `@cloudflare/workers-types`.
  - I segreti locali stanno in `.dev.vars`. Se quel file esiste, Wrangler non carica `.env` come segreti del Worker.
- **Libreria push.** `@block65/webcrypto-web-push` 2.0.0 (pubblicata il 2026-09-03) usa `aes128gcm` e lo schema VAPID RFC 8292. Le versioni 1.x e `@pushforge/builder` usano ancora `aesgcm`, che Apple rifiuta. API: `buildPushPayload(message, subscription, vapid)` restituisce `{ method, headers, body }` da passare a `fetch(endpoint, …)`.
  - `publicKey` è il punto P-256 non compresso in base64url (87 caratteri).
  - `privateKey` è solo il campo `d` della JWK in base64url (43 caratteri).
- **Apple.**
  - Endpoint su `*.push.apple.com`.
  - `TTL` è obbligatorio; `Urgency: high` chiede la consegna immediata.
  - Il `sub` VAPID dev'essere `mailto:` o un URL.
  - 410 indica una subscription scaduta. Ogni push deve mostrare una notifica, altrimenti Safari revoca il permesso.
- **Recharts** 3.10.1.

**Dipendenze nuove:** `recharts` è nello stack. `@block65/webcrypto-web-push` è la libreria Web Push compatibile con il runtime Workers prevista da SPEC §7.2; va approvata dall'utente prima del Task 2 (`CLAUDE.md`: "Non aggiungere dipendenze senza chiedere").

## Global Constraints

Valgono tutte quelle della Fase 1, più queste.

- **API (SPEC §7.2).**
  - `POST /api/timer { subscription, durationMs, title, body }` → 204. `DELETE /api/timer { endpoint }` → 204.
  - Il client manda la **durata residua**, mai un orario assoluto: il Worker calcola la scadenza col proprio orologio.
- **Validazione Zod.** `durationMs` tra 1 000 e 3 600 000, `title` fino a 60 caratteri, `body` fino a 120. `endpoint` solo `https` e host `*.push.apple.com`, `fcm.googleapis.com` o `updates.push.services.mozilla.com`.
- **Durable Object.**
  - Istanza `getByName(sha256(endpoint))`, nessuna autenticazione. Al massimo un alarm per istanza: un nuovo POST lo sostituisce.
  - Header `TTL: 60` e `Urgency: high`. Su 404 o 410 lo stato del Durable Object è cancellato.
- **Log e segreti.** Non loggare mai subscription né payload. Segreti: `VAPID_PRIVATE_KEY` come secret del Worker e in `.dev.vars`; `VITE_VAPID_PUBLIC_KEY` in `.env`.
- **Permessi e notifiche.**
  - Il permesso delle notifiche si chiede solo dentro il gestore di un tocco, e solo in `display-mode: standalone`.
  - Il service worker chiama sempre `showNotification(title, { body, tag: 'rest-timer' })` a ogni `push`.
- **Testi.** Nell'interfaccia si parla di "Notifiche del timer", mai di "Web Push".
- **Grafici.**
  - Una sola serie per grafico, oppure enfasi (`chalk` per la serie, `steel` per il contesto). Il giallo segna solo i record.
  - Mai due assi y. Linee da 2px, marcatori da almeno 8px con anello di 2px del colore di fondo, barre larghe al massimo 24px con estremità arrotondata di 4px.
  - Griglia orizzontale a righe sottili continue `steel` al 25%.
  - Il tooltip non è mai l'unico modo per leggere un valore: ogni grafico ha la sua tabella. Niente animazioni.
  - Validazione colori (skill dataviz): `chalk`, `steel` e `plate-yellow` superano il contrasto di 3:1 su `rubber` e la separazione CVD giallo/steel (ΔE 20,4). I controlli di luminosità e croma riguardano solo le palette categoriali, che qui non si usano.

## Deviazioni dalla spec, decise in questo piano

1. **`ActiveTimer.pushFailed?: boolean`.** È il valore di un'impostazione, quindi nessuna migrazione Dexie. Serve all'icona "notifica non programmata" e sopravvive a una riapertura.
2. **`tsconfig` passa a `lib: ES2024`** per usare `Map.groupBy` (Safari 17.4+, Node 21+), invece di scrivere un helper.
3. **Colori dei grafici.** Recharts vuole stringhe di colore, quindi i token sono copiati come costanti in `src/components/chartTheme.ts`, con un commento che rimanda a `@theme`.
4. **Progressi in Fase 2 mostra solo l'elenco degli esercizi allenati.** Il controllo segmentato a tre voci (Esercizi, Gruppi muscolari, Costanza) arriva con la Fase 3, quando esistono le altre due.
5. **Nessun nuovo invio della push dopo un errore.** Il Durable Object cancella lo stato prima di inviare, quindi una push non accettata non viene ripetuta: con `TTL: 60` arriverebbe comunque tardi. Gli errori diversi da 404 e 410 si loggano solo come status e motivo.

## Review Focus

1. **Richiesta di push fallita (offline, Worker irraggiungibile):** il timer in app funziona comunque e la barra mostra "notifica non programmata". Un timer più vecchio non riceve il segnale di un fallimento successivo. Test nel Task 3 ("flags only the current timer").
2. **Endpoint ingannevoli** (`https://push.apple.com.evil.example/x`, `https://evil-push.apple.com/x`, `http://web.push.apple.com/x`): rifiutati, così il Worker non può essere usato per chiamare URL arbitrari. Test nel Task 1.
3. **Eliminare una sessione vecchia dallo storico mentre è in corso un allenamento:** il timer del recupero attivo resta. Test nel Task 5 ("deleting an old session keeps the running timer").
4. **Esercizio senza e1RM** (solo serie oltre 12 ripetizioni), a corpo libero o a durata: grafici e record non si rompono e usano la metrica giusta. Test nei Task 4 e 6 ("skips sessions without an e1RM", "uses reps / duration").
5. **Prima volta su un esercizio:** nessuna serie diventa gialla e il riepilogo non mostra "record battuti" senza uno storico precedente. Test nel Task 4 ("no history, no records").

## Mappa dei file

| File | Responsabilità |
|---|---|
| `wrangler.jsonc` | `main`, `run_worker_first`, binding e `exports` del Durable Object, `vars`, `secrets` |
| `worker/index.ts` | routing `/api/timer`, validazione, inoltro al Durable Object |
| `worker/validate.ts` | schemi Zod, allowlist degli endpoint, `endpointId` (sha256) |
| `worker/timer-do.ts` | `TimerDO`: `schedule`, `cancel`, `alarm` |
| `worker/web-push.ts` | `sendRestPush` con VAPID e `aes128gcm` |
| `worker/tsconfig.json`, `worker-configuration.d.ts` | tipi del runtime Workers |
| `scripts/gen-vapid.ts` | genera la coppia di chiavi VAPID |
| `src/platform/push.ts` | modalità standalone, permesso, subscription, POST/DELETE `/api/timer` |
| `src/features/workout/restPush.ts` | `syncRestPush`: rispecchia il timer sulla push |
| `src/features/settings/NotificationsSection.tsx` | "Notifiche del timer" |
| `src/sw.ts` | gestori `push` e `notificationclick` |
| `src/domain/records.ts` | record personali, rilevamento, tabella dei record |
| `src/domain/progress.ts` | serie per i grafici, periodi |
| `src/db/history.ts` | storico, contesto del riepilogo, esercizi allenati |
| `src/components/chartTheme.ts` | colori e stile degli assi per Recharts, tooltip |
| `src/features/history/*` | elenco dello storico, dettaglio della sessione modificabile |
| `src/features/library/ExerciseCharts.tsx` | grafici e record dell'esercizio (lazy) |
| `src/features/progress/ProgressScreen.tsx` | Progressi |

---

### Task 0: Bug — fogli dal basso troppo in basso su iPhone

**Contesto.**
- Nell'app avviata dalla Home dell'iPhone, alcuni fogli si aprono troppo in basso, quasi fuori dallo schermo:
  - il foglio dell'esercizio di giornata (Programmi → giornata → tocco su un esercizio, `DayExerciseSheet`);
  - il menu ⋯ in allenamento (`ExerciseMenu`).
- Entrambi usano `src/components/Sheet.tsx` (`<dialog>` con `showModal()`) e la classe `.sheet` in `src/styles/index.css` (`margin: auto 0 0`, `max-height: 92dvh`).
- In Chrome lo stesso CSS è corretto: foglio in basso e intero. Attenzione: Chrome headless impone una finestra di almeno 500px di larghezza, quindi una finestra di 390px dà un falso positivo.
- Ipotesi da verificare: regressione di iOS 26 nelle web app avviate dalla Home con `viewport-fit=cover` e status bar `black-translucent`.
  - `100dvh` e `100%` valgono l'altezza dello schermo meno l'inset superiore.
  - Gli elementi `fixed` si agganciano alla fine del documento quando il documento è più corto dello schermo.
  - Fonti: https://bugs.webkit.org/show_bug.cgi?id=297779, https://github.com/nckrtl/orbit/pull/754, https://github.com/alieldinHosni/bunyan/pull/3.
  - Rimedio citato: `min-height: 100lvh` su `html` e `body` in `@media (display-mode: standalone)`.

**Dati dal telefono:**
- Versione di iOS: <COMPILA>
- Succede anche con altri fogli ("Scegli un'altra giornata" in Oggi, "3 di 6" in allenamento, "Nuovo esercizio" in Esercizi)? <COMPILA>
- La tastiera era aperta, o avevi appena scritto qualcosa, prima di toccare? <COMPILA>

**Passi.**
1. Causa alla radice con superpowers:systematic-debugging.
   - Consulta le fonti sopra in versione aggiornata (WebFetch), non a memoria. Verifica anche se la regressione è già risolta in una versione di iOS successiva.
   - Incrocia l'ipotesi con i dati dal telefono e con i contenitori che usano `min-h-dvh`: `src/App.tsx`, `WorkoutScreen`, `SummaryScreen`.
2. Correzione minima nel punto in cui nasce il problema, che non cambi il comportamento in Chrome. Probabilmente CSS in `src/styles/index.css`, ed eventualmente le altezze dei contenitori. Niente nuove dipendenze.
3. Verifica:
   - `bun run format && bun run check`;
   - uno screenshot di Chrome headless (finestra almeno 600×900) che mostri un foglio intero, in basso;
   - la prova sull'iPhone è dell'utente: aggiungi al Task 9 la riga "I fogli (esercizio di giornata, menu ⋯, '3 di 6', 'Nuovo esercizio') si aprono interi, in basso, anche dopo aver scritto in un campo".
4. Non spuntare il bug in SPEC §12: lo spunta il Task 9 dopo la prova sul telefono.
5. Commit: `fix(ios): …`.

---

### Task 1: Worker — route `/api/timer`, validazione e Durable Object

**Files:**
- Create: `worker/validate.ts`, `worker/index.ts`, `worker/timer-do.ts`, `worker/tsconfig.json`, `worker-configuration.d.ts` (generato)
- Modify: `wrangler.jsonc`, `package.json`, `biome.json`
- Test: `worker/validate.test.ts`

**Interfaces:**
- Consumes: Zod (già installato).
- Produces:
  - `isAllowedEndpoint(url): boolean`;
  - schemi `timerRequest` e `cancelRequest`, tipo `TimerRequest`;
  - `endpointId(endpoint): Promise<string>` (sha256 in esadecimale);
  - classe `TimerDO` con `schedule(job: TimerRequest)`, `cancel()`, `alarm()`. L'invio arriva nel Task 2;
  - script `types` e `dev:worker`.

- [ ] **Step 1: Scrivi il test (fallisce)**

`worker/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { endpointId, isAllowedEndpoint, timerRequest } from './validate';

const request = (overrides: Record<string, unknown> = {}) => ({
  subscription: {
    endpoint: 'https://web.push.apple.com/QGuQyavXutnMH',
    keys: { p256dh: 'BOr1', auth: 'k3y' },
  },
  durationMs: 90_000,
  title: 'Recupero finito',
  body: 'Panca piana con bilanciere, serie 3 di 4',
  ...overrides,
});

describe('isAllowedEndpoint (SPEC §7.2)', () => {
  it.each([
    'https://web.push.apple.com/abc',
    'https://api.push.apple.com/abc',
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
  ])('allows %s', (url) => {
    expect(isAllowedEndpoint(url)).toBe(true);
  });

  it.each([
    'http://web.push.apple.com/abc',
    'https://push.apple.com.evil.example/abc',
    'https://evil-push.apple.com/abc',
    'https://example.com/abc',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isAllowedEndpoint(url)).toBe(false);
  });
});

describe('timerRequest', () => {
  it('accepts the documented payload', () => {
    expect(timerRequest.safeParse(request()).success).toBe(true);
  });

  it.each([
    ['durationMs below 1 s', { durationMs: 999 }],
    ['durationMs above 1 h', { durationMs: 3_600_001 }],
    ['a title over 60 characters', { title: 'x'.repeat(61) }],
    ['a body over 120 characters', { body: 'x'.repeat(121) }],
    ['a foreign endpoint', { subscription: { endpoint: 'https://example.com/x', keys: { p256dh: 'a', auth: 'b' } } }],
  ])('rejects %s', (_, overrides) => {
    expect(timerRequest.safeParse(request(overrides)).success).toBe(false);
  });
});

describe('endpointId', () => {
  it('is a stable sha256 hex digest', async () => {
    const id = await endpointId('https://web.push.apple.com/abc');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(await endpointId('https://web.push.apple.com/abc')).toBe(id);
  });
});
```

Run: `bun run test worker/validate.test.ts`
Expected: FAIL, `Cannot find module './validate'`.

- [ ] **Step 2: Scrivi `worker/validate.ts`**

```ts
import { z } from 'zod';

const DESKTOP_TEST_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com'];

/** SPEC §7.2: https only, Apple push hosts plus two desktop services used for testing. */
export function isAllowedEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    (url.hostname.endsWith('.push.apple.com') || DESKTOP_TEST_HOSTS.includes(url.hostname))
  );
}

const endpoint = z.string().max(1000).refine(isAllowedEndpoint);

export const timerRequest = z.object({
  subscription: z.object({
    endpoint,
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  durationMs: z.number().int().min(1_000).max(3_600_000),
  title: z.string().min(1).max(60),
  body: z.string().max(120),
});

export const cancelRequest = z.object({ endpoint });

export type TimerRequest = z.infer<typeof timerRequest>;

/** Durable Object name. Only whoever knows the subscription can schedule pushes to it. */
export async function endpointId(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

Run: `bun run test worker/validate.test.ts`
Expected: PASS.

- [ ] **Step 3: Configura Wrangler e i tipi del Worker**

`wrangler.jsonc`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "gym-log",
  "main": "./worker/index.ts",
  "compatibility_date": "2026-10-02",
  "assets": {
    "directory": "./dist/",
    "not_found_handling": "single-page-application",
    // Only /api/* reaches the Worker; everything else is a static asset or the SPA fallback.
    "run_worker_first": ["/api/*"]
  },
  "durable_objects": {
    "bindings": [{ "name": "TIMER", "class_name": "TimerDO" }]
  },
  // Declarative Durable Object setup (replaces "migrations"); SQLite is required on the Free plan.
  "exports": {
    "TimerDO": { "type": "durable-object", "storage": "sqlite" }
  }
}
```

`worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "types": []
  },
  "include": ["./**/*.ts", "../worker-configuration.d.ts"]
}
```

In `package.json`:

```json
"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.sw.json && tsc --noEmit -p worker/tsconfig.json",
"types": "wrangler types",
"dev:worker": "vite build && wrangler dev",
```

In `biome.json`, dentro `files.includes`, escludi il file generato:

```json
"files": { "includes": ["**", "!!**/dist", "!!**/dev-dist", "!worker-configuration.d.ts"] },
```

- [ ] **Step 4: Scrivi il Durable Object e il Worker**

`worker/timer-do.ts`:

```ts
import { DurableObject } from 'cloudflare:workers';
import type { TimerRequest } from './validate';

/** One instance per push subscription, holding at most one pending rest timer (one alarm). */
export class TimerDO extends DurableObject<Env> {
  async schedule(job: TimerRequest): Promise<void> {
    await this.ctx.storage.put('job', job);
    // The deadline comes from the Worker's clock: phone/server skew cannot move it (SPEC §7.2).
    await this.ctx.storage.setAlarm(Date.now() + job.durationMs);
  }

  async cancel(): Promise<void> {
    await this.ctx.storage.deleteAll(); // also removes the alarm (compatibility date >= 2026-02-24)
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll(); // sending arrives in Task 2
  }
}
```

`worker/index.ts`:

```ts
import { cancelRequest, endpointId, timerRequest } from './validate';

export { TimerDO } from './timer-do';

const status = (code: number, headers?: HeadersInit) => new Response(null, { status: code, headers });

// Never log subscriptions or payloads (SPEC §7.2).
export default {
  async fetch(request, env): Promise<Response> {
    if (new URL(request.url).pathname !== '/api/timer') return status(404);
    const body: unknown = await request.json().catch(() => null);

    if (request.method === 'POST') {
      const parsed = timerRequest.safeParse(body);
      if (!parsed.success) return status(400);
      const stub = env.TIMER.getByName(await endpointId(parsed.data.subscription.endpoint));
      await stub.schedule(parsed.data);
      return status(204);
    }

    if (request.method === 'DELETE') {
      const parsed = cancelRequest.safeParse(body);
      if (!parsed.success) return status(400);
      await env.TIMER.getByName(await endpointId(parsed.data.endpoint)).cancel();
      return status(204);
    }

    return status(405, { Allow: 'POST, DELETE' });
  },
} satisfies ExportedHandler<Env>;
```

Genera i tipi:

```bash
bun run types
```

Expected: `worker-configuration.d.ts` creato, con `TIMER: DurableObjectNamespace<import("./worker/index").TimerDO>` dentro `Env`. Con `compatibility_date` 2026-10-02 `nodejs_compat` è attivo per default. Se `tsc -p worker/tsconfig.json` segnala tipi Node mancanti (`Cannot find type definition file for 'node'`), fermati e chiedi all'utente prima di aggiungere `@types/node`.

- [ ] **Step 5: Verifica in locale**

```bash
bun run format && bun run check
bun run dev:worker
```

In un altro terminale:

```bash
BODY='{"subscription":{"endpoint":"https://fcm.googleapis.com/fcm/send/x","keys":{"p256dh":"a","auth":"b"}},"durationMs":5000,"title":"Recupero finito","body":"Prova"}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8787/api/timer -H 'content-type: application/json' -d "$BODY"   # 204
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8787/api/timer -H 'content-type: application/json' -d "${BODY/https:/http:}"   # 400
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE localhost:8787/api/timer -H 'content-type: application/json' -d '{"endpoint":"https://fcm.googleapis.com/fcm/send/x"}'   # 204
curl -s -o /dev/null -w '%{http_code}\n' localhost:8787/api/timer       # 405
curl -s -o /dev/null -w '%{http_code}\n' localhost:8787/api/altro       # 404
curl -s localhost:8787/programs | grep -c '<div id="root">'              # 1: SPA fallback
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(worker): add /api/timer with validation and a timer durable object"
```

---

### Task 2: Web Push dal Durable Object e chiavi VAPID

**Files:**
- Create: `scripts/gen-vapid.ts`, `worker/web-push.ts`, `.env`, `.dev.vars` (non versionato)
- Modify: `worker/timer-do.ts`, `wrangler.jsonc`, `package.json`
- Test: `worker/web-push.test.ts`

**Interfaces:**
- Consumes: `TimerRequest` (Task 1).
- Produces:
  - `sendRestPush(job: TimerRequest, env): Promise<Response>`;
  - variabili `VAPID_SUBJECT` e `VAPID_PUBLIC_KEY`, secret `VAPID_PRIVATE_KEY`;
  - `VITE_VAPID_PUBLIC_KEY` per il client (Task 3).

- [ ] **Step 1: Installa la libreria (dopo l'approvazione dell'utente)**

```bash
bun add @block65/webcrypto-web-push@2.0.0
```

- [ ] **Step 2: Genera le chiavi VAPID**

`scripts/gen-vapid.ts`:

```ts
// Prints a VAPID key pair (SPEC §7.2). Run once: bun scripts/gen-vapid.ts
const base64url = (bytes: ArrayBuffer) => Buffer.from(bytes).toString('base64url');

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const publicKey = base64url(await crypto.subtle.exportKey('raw', pair.publicKey));
const { d } = await crypto.subtle.exportKey('jwk', pair.privateKey);

console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${d}`);
```

```bash
bun scripts/gen-vapid.ts
```

Expected: due righe. La chiave pubblica ha 87 caratteri, la privata 43. Poi:

1. In `.env`, versionato perché la chiave pubblica è pubblica: `VITE_VAPID_PUBLIC_KEY=<pubblica>`.
2. In `.dev.vars`, non versionato (è già in `.gitignore` dalla Fase 0): `VAPID_PRIVATE_KEY=<privata>`.
3. In `wrangler.jsonc`, sotto `exports`:

```jsonc
  "vars": {
    // Contact for the push services (RFC 8292). Put the owner's address here.
    "VAPID_SUBJECT": "mailto:<indirizzo-del-proprietario>",
    "VAPID_PUBLIC_KEY": "<la stessa chiave pubblica di .env>"
  },
  "secrets": { "required": ["VAPID_PRIVATE_KEY"] }
```

Chiedi all'utente l'indirizzo per `VAPID_SUBJECT`: finisce nel token inviato ad Apple.

4. Carica il secret sui due Worker:

```bash
bunx wrangler secret put VAPID_PRIVATE_KEY
bunx wrangler secret put VAPID_PRIVATE_KEY --name gym-log-preview
bun run types   # Env gains VAPID_SUBJECT, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
```

- [ ] **Step 3: Scrivi il test (fallisce)**

`worker/web-push.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendRestPush } from './web-push';

const base64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function fixtures() {
  // Workers types return unions from generateKey/exportKey: narrow them explicitly.
  const vapid = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const browser = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const raw = async (key: CryptoKey) => base64url((await crypto.subtle.exportKey('raw', key)) as ArrayBuffer);
  // Env also holds TIMER and literal-typed vars: the test only needs the VAPID fields.
  const env = {
    VAPID_SUBJECT: 'mailto:test@example.com',
    VAPID_PUBLIC_KEY: await raw(vapid.publicKey),
    VAPID_PRIVATE_KEY: ((await crypto.subtle.exportKey('jwk', vapid.privateKey)) as JsonWebKey).d ?? '',
  } as unknown as Env;
  const keys = {
    p256dh: await raw(browser.publicKey),
    auth: base64url(crypto.getRandomValues(new Uint8Array(16)).buffer),
  };
  return { env, keys };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendRestPush', () => {
  it('posts an encrypted aes128gcm payload with TTL 60 and high urgency', async () => {
    const { env, keys } = await fixtures();
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await sendRestPush(
      {
        subscription: { endpoint: 'https://web.push.apple.com/abc', keys },
        durationMs: 90_000,
        title: 'Recupero finito',
        body: 'Panca, serie 1 di 3',
      },
      env,
    );

    expect(response.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://web.push.apple.com/abc');
    const headers = new Headers(init?.headers);
    expect(headers.get('ttl')).toBe('60');
    expect(headers.get('urgency')).toBe('high');
    expect(headers.get('content-encoding')).toBe('aes128gcm');
    expect(headers.get('authorization')).toMatch(/^vapid t=.+, k=.+$/);
  });
});
```

Run: `bun run test worker/web-push.test.ts`
Expected: FAIL, `Cannot find module './web-push'`.

- [ ] **Step 4: Scrivi `worker/web-push.ts` e collega l'alarm**

`worker/web-push.ts`:

```ts
import { buildPushPayload } from '@block65/webcrypto-web-push';
import type { TimerRequest } from './validate';

/** One rest-timer notification: VAPID (RFC 8292) and an aes128gcm payload (RFC 8291). */
export async function sendRestPush(job: TimerRequest, env: Env): Promise<Response> {
  const payload = await buildPushPayload(
    // A rest notification minutes late is useless: TTL 60. High urgency asks for immediate delivery.
    { data: { title: job.title, body: job.body }, options: { ttl: 60, urgency: 'high' } },
    { endpoint: job.subscription.endpoint, expirationTime: null, keys: job.subscription.keys },
    { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
  );
  return fetch(job.subscription.endpoint, payload);
}
```

In `worker/timer-do.ts` importa `sendRestPush` e sostituisci `alarm()`:

```ts
import { sendRestPush } from './web-push';
```

```ts
  async alarm(): Promise<void> {
    const job = await this.ctx.storage.get<TimerRequest>('job');
    // ponytail: state is cleared before sending, so an expired subscription (404/410) needs no
    // extra cleanup and a rejected push is not retried; with TTL 60 a retry would be late anyway.
    await this.ctx.storage.deleteAll();
    if (!job) return;
    const response = await sendRestPush(job, this.env);
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      // Status and reason only: never the subscription or the payload.
      console.warn('Push rejected', response.status, await response.text());
    }
  }
```

Run: `bun run test worker/web-push.test.ts`
Expected: PASS.

- [ ] **Step 5: Verifica il bundle del Worker**

```bash
bun run format && bun run check
bun run build && bunx wrangler deploy --dry-run --outdir .wrangler/dry-run
```

Expected: nessun errore, e il bundle include `@block65/webcrypto-web-push`. L'invio reale si prova nel Task 3, quando il client crea una subscription.

- [ ] **Step 6: Commit**

```bash
git add -A   # .dev.vars is ignored; .env holds only the public key
git commit -m "feat(worker): send rest-timer web push with vapid from the durable object alarm"
```

---

### Task 3: Notifiche nel client — permesso, subscription, push dal timer

**Files:**
- Create: `src/platform/push.ts`, `src/features/workout/restPush.ts`, `src/features/settings/NotificationsSection.tsx`
- Modify:
  - dati: `src/types.ts`, `src/globals.d.ts`, `src/db/workout.ts`, `src/db/workout.test.ts`;
  - service worker e avvio: `src/sw.ts`, `src/main.tsx`;
  - schermate: `src/features/settings/SettingsScreen.tsx`, `src/features/workout/TimerBar.tsx`, `src/features/workout/ExerciseView.tsx`, `src/features/workout/finish.ts`, `src/features/workout/StaleSessionSheet.tsx`.

**Interfaces:**
- Consumes: API del Task 1; `VITE_VAPID_PUBLIC_KEY` (Task 2); `completeSet`, `startTimer`, `extendTimer`, `clearTimer` (Fase 1, Task 15), che restituiscono il timer per questo scopo.
- Produces:
  - `isStandalone()`, `subscribePush(): Promise<'granted' | 'denied' | 'not-standalone' | 'unsupported'>`, `renewSubscription()`, `scheduleRestPush(timer): Promise<boolean>`, `cancelRestPush()`;
  - `setTimerPushFailed(endAt, failed)`;
  - `syncRestPush(timer: ActiveTimer | null | undefined)`. Con `undefined` non fa nulla (timer non toccato), con `null` annulla, con un timer programma.

Regola: il client chiama `syncRestPush` dopo ogni cambio del timer, senza attenderla. Il timer in app non dipende mai dalla rete.

- [ ] **Step 1: Scrivi il test (fallisce)**

In `src/types.ts`, dentro `ActiveTimer`:

```ts
  /** True when scheduling the lock-screen notification failed (offline): shows an icon. */
  pushFailed?: boolean;
```

In `src/db/workout.test.ts` estendi l'import con `setTimerPushFailed` e aggiungi:

```ts
describe('setTimerPushFailed', () => {
  it('flags only the current timer', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    const { timer: first } = await completeSet(bench.sets[0].id);
    await new Promise((resolve) => setTimeout(resolve, 2)); // distinct endAt values
    const { timer: second } = await completeSet(bench.sets[1].id);
    await setTimerPushFailed(first?.endAt ?? 0, true); // stale: a newer timer replaced it
    expect((await getSettings()).activeTimer?.pushFailed).toBeUndefined();
    await setTimerPushFailed(second?.endAt ?? 0, true);
    expect((await getSettings()).activeTimer?.pushFailed).toBe(true);
    await setTimerPushFailed(second?.endAt ?? 0, false);
    expect((await getSettings()).activeTimer?.pushFailed).toBe(false);
  });
});
```

Run: `bun run test src/db/workout.test.ts`
Expected: FAIL, `setTimerPushFailed is not a function`.

- [ ] **Step 2: Implementa `setTimerPushFailed`**

In fondo a `src/db/workout.ts`:

```ts
/** Records whether the push for the timer ending at endAt was scheduled; ignores replaced timers. */
export async function setTimerPushFailed(endAt: number, failed: boolean): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const { activeTimer } = await getSettings();
    if (activeTimer?.endAt === endAt) await setSetting('activeTimer', { ...activeTimer, pushFailed: failed });
  });
}
```

Run: `bun run test src/db/workout.test.ts`
Expected: PASS.

- [ ] **Step 3: Piattaforma push**

In `src/globals.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY: string;
}
```

`src/platform/push.ts`:

```ts
import type { ActiveTimer } from '../types';

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** SPEC §10: Web Push on iOS works only from the Home Screen. */
export const isStandalone = (): boolean =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const subscribe = async () =>
  (await navigator.serviceWorker.ready).pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(PUBLIC_KEY),
  });

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  return (await navigator.serviceWorker.ready).pushManager.getSubscription();
}

/** SPEC §7.2 step 1. Call it straight from a tap handler: iOS asks only in response to a tap. */
export async function subscribePush(): Promise<'granted' | 'denied' | 'not-standalone' | 'unsupported'> {
  if (!isStandalone()) return 'not-standalone';
  if (!supported()) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  await subscribe();
  return 'granted';
}

/** SPEC §7.2: at startup, quietly recreate a lost subscription while permission holds. */
export async function renewSubscription(): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return;
  if (!(await currentSubscription())) await subscribe();
}

/** POST the remaining duration, never an absolute time: the Worker owns the clock. */
export async function scheduleRestPush(timer: ActiveTimer): Promise<boolean> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return false;
    const response = await fetch('/api/timer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        durationMs: Math.min(3_600_000, Math.max(1_000, Math.round(timer.endAt - Date.now()))),
        title: 'Recupero finito',
        body: timer.label.slice(0, 120),
      }),
    });
    return response.ok;
  } catch {
    return false; // offline: the in-app timer keeps working
  }
}

export async function cancelRestPush(): Promise<void> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await fetch('/api/timer', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch {
    // Offline: the notification may still arrive; nothing else depends on it.
  }
}
```

`src/features/workout/restPush.ts`:

```ts
import { getSettings } from '../../db/settings';
import { setTimerPushFailed } from '../../db/workout';
import { cancelRestPush, scheduleRestPush } from '../../platform/push';
import type { ActiveTimer } from '../../types';

/**
 * Mirrors a change of the in-app rest timer to the lock-screen notification (SPEC §7.2).
 * undefined = timer untouched, null = cancelled. Callers never await it.
 */
export async function syncRestPush(timer: ActiveTimer | null | undefined): Promise<void> {
  if (timer === undefined) return;
  if (!(await getSettings()).pushEnabled) return;
  if (timer === null) return cancelRestPush();
  await setTimerPushFailed(timer.endAt, !(await scheduleRestPush(timer)));
}
```

- [ ] **Step 4: Service worker, gestori di push e clic**

In coda a `src/sw.ts`, prima di `export {};`:

```ts
// Every push must show a notification, or Safari may revoke the subscription (SPEC §7.2).
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Not JSON: show the default text.
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Recupero finito', {
      body: data.body ?? '',
      tag: 'rest-timer',
      icon: '/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const [client] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (client) await client.focus();
      else await self.clients.openWindow('/');
    })(),
  );
});
```

- [ ] **Step 5: Collega i cambi del timer**

`src/features/workout/ExerciseView.tsx`: importa `syncRestPush` e cambia `confirm`:

```tsx
import { syncRestPush } from './restPush';
```

```tsx
  const confirm = async (setId: string) => {
    const { exerciseDone, timer } = await completeSet(setId);
    void syncRestPush(timer);
    setSelectedId(null);
    if (exerciseDone) onExerciseDone();
  };
```

`src/features/workout/TimerBar.tsx`: importa `syncRestPush` e `BellOff` da lucide-react, poi definisci dentro il componente, prima dei `return`:

```tsx
  const stop = async () => {
    await clearTimer();
    void syncRestPush(null);
  };
```

Sostituisci i gestori:
- "Avvia recupero": `onClick={async () => void syncRestPush(await startTimer(item.se.id))}`
- barra verde: `onClick={stop}`
- "+15 s": `onClick={async () => void syncRestPush(await extendTimer(15_000))}`
- "Salta": `onClick={stop}`

Nello stato "in corso", subito dopo lo `<span>` del tempo:

```tsx
        {timer.pushFailed && (
          <span role="img" aria-label="Notifica non programmata" className="text-steel">
            <BellOff size={20} />
          </span>
        )}
```

`src/features/workout/finish.ts`: dopo `await finishSession(sessionId);` e dopo `await discardSession(sessionId);` aggiungi:

```ts
  void syncRestPush(null);
```

con `import { syncRestPush } from './restPush';`.

`src/features/workout/StaleSessionSheet.tsx`: in `finish`, dopo `await finishSession(…)`, aggiungi `void syncRestPush(null);` (stesso import).

`src/main.tsx`, dopo `void requestPersistentStorage();`:

```tsx
    void getSettings().then((settings) => {
      if (settings.pushEnabled) void renewSubscription();
    });
```

con gli import `getSettings` da `./db/settings` e `renewSubscription` da `./platform/push`.

- [ ] **Step 6: Sezione "Notifiche del timer"**

`src/features/settings/NotificationsSection.tsx`:

```tsx
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
          Le notifiche funzionano solo con Palestra aperta dalla schermata Home. In Safari tocca Condividi,
          poi “Aggiungi alla schermata Home”, e apri l'app da lì.
        </p>
      ) : enabled ? (
        <div className="row">
          <span className="flex-1">Avviso a fine recupero, anche a schermo bloccato</span>
          <button type="button" className="btn-text" onClick={() => setSetting('pushEnabled', false)}>
            Disattiva
          </button>
        </div>
      ) : (
        <div className="space-y-2 px-4">
          <p className="text-small text-steel">Ricevi un avviso a fine recupero anche con lo schermo bloccato.</p>
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
```

In `src/features/settings/SettingsScreen.tsx` importa la sezione e mettila subito prima di `<BackupSection …/>`:

```tsx
      <NotificationsSection enabled={settings.pushEnabled} />
```

- [ ] **Step 7: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Prova da desktop, dove Chrome installa la PWA in standalone su localhost:
1. `bun run dev:worker`, apri http://localhost:8787 in Chrome e installa l'app dall'icona nella barra degli indirizzi. Aprila dalla finestra installata.
2. Impostazioni → "Attiva notifiche": compare il permesso del sistema, poi "Avviso a fine recupero…".
3. Imposta un recupero di 15 s, conferma una serie e minimizza la finestra: entro qualche secondo dallo zero arriva la notifica "Recupero finito" con il testo "Panca…, serie 1 di 3". Il clic riporta l'app in primo piano.
4. Conferma una serie e premi "Salta": nessuna notifica arriva.
5. Ferma `wrangler dev`, conferma una serie: il timer in app parte e compare l'icona con la campanella barrata.

La prova sull'iPhone è nel collaudo (Task 9).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(push): schedule lock-screen rest notifications from the in-app timer"
```

---

### Task 4: Record personali e rilevamento in allenamento

**Files:**
- Create: `src/domain/records.ts`
- Modify: `src/features/workout/ExerciseView.tsx`, `src/features/workout/SetRows.tsx`
- Test: `src/domain/records.test.ts`

**Interfaces:**
- Consumes: `e1rm`, `isWorkSetDone`, `volume`, `LoggedSet` (Fase 1, Task 4); `exerciseHistory` (Fase 1, Task 7); `formatNumber`, `formatSeconds`.
- Produces:
  - tipi `Records { e1rm?; maxWeight?; maxVolume?; maxReps?; maxDuration? }`, `RecordKind = keyof Records`, `RecordEntry { kind; value; startedAt }`;
  - `RECORD_LABELS`;
  - `computeRecords(sessions: LoggedSet[][], tracking): Records`;
  - `isRecordSet(set, tracking, before: Records): boolean`;
  - `beatenRecords(sets, tracking, before): { kind; value }[]`;
  - `recordTable(history, tracking): RecordEntry[]`;
  - `formatRecord(kind, value): string`.

- [ ] **Step 1: Scrivi il test (fallisce)**

`src/domain/records.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { beatenRecords, computeRecords, formatRecord, isRecordSet, recordTable } from './records';

const set = (weightKg: number, reps: number, extra: { isWarmup?: boolean; durationSec?: number } = {}) => ({
  weightKg,
  reps,
  isWarmup: false,
  completedAt: 1,
  ...extra,
});

describe('computeRecords (SPEC §8.5)', () => {
  it('tracks best e1RM, heaviest load and biggest session volume for weighted exercises', () => {
    const records = computeRecords(
      [
        [set(80, 10), set(80, 8)],
        [set(90, 3), set(40, 20, { isWarmup: true })],
      ],
      'weight_reps',
    );
    expect(records.e1rm).toBeCloseTo(106.67, 2);
    expect(records.maxWeight).toBe(90);
    expect(records.maxVolume).toBe(1440);
  });

  it('uses reps for bodyweight and duration for timed exercises', () => {
    expect(computeRecords([[set(0, 12), set(10, 8)]], 'bodyweight_reps')).toEqual({ maxReps: 12 });
    const holds = [[{ durationSec: 60, isWarmup: false, completedAt: 1 }]];
    expect(computeRecords(holds, 'duration')).toEqual({ maxDuration: 60 });
  });

  it('has no e1RM when every set is above 12 reps', () => {
    expect(computeRecords([[set(40, 15)]], 'weight_reps')).toEqual({ maxWeight: 40, maxVolume: 600 });
  });
});

describe('isRecordSet', () => {
  const before = computeRecords([[set(80, 10)]], 'weight_reps');
  it('flags a set that beats the e1RM or the load of earlier sessions', () => {
    expect(isRecordSet(set(80, 11), 'weight_reps', before)).toBe(true);
    expect(isRecordSet(set(82.5, 1), 'weight_reps', before)).toBe(true);
    expect(isRecordSet(set(80, 10), 'weight_reps', before)).toBe(false);
  });
  it('ignores warmups and sets still to do', () => {
    expect(isRecordSet(set(100, 10, { isWarmup: true }), 'weight_reps', before)).toBe(false);
    expect(isRecordSet({ ...set(100, 10), completedAt: undefined }, 'weight_reps', before)).toBe(false);
  });
  it('no history, no records', () => {
    expect(isRecordSet(set(100, 10), 'weight_reps', {})).toBe(false);
    expect(beatenRecords([set(100, 10)], 'weight_reps', {})).toEqual([]);
  });
});

describe('beatenRecords and recordTable', () => {
  it('lists the records a session improved', () => {
    const before = computeRecords([[set(80, 10)]], 'weight_reps');
    expect(beatenRecords([set(80, 10), set(80, 10)], 'weight_reps', before)).toEqual([
      { kind: 'maxVolume', value: 1600 },
    ]);
  });

  it('keeps the first session that reached each best', () => {
    const table = recordTable(
      [
        { startedAt: 200, sets: [set(90, 5)] },
        { startedAt: 100, sets: [set(80, 10)] },
        { startedAt: 300, sets: [set(90, 5)] },
      ],
      'weight_reps',
    );
    expect(table.find((r) => r.kind === 'maxWeight')).toEqual({ kind: 'maxWeight', value: 90, startedAt: 200 });
    expect(table.find((r) => r.kind === 'maxVolume')?.startedAt).toBe(100);
  });

  it('formats each kind with its unit', () => {
    expect(formatRecord('e1rm', 106.666)).toBe('106,7 kg');
    expect(formatRecord('maxVolume', 12345)).toBe('12.345 kg');
    expect(formatRecord('maxReps', 15)).toBe('15 rip');
    expect(formatRecord('maxDuration', 90)).toBe('1 min 30 s');
  });
});
```

Run: `bun run test src/domain/records.test.ts`
Expected: FAIL, `Cannot find module './records'`.

- [ ] **Step 2: Scrivi `src/domain/records.ts`**

```ts
import type { TrackingType } from '../types';
import { formatNumber, formatSeconds } from './format';
import { e1rm, isWorkSetDone, type LoggedSet, volume } from './stats';

export interface Records {
  e1rm?: number;
  maxWeight?: number;
  maxVolume?: number;
  maxReps?: number;
  maxDuration?: number;
}

export type RecordKind = keyof Records;

export interface RecordEntry {
  kind: RecordKind;
  value: number;
  startedAt: number;
}

export const RECORD_LABELS: Record<RecordKind, string> = {
  e1rm: 'Massimale stimato',
  maxWeight: 'Carico massimo',
  maxVolume: 'Volume in una sessione',
  maxReps: 'Ripetizioni in una serie',
  maxDuration: 'Durata massima',
};

const max = (a: number | undefined, b: number | undefined) =>
  b === undefined ? a : a === undefined ? b : Math.max(a, b);

/** SPEC §8.5, over completed work sets; each inner list is one session. */
export function computeRecords(sessions: LoggedSet[][], tracking: TrackingType): Records {
  const records: Records = {};
  for (const sets of sessions) {
    const work = sets.filter(isWorkSetDone);
    for (const s of work) {
      if (tracking === 'weight_reps') {
        records.e1rm = max(records.e1rm, e1rm(s.weightKg ?? 0, s.reps ?? 0));
        if ((s.weightKg ?? 0) > 0) records.maxWeight = max(records.maxWeight, s.weightKg);
      } else if (tracking === 'bodyweight_reps') {
        records.maxReps = max(records.maxReps, s.reps);
      } else {
        records.maxDuration = max(records.maxDuration, s.durationSec);
      }
    }
    if (tracking === 'weight_reps' && work.length > 0) {
      records.maxVolume = max(records.maxVolume, volume(sets, tracking));
    }
  }
  return records;
}

/** A completed work set beating the history before this session. No history means no records. */
export function isRecordSet(set: LoggedSet, tracking: TrackingType, before: Records): boolean {
  if (!isWorkSetDone(set)) return false;
  if (tracking === 'weight_reps') {
    const estimate = e1rm(set.weightKg ?? 0, set.reps ?? 0);
    const beatsE1rm = estimate !== undefined && before.e1rm !== undefined && estimate > before.e1rm;
    const beatsLoad = before.maxWeight !== undefined && (set.weightKg ?? 0) > before.maxWeight;
    return beatsE1rm || beatsLoad;
  }
  if (tracking === 'bodyweight_reps') return before.maxReps !== undefined && (set.reps ?? 0) > before.maxReps;
  return before.maxDuration !== undefined && (set.durationSec ?? 0) > before.maxDuration;
}

/** Records improved by one session (summary, SPEC §6.8). */
export function beatenRecords(
  sets: LoggedSet[],
  tracking: TrackingType,
  before: Records,
): { kind: RecordKind; value: number }[] {
  const now = computeRecords([sets], tracking);
  return (Object.keys(now) as RecordKind[]).flatMap((kind) => {
    const value = now[kind];
    const previous = before[kind];
    return value !== undefined && previous !== undefined && value > previous ? [{ kind, value }] : [];
  });
}

/** Each record with the first session that reached it (exercise detail). */
export function recordTable(
  history: { startedAt: number; sets: LoggedSet[] }[],
  tracking: TrackingType,
): RecordEntry[] {
  const best = new Map<RecordKind, RecordEntry>();
  for (const { startedAt, sets } of [...history].sort((a, b) => a.startedAt - b.startedAt)) {
    const records = computeRecords([sets], tracking);
    for (const kind of Object.keys(records) as RecordKind[]) {
      const value = records[kind];
      const current = best.get(kind);
      if (value !== undefined && (!current || value > current.value)) best.set(kind, { kind, value, startedAt });
    }
  }
  return [...best.values()];
}

export function formatRecord(kind: RecordKind, value: number): string {
  if (kind === 'maxReps') return `${value} rip`;
  if (kind === 'maxDuration') return formatSeconds(value);
  return `${formatNumber(Math.round(value * 10) / 10)} kg`;
}
```

Run: `bun run test src/domain/records.test.ts`
Expected: PASS.

- [ ] **Step 3: Serie da record in giallo durante l'allenamento**

In `src/features/workout/SetRows.tsx` aggiungi a `RowProps` il campo `record?: boolean`, ricevilo in `SetRow` e usalo per il colore dei valori e per l'etichetta accessibile:

```tsx
export function SetRow({ set, label, tracking, record = false, onSelect }: RowProps) {
  const done = set.completedAt !== undefined;
  const tone = record ? 'text-plate-yellow' : done && !set.isWarmup ? 'text-chalk' : 'text-steel';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${setName(set, label)}: ${formatSet(set, tracking)}${done ? ', completata' : ''}${record ? ', record' : ''}`}
      className="flex min-h-14 w-full items-center gap-2 border-b border-steel/25 px-4 text-left"
    >
      <span className="num w-6 text-title text-steel">{label}</span>
      <span className={`flex flex-1 items-baseline gap-1 ${tone}`}>
        <Values set={set} tracking={tracking} />
      </span>
      <Disc done={done} />
    </button>
  );
}
```

In `src/features/workout/ExerciseView.tsx` leggi tutto lo storico (escluso il giorno in corso, che non è `completed`) e calcola i record precedenti:

```tsx
import { computeRecords, isRecordSet } from '../../domain/records';
```

```tsx
  const history = useLiveQuery(() => exerciseHistory(exercise.id), [exercise.id]) ?? [];
  const last = history[0];
  const before = computeRecords(
    history.map((h) => h.sets),
    tracking,
  );
```

(rimuove la vecchia riga `const [last] = useLiveQuery(…, 1)…`). Passa il flag alla riga:

```tsx
              <SetRow
                set={set}
                label={label(set)}
                tracking={tracking}
                record={isRecordSet(set, tracking, before)}
                onSelect={() => setSelectedId(set.id)}
              />
```

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`:
1. Prima sessione di un esercizio: nessuna serie diventa gialla.
2. Nella sessione successiva conferma una serie con 2,5 kg in più dell'ultima volta: i valori diventano gialli. Una serie uguale a quelle precedenti resta `chalk`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(records): detect personal records and highlight them during the workout"
```

---

### Task 5: Storico — elenco e dettaglio modificabile

**Files:**
- Create: `src/db/history.ts`, `src/features/history/HistoryScreen.tsx`, `src/features/history/SessionDetail.tsx`
- Modify:
  - configurazione: `tsconfig.json` (lib ES2024);
  - dominio e dati: `src/domain/format.ts`, `src/domain/format.test.ts`, `src/domain/workout.ts`, `src/domain/workout.test.ts`, `src/db/workout.ts`, `src/db/workout.test.ts`;
  - interfaccia: `src/features/workout/SetRows.tsx`, `src/features/workout/ExerciseView.tsx`, `src/App.tsx`, `src/routes.tsx`.
- Test: `src/db/history.test.ts`

**Interfaces:**
- Consumes: `getWorkout` (Fase 1, Task 13); `discardSession`, `setSessionNotes`, `updateSet`, `deleteSet` (Fase 1); `summarize`; `SetRow`, `SetEditor`.
- Produces:
  - formattazione ed etichette: `formatMonth(ts)` ("settembre 2026"), `setLabel(sets, set)` ("R", "1", "2"…);
  - DB: `toggleWarmup(setId)`, `HistoryRow { session; durationMs; sets; volume }`, `listHistory(): Promise<HistoryRow[]>`;
  - `SetEditor` riceve il prop opzionale `onToggleWarmup`;
  - route `/history` e `/history/:sessionId`, tab "Storico".

- [ ] **Step 1: `Map.groupBy` disponibile**

In `tsconfig.json` cambia `lib`:

```json
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
```

- [ ] **Step 2: Scrivi i test (falliscono)**

In `src/domain/format.test.ts` importa `formatMonth` e aggiungi:

```ts
describe('formatMonth', () => {
  it('names month and year', () => {
    expect(formatMonth(new Date(2026, 8, 23).getTime())).toBe('settembre 2026');
  });
});
```

In `src/domain/workout.test.ts` importa `setLabel` e aggiungi:

```ts
describe('setLabel', () => {
  it('numbers work sets and marks warmups with R', () => {
    const sets = [
      { id: 'w', isWarmup: true },
      { id: 'a', isWarmup: false },
      { id: 'b', isWarmup: false },
    ];
    expect(sets.map((s) => setLabel(sets, s))).toEqual(['R', '1', '2']);
  });
});
```

In `src/db/workout.test.ts` importa `toggleWarmup` e `discardSession` (se non già importato), poi aggiungi:

```ts
describe('history edits', () => {
  it('turns a work set into a warmup and back', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await toggleWarmup(bench.sets[0].id);
    expect((await db.setLogs.get(bench.sets[0].id))?.isWarmup).toBe(true);
    await toggleWarmup(bench.sets[0].id);
    expect((await db.setLogs.get(bench.sets[0].id))?.isWarmup).toBe(false);
  });

  it('deleting an old session keeps the running timer', async () => {
    const oldSession = await setup();
    await finishSession(oldSession);
    const day = (await db.sessions.get(oldSession))?.dayId ?? '';
    const current = await startSession(day);
    const [bench] = await items(current);
    await updateSet(bench.sets[0].id, { weightKg: 80, reps: 10 });
    const { timer } = await completeSet(bench.sets[0].id);
    await discardSession(oldSession);
    expect((await getSettings()).activeTimer).toEqual(timer);
  });
});
```

`src/db/history.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createExercise } from './exercises';
import { listHistory } from './history';
import { addDay, addDayExercise, createProgram } from './programs';
import { getWorkout, startSession } from './sessions';
import { completeSet, finishSession, updateSet } from './workout';

/** A completed session on `day` where every bench set is weight × reps. */
async function train(day: string, weightKg: number, reps: number) {
  const sessionId = await startSession(day);
  const [bench] = (await getWorkout(sessionId))?.items ?? [];
  for (const s of bench.sets) {
    await updateSet(s.id, { weightKg, reps });
    await completeSet(s.id);
  }
  await finishSession(sessionId);
  // The next session must start at a later millisecond, or ordering by startedAt is a tie.
  await new Promise((resolve) => setTimeout(resolve, 2));
  return sessionId;
}

async function benchDay() {
  const day = await addDay(await createProgram());
  const bench = await createExercise({
    name: 'Panca',
    muscleGroup: 'chest',
    equipment: 'barbell',
    trackingType: 'weight_reps',
    notes: '',
  });
  await addDayExercise(day, bench);
  return day;
}

describe('listHistory', () => {
  it('lists completed sessions newest first with sets and volume', async () => {
    const day = await benchDay();
    const first = await train(day, 80, 10);
    const second = await train(day, 82.5, 8);
    await startSession(day); // in progress: not history

    const rows = await listHistory();
    expect(rows.map((r) => r.session.id)).toEqual([second, first]);
    expect(rows[0]).toMatchObject({ sets: 3, volume: 1980 });
    expect(rows[1]).toMatchObject({ sets: 3, volume: 2400 });
    expect(rows[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
```

Run: `bun run test src/domain src/db`
Expected: FAIL, con `formatMonth`, `setLabel`, `toggleWarmup` e `./history` mancanti.

- [ ] **Step 3: Implementa**

In `src/domain/format.ts`:

```ts
const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
export const formatMonth = (ts: number): string => monthYear.format(ts);
```

In `src/domain/workout.ts`:

```ts
/** "R" for warmups, 1-based position among work sets otherwise. */
export function setLabel(sets: Pick<SetLog, 'id' | 'isWarmup'>[], set: Pick<SetLog, 'id' | 'isWarmup'>): string {
  if (set.isWarmup) return 'R';
  return String(sets.filter((s) => !s.isWarmup).findIndex((s) => s.id === set.id) + 1);
}
```

In `src/features/workout/ExerciseView.tsx` sostituisci le righe `workIds`/`label` con l'uso di `setLabel(sets, set)` (import da `../../domain/workout`).

In fondo a `src/db/workout.ts`:

```ts
/** SPEC §5.4: history can turn a set into a warmup (excluded from stats) and back. */
export async function toggleWarmup(setId: string): Promise<void> {
  await db.transaction('rw', db.setLogs, async () => {
    const set = await db.setLogs.get(setId);
    if (set) await db.setLogs.update(setId, { isWarmup: !set.isWarmup });
  });
}
```

`src/db/history.ts`:

```ts
import { summarize } from '../domain/stats';
import type { Session } from '../types';
import { db } from './db';

export interface HistoryRow {
  session: Session;
  durationMs: number;
  sets: number;
  volume: number;
}

/** SPEC §5.4: completed sessions, newest first, with duration, work sets and volume. */
export async function listHistory(): Promise<HistoryRow[]> {
  // ponytail: whole-table reads, fine for one person's years of training. If it ever lags,
  // read sessions by the startedAt index one page at a time.
  const [sessions, sessionExercises, setLogs, exercises] = await Promise.all([
    db.sessions.where('status').equals('completed').toArray(),
    db.sessionExercises.toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);
  const tracking = new Map(exercises.map((e) => [e.id, e.trackingType]));
  const setsBySessionExercise = Map.groupBy(setLogs, (s) => s.sessionExerciseId);
  const exercisesBySession = Map.groupBy(sessionExercises, (se) => se.sessionId);
  return sessions
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((session) => {
      const items = (exercisesBySession.get(session.id) ?? []).map((se) => ({
        trackingType: tracking.get(se.exerciseId) ?? 'weight_reps',
        sets: setsBySessionExercise.get(se.id) ?? [],
      }));
      return { session, durationMs: (session.endedAt ?? session.startedAt) - session.startedAt, ...summarize(items) };
    });
}
```

Run: `bun run test src/domain src/db`
Expected: PASS.

- [ ] **Step 4: Riscaldamento attivabile nell'editor della serie**

In `src/features/workout/SetRows.tsx` aggiungi a `EditorProps` il campo `onToggleWarmup?: () => void` e ricevilo in `SetEditor`. Subito dopo il `<div className="mt-1 space-y-2">` degli stepper:

```tsx
      {onToggleWarmup && (
        <label className="mt-2 flex min-h-11 items-center gap-3">
          <span className="flex-1">Serie di riscaldamento</span>
          <input type="checkbox" className="switch" checked={set.isWarmup} onChange={onToggleWarmup} />
        </label>
      )}
```

- [ ] **Step 5: Schermate dello storico**

`src/features/history/HistoryScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { listHistory } from '../../db/history';
import { countLabel, formatClock, formatDate, formatMonth, formatNumber } from '../../domain/format';

export function HistoryScreen() {
  const rows = useLiveQuery(listHistory);
  if (!rows) return null;
  const months = Map.groupBy(rows, (row) => formatMonth(row.session.startedAt));

  return (
    <>
      <Header title="Storico" />
      {rows.length === 0 && (
        <p className="px-4 py-6 text-steel">Nessun allenamento registrato. Inizia il primo dalla schermata Oggi.</p>
      )}
      {[...months].map(([month, list]) => (
        <section key={month}>
          <h2 className="section-title first-letter:uppercase">{month}</h2>
          <ul className="border-t border-steel/25">
            {list.map(({ session, durationMs, sets, volume }) => (
              <li key={session.id}>
                <Link to={`/history/${session.id}`} className="row">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      Giornata {session.dayLabel}
                      {session.dayName && `, ${session.dayName}`}
                    </span>
                    <span className="block text-small text-steel first-letter:uppercase">
                      {formatDate(session.startedAt)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-title">{formatClock(durationMs)}</span>
                    <span className="block text-small text-steel tabular-nums">
                      {countLabel(sets, 'serie', 'serie')}
                      {volume > 0 && `, ${formatNumber(volume)} kg`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
```

`src/features/history/SessionDetail.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { getWorkout } from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { discardSession, setSessionNotes, toggleWarmup } from '../../db/workout';
import { countLabel, formatClock, formatDate, formatNumber, formatTime } from '../../domain/format';
import { summarize } from '../../domain/stats';
import { setLabel, weightStep } from '../../domain/workout';
import { confirmAction } from '../../platform/confirm';
import { SetEditor, SetRow } from '../workout/SetRows';

/** SPEC §5.4: every value of a past session can be corrected. */
export function SessionDetail() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const settings = useLiveQuery(getSettings);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (workout === undefined || !settings) return null;
  if (workout === null) return <Navigate to="/history" replace />;
  const { session, items } = workout;
  if (session.status === 'in_progress') return <Navigate to={`/workout/${session.id}`} replace />;
  const totals = summarize(items.map((i) => ({ trackingType: i.exercise.trackingType, sets: i.sets })));

  const remove = async () => {
    if (!confirmAction('Eliminare questo allenamento? Le sue serie spariscono da storico e progressi.')) return;
    await discardSession(session.id);
    navigate('/history', { replace: true });
  };

  return (
    <>
      <Header title={`Giornata ${session.dayLabel}`} back="/history" />
      <p className="px-4 text-small text-steel first-letter:uppercase">
        {formatDate(session.startedAt)}, alle {formatTime(session.startedAt)}
      </p>
      <p className="px-4 text-small text-steel tabular-nums">
        Durata {formatClock((session.endedAt ?? session.startedAt) - session.startedAt)},{' '}
        {countLabel(totals.sets, 'serie', 'serie')}
        {totals.volume > 0 && `, ${formatNumber(totals.volume)} kg`}
      </p>

      {items.map(({ se, exercise, sets }) => (
        <section key={se.id}>
          <h2 className="px-4 pt-6 pb-2 font-semibold">{exercise.name}</h2>
          {sets.length === 0 ? (
            <p className="px-4 text-small text-steel">Nessuna serie</p>
          ) : (
            <ul className="border-t border-steel/25">
              {sets.map((set) => (
                <li key={set.id}>
                  {set.id === selectedId ? (
                    <SetEditor
                      set={set}
                      label={setLabel(sets, set)}
                      se={se}
                      exercise={exercise}
                      step={weightStep(exercise, settings.weightSteps)}
                      onConfirm={() => setSelectedId(null)}
                      onClose={() => setSelectedId(null)}
                      onToggleWarmup={() => toggleWarmup(set.id)}
                    />
                  ) : (
                    <SetRow
                      set={set}
                      label={setLabel(sets, set)}
                      tracking={exercise.trackingType}
                      onSelect={() => setSelectedId(set.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <label className="block px-4 pt-6">
        <span className="label">Note</span>
        <textarea
          className="field"
          rows={3}
          defaultValue={session.notes}
          onChange={(e) => void setSessionNotes(session.id, e.target.value)}
        />
      </label>
      <div className="mt-auto px-4 py-6">
        <button type="button" className="btn-danger" onClick={remove}>
          <Trash2 size={20} /> Elimina allenamento
        </button>
      </div>
    </>
  );
}
```

In `src/App.tsx` aggiungi la tab:

```tsx
import { ClipboardList, Dumbbell, History as HistoryIcon } from 'lucide-react';
```

```tsx
const TABS = [
  { to: '/', label: 'Oggi', Icon: Dumbbell },
  { to: '/programs', label: 'Programmi', Icon: ClipboardList },
  { to: '/history', label: 'Storico', Icon: HistoryIcon },
];
```

In `src/routes.tsx`, tra i figli di `AppLayout`:

```tsx
import { HistoryScreen } from './features/history/HistoryScreen';
import { SessionDetail } from './features/history/SessionDetail';
```

```tsx
      { path: 'history', Component: HistoryScreen },
      { path: 'history/:sessionId', Component: SessionDetail },
```

- [ ] **Step 6: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`:
1. "Storico" mostra le sessioni raggruppate per mese ("Ottobre 2026"), con giornata, data, durata, serie e volume.
2. Il dettaglio di una sessione permette di:
   - correggere il peso di una serie, e il volume in alto si aggiorna;
   - rendere una serie di riscaldamento (la riga passa a "R") e toglierla;
   - eliminare una serie con conferma;
   - scrivere una nota.
3. "Elimina allenamento" chiede conferma, poi torna all'elenco senza la sessione.
4. Senza sessioni: "Nessun allenamento registrato. Inizia il primo dalla schermata Oggi."

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(history): list past sessions by month and edit them"
```

---

### Task 6: Dettaglio esercizio con grafici

**Files:**
- Create: `src/domain/progress.ts`, `src/components/chartTheme.tsx`, `src/features/library/ExerciseCharts.tsx`
- Modify: `src/domain/format.ts`, `src/domain/format.test.ts`, `src/features/library/ExerciseDetail.tsx`, `package.json`
- Test: `src/domain/progress.test.ts`

**Interfaces:**
- Consumes: `computeRecords`, `recordTable`, `formatRecord`, `RECORD_LABELS` (Task 4); `volume`, `LoggedSet`; `exerciseHistory`, `ExerciseSession`; `Segmented`.
- Produces:
  - dominio: `formatShortDate(ts)` ("23 set"), `Period`, `SeriesPoint`, `exerciseSeries(history, tracking)`, `periodStart(period, now)`;
  - `CHART`, `AXIS`, `TooltipBox({ value, label })`, riusati nella Fase 3;
  - `ExerciseCharts` (default export, caricato in lazy).

Forma dei grafici (skill dataviz). Il compito è mostrare un andamento nel tempo, quindi:
- **linea** per la metrica principale di ogni sessione: e1RM, ripetizioni migliori o durata migliore secondo il tipo;
- **colonne** separate per il volume, mai un secondo asse y;
- una sola serie per grafico, quindi nessuna legenda: il titolo dice cosa c'è.

L'ultimo valore è etichettato in chiaro accanto al titolo. I punti record sono gialli e l'ultimo punto ha un dischetto `chalk`. Il cursore verticale del tooltip agganciato alla data è il crosshair. La tabella "Mostra i dati" contiene tutti i valori.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/format.test.ts` importa `formatShortDate` e aggiungi:

```ts
describe('formatShortDate', () => {
  it('uses day and short month', () => {
    expect(formatShortDate(new Date(2026, 8, 23).getTime())).toBe('23 set');
  });
});
```

`src/domain/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { exerciseSeries, periodStart } from './progress';

const work = (weightKg: number, reps: number) => ({ weightKg, reps, isWarmup: false, completedAt: 1 });
const session = (sessionId: string, startedAt: number, sets: ReturnType<typeof work>[]) => ({
  sessionId,
  startedAt,
  sets,
});

describe('exerciseSeries (SPEC §8.7)', () => {
  it('is oldest first, with the best e1RM, the volume and record flags', () => {
    const points = exerciseSeries(
      [
        session('c', 300, [work(85, 8)]),
        session('a', 100, [work(80, 10), work(80, 8)]),
        session('b', 200, [work(80, 9)]),
      ],
      'weight_reps',
    );
    expect(points.map((p) => p.sessionId)).toEqual(['a', 'b', 'c']);
    expect(points[0]?.value).toBeCloseTo(106.67, 2);
    expect(points[0]?.volume).toBe(1440);
    expect(points.map((p) => p.record)).toEqual([false, false, true]);
  });

  it('skips sessions without an e1RM', () => {
    expect(exerciseSeries([session('a', 100, [work(40, 15)])], 'weight_reps')).toEqual([]);
  });

  it('uses reps for bodyweight exercises and has no volume', () => {
    const [point] = exerciseSeries([session('a', 100, [work(0, 12), work(10, 8)])], 'bodyweight_reps');
    expect(point).toMatchObject({ value: 12, volume: 0 });
  });

  it('uses the longest hold for duration exercises', () => {
    const holds = [{ durationSec: 45, isWarmup: false, completedAt: 1 }, { durationSec: 60, isWarmup: false, completedAt: 1 }];
    expect(exerciseSeries([{ sessionId: 'a', startedAt: 1, sets: holds }], 'duration')[0]?.value).toBe(60);
  });
});

describe('periodStart', () => {
  const now = new Date(2026, 9, 2, 18).getTime();
  it('goes back by calendar months', () => {
    expect(periodStart('3m', now)).toBe(new Date(2026, 6, 2, 18).getTime());
    expect(periodStart('1y', now)).toBe(new Date(2025, 9, 2, 18).getTime());
  });
  it('starts at zero for the whole history', () => {
    expect(periodStart('all', now)).toBe(0);
  });
});
```

Run: `bun run test src/domain`
Expected: FAIL, con `formatShortDate` e `./progress` mancanti.

- [ ] **Step 2: Implementa il dominio**

In `src/domain/format.ts`:

```ts
const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
export const formatShortDate = (ts: number): string => shortDate.format(ts);
```

`src/domain/progress.ts`:

```ts
import type { TrackingType } from '../types';
import { computeRecords } from './records';
import { type LoggedSet, volume } from './stats';

export type Period = '3m' | '6m' | '1y' | 'all';

const MONTHS: Record<Exclude<Period, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

export interface SeriesPoint {
  sessionId: string;
  startedAt: number;
  /** Best e1RM, most reps or longest hold of the session, by tracking type. */
  value: number;
  volume: number;
  /** The session beat every earlier one. */
  record: boolean;
}

function sessionValue(sets: LoggedSet[], tracking: TrackingType): number | undefined {
  const r = computeRecords([sets], tracking);
  if (tracking === 'weight_reps') return r.e1rm;
  return tracking === 'bodyweight_reps' ? r.maxReps : r.maxDuration;
}

/** SPEC §8.7: oldest first; sessions without the metric (e.g. only sets above 12 reps) are skipped. */
export function exerciseSeries(
  history: { sessionId: string; startedAt: number; sets: LoggedSet[] }[],
  tracking: TrackingType,
): SeriesPoint[] {
  let best: number | undefined;
  return [...history]
    .sort((a, b) => a.startedAt - b.startedAt)
    .flatMap(({ sessionId, startedAt, sets }) => {
      const value = sessionValue(sets, tracking);
      if (value === undefined) return [];
      const record = best !== undefined && value > best;
      best = Math.max(best ?? value, value);
      return [{ sessionId, startedAt, value, volume: volume(sets, tracking), record }];
    });
}

export function periodStart(period: Period, now: number): number {
  if (period === 'all') return 0;
  const d = new Date(now);
  d.setMonth(d.getMonth() - MONTHS[period]);
  return d.getTime();
}
```

Run: `bun run test src/domain`
Expected: PASS.

- [ ] **Step 3: Tema dei grafici**

```bash
bun add recharts@3.10.1
```

`src/components/chartTheme.tsx`:

```tsx
// Recharts takes color strings, not classes: these mirror the @theme tokens in src/styles/index.css.
export const CHART = {
  chalk: '#EDEBE6',
  steel: '#9C978E',
  yellow: '#F0C419', // records only
  surface: '#1F1E1C',
  grid: 'rgba(156, 151, 142, 0.25)',
  hover: 'rgba(156, 151, 142, 0.15)',
} as const;

/** Recessive axes: no lines, steel 13px ticks. */
export const AXIS = {
  tick: { fill: CHART.steel, fontSize: 13 },
  tickLine: false,
  axisLine: false,
} as const;

/** Values lead, labels follow: the number is the strong element. */
export function TooltipBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-control bg-iron px-3 py-2">
      <p className="num text-title">{value}</p>
      <p className="text-tiny text-steel">{label}</p>
    </div>
  );
}
```

- [ ] **Step 4: Grafici dell'esercizio**

`src/features/library/ExerciseCharts.tsx`:

```tsx
import { type ReactElement, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { Segmented } from '../../components/Segmented';
import type { ExerciseSession } from '../../db/exercises';
import { formatNumber, formatSeconds, formatShortDate } from '../../domain/format';
import { exerciseSeries, type Period, periodStart, type SeriesPoint } from '../../domain/progress';
import { formatRecord, RECORD_LABELS, recordTable } from '../../domain/records';
import type { TrackingType } from '../../types';

const PERIODS: [Period, string][] = [
  ['3m', '3 mesi'],
  ['6m', '6 mesi'],
  ['1y', '1 anno'],
  ['all', 'Tutto'],
];

const METRIC: Record<TrackingType, { title: string; format: (value: number) => string }> = {
  weight_reps: { title: 'Massimale stimato', format: (v) => `${formatNumber(Math.round(v * 10) / 10)} kg` },
  bodyweight_reps: { title: 'Ripetizioni migliori', format: (v) => `${v} rip` },
  duration: { title: 'Durata migliore', format: (v) => formatSeconds(v) },
};

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: SeriesPoint;
}

const pointOf = (payload: unknown): SeriesPoint | undefined =>
  (payload as { payload?: SeriesPoint }[] | undefined)?.[0]?.payload;

export default function ExerciseCharts({ history, tracking }: { history: ExerciseSession[]; tracking: TrackingType }) {
  const [period, setPeriod] = useState<Period>('6m');
  const from = periodStart(period, Date.now());
  const points = exerciseSeries(history, tracking).filter((p) => p.startedAt >= from);
  const records = recordTable(history, tracking);
  const metric = METRIC[tracking];
  const first = points[0];
  const last = points[points.length - 1];

  // Yellow means record and nothing else; the latest point gets a chalk end-dot; others none.
  const renderDot = ({ cx, cy, index, payload }: DotProps): ReactElement => {
    const fill = payload?.record ? CHART.yellow : index === points.length - 1 ? CHART.chalk : undefined;
    if (cx === undefined || cy === undefined || !fill) return <g key={`dot-${index}`} />;
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill={fill} stroke={CHART.surface} strokeWidth={2} />;
  };

  return (
    <section className="pb-2">
      <h2 className="section-title">Andamento</h2>
      <div className="px-4 pb-3">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {!first || !last || points.length < 2 ? (
        <p className="px-4 text-steel">Servono almeno due sessioni in questo periodo per disegnare l'andamento.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between px-4">
            <h3 className="text-small text-steel">{metric.title} per sessione</h3>
            <p className="num text-title">{metric.format(last.value)}</p>
          </div>
          <div
            className="h-56 pr-4"
            role="img"
            aria-label={`${metric.title} per sessione, da ${metric.format(first.value)} a ${metric.format(last.value)}. I valori sono nella tabella dei dati.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="startedAt"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatShortDate}
                  minTickGap={32}
                  {...AXIS}
                />
                <YAxis width={44} domain={['auto', 'auto']} tickFormatter={(v: number) => formatNumber(v)} {...AXIS} />
                <Tooltip
                  cursor={{ stroke: CHART.steel, strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const p = pointOf(payload);
                    return active && p ? (
                      <TooltipBox value={metric.format(p.value)} label={`${formatShortDate(p.startedAt)}${p.record ? ', record' : ''}`} />
                    ) : null;
                  }}
                />
                <Line
                  dataKey="value"
                  stroke={CHART.chalk}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={renderDot}
                  activeDot={{ r: 5, fill: CHART.chalk, stroke: CHART.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {tracking === 'weight_reps' && (
            <>
              <div className="flex items-baseline justify-between px-4 pt-6">
                <h3 className="text-small text-steel">Volume per sessione</h3>
                <p className="num text-title">{formatNumber(last.volume)} kg</p>
              </div>
              <div className="h-44 pr-4" role="img" aria-label="Volume per sessione. I valori sono nella tabella dei dati.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="startedAt" tickFormatter={formatShortDate} minTickGap={32} {...AXIS} />
                    <YAxis width={44} tickFormatter={(v: number) => formatNumber(v)} {...AXIS} />
                    <Tooltip
                      cursor={{ fill: CHART.hover }}
                      content={({ active, payload }) => {
                        const p = pointOf(payload);
                        return active && p ? (
                          <TooltipBox value={`${formatNumber(p.volume)} kg`} label={formatShortDate(p.startedAt)} />
                        ) : null;
                      }}
                    />
                    <Bar dataKey="volume" fill={CHART.steel} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}

      {records.length > 0 && (
        <>
          <h3 className="section-title">Record</h3>
          <table className="w-full border-t border-steel/25">
            <tbody>
              {records.map((r) => (
                <tr key={r.kind} className="border-b border-steel/25">
                  <th scope="row" className="py-3 pl-4 text-left font-normal">
                    {RECORD_LABELS[r.kind]}
                  </th>
                  <td className="num text-right text-title">{formatRecord(r.kind, r.value)}</td>
                  <td className="w-20 pr-4 text-right text-small text-steel">{formatShortDate(r.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {points.length > 0 && (
        <details className="pt-2">
          <summary className="section-title min-h-11 cursor-pointer">Mostra i dati</summary>
          <table className="w-full text-small tabular-nums">
            <thead>
              <tr className="text-steel">
                <th scope="col" className="pl-4 text-left font-normal">Data</th>
                <th scope="col" className="text-right font-normal">{metric.title}</th>
                {tracking === 'weight_reps' && <th scope="col" className="pr-4 text-right font-normal">Volume</th>}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.sessionId} className="border-b border-steel/25">
                  <td className="py-2 pl-4">{formatShortDate(p.startedAt)}</td>
                  <td className="text-right">{metric.format(p.value)}</td>
                  {tracking === 'weight_reps' && <td className="pr-4 text-right">{formatNumber(p.volume)} kg</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Caricamento lazy nel dettaglio esercizio**

In `src/features/library/ExerciseDetail.tsx`:

```tsx
import { lazy, Suspense, useState } from 'react';

const ExerciseCharts = lazy(() => import('./ExerciseCharts')); // Recharts stays out of the main bundle
```

Leggi tutto lo storico e non solo le ultime 5 sessioni:

```tsx
  const history = useLiveQuery(() => exerciseHistory(exerciseId), [exerciseId]);
```

Prima di `<h2 className="section-title">Ultime sessioni</h2>`:

```tsx
      {history.length > 0 && (
        <Suspense fallback={null}>
          <ExerciseCharts history={history} tracking={trackingType} />
        </Suspense>
      )}
```

Nell'elenco "Ultime sessioni" usa `history.slice(0, 5).map(…)` al posto di `history.map(…)`.

- [ ] **Step 6: Verifica**

Run: `bun run format && bun run check && bun run build`
Expected: PASS. In `dist/assets/` c'è un chunk `ExerciseCharts-*.js` separato. Recharts non finisce in `index-*.js`: per controllarlo, `grep -l recharts dist/assets/index-*.js` non trova nulla.

Con `bun run dev` e almeno tre sessioni di Panca con carichi crescenti (o modificate dallo storico):
1. Nel dettaglio di Panca, "Andamento" ha "6 mesi" selezionato e una linea `chalk` di 2px. I punti record sono gialli con l'anello scuro e l'ultimo punto è `chalk`. Il valore attuale sta accanto al titolo.
2. Toccando il grafico compare una linea verticale con il riquadro: valore in grande, poi la data.
3. Le colonne del volume sono `steel`, larghe al massimo 24px e arrotondate in alto.
4. "Record" elenca massimale, carico e volume con la data. "Mostra i dati" apre la tabella completa.
5. Con un solo allenamento compare "Servono almeno due sessioni…" e la tabella resta disponibile.
6. Per "Plank" il titolo è "Durata migliore" e non c'è il grafico del volume.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(progress): add exercise charts, records table and data table"
```

---

### Task 7: Riepilogo con record e confronto con l'ultima volta

**Files:**
- Modify: `src/db/history.ts`, `src/db/history.test.ts`, `src/domain/format.ts`, `src/domain/format.test.ts`, `src/features/workout/SummaryScreen.tsx`

**Interfaces:**
- Consumes: `getWorkout`, `Workout` (Fase 1); `exerciseHistory`; `computeRecords`, `beatenRecords`, `RECORD_LABELS`, `formatRecord` (Task 4); `bestSet`, `summarize`.
- Produces:
  - `formatChange(current, previous): string | undefined` ("+5%");
  - `SummaryContext { previous?: Workout; recordsBefore: Map<string, Records> }`;
  - `getSummaryContext(sessionId): Promise<SummaryContext | undefined>`.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/format.test.ts` importa `formatChange` e aggiungi:

```ts
describe('formatChange', () => {
  it('shows a signed percentage', () => {
    expect(formatChange(1050, 1000)).toBe('+5%');
    expect(formatChange(880, 1000)).toBe('-12%');
    expect(formatChange(1000, 1000)).toBe('0%');
  });
  it('is undefined without a previous value', () => {
    expect(formatChange(500, 0)).toBeUndefined();
  });
});
```

In `src/db/history.test.ts` importa `getSummaryContext` e aggiungi:

```ts
describe('getSummaryContext', () => {
  it('finds the previous session of the same day and the records before this one', async () => {
    const day = await benchDay();
    const first = await train(day, 80, 10);
    const second = await train(day, 82.5, 10);

    const context = await getSummaryContext(second);
    expect(context?.previous?.session.id).toBe(first);
    const [records] = [...(context?.recordsBefore.values() ?? [])];
    expect(records?.maxWeight).toBe(80); // the second session itself is not "before"
  });

  it('has nothing to compare on the first session', async () => {
    const first = await train(await benchDay(), 80, 10);
    const context = await getSummaryContext(first);
    expect(context?.previous).toBeUndefined();
    expect([...(context?.recordsBefore.values() ?? [])]).toEqual([{}]);
  });
});
```

Run: `bun run test src/domain/format.test.ts src/db/history.test.ts`
Expected: FAIL, `formatChange` e `getSummaryContext` mancanti.

- [ ] **Step 2: Implementa**

In `src/domain/format.ts`:

```ts
const percentChange = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  signDisplay: 'exceptZero',
  maximumFractionDigits: 0,
});

/** (current − previous) / previous as "+5%"; undefined without a previous value. */
export function formatChange(current: number, previous: number): string | undefined {
  return previous > 0 ? percentChange.format((current - previous) / previous) : undefined;
}
```

In `src/db/history.ts`:

```ts
import { computeRecords, type Records } from '../domain/records';
import { exerciseHistory } from './exercises';
import { getWorkout, type Workout } from './sessions';
```

```ts
export interface SummaryContext {
  /** Last completed session of the same day before this one (SPEC §6.8). */
  previous?: Workout;
  /** Records by exercise id, from the sessions before this one. */
  recordsBefore: Map<string, Records>;
}

export async function getSummaryContext(sessionId: string): Promise<SummaryContext | undefined> {
  const workout = await getWorkout(sessionId);
  if (!workout) return undefined;
  const { session, items } = workout;
  const earlier = await db.sessions
    .where('dayId')
    .equals(session.dayId)
    .filter((s) => s.status === 'completed' && s.startedAt < session.startedAt)
    .sortBy('startedAt');
  const previousId = earlier.at(-1)?.id;

  const recordsBefore = new Map<string, Records>();
  for (const { exercise } of items) {
    if (recordsBefore.has(exercise.id)) continue;
    const before = (await exerciseHistory(exercise.id)).filter((h) => h.startedAt < session.startedAt);
    recordsBefore.set(
      exercise.id,
      computeRecords(
        before.map((h) => h.sets),
        exercise.trackingType,
      ),
    );
  }
  return { previous: previousId ? await getWorkout(previousId) : undefined, recordsBefore };
}
```

Run: `bun run test src/domain/format.test.ts src/db/history.test.ts`
Expected: PASS.

- [ ] **Step 3: Riepilogo completo**

`src/features/workout/SummaryScreen.tsx` (sostituisce la versione della Fase 1):

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { getSummaryContext } from '../../db/history';
import { getWorkout } from '../../db/sessions';
import { setSessionNotes } from '../../db/workout';
import { formatChange, formatClock, formatNumber, formatSet } from '../../domain/format';
import { beatenRecords, formatRecord, RECORD_LABELS } from '../../domain/records';
import { bestSet, summarize } from '../../domain/stats';

/** SPEC §6.8: totals, records beaten and the comparison with the last session of the same day. */
export function SummaryScreen() {
  const { sessionId = '' } = useParams();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const context = useLiveQuery(() => getSummaryContext(sessionId), [sessionId]);
  if (workout === undefined) return null;
  if (workout === null) return <Navigate to="/" replace />;
  const { session, items } = workout;
  if (session.status === 'in_progress') return <Navigate to={`/workout/${session.id}`} replace />;
  if (!context) return null;

  const totalsOf = (list: typeof items) =>
    summarize(list.map((i) => ({ trackingType: i.exercise.trackingType, sets: i.sets })));
  const totals = totalsOf(items);
  const change = context.previous && formatChange(totals.volume, totalsOf(context.previous.items).volume);
  const beaten = items.flatMap(({ se, exercise, sets }) =>
    beatenRecords(sets, exercise.trackingType, context.recordsBefore.get(exercise.id) ?? {}).map((r) => ({
      ...r,
      key: `${se.id}-${r.kind}`,
      name: exercise.name,
    })),
  );

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header title="Allenamento terminato" />
      <p className="px-4 text-small text-steel">
        Giornata {session.dayLabel}
        {session.dayName && `, ${session.dayName}`}
      </p>
      <dl className="grid grid-cols-3 gap-2 px-4 pt-6 pb-2">
        <Stat label="Durata" value={formatClock((session.endedAt ?? session.startedAt) - session.startedAt)} />
        <Stat label="Serie" value={formatNumber(totals.sets)} />
        <Stat label="Volume" value={formatNumber(totals.volume)} unit="kg" />
      </dl>
      {change && (
        <p className="px-4 pb-2 text-small text-steel">
          Volume {change} rispetto all'ultima giornata {session.dayLabel}
        </p>
      )}

      {beaten.length > 0 && (
        <>
          <h2 className="section-title">Record battuti</h2>
          <ul className="border-t border-steel/25">
            {beaten.map(({ key, name, kind, value }) => (
              <li key={key} className="row">
                <Trophy size={20} className="shrink-0 text-plate-yellow" />
                <span className="flex-1">
                  <span className="block">{name}</span>
                  <span className="block text-small text-steel">{RECORD_LABELS[kind]}</span>
                </span>
                <span className="num text-title">{formatRecord(kind, value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Esercizi</h2>
      <ul className="border-t border-steel/25">
        {items.map(({ se, exercise, sets }) => {
          const tracking = exercise.trackingType;
          const best = bestSet(sets, tracking);
          const previousItem = context.previous?.items.find((i) => i.exercise.id === exercise.id);
          const previousBest = previousItem && bestSet(previousItem.sets, tracking);
          return (
            <li key={se.id} className="row">
              <span className="flex-1">
                <span className="block">{exercise.name}</span>
                {best && previousBest && (
                  <span className="block text-small text-steel tabular-nums">
                    l'ultima volta {formatSet(previousBest, tracking)}
                  </span>
                )}
              </span>
              {best ? (
                <span className="num text-title">{formatSet(best, tracking)}</span>
              ) : (
                <span className="text-small text-steel">Nessuna serie</span>
              )}
            </li>
          );
        })}
      </ul>

      <label className="block px-4 pt-6">
        <span className="label">Note</span>
        <textarea
          className="field"
          rows={3}
          defaultValue={session.notes}
          placeholder="Come è andata?"
          onChange={(e) => void setSessionNotes(session.id, e.target.value)}
        />
      </label>
      <div className="mt-auto px-4 pt-6 pb-4">
        <Link to="/" replace className="btn-primary">
          Fatto
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-tiny text-steel">{label}</dt>
      <dd className="num text-value">
        {value}
        {unit && <span className="pl-1 font-sans text-small font-normal text-steel">{unit}</span>}
      </dd>
    </div>
  );
}
```

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: ripeti la stessa giornata con 2,5 kg in più su Panca e termina.
1. Il riepilogo mostra "Volume +3% rispetto all'ultima giornata A" (o la variazione reale).
2. "Record battuti" elenca "Panca piana… Carico massimo 82,5 kg" con il trofeo giallo.
3. La riga di Panca mostra "82,5×8" con sotto "l'ultima volta 80×8".
4. Alla prima volta di una giornata non compaiono né il confronto né i record.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(summary): show records beaten and compare with the last session of the day"
```

---

### Task 8: Schermata Progressi (esercizi)

**Files:**
- Create: `src/features/progress/ProgressScreen.tsx`
- Modify: `src/db/history.ts`, `src/db/history.test.ts`, `src/domain/records.ts`, `src/domain/records.test.ts`, `src/App.tsx`, `src/routes.tsx`

**Interfaces:**
- Consumes: `computeRecords`, `formatRecord`, `RECORD_LABELS` (Task 4); `relativeDay`.
- Produces:
  - `headlineRecord(records, tracking): { kind; value } | undefined`;
  - `TrainedExercise { exercise; lastAt; best: Records }`, `listTrainedExercises(): Promise<TrainedExercise[]>`;
  - route `/progress`, tab "Progressi". La Fase 3 aggiunge i segmenti Gruppi muscolari e Costanza.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/records.test.ts` importa `headlineRecord` e aggiungi:

```ts
describe('headlineRecord', () => {
  it('prefers the e1RM, then the load, for weighted exercises', () => {
    expect(headlineRecord({ e1rm: 106, maxWeight: 90 }, 'weight_reps')).toEqual({ kind: 'e1rm', value: 106 });
    expect(headlineRecord({ maxWeight: 40 }, 'weight_reps')).toEqual({ kind: 'maxWeight', value: 40 });
  });
  it('uses reps or duration otherwise', () => {
    expect(headlineRecord({ maxReps: 15 }, 'bodyweight_reps')).toEqual({ kind: 'maxReps', value: 15 });
    expect(headlineRecord({}, 'duration')).toBeUndefined();
  });
});
```

In `src/db/history.test.ts` importa `listTrainedExercises` e aggiungi:

```ts
describe('listTrainedExercises', () => {
  it('lists only exercises with completed work sets, most recent first', async () => {
    const day = await benchDay();
    await train(day, 80, 10);
    const rows = await listTrainedExercises();
    expect(rows.map((r) => r.exercise.name)).toEqual(['Panca']);
    expect(rows[0]?.best.maxWeight).toBe(80);
  });
});
```

Run: `bun run test src/domain/records.test.ts src/db/history.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementa**

In `src/domain/records.ts`:

```ts
/** The one number shown per exercise on the Progress list. */
export function headlineRecord(
  records: Records,
  tracking: TrackingType,
): { kind: RecordKind; value: number } | undefined {
  const order: RecordKind[] =
    tracking === 'weight_reps' ? ['e1rm', 'maxWeight'] : tracking === 'bodyweight_reps' ? ['maxReps'] : ['maxDuration'];
  const kind = order.find((k) => records[k] !== undefined);
  const value = kind && records[kind];
  return kind && value !== undefined ? { kind, value } : undefined;
}
```

In `src/db/history.ts`:

```ts
import type { Exercise, Session } from '../types';
```

```ts
export interface TrainedExercise {
  exercise: Exercise;
  lastAt: number;
  best: Records;
}

export async function listTrainedExercises(): Promise<TrainedExercise[]> {
  const [sessions, setLogs, exercises] = await Promise.all([
    db.sessions.where('status').equals('completed').toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);
  const completed = new Map(sessions.map((s) => [s.id, s]));
  const valid = setLogs.filter((s) => completed.has(s.sessionId) && s.completedAt !== undefined && !s.isWarmup);
  const byExercise = Map.groupBy(valid, (s) => s.exerciseId);
  return exercises
    .flatMap((exercise) => {
      const sets = byExercise.get(exercise.id);
      if (!sets) return [];
      const lastAt = Math.max(...sets.map((s) => completed.get(s.sessionId)?.startedAt ?? 0));
      const bySession = [...Map.groupBy(sets, (s) => s.sessionId).values()];
      return [{ exercise, lastAt, best: computeRecords(bySession, exercise.trackingType) }];
    })
    .sort((a, b) => b.lastAt - a.lastAt);
}
```

Run: `bun run test src/domain/records.test.ts src/db/history.test.ts`
Expected: PASS.

- [ ] **Step 3: Schermata e tab**

`src/features/progress/ProgressScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { listTrainedExercises } from '../../db/history';
import { relativeDay } from '../../domain/format';
import { formatRecord, headlineRecord, RECORD_LABELS } from '../../domain/records';

export function ProgressScreen() {
  const rows = useLiveQuery(listTrainedExercises);
  if (!rows) return null;
  return (
    <>
      <Header title="Progressi" />
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-steel">Nessun progresso da mostrare. Completa un allenamento e torna qui.</p>
      ) : (
        <ul className="border-t border-steel/25">
          {rows.map(({ exercise, lastAt, best }) => {
            const headline = headlineRecord(best, exercise.trackingType);
            return (
              <li key={exercise.id}>
                <Link to={`/exercises/${exercise.id}`} className="row">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{exercise.name}</span>
                    <span className="block text-small text-steel">Ultima volta {relativeDay(lastAt)}</span>
                  </span>
                  {headline && (
                    <span className="text-right">
                      <span className="num block text-title">{formatRecord(headline.kind, headline.value)}</span>
                      <span className="block text-tiny text-steel">{RECORD_LABELS[headline.kind]}</span>
                    </span>
                  )}
                  <ChevronRight size={20} className="shrink-0 text-steel" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
```

In `src/App.tsx`:

```tsx
import { ClipboardList, Dumbbell, History as HistoryIcon, TrendingUp } from 'lucide-react';
```

```tsx
  { to: '/progress', label: 'Progressi', Icon: TrendingUp },
```

(come quarta voce di `TABS`). In `src/routes.tsx`:

```tsx
import { ProgressScreen } from './features/progress/ProgressScreen';
```

```tsx
      { path: 'progress', Component: ProgressScreen },
```

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`:
1. La tab bar ha quattro voci: Oggi, Programmi, Storico, Progressi. A 375pt le etichette non si sovrappongono.
2. "Progressi" elenca gli esercizi allenati, dal più recente: "Ultima volta ieri" e a destra "106,7 kg / Massimale stimato".
3. Il tocco apre il dettaglio con i grafici.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(progress): list trained exercises with their headline record"
```

---

### Task 9: Collaudo della Fase 2 sull'iPhone

**Files:**
- Modify: `docs/SPEC.md` (checklist §12)

**Interfaces:**
- Consumes: tutta la Fase 2.
- Produces: la Fase 2 in produzione.

- [ ] **Step 1: Controllo e anteprima**

```bash
bun run format && bun run check && bun run build
bun run deploy:preview
```

Prima del deploy controlla che il secret `VAPID_PRIVATE_KEY` esista su `gym-log-preview` (Task 2, step 2).

- [ ] **Step 2: Attivazione sull'iPhone**

1. Apri l'anteprima in Safari: Impostazioni → "Notifiche del timer" spiega come aggiungere l'app alla Home.
2. Aggiungila alla Home e aprila da lì. "Attiva notifiche" mostra il permesso di iOS; consenti.

- [ ] **Step 3: Criteri della Fase 2**

Imposta un recupero di 30 s su un esercizio.

1. **A schermo bloccato.** Conferma una serie e blocca il telefono: la notifica "Recupero finito" arriva entro pochi secondi dalla fine del recupero. Un tocco riapre l'app.
2. **"+15 s".** Conferma una serie, tocca "+15 s" e blocca: la notifica arriva circa 45 s dopo la conferma.
3. **"Salta" e "Termina allenamento".** Conferma una serie e tocca "Salta": nessuna notifica. Conferma una serie e termina l'allenamento durante il recupero: nessuna notifica.
4. **Offline.** In modalità aereo conferma una serie: il timer in app scorre, compare la campanella barrata e nessuna notifica arriva. È il comportamento atteso.
5. **Subscription persa.** Chiudi l'app dal multitasking, riaprila e ripeti il punto 1: funziona ancora, perché all'avvio la subscription si rinnova se serve.
6. **Log puliti.** `bunx wrangler tail gym-log-preview` durante i test non mostra né endpoint né testi delle notifiche.

- [ ] **Step 4: Storico, record e grafici sul telefono**

Correggi una serie da Storico. In Progressi apri l'esercizio: il grafico riflette la correzione, e il tocco sul grafico mostra il valore.

I fogli (esercizio di giornata, menu ⋯, '3 di 6', 'Nuovo esercizio') si aprono interi, in basso, anche dopo aver scritto in un campo

Su schermate corte (Progressi vuoto, Impostazioni) la pagina non scorre e la tab bar tocca il fondo.

Se i fogli restano troppo in basso o questo controllo non passa: togli la regola `@media (display-mode: standalone) { html, body { min-height: 100lvh; } }` da `src/styles/index.css`, oppure passa la barra di stato a `black` opaca (va reinstallata l'app dalla schermata Home). La scelta è dell'utente.

- [ ] **Step 5: Produzione e checklist**

```bash
bunx wrangler secret put VAPID_PRIVATE_KEY   # if not done in Task 2
bun run deploy
```

In `docs/SPEC.md` §12 "Fase 2" spunta tutte le voci.

```bash
git add -A
git commit -m "chore: complete phase 2 acceptance"
```
