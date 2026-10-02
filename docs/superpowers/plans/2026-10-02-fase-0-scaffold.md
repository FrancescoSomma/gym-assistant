# Fase 0 — Scaffold: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** progetto Vite + React + TypeScript con Bun, sistema visivo in Tailwind v4, PWA installabile che funziona offline, pubblicata su Cloudflare Workers come soli asset statici.

**Architecture:** SPA statica. Il service worker è scritto a mano (`src/sw.ts`, solo Cache API, niente Workbox runtime) e vite-plugin-pwa ci inietta l'elenco dei file da mettere in cache (`injectManifest`). Il deploy usa Workers Static Assets con il fallback SPA; in questa fase non c'è codice Worker.

**Tech Stack:** Bun, Vite 8, React 19, TypeScript 7, Tailwind CSS 4.3, vite-plugin-pwa 1.3, Vitest 5, Biome 2.5, Wrangler 4.

**Spec:** `docs/SPEC.md` (oggi in `SPEC.md` alla radice; il Task 1 lo sposta), §3, §10, §11, §12 "Fase 0". Le regole di progetto sono in `CLAUDE.md`.

**Piani collegati:** Fase 1 `2026-10-02-fase-1-mvp.md` · Fase 2 `2026-10-02-fase-2-notifiche-storico.md` · Fase 3 `2026-10-02-fase-3-analisi.md`.

## Versioni verificate (2026-10-02)

Le versioni sono state verificate sul registro npm e con un'installazione di prova (`vite build` riuscito con React, Tailwind e PWA insieme).

| Pacchetto | Versione | Note |
|---|---|---|
| vite | 8.3.2 | richiede `"type": "module"` nel package.json |
| @vitejs/plugin-react | 6.1.1 | solo Vite 8 |
| react, react-dom | 19.3.0 | |
| @types/react | 19.3.0 | |
| typescript | 7.0.2 | compilatore nativo. Di default ha `strict: true` e `types: []`, quindi i tipi ambientali vanno elencati |
| tailwindcss, @tailwindcss/vite | 4.3.3 | |
| vite-plugin-pwa | 1.3.0 | supporta Vite 8 |
| workbox-window | 7.4.1 | lo importa `virtual:pwa-register`; la documentazione chiede di aggiungerlo esplicitamente |
| vitest | 5.0.3 | Node ^22.12 o ^24 |
| @biomejs/biome | 2.5.15 | |
| wrangler | 4.147.0 | |

## Global Constraints

- Bun è il package manager e lancia gli script (`bun run …`). Vitest e Vite girano su Node 24, già installato.
- Dipendenze ammesse: solo quelle dello stack in `CLAUDE.md`. `workbox-window` è un requisito di vite-plugin-pwa ed è l'unica aggiunta. Ogni altra dipendenza va chiesta.
- Interfaccia in italiano. Codice, identificatori, commenti e commit in inglese, con Conventional Commits.
- TypeScript strict. Biome per lint e formattazione: virgolette singole, punto e virgola, 2 spazi, righe da 100 caratteri.
- Manifest: `name` e `short_name` "Palestra", `lang: "it"`, `display: "standalone"`, `orientation: "portrait"`, `start_url` e `scope` `"/"`, `background_color` e `theme_color` `#1F1E1C`, icone 192, 512 e 512 maskable.
- `index.html`: `viewport-fit=cover`, `theme-color #1F1E1C`, `apple-mobile-web-app-status-bar-style black-translucent`, `apple-touch-icon` 180×180 senza trasparenza.
- CSS: `overscroll-behavior: none` su `html` e `body`; `touch-action: manipulation` sugli elementi interattivi; `-webkit-user-select: none` e `-webkit-touch-callout: none` sui controlli, non sui testi; margini con `env(safe-area-inset-*)`; input con `font-size` di almeno 16px.
- Service worker: precache di tutti gli asset di build, font compresi; fallback di navigazione sulla shell; `/api/` escluso; aggiornamenti con `registerType: 'prompt'`.
- Solo tema scuro. Ogni colore dei dischi ha un solo significato (SPEC §11.2).
- Dominio di produzione stabile fin dal primo deploy: `gym-log.<sottodominio>.workers.dev`.
- Una feature è completa quando `bun run check` passa.

## Review Focus

Sono i casi che i test automatici non coprono e che più probabilmente danno problemi all'utente. Ognuno ha una verifica esplicita nel task indicato.

1. **Riapertura offline su una route profonda** (per esempio `/programs` in modalità aereo): deve aprirsi la shell, non la pagina di errore di Safari. Verifica nel Task 3, step 7.
2. **Redirect di Cloudflare da `/index.html` a `/`:** una risposta con redirect messa in cache rompe la navigazione su iOS. Il service worker precarica `/` al posto di `index.html`. Verifica nel Task 4, step 5.
3. **Nuova versione con l'app installata:** dopo un deploy compare "Nuova versione disponibile", "Aggiorna" ricarica la nuova versione e le cache vecchie vengono cancellate. Verifica nel Task 4, step 6.
4. **Contenuti sotto la notch o sotto l'indicatore Home** con `black-translucent`: il padding con `safe-area-inset` deve funzionare. Verifica nel Task 2, step 6, e sul telefono nel Task 4.
5. **Icona sulla Home con sfondo nero o trasparente:** l'`apple-touch-icon` deve essere opaca. Verifica nel Task 3, step 3.

## Mappa dei file

| File | Responsabilità |
|---|---|
| `package.json` | script e dipendenze |
| `tsconfig.json` | TypeScript per app, test e `vite.config.ts` (esclude `src/sw.ts`) |
| `tsconfig.sw.json` | TypeScript per il service worker (lib WebWorker) |
| `biome.json` | lint e formattazione |
| `vite.config.ts` | React, Tailwind, PWA, Vitest |
| `index.html` | meta per iOS e punto di montaggio |
| `src/main.tsx` | avvio di React |
| `src/App.tsx` | schermata provvisoria (diventa il layout nella Fase 1) |
| `src/styles/index.css` | Tailwind, token `@theme`, font, stili di base |
| `src/sw.ts` | precache, fallback di navigazione, messaggio `SKIP_WAITING` |
| `src/components/UpdatePrompt.tsx` | avviso "Nuova versione disponibile" |
| `scripts/gen-icons.ts` | genera le icone PNG senza dipendenze |
| `public/fonts/barlow-condensed-600.woff2` | font dei numeri, self-hosted |
| `public/icon-*.png`, `public/apple-touch-icon.png` | icone generate |
| `wrangler.jsonc` | deploy su Workers Static Assets |

---

### Task 1: Toolchain e progetto vuoto

**Files:**
- Move: `SPEC.md` → `docs/SPEC.md`
- Create: `.gitignore`, `package.json`, `tsconfig.json`, `biome.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: niente.
- Produces: script `dev`, `build`, `preview`, `test`, `typecheck`, `lint`, `format`, `check`. Componente `App` esportato da `src/App.tsx`.

- [ ] **Step 1: Installa Bun e controlla Node**

```bash
brew install oven-sh/bun/bun   # oppure: curl -fsSL https://bun.sh/install | bash
bun --version                  # atteso: 1.2 o successiva
node --version                 # atteso: v24.x (Vitest 5 richiede ^22.12 o ^24)
```

- [ ] **Step 2: Sposta la specifica dove la cerca CLAUDE.md**

```bash
cd /Users/francescosomma/Personale/gym-assistant
mkdir -p docs
mv SPEC.md docs/SPEC.md
```

- [ ] **Step 3: Crea `.gitignore`**

Biome legge `.gitignore` (`vcs.useIgnoreFile`) e va in errore se il file non esiste: crealo prima di configurare Biome.

```gitignore
node_modules
dist
dev-dist
.wrangler
.dev.vars
*.log
.DS_Store
```

- [ ] **Step 4: Crea `package.json` e installa le dipendenze**

```json
{
  "name": "gym-log",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome check --write .",
    "check": "bun run typecheck && bun run lint && bun run test"
  }
}
```

```bash
bun add react@19.3.0 react-dom@19.3.0
bun add -d vite@8.3.2 @vitejs/plugin-react@6.1.1 typescript@7.0.2 @types/react@19.3.0 @types/react-dom@19 vitest@5.0.3 @biomejs/biome@2.5.15
```

- [ ] **Step 5: Crea `tsconfig.json`**

TypeScript 7 ha `types: []` di default: i tipi di Vite vanno elencati, altrimenti `import.meta.env` e gli import di CSS non compilano.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 6: Crea `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!!**/dist", "!!**/dev-dist"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } },
  "css": { "parser": { "tailwindDirectives": true } },
  "linter": { "rules": { "preset": "recommended" } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

- [ ] **Step 7: Crea `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`**

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node' },
});
```

`index.html`:

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Palestra</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`:

```tsx
export function App() {
  return <main>Palestra</main>;
}
```

- [ ] **Step 8: Verifica**

```bash
bun run format   # normalizza la formattazione e ordina gli import
bun run check
```

Atteso: `tsc` senza errori, `biome check` con "Checked N files… No fixes applied", `vitest` con "No test files found, exiting with code 0".

```bash
bun run dev
```

Atteso: su http://localhost:5173 si vede "Palestra". Chiudi il server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react typescript project with bun"
```

---

### Task 2: Sistema visivo (Tailwind v4, token, font)

Il sistema visivo nasce da SPEC §11, che fissa palette, ruoli tipografici, scala e principi. Le scelte che la spec lascia libere, e il loro perché, sono raccolte qui una volta sola: la Fase 1 le usa senza ridiscuterle.

**Piano visivo**

- **Colore.** Gli otto token di §11.2. `--color-*: initial` toglie la palette predefinita di Tailwind, così `bg-red-500` non esiste e i colori dei dischi non si possono usare come decorazione per sbaglio.
  - I separatori sono `steel` al 25% (`border-steel/25`).
  - Le superfici traslucide (pulsanti secondari, pulsanti degli stepper) usano `steel` al 15%: si vedono sia su `rubber` sia su `iron`.
- **Contrasto misurato.**
  - `chalk` su `plate-blue` ≈ 4,6:1 (dalla spec). `rubber` su `plate-green` ≈ 5,2:1, quindi testo e spunte sul verde sono `rubber`. `steel` su `rubber` ≈ 5,7:1 e su `iron` ≈ 4,8:1.
  - `plate-red` su `rubber` ≈ 3,6:1 e `chalk` su `plate-red` ≈ 3,8:1: il rosso non regge testo da 17px. Le azioni distruttive hanno quindi testo `chalk` e un'icona `plate-red` (alla grafica basta 3:1).
  - Gli errori non sono azioni distruttive, quindi non sono rossi: testo `chalk` con `role="alert"`.
- **Tipografia.**
  - Numeri in **Barlow Condensed 600** con `tabular-nums`. Big Shoulders è stata verificata con fontTools: nessuna versione ha la feature `tnum` e le cifre hanno larghezze diverse (0=980, 1=543 unità), quindi il timer "ballerebbe". La spec prescrive questo fallback.
  - Testo dell'interfaccia in `system-ui`.
  - La scala è solo quella di §11.3, con `--text-*: initial`: `text-timer` 64, `text-value` 32, `text-name` 28, `text-title` 22, `text-body` 17, `text-small` 15, `text-tiny` 13.
- **Forma.** Due raggi più il cerchio:
  - `rounded-control` (12px) per pulsanti e campi;
  - `rounded-sheet` (20px) per gli angoli superiori dei fogli;
  - `rounded-full` per i dischi.
  - Le righe degli elenchi non hanno raggio: §11.1 chiede "righe, non card".
- **Metafora dei dischi.** Lo stato di una serie è un piccolo disco: contorno `steel` se prevista, pieno `plate-green` con spunta `rubber` se completata. La serie corrente ha un bordo sinistro `plate-blue` di 4px, come il bordo colorato di un disco visto di taglio. Nient'altro nell'interfaccia è colorato.
- **Un solo elemento audace: la barra del timer** (Fase 1, Task 17). Numeri da 64px, una linea `chalk` di 4px che si svuota, tutta verde a fine recupero. Il resto dell'interfaccia resta sobrio.
- **Revisione rispetto ai default generati.**
  - La spec impone il fondo scuro e una palette di accenti, cioè il cliché "nero più accento acido". Lo si evita con tre scelte: ogni colore ha un solo significato, i neutri sono caldi (`rubber`, `chalk`) e non `#111`, l'unico colore che si vede spesso è il blu della serie corrente.
  - Niente etichette in maiuscolo sopra i titoli: le intestazioni di sezione sono `text-small text-steel` con la sola iniziale maiuscola.
  - Niente separatori "·": si usano le virgole.
  - Niente monospace per i dati: si usano le cifre tabellari di Barlow.
  - Niente "→" nei pulsanti.
  - Prima versione scartata: una lettera della giornata da 64px come elemento principale di Oggi. Avrebbe fatto concorrenza al timer, quindi l'etichetta resta a 32px.

**Files:**
- Create: `src/styles/index.css`, `public/fonts/barlow-condensed-600.woff2`
- Modify: `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `package.json`

**Interfaces:**
- Consumes: Task 1.
- Produces: utility `bg-rubber`, `bg-iron`, `text-chalk`, `text-steel`, `bg-plate-blue`, `bg-plate-green`, `text-plate-yellow`, `text-plate-red`, `border-steel/25`, `font-num`, `text-timer`, `text-value`, `text-name`, `text-title`, `text-body`, `text-small`, `text-tiny`, `rounded-control`, `rounded-sheet` e la utility composta `num` (Barlow, 600, `tabular-nums`).

- [ ] **Step 1: Installa Tailwind e scarica il font**

```bash
bun add -d tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
mkdir -p public/fonts
curl -fsSLo public/fonts/barlow-condensed-600.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/barlow-condensed@latest/latin-600-normal.woff2
ls -l public/fonts   # atteso: circa 22 KB
```

Licenza OFL: il self-hosting è consentito.

- [ ] **Step 2: Crea `src/styles/index.css`**

```css
@import "tailwindcss";

@font-face {
  font-family: "Barlow Condensed";
  src: url("/fonts/barlow-condensed-600.woff2") format("woff2");
  font-weight: 600;
  font-display: swap;
}

@theme {
  --color-*: initial;
  --color-rubber: #1f1e1c;
  --color-iron: #2e2c29;
  --color-chalk: #edebe6;
  --color-steel: #9c978e;
  --color-plate-blue: #2b5dd8;
  --color-plate-yellow: #f0c419;
  --color-plate-green: #2fa45a;
  --color-plate-red: #d93a2f;

  --font-sans: system-ui, -apple-system, sans-serif;
  --font-num: "Barlow Condensed", system-ui, sans-serif;

  --text-*: initial;
  --text-timer: 64px;
  --text-timer--line-height: 1;
  --text-value: 32px;
  --text-value--line-height: 1.1;
  --text-name: 28px;
  --text-name--line-height: 1.15;
  --text-title: 22px;
  --text-title--line-height: 1.25;
  --text-body: 17px;
  --text-body--line-height: 1.4;
  --text-small: 15px;
  --text-small--line-height: 1.35;
  --text-tiny: 13px;
  --text-tiny--line-height: 1.3;

  --radius-*: initial;
  --radius-control: 12px;
  --radius-sheet: 20px;
}

@utility num {
  font-family: var(--font-num);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@layer base {
  html,
  body {
    overscroll-behavior: none;
    background: var(--color-rubber);
    color: var(--color-chalk);
  }
  body {
    font-family: var(--font-sans);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  a,
  button,
  input,
  select,
  textarea,
  summary,
  label {
    touch-action: manipulation;
  }
  a,
  button,
  summary,
  label {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  input,
  select,
  textarea {
    font-size: max(16px, 1em);
  }
  :focus-visible {
    outline: 2px solid var(--color-chalk);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition-duration: 0s !important;
      animation-duration: 0s !important;
    }
  }
}
```

- [ ] **Step 3: Aggiungi il plugin a `vite.config.ts` e importa il CSS**

```ts
/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
});
```

In `src/main.tsx` aggiungi dopo gli import esistenti:

```tsx
import './styles/index.css';
```

- [ ] **Step 4: Schermata provvisoria che usa i token**

`src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="min-h-dvh px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="text-title font-semibold">Palestra</h1>
      <p className="mt-1 text-small text-steel">Diario di allenamento</p>
      <p className="num mt-8 text-timer">1:42</p>
    </main>
  );
}
```

- [ ] **Step 5: Verifica statica**

```bash
bun run format && bun run check
bun run build && grep -o 'bg-rubber\|text-timer\|font-num' dist/assets/*.css | sort -u
```

Atteso: `check` passa; il grep trova almeno `text-timer` (le classi usate finiscono nel CSS di build).

- [ ] **Step 6: Verifica visiva**

Lancia `bun run dev` e apri la pagina con la vista mobile di Chrome DevTools (iPhone 14, 390×844):
- lo sfondo è `#1F1E1C`;
- "1:42" è in Barlow Condensed: in DevTools → Computed → Rendered Fonts compare "Barlow Condensed";
- il titolo non tocca il bordo superiore.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, number font and base styles"
```

---

### Task 3: PWA (manifest, icone, service worker, avviso di aggiornamento)

**Files:**
- Create: `scripts/gen-icons.ts`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `src/sw.ts`, `tsconfig.sw.json`, `src/components/UpdatePrompt.tsx`
- Modify: `vite.config.ts`, `index.html`, `tsconfig.json`, `package.json`, `src/App.tsx`

**Interfaces:**
- Consumes: Task 2 (token CSS).
- Produces:
  - `UpdatePrompt()` in `src/components/UpdatePrompt.tsx`: registra il service worker e mostra l'avviso. Va sempre montato fuori dalla modalità allenamento.
  - `src/sw.ts`: il nome della cache dipende dal contenuto del manifest. La Fase 2 aggiunge i gestori `push` e `notificationclick` a questo file.

- [ ] **Step 1: Installa vite-plugin-pwa**

```bash
bun add -d vite-plugin-pwa@1.3.0 workbox-window@7.4.1
```

- [ ] **Step 2: Scrivi il generatore di icone**

Niente dipendenze: un PNG RGB scritto con `node:zlib`. Il disegno è un disco da 20 kg visto di fronte (blu, con mozzo `chalk` e foro centrale) su fondo `rubber`, opaco come richiede iOS.

`scripts/gen-icons.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];
const RUBBER: Rgb = [0x1f, 0x1e, 0x1c];
const BLUE: Rgb = [0x2b, 0x5d, 0xd8];
const CHALK: Rgb = [0xed, 0xeb, 0xe6];

// r is the distance from the centre, 1 = edge of the plate.
function plate(r: number): Rgb {
  if (r > 1) return RUBBER;
  if (r > 0.8 && r <= 0.84) return RUBBER; // groove near the rim
  if (r > 0.3) return BLUE;
  if (r > 0.17) return CHALK;
  return RUBBER;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = ~0;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** radius: plate radius as a fraction of half the icon size. */
function png(size: number, radius: number): Buffer {
  const SS = 4; // 4×4 supersampling for smooth edges
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = x + (sx + 0.5) / SS - half;
          const dy = y + (sy + 0.5) / SS - half;
          const c = plate(Math.hypot(dx, dy) / (half * radius));
          for (let i = 0; i < 3; i++) sum[i] = (sum[i] as number) + c[i];
        }
      }
      for (let i = 0; i < 3; i++) raw[y * stride + 1 + x * 3 + i] = Math.round((sum[i] as number) / (SS * SS));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', png(192, 0.86));
writeFileSync('public/icon-512.png', png(512, 0.86));
// Maskable icons are cropped to a circle of 80% diameter: keep the plate inside it.
writeFileSync('public/icon-maskable-512.png', png(512, 0.72));
writeFileSync('public/apple-touch-icon.png', png(180, 0.8));
```

- [ ] **Step 3: Genera le icone e guardale**

```bash
bun scripts/gen-icons.ts
file public/*.png
```

Atteso: quattro file `PNG image data, … 8-bit/color RGB` (RGB senza canale alfa, quindi opachi). Apri `public/icon-512.png` e controlla: disco blu con bordi lisci, scanalatura scura vicino al bordo, mozzo chiaro e foro centrale.

- [ ] **Step 4: Scrivi il service worker e la sua configurazione TypeScript**

`src/sw.ts`:

```ts
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ponytail: plain Cache API instead of workbox-precaching. The cache name changes with any
// file revision, so every deploy re-downloads the whole shell (about 1 MB by Phase 3). Switch to
// workbox-precaching if per-file updates ever matter.
const manifest = self.__WB_MANIFEST;
const CACHE = `shell-${hash(JSON.stringify(manifest))}`;
// Cloudflare redirects /index.html to /: a cached redirect breaks navigations on iOS,
// so cache the shell under "/".
const SHELL = '/';
const urls = manifest.map(({ url }) => (url === 'index.html' ? SHELL : `/${url.replace(/^\//, '')}`));

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Sent by useRegisterSW().updateServiceWorker() when the user taps "Aggiorna".
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request.mode === 'navigate' ? SHELL : request, {
        ignoreSearch: request.mode === 'navigate',
      });
      return cached ?? fetch(request);
    })(),
  );
});

export {};
```

`tsconfig.sw.json` (tenere DOM e WebWorker nello stesso programma produce decine di errori `Duplicate identifier`):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": []
  },
  "files": ["src/sw.ts"]
}
```

In `tsconfig.json` aggiungi `"vite-plugin-pwa/react"` ai `types` ed escludi il service worker:

```json
    "types": ["vite/client", "vite-plugin-pwa/react"]
  },
  "include": ["src", "vite.config.ts"],
  "exclude": ["src/sw.ts"]
}
```

In `package.json` lo script `typecheck` diventa:

```json
"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.sw.json",
```

- [ ] **Step 5: Configura vite-plugin-pwa e i meta di iOS**

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false, // UpdatePrompt registers it through useRegisterSW
      // The icons already match globPatterns: adding them again duplicates entries and cache.addAll fails.
      includeManifestIcons: false,
      // No "webmanifest" here: the plugin adds it already, and duplicates make cache.addAll fail.
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,woff2}'] },
      manifest: {
        name: 'Palestra',
        short_name: 'Palestra',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#1F1E1C',
        theme_color: '#1F1E1C',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
```

In `index.html`, dentro `<head>` dopo il meta viewport:

```html
    <meta name="theme-color" content="#1F1E1C" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

- [ ] **Step 6: Avviso di aggiornamento**

`src/components/UpdatePrompt.tsx`:

```tsx
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
```

In `src/App.tsx` montalo in fondo alla pagina:

```tsx
import { UpdatePrompt } from './components/UpdatePrompt';

export function App() {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <main className="flex-1 px-4 pt-4">
        <h1 className="text-title font-semibold">Palestra</h1>
        <p className="mt-1 text-small text-steel">Diario di allenamento</p>
        <p className="num mt-8 text-timer">1:42</p>
      </main>
      <UpdatePrompt />
    </div>
  );
}
```

- [ ] **Step 7: Verifica build e funzionamento offline**

```bash
bun run format && bun run check
bun run build
grep -c 'shell-' dist/sw.js                       # atteso: 1
grep -o 'rel="manifest"[^>]*' dist/index.html     # atteso: href="/manifest.webmanifest"
grep -o '"url":"[^"]*"' dist/sw.js | sort | uniq -d   # atteso: nessuna riga. Un duplicato fa fallire cache.addAll e il service worker non si installa
bun run preview
```

In Chrome su http://localhost:4173:
1. DevTools → Application → Service workers: `sw.js` è "activated and running". In Cache storage c'è `shell-…` con `/`, i file in `assets/`, il font e le icone.
2. Application → Manifest: nessun errore, compaiono le tre icone.
3. Network → Offline. Ricarica `/`, poi apri http://localhost:4173/programs: si apre la shell in entrambi i casi (Review Focus 1).
4. Torna online. Cambia il testo "Diario di allenamento", lancia `bun run build` e ricarica la pagina di preview: compare "Nuova versione disponibile". "Aggiorna" ricarica il testo nuovo e in Cache storage resta una sola cache `shell-…`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: make the app an installable offline PWA"
```

---

### Task 4: Deploy su Cloudflare Workers (soli asset statici)

**Files:**
- Create: `wrangler.jsonc`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 3 (`dist/` con `sw.js`).
- Produces: script `deploy` (produzione, Worker `gym-log`) e `deploy:preview` (Worker `gym-log-preview`, origine diversa e quindi dati separati, per i test sull'iPhone). Nella Fase 2 `wrangler.jsonc` riceve `main`, `run_worker_first` e il Durable Object.

- [ ] **Step 1: Installa Wrangler e configura gli asset**

```bash
bun add -d wrangler@4.147.0
```

`wrangler.jsonc`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "gym-log",
  "compatibility_date": "2026-10-02",
  // Assets-only Worker: no "main" until Phase 2.
  "assets": {
    "directory": "./dist/",
    "not_found_handling": "single-page-application"
  }
}
```

- [ ] **Step 2: Script di deploy**

In `package.json`, dentro `scripts`:

```json
"deploy": "vite build && wrangler deploy",
"deploy:preview": "vite build && wrangler deploy --name gym-log-preview"
```

> **Rinviati (2026-10-03):** gli step 3–6 e la spunta delle voci 3 e 4 della roadmap si eseguono nel collaudo della Fase 1 (`2026-10-02-fase-1-mvp.md`, Task 22). Lo step 7 ha spuntato solo le voci 1 e 2.

- [ ] **Step 3: Login e primo deploy di produzione**

```bash
bunx wrangler login          # apre il browser: autorizza l'account Cloudflare
bun run deploy
```

Atteso: l'output termina con `https://gym-log.<sottodominio>.workers.dev`. È il dominio di produzione definitivo: i dati sono legati a questa origine, quindi non cambiarla più (`CLAUDE.md`). Scrivilo in `docs/SPEC.md` §3.2, alla riga sul dominio stabile.

- [ ] **Step 4: Controlla il fallback SPA e la cache**

```bash
curl -sI https://gym-log.<sottodominio>.workers.dev/programs | head -n 1   # atteso: HTTP/2 200
curl -sI https://gym-log.<sottodominio>.workers.dev/index.html | head -n 1 # atteso: un 3xx verso /
curl -s https://gym-log.<sottodominio>.workers.dev/sw.js | grep -c "shell-"  # atteso: 1
```

Il 3xx su `/index.html` conferma perché il service worker mette in cache `/` (Review Focus 2).

- [ ] **Step 5: Criterio di fase sull'iPhone**

1. In Safari apri l'URL di produzione → Condividi → "Aggiungi alla schermata Home".
2. L'icona è il disco blu su fondo scuro, senza bordi bianchi (Review Focus 5).
3. Apri l'app dalla Home. La barra di stato è trasparente e il testo non finisce sotto la notch.
4. Attiva la modalità aereo, chiudi l'app dal multitasking e riaprila: si apre la stessa schermata (Review Focus 2).

- [ ] **Step 6: Aggiornamento con l'app installata**

1. Cambia il sottotitolo in `src/App.tsx` e lancia `bun run deploy`.
2. Riapri l'app sull'iPhone, online: entro qualche secondo compare "Nuova versione disponibile".
3. "Aggiorna" mostra il testo nuovo (Review Focus 3).
4. Rimetti il testo originale e lancia `bun run deploy`.

- [ ] **Step 7: Spunta la roadmap e commit**

In `docs/SPEC.md` §12 "Fase 0" spunta le quattro voci (`- [x]`).

```bash
git add -A
git commit -m "chore: deploy static assets to cloudflare workers"
```
