# Redesign "Pedana di gara": piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sostituire il linguaggio visivo di Palestra con il mondo "Pedana di gara" (arena scura, luce, legno di pedana, Archivo condensato e corsivo per i numeri, tabellone dei tentativi, orologio di gara) in tutte le schermate, senza cambiare dati, regole o comportamento.

**Architecture:** i token del mondo vivono in `@theme` di `src/styles/index.css`, con alias temporanei dei vecchi nomi così l'app resta coerente durante la migrazione (li toglie il Task 18). Le primitive nuove (`Lights`, `Tab`, `NamePlate`, `RollingNumber`, `CountUp`, `SupersetBracket`, `MotionProvider`) stanno in `src/components/`. Ogni schermata si riscrive in un task suo. I pochi calcoli nuovi di presentazione sono funzioni pure in `src/domain/`, con test. L'animazione usa CSS per entrate e tendine e `motion` (caricato in lazy, `LazyMotion` + `domMax`) per layout condivisi, cifre che scorrono e conteggi. Dati dimostrativi solo in sviluppo (`?demo`) e uno script di screenshot headless servono a verificare ogni schermata.

**Tech Stack:** come prima (Bun, Vite 8, React 19, TypeScript 7, Tailwind 4.3, Dexie, React Router 8.4, Recharts, Biome, Vitest), più `motion@14.0.0`. Font Archivo self-hosted (woff2 latini di Google Fonts, OFL).

**Spec:** `docs/superpowers/specs/2026-10-03-redesign-pedana-di-gara.md`. Verità di prodotto in `PRODUCT.md`. Comportamento, dati e testi in `docs/SPEC.md` (tutto valido tranne §11, sostituito dalla spec del redesign). Skill di design: `.claude/skills/impeccable/` (il percorso dei comandi è `.claude/skills/impeccable/scripts/impeccable`; su Windows senza `sh` usa `impeccable.cmd`).

## Global Constraints

Valgono per ogni task.

- **Palette** (spec §5.2), solo questi colori: `arena #0B0C0E`, `tribuna #17191D`, `fondale #23262B`, `luce #F2F1EC`, `fumo #8F949B`, `filetto` = luce al 14%, `pedana #B8875A`, `acciaio #9AA0A6`, `plate-blue #2453D6`, `plate-yellow #F6D43A`, `plate-green #2BA55B`, `plate-red #D93A2F`, `plate-white #F2F1EC`.
- **Semantica dei dischi:** blu = azione primaria, serie corrente, allenamento in corso, interruttori accesi; giallo = record e nient'altro; verde = serie completate, recupero finito, settimana raggiunta; rosso = azioni distruttive, solo come icona o riempimento (4,3:1 su arena, mai testo piccolo). Il blu non è mai testo su arena (3,1:1).
- **Selezione = inversione:** segmento scelto e chip attivo sono `bg-luce text-arena`.
- **Tipografia:** una sola famiglia, Archivo (tondo e corsivo, variabile su peso 100–900 e larghezza 62–125%). Utility: `num` (tabellone: corsivo, larghezza 62%, peso 800, `tabular-nums`) per ogni numero; `plate` (corsivo, larghezza 75%, peso 800) per nomi degli esercizi in allenamento, titoli e titoli dei fogli; `label-text` (13 px, larghezza 87,5%, peso 600) per etichette e titoli di sezione. Il tabellone vale per i numeri, non per le frasi.
- **Scala in px fissi:** `bib` 96, `timer` 72, `value` 44, `large` 34, `score` 32, `step` 28, `name` 26, `title` 22, `body` 17, `small` 15, `tiny` 13 (minimo assoluto). Input ad almeno 16 px.
- **Forma:** raggi `tag` 2 px, `control` 6 px, `sheet` 16 px; filetti di 0,5 px in `filetto` (utility `rule-t`, `rule-b`); un filetto pieno da 1 px in `luce` apre i tabelloni. Nessuna ombra, nessun gradiente, nessun bagliore. Taglio a 12° solo sulle linguette (`cut-right`).
- **Movimento:** curve `ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `ease-in` `cubic-bezier(0.5, 0, 0.75, 0)`; durate 120 ms (tocco), 180 ms (stato), 240 ms (tendine, entrate), 320 ms (fogli). Si animano solo transform, opacity e clip-path. Con `prefers-reduced-motion: reduce` niente si muove e niente resta nascosto (anche i ritardi vanno a zero).
- **Target touch** di 44 pt, 56 pt in modalità allenamento. Azioni primarie nella metà bassa dello schermo.
- **Testi:** quelli di `docs/SPEC.md` §11.4 (italiano, solo iniziale maiuscola, niente maiuscolo tutto, verbi attivi, stessa azione stesso nome). Nessun gergo di gara nell'interfaccia: si dice "serie", mai "tentativo".
- **Craft floor di impeccable:** niente etichetta sopra un titolo (eyebrow), niente bordo colorato a sinistra oltre 1 px su righe o card, niente icone fatte di caratteri Unicode, niente card annidate.
- **Non cambiano:** schema Dexie, `src/db/*` (salvo il nuovo `src/db/demo.ts`), formato del backup, Worker, push, service worker, regole di `src/domain/`. I componenti non fanno calcoli di dominio: quelli nuovi sono funzioni pure in `src/domain/` con test.
- **Dipendenze:** solo `motion@14.0.0`, versione esatta (come le altre in `package.json`). Nessun'altra.
- **Prima di ogni task che tocca l'interfaccia:** leggi `.claude/skills/impeccable/reference/craft-floor.md` e il contratto di direzione (`.claude/skills/impeccable/scripts/impeccable surface-brief read src/App.tsx`).
- **Verifica di ogni task:** `bun run format`, poi `bun run check` (typecheck, lint, test) che passa. Per i task di interfaccia: con `bun run dev` attivo, `bun run screens --only=<schermate del task>`, poi apri i PNG in `.impeccable/review/` e confrontali con la spec. Una sola tornata di correzioni per task: la revisione fine è del Task 19.
- **Commit:** Conventional Commits in inglese, che finiscono con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Deviazioni dalla spec, decise in questo piano

1. **Transizioni tra le route (spec §5.6).** Al posto della View Transitions API si usa un'animazione d'ingresso al montaggio della schermata (`animate-enter-*` su un contenitore con `key={pathname}` in `AppLayout`). Il motivo: le schermate restituiscono `null` finché `useLiveQuery` non risponde, quindi una View Transition fotograferebbe un fotogramma vuoto. Non c'è animazione d'uscita.
2. **Lettera della giornata (spec §5.3):** 96 px invece di 112, perché il craft floor fissa a 6rem il massimo per un display.
3. **Calcolatore dei dischi (spec §7.4).** I dischi da 25, 20, 15 e 10 kg hanno la stessa altezza (450 mm nella realtà) e cambiano spessore. Il numero non è scritto dentro i dischi, perché i più sottili sono larghi 8 px: lo dice la riga "Per lato", e il disegno è decorativo (`aria-hidden`).
4. **Fallback del carattere:** niente `size-adjust`. I due woff2 sono precaricati in `index.html` e nel precache del service worker, quindi lo scambio avviene solo al primo avvio.
5. **Reduced motion:** i fogli appaiono e spariscono senza dissolvenza (la spec chiedeva 120 ms). È la regola globale già esistente in `index.css`.
6. **Nuovo esercizio:** restano i `<select>` nativi, ridisegnati con la freccia, invece di un segmented per il tipo di registrazione.
7. **Orologio del recupero:** "Recupero" sta sopra il tempo invece che accanto, così "10:00" a 72 px entra a 375 px di larghezza.
8. **Riepilogo:** Durata e Serie stanno affiancate e il Volume sta su una riga sua a 44 px, così "12.450 kg" e "1:02:15" entrano a 375 px.
9. **Marcatore della tab attiva:** inclinato con `skew` invece che tagliato, perché a 3 px di altezza il taglio non si vede.
10. **Progressi (spec §8.5):** il valore più recente resta nell'intestazione del grafico, giallo se è un record, invece che come etichetta sul punto. È la stessa informazione, senza rischio di taglio ai bordi.
11. **Archiviazione (spec §7.9):** niente barra dello spazio, perché `getStorageInfo` non legge la quota e su iOS la quota vale gigabyte, quindi la barra resterebbe sempre vuota. Si mostra il numero sul tabellone.
13. **Flash del record (spec §8.2):** compare dentro la barra di navigazione dell'allenamento (Precedente, Successivo, Termina), non come terzo inferiore fisso sopra il tabellone. Un pannello fisso tagliava il contenuto scorrevole a metà riga, da quando la pagina porta il tasto di conferma in vista. Il pannello copre la barra per 2,5 s al massimo e un tocco lo chiude; senza flash la barra riceve ogni tocco. Dentro la barra non occupa altezza: la regione `aria-live` resta sempre montata.

## Review Focus

1. **Reduced motion e comparse ritardate.** Con `prefers-reduced-motion` i record del riepilogo (tendina con ritardo) e la lettera di Oggi devono essere visibili subito, mai nascosti per la durata del ritardo. Verifica nel Task 2 (regola CSS che azzera anche `animation-delay`) e nel Task 18 (`bun run screens --reduced`, controlla `summary-390-reduced.png`).
2. **Valori estremi a 375 px.** Nomi lunghi ("Estensioni sopra la testa con manubrio"), "122,5", volume "12.450 kg", durata "1:02:15", recupero "10:00" non devono andare a capo male né uscire dallo schermo. I dati dimostrativi del Task 1 li contengono; controllo negli screenshot a 375 nei Task 6, 7, 11, 14 e nel Task 18.
3. **Carattere offline.** I due woff2 devono finire nel precache del service worker, altrimenti in modalità aereo l'app torna al font di sistema. Verifica nel Task 2: `grep -o "archivo-[a-z]*\.woff2" dist/sw.js | sort -u` restituisce due righe.
4. **Fogli: trascinamento e chiusure incrociate.** Trascinare la lista dentro un foglio deve scorrere, non chiudere; un foglio chiuso dal genitore mentre se ne apre un altro (menu dell'esercizio → "Sostituisci") non deve chiudere il secondo; Esc e tocco sullo sfondo funzionano ancora. Verifica manuale guidata nel Task 4 e sul telefono nel Task 19.
5. **Peso di motion.** `domMax` deve restare fuori dal chunk principale (caricato in lazy) e il JavaScript principale non deve crescere più di 45 KB gzip. Verifica nel Task 3 (nome del chunk) e nel Task 18 (confronto con `.impeccable/review/bundle-before.txt` del Task 1).

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/styles/index.css` | token del mondo, font, base, classi globali, keyframes |
| `public/fonts/archivo-*.woff2`, `public/fonts/OFL-Archivo.txt` | carattere self-hosted e licenza |
| `src/components/MotionProvider.tsx`, `motionFeatures.ts` | `LazyMotion` con `domMax` in lazy, `MotionConfig` con reduced motion |
| `src/components/RollingNumber.tsx`, `CountUp.tsx` | cifre che scorrono, conteggio del riepilogo |
| `src/components/Lights.tsx`, `Tab.tsx`, `NamePlate.tsx`, `SupersetBracket.tsx` | segni e pezzi del sottopancia |
| `src/components/Sheet.tsx`, `Stepper.tsx`, `Segmented.tsx`, `Header.tsx`, `MoveButtons.tsx`, `UpdatePrompt.tsx`, `chartTheme.tsx` | primitive ridisegnate |
| `src/domain/navigation.ts` | `enterMotion`: come entra una schermata |
| `src/domain/workout.ts` | `workSetCounter` |
| `src/domain/records.ts` | `setRecord` |
| `src/domain/program.ts` | `planTotals` |
| `src/domain/superset.ts` | `supersetPosition` |
| `src/domain/format.ts` | `formatDayParts` |
| `src/db/demo.ts` | dati dimostrativi, solo sviluppo |
| `scripts/screens.ts` | screenshot headless per la revisione |
| `src/features/**` | schermate ridisegnate |
| `scripts/gen-icons.ts`, `public/*.png` | icone dell'app |

---

### Task 0: Ambiente e contratto di direzione

**Files:**
- Modify: `.gitignore`
- Create: surface brief di impeccable (percorso scelto dal comando, sotto `.impeccable/`)
- Commit: `PRODUCT.md`, la spec, questo piano, `.impeccable/mocks/decision/palestra-direzioni.html`

**Interfaces:**
- Consumes: niente.
- Produces: un ambiente in cui `bun run check` passa; il contratto di direzione leggibile con `impeccable surface-brief read src/App.tsx`.

- [ ] **Step 1: Installa Bun se manca**

Run: `bun --version`
Se il comando non esiste (su Windows):

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Poi apri un nuovo terminale (o usa `$env:USERPROFILE\.bun\bin\bun.exe`) e rilancia `bun --version`.
Expected: una versione 1.x.

- [ ] **Step 2: Installa le dipendenze e verifica la base**

Run: `bun install`, poi `bun run check`
Expected: PASS, tutti i test verdi. Se qualcosa fallisce prima di aver toccato il codice, fermati e segnalalo: il redesign parte da una base verde.

- [ ] **Step 3: Ignora gli screenshot di revisione**

In fondo a `.gitignore` aggiungi:

```
# Impeccable design review captures (regenerated with bun run screens)
.impeccable/review/
```

- [ ] **Step 4: Scrivi il contratto di direzione nel surface brief**

Crea un file temporaneo fuori dal repository (per esempio nella cartella temporanea del sistema) chiamato `brief.md`, con questo contenuto:

```markdown
# Palestra: tutta l'app (redesign "Pedana di gara")

Modalità: Operate. Scope: tutte le schermate della PWA (Oggi, allenamento, riepilogo, programmi, libreria, storico, progressi, impostazioni, fogli).
Pubblico: un solo atleta, in palestra tra una serie e l'altra (una mano, braccio teso, luce forte) e a casa per pianificare.
Compito: registrare una serie con un tocco, sapere quando riprendere, vedere i progressi.
Vincoli: PRODUCT.md; docs/SPEC.md tranne §11; docs/superpowers/specs/2026-10-03-redesign-pedana-di-gara.md.
Momento da ricordare: la conferma della serie (le tre luci si accendono, la banda blu scivola alla serie dopo, parte l'orologio).
Riferimento della direzione (code-led, nessun mock): .impeccable/mocks/decision/palestra-direzioni.html, card "Pedana di gara".

## Direction contract

THESIS: Ogni serie è un tentativo in pedana e il recupero è l'orologio di gara: Palestra è la grafica di una gara di pesistica con un solo atleta. Rifiuta il cruscotto fitness a card arrotondate, anelli di progresso e accento al neon.

OWN-WORLD: Arena #0B0C0E come fondo, tribuna #17191D per fogli e pannelli, luce #F2F1EC per numeri e testo, legno di pedana #B8875A per linguette, filo del cronometro e riferimenti; i colori dei dischi con un solo significato ciascuno. Archivo: tondo e largo per il testo, corsivo extra-condensato nero per numeri e nomi. Angoli quasi vivi, filetti di un pixel, nessuna ombra.

STORY: Apri e vedi la giornata come lista di partenza; inizi; registri ogni serie con un tocco mentre il tabellone avanza; l'orologio ti richiama; a fine allenamento il tabellone dei risultati mostra totali e record.

FIRST VIEWPORT: Modalità allenamento. In alto l'header (chiudi, giornata, durata, "3 di 6"). Sotto, il sottopancia: linguetta di legno "2/4" e targa chiara con il nome dell'esercizio, poi target e riga "Ultima volta". Al centro il tabellone delle serie: numeri condensati da 32 px, tre luci per riga, la serie corrente come banda blu con stepper da 56 pt e valori da 44 px, "Conferma serie" blu nella zona del pollice. In fondo l'orologio del recupero a tutta larghezza, cifre da 72 px, filo di legno che si accorcia.

FORM: Pedana di gara; candidato 1 della lista ordinata (scelta di impeccable, preferita dall'utente all'assegnato, La scheda); seed c766838c.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
```

Run (sostituisci `<brief.md>` con il percorso del file):

```bash
.claude/skills/impeccable/scripts/impeccable surface-brief write src/App.tsx <brief.md> src/features/workout/WorkoutScreen.tsx src/features/today/TodayScreen.tsx src/features/workout/SummaryScreen.tsx
.claude/skills/impeccable/scripts/impeccable surface-brief read src/App.tsx
```

Expected: la lettura mostra i sei blocchi (THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM, FINISH) e il seed `c766838c`. Il contratto non va mai copiato nel codice sorgente, nel DOM, in commenti o in attributi.

- [ ] **Step 5: Controlla il riferimento della direzione**

Run: `ls .impeccable/mocks/decision/palestra-direzioni.html`
Expected: il file esiste (pagina di confronto delle tre direzioni, copiata durante la scrittura del piano).

- [ ] **Step 6: Commit**

```bash
git add .gitignore .impeccable PRODUCT.md docs/superpowers/specs/2026-10-03-redesign-pedana-di-gara.md docs/superpowers/plans/2026-10-03-redesign-pedana-di-gara.md
git commit -m "docs: add the Pedana di gara redesign spec, plan and direction contract

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Dati dimostrativi e screenshot di revisione

**Files:**
- Create: `src/db/demo.ts`, `src/db/demo.test.ts`, `scripts/screens.ts`
- Modify: `src/main.tsx`, `package.json`

**Interfaces:**
- Consumes: `seedExercises`, `SEED_VERSION` (`src/db/seed.ts`); `DAY_MS`, `toDateKey` (`src/domain/dates.ts`); `db`.
- Produces:
  - `seedDemo(mode: string, now?: number): Promise<void>`; `mode` è `''`, `'workout'` o `'rest-done'`;
  - `DEMO_IDS = { program: 'demo-program', lastSession: 'demo-done', activeSession: 'demo-session' }`;
  - `demoExerciseId(name: string): string` (es. `demo-panca-piana-con-bilanciere`);
  - comando `bun run screens [--only=a,b] [--reduced]` che scrive `.impeccable/review/<nome>-<larghezza>[-reduced].png`. Nomi: `today`, `today-active`, `workout`, `workout-rest-done`, `summary`, `programs`, `program`, `day`, `library`, `exercise`, `history`, `session`, `progress`, `progress-groups`, `progress-consistency`, `bodyweight`, `settings`.

- [ ] **Step 1: Scrivi il test (fallisce)**

`src/db/demo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { db } from './db';
import { DEMO_IDS, demoExerciseId, seedDemo } from './demo';
import { listHistory } from './history';
import { getActiveSession, getTodayPlan, getWorkout } from './sessions';
import { getSettings } from './settings';

describe('seedDemo (development screenshots)', () => {
  it('builds eight weeks of history that ends with demo-done, with day A next', async () => {
    await seedDemo('');
    const history = await listHistory();
    expect(history).toHaveLength(24);
    expect(history[0]?.session.id).toBe(DEMO_IDS.lastSession);
    expect(await getActiveSession()).toBeUndefined();
    expect((await getTodayPlan())?.day?.label).toBe('A');
    expect((await getSettings()).activeTimer).toBeNull();
  });

  it('opens day A with set 2 of 4 to do and the rest running', async () => {
    const now = Date.now();
    await seedDemo('workout', now);
    const workout = await getWorkout(DEMO_IDS.activeSession);
    const bench = workout?.items[0];
    expect(bench?.exercise.id).toBe(demoExerciseId('Panca piana con bilanciere'));
    expect(bench?.sets.filter((s) => !s.isWarmup && s.completedAt !== undefined)).toHaveLength(1);
    expect((await getSettings()).activeTimer?.endAt).toBe(now + 72_000);
  });

  it('replaces previous data and ends the rest 12 s ago in rest-done mode', async () => {
    await seedDemo('workout');
    const now = Date.now();
    await seedDemo('rest-done', now);
    expect(await db.sessions.where('status').equals('in_progress').count()).toBe(1);
    expect((await getSettings()).activeTimer?.endAt).toBe(now - 12_000);
  });
});
```

Run: `bun run test src/db/demo.test.ts`
Expected: FAIL, `./demo` non esiste.

- [ ] **Step 2: Implementa `src/db/demo.ts`**

```ts
import { DAY_MS, toDateKey } from '../domain/dates';
import type {
  ActiveTimer,
  Bodyweight,
  Day,
  DayExercise,
  Exercise,
  Session,
  SessionExercise,
  SetLog,
} from '../types';
import { db } from './db';
import { SEED_VERSION, seedExercises } from './seed';

/**
 * Development only: main.tsx loads it when the URL has ?demo, and production builds drop it.
 * It replaces every table with eight weeks of realistic training, for screenshots and design
 * review.
 *   ?demo            history only, day A next
 *   ?demo=workout    day A in progress, set 2 of 4 to do, rest running
 *   ?demo=rest-done  the same, with the rest finished 12 s ago
 */
export const DEMO_IDS = {
  program: 'demo-program',
  lastSession: 'demo-done',
  activeSession: 'demo-session',
} as const;

/** "Panca piana con bilanciere" → "demo-panca-piana-con-bilanciere": stable screenshot URLs. */
export const demoExerciseId = (name: string): string =>
  `demo-${name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

interface Row {
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  /** Load eight weeks ago in kg (0 for bodyweight), or seconds for timed holds. */
  start: number;
  /** Added every second time the day is trained. */
  step: number;
  superset?: string;
}

interface DemoDay {
  id: string;
  label: string;
  name: string;
  rows: Row[];
}

const DAYS: DemoDay[] = [
  {
    id: 'demo-day-a',
    label: 'A',
    name: 'Petto e tricipiti',
    rows: [
      { name: 'Panca piana con bilanciere', sets: 4, repMin: 6, repMax: 8, restSec: 180, start: 85, step: 2.5 },
      { name: 'Panca inclinata con manubri', sets: 3, repMin: 8, repMax: 10, restSec: 120, start: 26, step: 2 },
      { name: 'Croci ai cavi', sets: 3, repMin: 12, repMax: 15, restSec: 90, start: 15, step: 2.5, superset: 'demo-ss-a' },
      { name: 'Pushdown ai cavi', sets: 3, repMin: 10, repMax: 12, restSec: 90, start: 30, step: 2.5, superset: 'demo-ss-a' },
      { name: 'Estensioni sopra la testa con manubrio', sets: 3, repMin: 10, repMax: 12, restSec: 90, start: 20, step: 2 },
      { name: 'Dip alle parallele', sets: 3, repMin: 8, repMax: 12, restSec: 120, start: 0, step: 0 },
    ],
  },
  {
    id: 'demo-day-b',
    label: 'B',
    name: 'Schiena e bicipiti',
    rows: [
      { name: 'Trazioni alla sbarra', sets: 4, repMin: 6, repMax: 10, restSec: 150, start: 0, step: 0 },
      { name: 'Rematore con bilanciere', sets: 4, repMin: 8, repMax: 10, restSec: 120, start: 70, step: 2.5 },
      { name: 'Lat machine', sets: 3, repMin: 10, repMax: 12, restSec: 90, start: 60, step: 2.5 },
      { name: 'Curl con bilanciere', sets: 3, repMin: 8, repMax: 12, restSec: 90, start: 30, step: 2.5 },
      { name: 'Curl a martello', sets: 3, repMin: 10, repMax: 12, restSec: 60, start: 14, step: 2 },
    ],
  },
  {
    id: 'demo-day-c',
    label: 'C',
    name: 'Gambe',
    rows: [
      { name: 'Squat con bilanciere', sets: 4, repMin: 5, repMax: 8, restSec: 180, start: 110, step: 2.5 },
      { name: 'Stacco rumeno', sets: 3, repMin: 8, repMax: 10, restSec: 150, start: 90, step: 2.5 },
      { name: 'Leg press', sets: 3, repMin: 10, repMax: 12, restSec: 120, start: 180, step: 5 },
      { name: 'Leg curl', sets: 3, repMin: 10, repMax: 12, restSec: 90, start: 45, step: 5 },
      { name: 'Calf raise in piedi', sets: 4, repMin: 12, repMax: 15, restSec: 60, start: 80, step: 5 },
    ],
  },
  {
    id: 'demo-day-d',
    label: 'D',
    name: 'Spalle e addome',
    rows: [
      // 600 s: the widest rest clock ("10:00").
      { name: 'Military press', sets: 4, repMin: 6, repMax: 8, restSec: 600, start: 50, step: 2.5 },
      { name: 'Alzate laterali con manubri', sets: 4, repMin: 12, repMax: 15, restSec: 60, start: 10, step: 1 },
      { name: 'Face pull', sets: 3, repMin: 12, repMax: 15, restSec: 60, start: 25, step: 2.5 },
      { name: 'Crunch ai cavi', sets: 3, repMin: 12, repMax: 15, restSec: 60, start: 40, step: 5 },
      { name: 'Plank', sets: 3, repMin: 8, repMax: 12, restSec: 60, start: 45, step: 5 },
    ],
  },
];

const SESSIONS = 24; // eight weeks, three a week
const LONG_SESSION = 20; // lasts 1:02:15, the widest duration

type Values = Pick<SetLog, 'weightKg' | 'reps' | 'durationSec'>;

function workSets(row: Row, exercise: Exercise, steps: number): Values[] {
  const load = row.start + row.step * steps;
  return Array.from({ length: row.sets }, (_, i) => {
    if (exercise.trackingType === 'duration') return { durationSec: load };
    const reps = Math.max(row.repMin, row.repMax - i);
    return { weightKg: exercise.trackingType === 'bodyweight_reps' ? 0 : load, reps };
  });
}

/**
 * One session of a day: a warmup on a weighted first exercise, then the planned work sets.
 * done(order, index) says which sets are completed: they get completedAt spread up to endAt.
 */
function buildSession(
  sessionId: string,
  day: DemoDay,
  exercise: (name: string) => Exercise,
  steps: number,
  startedAt: number,
  endAt: number,
  done: (order: number, index: number) => boolean,
): { sessionExercises: SessionExercise[]; setLogs: SetLog[] } {
  const sessionExercises: SessionExercise[] = [];
  const setLogs: SetLog[] = [];
  day.rows.forEach((row, order) => {
    const ex = exercise(row.name);
    const seId = `${sessionId}-${order}`;
    const warmups: Values[] =
      order === 0 && ex.trackingType === 'weight_reps'
        ? [{ weightKg: Math.round((row.start * 0.6) / 5) * 5, reps: 10 }]
        : [];
    const all = [
      ...warmups.map((v) => ({ ...v, isWarmup: true })),
      ...workSets(row, ex, steps).map((v) => ({ ...v, isWarmup: false })),
    ];
    all.forEach((values, index) => {
      setLogs.push({
        id: `${seId}-${index}`,
        sessionId,
        sessionExerciseId: seId,
        exerciseId: ex.id,
        index,
        ...values,
        completedAt: done(order, index) ? 0 : undefined,
      });
    });
    sessionExercises.push({
      id: seId,
      sessionId,
      exerciseId: ex.id,
      order,
      plannedSets: row.sets,
      repMin: row.repMin,
      repMax: row.repMax,
      targetSec: ex.trackingType === 'duration' ? row.start : undefined,
      restSec: row.restSec,
      status: all.every((_, index) => done(order, index)) ? 'done' : 'pending',
      dayExerciseId: `${day.id}-${order}`,
      supersetKey: row.superset,
    });
  });
  const completed = setLogs.filter((s) => s.completedAt !== undefined);
  completed.forEach((s, i) => {
    s.completedAt = Math.round(startedAt + ((i + 1) * (endAt - startedAt)) / (completed.length + 1));
  });
  return { sessionExercises, setLogs };
}

export async function seedDemo(mode: string, now = Date.now()): Promise<void> {
  const exercises = seedExercises(now).map((e) => ({ ...e, id: demoExerciseId(e.name) }));
  const byName = new Map(exercises.map((e) => [e.name, e]));
  const exercise = (name: string): Exercise => {
    const found = byName.get(name);
    if (!found) throw new Error(`Demo exercise not in the library: ${name}`);
    return found;
  };
  exercise('Panca piana con bilanciere').notes = 'Presa sugli anelli';

  const days: Day[] = DAYS.map((d, order) => ({
    id: d.id,
    programId: DEMO_IDS.program,
    label: d.label,
    name: d.name,
    order,
  }));
  const dayExercises: DayExercise[] = DAYS.flatMap((d) =>
    d.rows.map((row, order) => ({
      id: `${d.id}-${order}`,
      dayId: d.id,
      exerciseId: exercise(row.name).id,
      order,
      sets: row.sets,
      repMin: row.repMin,
      repMax: row.repMax,
      targetSec: exercise(row.name).trackingType === 'duration' ? row.start : undefined,
      restSec: row.restSec,
      notes: row.name === 'Panca piana con bilanciere' ? 'Un secondo di fermo al petto' : '',
      supersetKey: row.superset,
    })),
  );

  const sessions: Session[] = [];
  const sessionExercises: SessionExercise[] = [];
  const setLogs: SetLog[] = [];
  for (let k = 0; k < SESSIONS; k++) {
    const day = DAYS[k % DAYS.length];
    const last = k === SESSIONS - 1;
    const id = last ? DEMO_IDS.lastSession : `demo-s-${k}`;
    const startedAt = new Date(now - Math.round((SESSIONS - k) * 2.33) * DAY_MS).setHours(
      18,
      30,
      0,
      0,
    );
    const endedAt = startedAt + (k === LONG_SESSION ? 3_735_000 : (52 + (k % 5) * 3) * 60_000);
    // Loads go up every second round of a day; the last session beats every record.
    const steps = Math.floor(Math.floor(k / DAYS.length) / 2) + (last ? 1 : 0);
    sessions.push({
      id,
      programId: DEMO_IDS.program,
      dayId: day.id,
      dayLabel: day.label,
      dayName: day.name,
      status: 'completed',
      startedAt,
      endedAt,
      notes: last ? 'Spalle fresche, military pulita.' : '',
    });
    const built = buildSession(id, day, exercise, steps, startedAt, endedAt, () => true);
    sessionExercises.push(...built.sessionExercises);
    setLogs.push(...built.setLogs);
  }

  let activeTimer: ActiveTimer | null = null;
  if (mode === 'workout' || mode === 'rest-done') {
    const day = DAYS[0];
    const startedAt = now - 24 * 60_000 - 13_000; // "24:13" on the workout header
    sessions.push({
      id: DEMO_IDS.activeSession,
      programId: DEMO_IDS.program,
      dayId: day.id,
      dayLabel: day.label,
      dayName: day.name,
      status: 'in_progress',
      startedAt,
      notes: '',
    });
    // Bench press: the warmup and set 1 (a record, 92,5 kg) done, set 2 of 4 to do.
    const built = buildSession(
      DEMO_IDS.activeSession,
      day,
      exercise,
      3,
      startedAt,
      now - 110_000,
      (order, index) => order === 0 && index <= 1,
    );
    sessionExercises.push(...built.sessionExercises);
    setLogs.push(...built.setLogs);
    activeTimer = {
      sessionExerciseId: `${DEMO_IDS.activeSession}-0`,
      endAt: mode === 'workout' ? now + 72_000 : now - 12_000,
      durationMs: day.rows[0].restSec * 1000,
      label: 'Panca piana con bilanciere, serie 1 di 4',
    };
  }

  const bodyweights: Bodyweight[] = Array.from({ length: 8 }, (_, w) => w).map((w) => ({
    id: `demo-bw-${w}`,
    date: toDateKey(now - (7 - w) * 7 * DAY_MS),
    kg: Math.round((82.4 - w * 0.25 + (w % 2) * 0.1) * 10) / 10,
  }));

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.exercises.bulkAdd(exercises);
    await db.programs.add({
      id: DEMO_IDS.program,
      name: 'Forza 4 giorni',
      notes: 'Tre allenamenti a settimana, giornate a rotazione.',
      createdAt: now - 60 * DAY_MS,
      updatedAt: now - 60 * DAY_MS,
    });
    await db.days.bulkAdd(days);
    await db.dayExercises.bulkAdd(dayExercises);
    await db.sessions.bulkAdd(sessions);
    await db.sessionExercises.bulkAdd(sessionExercises);
    await db.setLogs.bulkAdd(setLogs);
    await db.bodyweights.bulkAdd(bodyweights);
    await db.settings.bulkPut([
      { key: 'seedVersion', value: SEED_VERSION },
      { key: 'activeProgramId', value: DEMO_IDS.program },
      { key: 'weeklyGoal', value: 3 },
      { key: 'lastBackupAt', value: now - 9 * DAY_MS },
      { key: 'activeTimer', value: activeTimer },
    ]);
  });
}
```

Run: `bun run test src/db/demo.test.ts`
Expected: PASS (3 test).

- [ ] **Step 3: Carica i dati dimostrativi solo in sviluppo**

In `src/main.tsx` sostituisci la riga `ensureSeed()` (l'inizio della catena `.then`) con `boot()` e aggiungi la funzione sopra la catena:

```tsx
async function boot(): Promise<void> {
  await ensureSeed();
  // Development only: ?demo fills the database for screenshots (src/db/demo.ts). Vite replaces
  // import.meta.env.DEV with false in production, so the import and the module disappear.
  if (import.meta.env.DEV) {
    const demo = new URLSearchParams(location.search).get('demo');
    if (demo !== null) await (await import('./db/demo')).seedDemo(demo);
  }
}

boot()
  .then(() => {
```

Il resto della catena (`requestPersistentStorage`, push, `root.render`, `.catch`) resta identico.

- [ ] **Step 4: Scrivi lo script degli screenshot**

`scripts/screens.ts`:

```ts
/**
 * Phone-size screenshots of the dev server with demo data (src/db/demo.ts), for design review.
 *   bun run dev                         (in another terminal)
 *   bun run screens                     every shot at 390×844 and 375×667
 *   bun run screens --only=today,workout --reduced
 * Output: .impeccable/review/<name>-<width>[-reduced].png. Set CHROME to the browser executable
 * when Chrome or Edge is not in a standard place, BASE_URL when the server is not on port 5173.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const browser = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((path) => path !== undefined && existsSync(path));
if (!browser) throw new Error('Chrome or Edge not found: set CHROME to the browser executable.');

const base = process.env.BASE_URL ?? 'http://localhost:5173';
const out = resolve('.impeccable/review');
const viewports: [number, number][] = [
  [390, 844],
  [375, 667],
];
const shots: [string, string][] = [
  ['today', '/?demo'],
  ['today-active', '/?demo=workout'],
  ['workout', '/workout/demo-session?demo=workout'],
  ['workout-rest-done', '/workout/demo-session?demo=rest-done'],
  ['summary', '/workout/demo-done/summary?demo'],
  ['programs', '/programs?demo'],
  ['program', '/programs/demo-program?demo'],
  ['day', '/programs/demo-program/days/demo-day-a?demo'],
  ['library', '/programs?tab=exercises&demo'],
  ['exercise', '/exercises/demo-panca-piana-con-bilanciere?demo'],
  ['history', '/history?demo'],
  ['session', '/history/demo-done?demo'],
  ['progress', '/progress?demo'],
  ['progress-groups', '/progress?tab=groups&demo'],
  ['progress-consistency', '/progress?tab=consistency&demo'],
  ['bodyweight', '/progress/bodyweight?demo'],
  ['settings', '/settings?demo'],
];

const args = process.argv.slice(2);
const reduced = args.includes('--reduced');
const only = args
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',');
mkdirSync(out, { recursive: true });

let failures = 0;
for (const [name, path] of shots) {
  if (only && !only.includes(name)) continue;
  for (const [width, height] of viewports) {
    const profile = mkdtempSync(join(tmpdir(), 'palestra-shot-'));
    const file = join(out, `${name}-${width}${reduced ? '-reduced' : ''}.png`);
    const result = spawnSync(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`,
        '--force-device-scale-factor=2',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=6000',
        ...(reduced ? ['--force-prefers-reduced-motion'] : []),
        `--screenshot=${file}`,
        `${base}${path}`,
      ],
      { encoding: 'utf8' },
    );
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome can still hold the profile for a moment on Windows: the OS cleans tmp later.
    }
    if (result.status === 0 && existsSync(file)) {
      console.log(`ok    ${file}`);
    } else {
      failures++;
      console.log(`FAIL  ${name}-${width}: ${result.stderr}`);
    }
  }
}
process.exitCode = failures > 0 ? 1 : 0;
```

In `package.json`, dentro `"scripts"`, aggiungi dopo `"preview"`:

```json
    "screens": "bun scripts/screens.ts",
```

- [ ] **Step 5: Verifica gli screenshot e salva il "prima"**

Run, in un terminale: `bun run dev`. In un altro: `bun run screens`
Expected: 34 righe `ok`. Apri `today-390.png`, `workout-390.png` e `summary-390.png`: devono mostrare i dati dimostrativi (giornata A, Panca piana con la serie 2 da fare, recupero in corso, riepilogo con record). Se un'immagine è vuota o nera, alza `--virtual-time-budget` a 10000 e riprova.

Poi conserva gli screenshot come riferimento del "prima" e misura il bundle attuale:

```bash
mkdir -p .impeccable/review/before && mv .impeccable/review/*.png .impeccable/review/before/
bun run build 2>&1 | tee .impeccable/review/bundle-before.txt
```

- [ ] **Step 6: Verifica che la demo non vada in produzione**

Run: `bun run build`, poi `grep -rl "demo-session" dist/ || echo "demo assente"`
Expected: `demo assente`.

- [ ] **Step 7: Format, check, commit**

Run: `bun run format && bun run check`
Expected: PASS.

```bash
git add src/db/demo.ts src/db/demo.test.ts src/main.tsx scripts/screens.ts package.json
git commit -m "chore: add development demo data and phone screenshots for design review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Fondamenta del mondo (token, carattere, base, classi globali)

**Files:**
- Create: `public/fonts/archivo-roman.woff2`, `public/fonts/archivo-italic.woff2`, `public/fonts/OFL-Archivo.txt`
- Delete: `public/fonts/barlow-condensed-600.woff2`
- Modify: `src/styles/index.css` (riscritto), `index.html`, `vite.config.ts`

**Interfaces:**
- Consumes: niente.
- Produces (usati da tutti i task successivi):
  - colori Tailwind `arena`, `tribuna`, `fondale`, `luce`, `fumo`, `filetto`, `pedana`, `acciaio`, `plate-blue`, `plate-yellow`, `plate-green`, `plate-red`, `plate-white` (più gli alias temporanei `rubber`, `iron`, `chalk`, `steel`);
  - testi `text-bib`, `text-timer`, `text-value`, `text-large`, `text-score`, `text-step`, `text-name`, `text-title`, `text-body`, `text-small`, `text-tiny`;
  - raggi `rounded-tag`, `rounded-control`, `rounded-sheet`; curve `ease-out`, `ease-in`, `ease-in-out`;
  - animazioni `animate-wipe`, `animate-enter-forward`, `animate-enter-back`, `animate-enter-fade`, `animate-enter-rise`, `animate-light-on`;
  - utility `num`, `plate`, `label-text`, `cut-right`, `rule-t`, `rule-b`;
  - classi `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-text`, `.row`, `.section-title`, `.field`, `.label`, `.chip`, `.chip-action`, `.switch`, `.sheet`;
  - variabili CSS `--surface` (fondo della superficie corrente: arena, o tribuna dentro un foglio) e `--sticky-top` (inizio delle intestazioni fisse: safe area in pagina, 0 in un foglio).

- [ ] **Step 1: Leggi il craft floor e il contratto**

Run: `.claude/skills/impeccable/scripts/impeccable surface-brief read src/App.tsx` e leggi `.claude/skills/impeccable/reference/craft-floor.md` e `.claude/skills/impeccable/reference/typeset.md`.

- [ ] **Step 2: Scarica il carattere**

```bash
curl -sSL -o public/fonts/archivo-roman.woff2 https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLg.woff2
curl -sSL -o public/fonts/archivo-italic.woff2 https://fonts.gstatic.com/s/archivo/v25/k3kSo8UDI-1M0wlSfdzYLGHE.woff2
curl -sSL -o public/fonts/OFL-Archivo.txt https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/OFL.txt
git rm public/fonts/barlow-condensed-600.woff2
wc -c public/fonts/archivo-*.woff2
```

Expected: circa 90 KB (tondo) e 102 KB (corsivo). Sono i sottoinsiemi latini di Google Fonts, variabili su peso e larghezza, con `tnum` (verificato). Se gli URL non rispondono più, prendi quelli attuali dal blocco `/* latin */` di `https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900` (richiesta con uno user agent di Chrome).

- [ ] **Step 3: Riscrivi `src/styles/index.css`**

Sostituisci tutto il contenuto con:

```css
@import "tailwindcss";

@font-face {
  font-family: "Archivo";
  src: url("/fonts/archivo-roman.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-stretch: 62% 125%;
  font-display: swap;
}

@font-face {
  font-family: "Archivo";
  src: url("/fonts/archivo-italic.woff2") format("woff2");
  font-style: italic;
  font-weight: 100 900;
  font-stretch: 62% 125%;
  font-display: swap;
}

/* Pedana di gara: docs/superpowers/specs/2026-10-03-redesign-pedana-di-gara.md §5.
   Variables read from inline styles in TSX (--ease-out in Sheet) are also used below in CSS,
   so Tailwind emits them. */
@theme {
  --color-*: initial;
  --color-arena: #0b0c0e;
  --color-tribuna: #17191d;
  --color-fondale: #23262b;
  --color-luce: #f2f1ec;
  --color-fumo: #8f949b;
  --color-filetto: rgb(242 241 236 / 0.14);
  --color-pedana: #b8875a;
  --color-acciaio: #9aa0a6;
  --color-plate-blue: #2453d6;
  --color-plate-yellow: #f6d43a;
  --color-plate-green: #2ba55b;
  --color-plate-red: #d93a2f;
  --color-plate-white: #f2f1ec;
  /* Old names mapped to the new world; the cleanup task removes them. */
  --color-rubber: #0b0c0e;
  --color-iron: #17191d;
  --color-chalk: #f2f1ec;
  --color-steel: #8f949b;

  --font-sans: "Archivo", system-ui, -apple-system, sans-serif;

  --text-*: initial;
  --text-bib: 96px;
  --text-bib--line-height: 0.9;
  --text-timer: 72px;
  --text-timer--line-height: 1;
  --text-value: 44px;
  --text-value--line-height: 1;
  --text-large: 34px;
  --text-large--line-height: 1.05;
  --text-score: 32px;
  --text-score--line-height: 1;
  --text-step: 28px;
  --text-step--line-height: 1;
  --text-name: 26px;
  --text-name--line-height: 1.1;
  --text-title: 22px;
  --text-title--line-height: 1.2;
  --text-body: 17px;
  --text-body--line-height: 1.4;
  --text-small: 15px;
  --text-small--line-height: 1.35;
  --text-tiny: 13px;
  --text-tiny--line-height: 1.3;

  --radius-*: initial;
  --radius-tag: 2px;
  --radius-control: 6px;
  --radius-sheet: 16px;

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in: cubic-bezier(0.5, 0, 0.75, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* backwards fill: once over, no transform stays behind to break sticky or fixed children. */
  --animate-wipe: wipe 240ms var(--ease-out) backwards;
  --animate-enter-forward: enter-forward 240ms var(--ease-out) backwards;
  --animate-enter-back: enter-back 240ms var(--ease-out) backwards;
  --animate-enter-fade: enter-fade 160ms var(--ease-out) backwards;
  --animate-enter-rise: enter-rise 320ms var(--ease-out) backwards;
  --animate-light-on: light-on 180ms var(--ease-out) backwards;
}

/* The broadcast graphic uncovering itself from the left: the world's one native motion. */
@keyframes wipe {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
@keyframes enter-forward {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
}
@keyframes enter-back {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
}
@keyframes enter-fade {
  from {
    opacity: 0;
  }
}
@keyframes enter-rise {
  from {
    opacity: 0;
    transform: translateY(32px);
  }
}
@keyframes light-on {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
}
@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}
@keyframes sheet-out {
  to {
    transform: translateY(100%);
  }
}
@keyframes fade-out {
  to {
    opacity: 0;
  }
}

/* Tabellone: every number on screen. */
@utility num {
  font-style: italic;
  font-stretch: 62%;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* Targa: exercise names in workout mode, large titles, sheet titles. */
@utility plate {
  font-style: italic;
  font-stretch: 75%;
  font-weight: 800;
}

/* Labels: section titles, column heads, tab bar. Sentence case, never all caps. */
@utility label-text {
  font-size: var(--text-tiny);
  line-height: var(--text-tiny--line-height);
  font-stretch: 87.5%;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Right edge cut at the italic angle (12°): wood tabs and record tabs only. */
@utility cut-right {
  clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
  padding-right: calc(var(--spacing) * 2 + 6px);
}

/* One device pixel on retina screens. */
@utility rule-t {
  border-top: 0.5px solid var(--color-filetto);
}
@utility rule-b {
  border-bottom: 0.5px solid var(--color-filetto);
}

@layer base {
  html,
  body {
    overscroll-behavior: none;
    background: var(--color-arena);
    color: var(--color-luce);
    color-scheme: dark;
  }
  /* iOS 26 home-screen apps with viewport-fit=cover and black-translucent resolve 100% and 100dvh
     one status bar short of the screen (WebKit bug 301108). On a document shorter than the screen
     iOS misplaces fixed elements, the sheets' modal <dialog> included: keep it full-screen tall. */
  @media (display-mode: standalone) {
    html,
    body {
      min-height: 100lvh;
    }
  }
  body {
    --surface: var(--color-arena);
    --sticky-top: env(safe-area-inset-top);
    font-family: var(--font-sans);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    font-synthesis: none;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  ::selection {
    background: var(--color-pedana);
    color: var(--color-arena);
  }
  input,
  textarea,
  select {
    caret-color: var(--color-luce);
    accent-color: var(--color-plate-blue);
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
    outline: 2px solid var(--color-luce);
    outline-offset: 2px;
  }
  .lucide {
    stroke-width: 1.75;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      /* biome-ignore lint/complexity/noImportantStyles: must override utility and inline animation durations */
      transition-duration: 0s !important;
      /* biome-ignore lint/complexity/noImportantStyles: must override utility and inline animation durations */
      transition-delay: 0s !important;
      /* biome-ignore lint/complexity/noImportantStyles: must override utility and inline animation durations */
      animation-duration: 0s !important;
      /* biome-ignore lint/complexity/noImportantStyles: a delayed reveal must not stay hidden */
      animation-delay: 0s !important;
    }
  }
}

@layer components {
  .btn-primary {
    @apply flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-plate-blue px-4 text-body font-semibold text-luce transition-transform duration-120 ease-out active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100;
  }
  .btn-secondary,
  .btn-danger {
    @apply flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-fondale px-4 text-body font-semibold text-luce transition-transform duration-120 ease-out active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100;
  }
  /* Red text would be 4.3:1 on arena: destructive actions keep luce text and a red icon. */
  .btn-danger svg {
    color: var(--color-plate-red);
  }
  .btn-text {
    @apply inline-flex min-h-11 items-center gap-1 px-2 text-body font-semibold text-luce active:opacity-60 disabled:opacity-40;
  }
  .row {
    @apply flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left rule-b;
  }
  a.row:active,
  button.row:active {
    background: var(--color-fondale);
  }
  /* A section heading, with the list's total right-aligned when there is one. */
  .section-title {
    @apply flex items-baseline justify-between gap-3 px-4 pt-6 pb-2 label-text text-fumo;
  }
  .field {
    @apply w-full rounded-control border-b-[1.5px] border-transparent bg-fondale px-3 py-3 text-body text-luce outline-none placeholder:text-fumo focus:border-luce disabled:opacity-50;
  }
  select.field {
    appearance: none;
    padding-right: 2.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%238f949b' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
  }
  .label {
    @apply mb-1 block label-text text-fumo;
  }
  .chip {
    @apply inline-flex min-h-11 shrink-0 items-center rounded-control bg-fondale px-4 text-small font-semibold text-luce transition-colors duration-180 aria-pressed:bg-luce aria-pressed:text-arena;
  }
  /* A suggestion to act on (progression): outlined in the action blue. */
  .chip-action {
    @apply inline-flex min-h-14 shrink-0 items-center rounded-control px-4 text-small font-semibold text-luce ring-[1.5px] ring-plate-blue ring-inset active:bg-plate-blue;
  }
  .switch {
    @apply relative h-8 w-13 shrink-0 appearance-none rounded-full bg-fondale transition-colors duration-180 checked:bg-plate-blue;
  }
  .switch::after {
    content: "";
    @apply absolute top-1 left-1 size-6 rounded-full bg-fumo transition-transform duration-180 ease-out;
  }
  .switch:checked::after {
    @apply translate-x-5 bg-luce;
  }
  .sheet {
    --surface: var(--color-tribuna);
    --sticky-top: 0px;
    margin: auto 0 0;
    width: 100%;
    max-width: 100%;
    max-height: 92dvh;
    padding: 0; /* the safe area is padded inside, so taps there do not count as backdrop taps */
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
    background: var(--color-tribuna);
    color: var(--color-luce);
  }
  .sheet[open] {
    animation: sheet-in 320ms var(--ease-out) backwards;
  }
  .sheet[data-closing] {
    animation: sheet-out 200ms var(--ease-in) forwards;
  }
  .sheet::backdrop {
    background: rgb(0 0 0 / 0.7);
    animation: enter-fade 320ms var(--ease-out) backwards;
  }
  .sheet[data-closing]::backdrop {
    animation: fade-out 200ms var(--ease-in) forwards;
  }
}
```

- [ ] **Step 4: `index.html` e manifest**

In `index.html` cambia `content="#1F1E1C"` in `content="#0B0C0E"` e aggiungi, dopo il `<link rel="apple-touch-icon" …>`:

```html
    <link rel="preload" href="/fonts/archivo-roman.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/archivo-italic.woff2" as="font" type="font/woff2" crossorigin />
```

In `vite.config.ts` cambia `background_color: '#1F1E1C'` e `theme_color: '#1F1E1C'` in `'#0B0C0E'`.

- [ ] **Step 5: Verifica build, precache e aspetto**

Run: `bun run format && bun run check`, poi `bun run build`, poi `grep -o "archivo-[a-z]*\.woff2" dist/sw.js | sort -u`
Expected: PASS; due righe, `archivo-italic.woff2` e `archivo-roman.woff2` (Review Focus 3). `grep -c barlow dist/sw.js` restituisce 0.

Con `bun run dev` attivo: `bun run screens --only=today,workout,settings`. Le schermate hanno ancora la vecchia struttura, ma con fondo arena, testo Archivo e numeri in corsivo condensato. Nessuna schermata deve essere illeggibile: gli alias tengono i vecchi colori al loro posto.

- [ ] **Step 6: Commit**

```bash
git add public/fonts src/styles/index.css index.html vite.config.ts
git commit -m "feat(ui): lay the Pedana di gara foundations: tokens, Archivo, base styles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Motion e primitive (numeri che scorrono, luci, linguetta, targa, stepper, segmented)

**Files:**
- Modify: `package.json`, `bun.lock` (via `bun add`), `src/main.tsx`, `src/components/Stepper.tsx`, `src/components/Segmented.tsx`, `src/components/MoveButtons.tsx`
- Create: `src/components/MotionProvider.tsx`, `src/components/motionFeatures.ts`, `src/components/RollingNumber.tsx`, `src/components/Lights.tsx`, `src/components/Tab.tsx`, `src/components/NamePlate.tsx`

**Interfaces:**
- Consumes: token e utility del Task 2.
- Produces:
  - `MotionProvider({ children })`: avvolge l'app; dentro si usano solo componenti `m.*` di `motion/react` (`LazyMotion strict`);
  - `RollingNumber({ value: number | undefined; text: string })`: testo decorativo (`aria-hidden`) le cui cifre cambiate scorrono;
  - `Lights({ total: number; lit: number; muted?: boolean; sequence?: boolean; label?: string })`;
  - `Tab({ children, tone?: 'pedana' | 'record', className?, ...span props })`;
  - `NamePlate({ children, as?: 'h1' | 'h2' | 'p', className? })`;
  - `Stepper` e `Segmented` con le stesse props di oggi.

- [ ] **Step 1: Leggi il craft floor, il contratto e `reference/animate.md` di impeccable**

- [ ] **Step 2: Aggiungi motion**

Run: `bun add --exact motion@14.0.0`
Expected: in `package.json` compare `"motion": "14.0.0"`.

- [ ] **Step 3: Provider di motion**

`src/components/motionFeatures.ts`:

```ts
// Loaded on demand by MotionProvider: layout, shared-layout and gesture support (domMax) stays
// out of the main bundle.
import { domMax } from 'motion/react';

export default domMax;
```

`src/components/MotionProvider.tsx`:

```tsx
import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const features = () => import('./motionFeatures').then((module) => module.default);

/**
 * Only m.* components inside (strict), with the features loaded lazily. reducedMotion "user"
 * turns transform and layout animations off under prefers-reduced-motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
```

In `src/main.tsx` importa `MotionProvider` da `./components/MotionProvider` e avvolgi il router:

```tsx
      <StrictMode>
        <MotionProvider>
          <RouterProvider router={router} />
        </MotionProvider>
      </StrictMode>,
```

- [ ] **Step 4: `RollingNumber`**

`src/components/RollingNumber.tsx`:

```tsx
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';

const slide = {
  enter: (dir: number) => ({ y: `${dir * 100}%`, opacity: 0 }),
  center: { y: '0%', opacity: 1 },
  exit: (dir: number) => ({ y: `${dir * -100}%`, opacity: 0 }),
};

/**
 * The text of a number whose changed characters roll: up when the value grows, down when it
 * shrinks. Characters are keyed from the right, so "9" → "10" rolls the units and brings in the
 * tens. Decorative: the surrounding element carries the accessible value.
 */
export function RollingNumber({ value, text }: { value: number | undefined; text: string }) {
  const [last, setLast] = useState({ value, dir: 1 });
  if (value !== last.value) {
    // Storing the previous value during render: React re-renders at once with the new direction.
    setLast({
      value,
      dir: value !== undefined && last.value !== undefined && value < last.value ? -1 : 1,
    });
  }
  const chars = [...text];
  return (
    <span aria-hidden="true" className="inline-flex">
      {chars.map((char, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a slot is a position counted from the right
        <span key={chars.length - i} className="relative inline-block overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={last.dir}>
            <m.span
              key={char}
              custom={last.dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block"
            >
              {char}
            </m.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 5: `Lights`, `Tab`, `NamePlate`**

`src/components/Lights.tsx`:

```tsx
interface Props {
  /** Number of lights. */
  total: number;
  /** How many are on, from the left. */
  lit: number;
  /** Warmups light up grey: they do not count. */
  muted?: boolean;
  /** Light up one after the other, as on a set confirmed a moment ago. */
  sequence?: boolean;
  /** Accessible name; without it the lights are decorative. */
  label?: string;
}

/** The judges' lights: green once done (green means completed), outlined while to do. */
export function Lights({ total, lit, muted = false, sequence = false, label }: Props) {
  const on = muted ? 'bg-fumo' : 'bg-plate-green';
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="flex shrink-0 items-center gap-1"
    >
      {Array.from({ length: total }, (_, i) => i).map((n) => (
        <span
          key={n}
          className={`size-2.5 rounded-full ${n < lit ? `${on} ${sequence ? 'animate-light-on' : ''}` : 'border-[1.5px] border-fumo/70'}`}
          style={sequence && n < lit ? { animationDelay: `${n * 70}ms` } : undefined}
        />
      ))}
    </span>
  );
}
```

`src/components/Tab.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** record: the yellow tab of a personal record. */
  tone?: 'pedana' | 'record';
}

/** The wood tab of the lower third: a short label or number, right edge cut at the italic angle. */
export function Tab({ children, tone = 'pedana', className = '', ...rest }: Props) {
  const color = tone === 'record' ? 'bg-plate-yellow' : 'bg-pedana';
  return (
    <span
      {...rest}
      className={`cut-right inline-flex shrink-0 items-center gap-1 rounded-l-tag pl-2 text-arena ${color} ${className}`}
    >
      {children}
    </span>
  );
}
```

`src/components/NamePlate.tsx`:

```tsx
import type { ReactNode } from 'react';

/** The light plate of the lower third: the exercise name in the plate face, two lines at most. */
export function NamePlate({
  children,
  as: Tag = 'h1',
  className = '',
}: {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'p';
  className?: string;
}) {
  return (
    <Tag className={`plate line-clamp-2 min-w-0 bg-luce px-2.5 py-1 text-name text-arena ${className}`}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 6: Riscrivi `Stepper`**

In `src/components/Stepper.tsx` la logica (`clamp`, `parse`, `write`, `commit`, `bump`, `commitOnUnmount`, `keepFocus`) e le props restano identiche. Aggiungi l'import:

```tsx
import { RollingNumber } from './RollingNumber';
```

e sostituisci tutto da `const height = …` fino alla fine della funzione con:

```tsx
  const lg = size === 'lg';
  const box = lg ? 'h-14' : 'h-11';
  const button = `flex ${box} ${lg ? 'w-14' : 'w-11'} shrink-0 items-center justify-center rounded-control bg-fondale text-luce transition-transform duration-120 ease-out active:scale-[0.94] disabled:opacity-30 disabled:active:scale-100`;
  const text = lg ? 'text-value' : 'text-step';
  const shown = value === undefined ? '' : formatNumber(value);
  // At rest the digits roll on ± (RollingNumber over a transparent input); typing shows the input.
  const rolling = draft === null && shown !== '';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Diminuisci ${label.toLowerCase()}`}
        className={button}
        disabled={value !== undefined && value <= min}
        onPointerDown={keepFocus}
        onClick={() => bump(-step)}
      >
        <Minus />
      </button>
      <label className={`flex ${box} min-w-0 flex-1 items-center`}>
        <span className="sr-only">{label}</span>
        <span className="flex w-full items-baseline gap-1.5">
          <span className="relative min-w-0 flex-1">
            <input
              inputMode={decimal ? 'decimal' : 'numeric'}
              enterKeyHint="done"
              className={`num w-full bg-transparent outline-none placeholder:text-fumo ${unit ? 'text-right' : 'text-center'} ${text} ${rolling ? 'text-transparent' : ''}`}
              value={draft ?? shown}
              placeholder={placeholder}
              onFocus={(e) => {
                setDraft(e.currentTarget.value);
                e.currentTarget.select();
              }}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (live) write(e.currentTarget.value);
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
            {rolling && (
              <span
                className={`num pointer-events-none absolute inset-0 flex items-center ${unit ? 'justify-end' : 'justify-center'} ${text}`}
              >
                <RollingNumber value={value} text={shown} />
              </span>
            )}
          </span>
          {unit && <span className="label-text w-7 shrink-0 text-fumo">{unit}</span>}
        </span>
      </label>
      <button
        type="button"
        aria-label={`Aumenta ${label.toLowerCase()}`}
        className={button}
        disabled={value !== undefined && value >= max}
        onPointerDown={keepFocus}
        onClick={() => bump(step)}
      >
        <Plus />
      </button>
    </div>
  );
}
```

Aggiorna il commento della prop `size`: `/** lg: 56pt targets and 44px values for workout mode. */`.

- [ ] **Step 7: Riscrivi `Segmented` e `MoveButtons`**

`src/components/Segmented.tsx`, il `return` diventa:

```tsx
  return (
    <div className="flex gap-1 rounded-control bg-tribuna p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className={`${tall ? 'min-h-14' : 'min-h-11'} flex-1 rounded-tag px-2 text-small leading-tight font-semibold text-fumo transition-colors duration-180 active:text-luce aria-pressed:bg-luce aria-pressed:text-arena`}
        >
          {label}
        </button>
      ))}
    </div>
  );
```

`src/components/MoveButtons.tsx`, la costante `style` diventa:

```tsx
  const style =
    'flex size-11 items-center justify-center text-fumo active:text-luce disabled:opacity-30';
```

- [ ] **Step 8: Verifica**

Run: `bun run format && bun run check`, poi `bun run build` e `ls dist/assets | grep -i motionFeatures`
Expected: PASS; un chunk `motionFeatures-*.js` separato (Review Focus 5).

Con `bun run dev`: `bun run screens --only=workout,settings`. Gli stepper hanno i quadrati `fondale` e i valori sul tabellone. In un browser desktop su `http://localhost:5173/workout/demo-session?demo=workout`, premi + e − sul peso: le cifre scorrono in su e in giù, e un tocco sul valore lo rende modificabile come prima.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock src/main.tsx src/components
git commit -m "feat(ui): add motion, rolling digits, lights, tab and name plate primitives

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Fogli che salgono, scendono e si trascinano

**Files:**
- Modify: `src/components/Sheet.tsx` (riscritto)

**Interfaces:**
- Consumes: classe `.sheet` e keyframes `sheet-in`, `sheet-out` del Task 2.
- Produces: `Sheet` con le stesse props (`open`, `onClose`, `title`, `full?`, `children`). Il contenuto resta montato durante la discesa (200 ms).

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: Riscrivi `src/components/Sheet.tsx`**

```tsx
import { X } from 'lucide-react';
import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Tall sheet for long lists, e.g. the exercise picker. */
  full?: boolean;
  children: ReactNode;
}

const CLOSE_MS = 200;
/** Dragging the header down by more than this, or flicking it, closes the sheet. */
const DRAG_CLOSE_PX = 120;
const DRAG_CLOSE_SPEED = 0.6; // px per ms
/** Below this a touch is a tap: the close button keeps working. */
const DRAG_START_PX = 6;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Drag {
  startY: number;
  lastY: number;
  lastT: number;
  speed: number;
  active: boolean;
}

/**
 * Bottom sheet on the native <dialog>: focus trap, Esc and the top layer come for free. It slides
 * up when it opens, slides down before closing, and follows a downward drag of its header.
 */
export function Sheet({ open, onClose, title, full = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<Drag | null>(null);
  // Keeps the content while the sheet slides down: the parent's `open` is already false.
  const [shown, setShown] = useState(open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setShown(true);
      dialog.removeAttribute('data-closing');
      dialog.style.transform = '';
      dialog.style.transition = '';
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) {
      setShown(false);
      return;
    }
    dialog.setAttribute('data-closing', '');
    const timer = setTimeout(
      () => {
        dialog.close();
        dialog.removeAttribute('data-closing');
        dialog.style.transform = '';
        setShown(false);
      },
      reducedMotion() ? 0 : CLOSE_MS,
    );
    return () => clearTimeout(timer);
  }, [open]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      speed: 0,
      active: false,
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const dialog = ref.current;
    if (!d || !dialog) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (dy < DRAG_START_PX) return;
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      dialog.style.transition = 'none';
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.speed = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    dialog.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    const dialog = ref.current;
    if (!d?.active || !dialog) return;
    if (e.clientY - d.startY > DRAG_CLOSE_PX || d.speed > DRAG_CLOSE_SPEED) {
      onClose(); // the closing slide starts from where the finger left it
      return;
    }
    dialog.style.transition = `transform ${CLOSE_MS}ms var(--ease-out)`;
    dialog.style.transform = '';
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: closes on backdrop taps; Esc closes natively
    <dialog
      ref={ref}
      className={`sheet ${full ? 'h-[92dvh]' : ''}`}
      // Only a native close (Esc) reports back. When the parent closed us, its state already moved
      // on, possibly to another sheet: calling onClose again would close that one.
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {shown && (
        <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle; the close button and Esc are the accessible ways out */}
          <div
            className="touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <div className="flex justify-center pt-2" aria-hidden="true">
              <span className="h-[5px] w-9 rounded-full bg-fumo/50" />
            </div>
            <div className="flex min-h-14 items-center gap-2 pr-1 pl-4">
              <h2 className="plate flex-1 text-title">{title}</h2>
              <button
                type="button"
                aria-label="Chiudi"
                className="flex size-14 items-center justify-center text-fumo active:text-luce"
                onClick={onClose}
              >
                <X />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 3: Verifica (Review Focus 4)**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`, in Chrome desktop con l'emulazione touch di un iPhone (DevTools, Toggle device toolbar):

1. `/programs/demo-program/days/demo-day-a?demo`, "Aggiungi esercizio": il foglio sale. Scorri l'elenco: scorre, non si chiude. Trascina il titolo verso il basso oltre metà strada: si chiude scendendo. Riaprilo, trascina poco e rilascia: torna su.
2. Tocca lo sfondo scuro: il foglio scende e si chiude. Riaprilo e premi Esc: si chiude.
3. `/workout/demo-session?demo=workout`, menu ⋯ dell'esercizio, "Sostituisci esercizio": il menu scende e il selettore resta aperto.
4. Tocca la X del foglio: si chiude al primo tocco.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sheet.tsx
git commit -m "feat(ui): slide sheets in and out and close them with a downward drag

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Struttura dell'app: tab bar, entrate delle schermate, titoli, barra dell'allenamento

**Files:**
- Create: `src/domain/navigation.ts`, `src/domain/navigation.test.ts`
- Modify: `src/App.tsx`, `src/components/Header.tsx`, `src/components/UpdatePrompt.tsx`, `src/features/workout/ActiveWorkoutBar.tsx`

**Interfaces:**
- Consumes: `restState` (`src/domain/workout.ts`); `Tab` (Task 3); `getSettings`.
- Produces:
  - `enterMotion(nav: { pathname: string; navigationType: string; back: boolean; initial: boolean }): EnterMotion`, con `EnterMotion = 'none' | 'fade' | 'forward' | 'back'`;
  - `Header({ title, back?, right?, large? })`: `large` per i titoli delle quattro tab; il link indietro passa `state={{ dir: 'back' }}`;
  - convenzione: un link che torna indietro passa `state={{ dir: 'back' }}`;
  - `ActiveWorkoutBar({ session, timer: ActiveTimer | null })`.

- [ ] **Step 1: Scrivi il test (fallisce)**

`src/domain/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { enterMotion } from './navigation';

const nav = (pathname: string, navigationType: string, back = false, initial = false) =>
  enterMotion({ pathname, navigationType, back, initial });

describe('enterMotion', () => {
  it('shows the first screen after launch without an entrance', () => {
    expect(nav('/history/abc', 'POP', false, true)).toBe('none');
  });
  it('fades between tabs and after a replace', () => {
    expect(nav('/programs', 'PUSH')).toBe('fade');
    expect(nav('/', 'PUSH')).toBe('fade');
    expect(nav('/history/abc', 'REPLACE')).toBe('fade');
  });
  it('slides in what is pushed on top', () => {
    expect(nav('/programs/p1/days/d1', 'PUSH')).toBe('forward');
  });
  it('slides back for back links and history pops, onto tabs too', () => {
    expect(nav('/programs', 'PUSH', true)).toBe('back');
    expect(nav('/history/abc', 'POP')).toBe('back');
  });
});
```

Run: `bun run test src/domain/navigation.test.ts`
Expected: FAIL, `./navigation` non esiste.

- [ ] **Step 2: Implementa `src/domain/navigation.ts`**

```ts
export type EnterMotion = 'none' | 'fade' | 'forward' | 'back';

const TAB_ROOTS = new Set(['/', '/programs', '/history', '/progress']);

/**
 * How a screen enters: nothing on launch, a slide back for back links and history pops, a fade
 * between tabs and after replacements, a slide in for everything pushed on top.
 */
export function enterMotion(nav: {
  pathname: string;
  /** React Router's navigation type: "POP", "PUSH" or "REPLACE". */
  navigationType: string;
  /** The link asked to go back (state.dir === 'back'). */
  back: boolean;
  /** First location since launch. */
  initial: boolean;
}): EnterMotion {
  if (nav.initial) return 'none';
  if (nav.back || nav.navigationType === 'POP') return 'back';
  if (nav.navigationType === 'REPLACE' || TAB_ROOTS.has(nav.pathname)) return 'fade';
  return 'forward';
}
```

Run: `bun run test src/domain/navigation.test.ts`
Expected: PASS.

- [ ] **Step 3: Riscrivi `src/App.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, Dumbbell, History as HistoryIcon, TrendingUp } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getActiveSession } from './db/sessions';
import { getSettings } from './db/settings';
import { type EnterMotion, enterMotion } from './domain/navigation';
import { ActiveWorkoutBar } from './features/workout/ActiveWorkoutBar';
import { StaleSessionSheet } from './features/workout/StaleSessionSheet';

const TABS = [
  { to: '/', label: 'Oggi', Icon: Dumbbell },
  { to: '/programs', label: 'Programmi', Icon: ClipboardList },
  { to: '/history', label: 'Storico', Icon: HistoryIcon },
  { to: '/progress', label: 'Progressi', Icon: TrendingUp },
];

const ENTER: Record<EnterMotion, string> = {
  none: '',
  fade: 'animate-enter-fade',
  forward: 'animate-enter-forward',
  back: 'animate-enter-back',
};

export function AppLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null);
  const settings = useLiveQuery(getSettings);
  const motion = enterMotion({
    pathname: location.pathname,
    navigationType,
    back: (location.state as { dir?: string } | null)?.dir === 'back',
    initial: location.key === 'default', // React Router: always "default" on the first location
  });

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <main className="flex flex-1 flex-col">
        {/* Keyed by path: each screen plays its entrance once, query changes (tabs) do not. */}
        <div key={location.pathname} className={`flex flex-1 flex-col ${ENTER[motion]}`}>
          <Outlet />
        </div>
      </main>
      <div className="sticky bottom-0 z-10 bg-arena pb-[env(safe-area-inset-bottom)]">
        {/* Never reload during a workout: hidden while a session is open (and while loading). */}
        <UpdatePrompt hidden={active !== null} />
        {active && location.pathname !== '/' && (
          <ActiveWorkoutBar session={active} timer={settings?.activeTimer ?? null} />
        )}
        <nav aria-label="Sezioni" className="flex rule-t">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 label-text transition-colors duration-180 ${isActive ? 'text-luce' : 'text-fumo active:text-luce'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 h-[3px] w-6 -skew-x-12 bg-pedana"
                    />
                  )}
                  <Icon size={24} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <StaleSessionSheet session={active ?? null} />
    </div>
  );
}
```

- [ ] **Step 4: Riscrivi `Header`**

`src/components/Header.tsx`:

```tsx
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Header({
  title,
  back,
  right,
  large = false,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
  /** The four tabs: a 34px title in the plate face. */
  large?: boolean;
}) {
  return (
    <header className={`flex items-center gap-1 px-4 ${large ? 'min-h-16 pt-2' : 'min-h-14'}`}>
      {back && (
        <Link
          to={back}
          state={{ dir: 'back' }}
          aria-label="Indietro"
          className="-ml-3 flex size-11 items-center justify-center active:opacity-60"
        >
          <ChevronLeft />
        </Link>
      )}
      <h1 className={`plate flex-1 truncate ${large ? 'text-large' : 'text-title'}`}>{title}</h1>
      {right}
    </header>
  );
}
```

- [ ] **Step 5: Riscrivi `ActiveWorkoutBar` e `UpdatePrompt`**

`src/features/workout/ActiveWorkoutBar.tsx`:

```tsx
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useNow } from '../../components/useNow';
import { formatClock } from '../../domain/format';
import { restState } from '../../domain/workout';
import type { ActiveTimer, Session } from '../../types';

/**
 * SPEC §5: above the tab bar while a workout is open and the user is outside it. Shows the rest
 * left when a rest runs, the elapsed workout time otherwise.
 */
export function ActiveWorkoutBar({
  session,
  timer,
}: {
  session: Session;
  timer: ActiveTimer | null;
}) {
  const now = useNow(timer ? 250 : 1000);
  const rest = timer ? restState(timer, now) : null;
  return (
    <Link
      to={`/workout/${session.id}`}
      className="flex min-h-14 items-center gap-3 bg-plate-blue px-4 text-luce active:brightness-110"
    >
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block font-semibold">Allenamento in corso</span>
        <span className="block text-tiny">Giornata {session.dayLabel}</span>
      </span>
      {rest?.finished ? (
        <span className="text-small font-semibold">Recupero finito</span>
      ) : rest ? (
        <span className="flex items-baseline gap-2">
          <span className="label-text">Recupero</span>
          <span className="num text-title">
            {formatClock(Math.ceil(rest.remainingMs / 1000) * 1000)}
          </span>
        </span>
      ) : (
        <span className="num text-title">{formatClock(now - session.startedAt)}</span>
      )}
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  );
}
```

`src/components/UpdatePrompt.tsx`: la registrazione (`useRegisterSW` e `onRegisteredSW`) resta identica. Aggiungi `import { Tab } from './Tab';` e l'ultimo `return` diventa:

```tsx
  return (
    <div className="flex items-center gap-3 bg-tribuna py-1 pr-2 rule-t">
      <Tab className="self-stretch label-text">Nuova versione disponibile</Tab>
      <span className="flex-1" />
      <button type="button" className="btn-text" onClick={() => void updateServiceWorker(true)}>
        Aggiorna
      </button>
    </div>
  );
```

- [ ] **Step 6: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: `bun run screens --only=today,programs,history,progress,settings`. Le tab hanno il marcatore di legno sopra l'icona attiva e i titoli grandi in corsivo condensato. Nel browser apri `/programs?demo=workout`: sopra la tab bar c'è la banda blu "Allenamento in corso" con "Recupero" e il tempo che scende. Passando da una tab all'altra le schermate entrano in dissolvenza; aprendo un programma la schermata entra da destra, e la freccia indietro la fa entrare da sinistra.

- [ ] **Step 7: Commit**

```bash
git add src/domain/navigation.ts src/domain/navigation.test.ts src/App.tsx src/components/Header.tsx src/components/UpdatePrompt.tsx src/features/workout/ActiveWorkoutBar.tsx
git commit -m "feat(ui): restyle the shell: tab bar, screen entrances, large titles, workout bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Modalità allenamento: sottopancia e tabellone delle serie

**Files:**
- Modify: `src/domain/workout.ts`, `src/domain/workout.test.ts`, `src/features/workout/SetRows.tsx` (riscritto), `src/features/workout/ExerciseView.tsx` (riscritto), `src/features/workout/WorkoutScreen.tsx` (riscritto), `src/features/workout/SessionSheet.tsx` (riscritto), `src/features/workout/ExerciseMenu.tsx`

**Interfaces:**
- Consumes: `Lights`, `Tab`, `NamePlate`, `RollingNumber`, `Stepper` (Task 3); `Sheet` (Task 4).
- Produces:
  - `workSetCounter(sets: Pick<SetLog, 'isWarmup' | 'completedAt'>[]): { current: number; total: number } | undefined`;
  - `SetRow` e `SetEditor` con le stesse props di oggi (usati anche da `SessionDetail`, Task 14); `Disc` sparisce (nessun altro lo usa);
  - la banda della serie corrente è un `m.div` con `layoutId={`set-band-${se.id}`}`.

- [ ] **Step 1: Leggi il craft floor e il contratto (FIRST VIEWPORT descrive questa schermata)**

- [ ] **Step 2: Scrivi il test (fallisce)**

In `src/domain/workout.test.ts` aggiungi `workSetCounter` all'import da `./workout` e in fondo al file:

```ts
describe('workSetCounter (lower third "2/4")', () => {
  const s = (done: boolean, isWarmup = false) => ({ isWarmup, completedAt: done ? 1 : undefined });
  it('counts the next work set to do over the work sets, warmups aside', () => {
    expect(workSetCounter([s(true, true), s(true), s(false), s(false), s(false)])).toEqual({
      current: 2,
      total: 4,
    });
  });
  it('stays on the last set once all are done, and is undefined without work sets', () => {
    expect(workSetCounter([s(true), s(true)])).toEqual({ current: 2, total: 2 });
    expect(workSetCounter([s(false, true)])).toBeUndefined();
  });
});
```

Run: `bun run test src/domain/workout.test.ts`
Expected: FAIL, `workSetCounter` non esportata.

- [ ] **Step 3: Implementa `workSetCounter`**

In fondo a `src/domain/workout.ts`:

```ts
/** "2/4" on the workout lower third: the next work set to do (the last when all are done). */
export function workSetCounter(
  sets: Pick<SetLog, 'isWarmup' | 'completedAt'>[],
): { current: number; total: number } | undefined {
  const work = sets.filter((s) => !s.isWarmup);
  if (work.length === 0) return undefined;
  const next = work.findIndex((s) => s.completedAt === undefined);
  return { current: next === -1 ? work.length : next + 1, total: work.length };
}
```

Run: `bun run test src/domain/workout.test.ts`
Expected: PASS.

- [ ] **Step 4: Riscrivi `src/features/workout/SetRows.tsx`**

```tsx
import { Check, Trash2, Trophy } from 'lucide-react';
import { m } from 'motion/react';
import { Lights } from '../../components/Lights';
import { Stepper } from '../../components/Stepper';
import { deleteSet, updateSet } from '../../db/workout';
import { formatNumber, formatRange, formatSet, type SetValues } from '../../domain/format';
import { canComplete } from '../../domain/workout';
import { confirmAction } from '../../platform/confirm';
import type { Exercise, SessionExercise, SetLog, TrackingType } from '../../types';

const DASH = '–';
/** A set confirmed this recently lights up in sequence when its row appears. */
const FRESH_MS = 1500;
const setName = (set: SetLog, label: string) => (set.isWarmup ? 'Riscaldamento' : `Serie ${label}`);

/** The numbers of a row: weight on the scoreboard, then × reps (or seconds, or reps alone). */
function Values({ set, tracking }: { set: SetLog; tracking: TrackingType }) {
  const big = set.isWarmup ? 'text-title' : 'text-score';
  if (tracking === 'duration') {
    return (
      <>
        <span className={`num w-20 text-right ${big}`}>{set.durationSec ?? DASH}</span>
        <span className="label-text text-fumo">s</span>
      </>
    );
  }
  if (tracking === 'bodyweight_reps' && !set.weightKg) {
    return (
      <>
        <span className={`num w-20 text-right ${big}`}>{set.reps ?? DASH}</span>
        <span className="label-text text-fumo">rip</span>
      </>
    );
  }
  const weight =
    set.weightKg === undefined
      ? DASH
      : `${tracking === 'bodyweight_reps' ? '+' : ''}${formatNumber(set.weightKg)}`;
  return (
    <>
      <span className={`num w-20 text-right ${big}`}>{weight}</span>
      <span className="label-text w-6 text-fumo">kg</span>
      <span className="num text-title">× {set.reps ?? DASH}</span>
    </>
  );
}

interface RowProps {
  set: SetLog;
  label: string;
  tracking: TrackingType;
  record?: boolean;
  onSelect: () => void;
}

/** A row of the set board: number, values and the judges' lights. A tap opens it in the editor. */
export function SetRow({ set, label, tracking, record = false, onSelect }: RowProps) {
  const done = set.completedAt !== undefined;
  const fresh = done && Date.now() - (set.completedAt ?? 0) < FRESH_MS;
  const tone = record ? 'text-plate-yellow' : done && !set.isWarmup ? 'text-luce' : 'text-fumo';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${setName(set, label)}: ${formatSet(set, tracking)}${done ? ', completata' : ''}${record ? ', record' : ''}`}
      className="flex min-h-14 w-full items-center gap-2 px-4 text-left rule-b active:bg-fondale"
    >
      <span className="num w-7 text-title text-fumo">{label}</span>
      <span className={`flex flex-1 items-baseline gap-1 ${tone}`}>
        <Values set={set} tracking={tracking} />
        {record && <Trophy size={16} aria-hidden="true" className="ml-1 self-center" />}
      </span>
      <Lights
        total={set.isWarmup ? 1 : 3}
        lit={done ? (set.isWarmup ? 1 : 3) : 0}
        muted={set.isWarmup}
        sequence={fresh}
      />
    </button>
  );
}

interface EditorProps {
  set: SetLog;
  label: string;
  se: SessionExercise;
  exercise: Exercise;
  step: number;
  onConfirm: () => void;
  onClose: () => void;
  onToggleWarmup?: () => void;
  onShowPlates?: () => void;
}

/**
 * The current set (blue band) or a completed one being corrected (grey band), with 56pt
 * steppers. The band carries a layoutId: when the next set becomes current it slides down to it.
 */
export function SetEditor({
  set,
  label,
  se,
  exercise,
  step,
  onConfirm,
  onClose,
  onToggleWarmup,
  onShowPlates,
}: EditorProps) {
  const tracking = exercise.trackingType;
  const done = set.completedAt !== undefined;
  const save = (patch: SetValues) => void updateSet(set.id, patch);
  const remove = () => {
    if (done && !confirmAction('Eliminare questa serie completata?')) return;
    void deleteSet(set.id);
  };
  return (
    <div className="bg-tribuna rule-b">
      <m.div
        layoutId={`set-band-${se.id}`}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={`flex min-h-14 items-center pl-4 ${done ? 'bg-fondale' : 'bg-plate-blue'}`}
      >
        <span className="flex-1 font-semibold">
          {setName(set, label)}
          {done && ', completata'}
        </span>
        {onShowPlates && (
          <button type="button" className="btn-text min-h-14 text-small" onClick={onShowPlates}>
            Dischi
          </button>
        )}
        <button
          type="button"
          aria-label="Elimina serie"
          className="flex size-14 items-center justify-center active:opacity-60"
          onClick={remove}
        >
          <Trash2 size={20} />
        </button>
      </m.div>
      <div className="space-y-2 px-4 pt-3 pb-4">
        {tracking !== 'duration' && (
          <Stepper
            size="lg"
            live
            label={tracking === 'bodyweight_reps' ? 'Zavorra' : 'Peso'}
            decimal
            unit="kg"
            step={step}
            value={tracking === 'bodyweight_reps' ? (set.weightKg ?? 0) : set.weightKg}
            placeholder={DASH}
            onChange={(weightKg) => save({ weightKg })}
          />
        )}
        {tracking === 'duration' ? (
          <Stepper
            size="lg"
            live
            label="Durata"
            unit="s"
            step={5}
            value={set.durationSec}
            fallback={se.targetSec}
            placeholder={String(se.targetSec ?? '')}
            onChange={(durationSec) => save({ durationSec })}
          />
        ) : (
          <Stepper
            size="lg"
            live
            label="Ripetizioni"
            unit="rip"
            step={1}
            value={set.reps}
            fallback={se.repMin}
            placeholder={formatRange(se.repMin, se.repMax)}
            onChange={(reps) => save({ reps })}
          />
        )}
        {onToggleWarmup && (
          <label className="flex min-h-11 items-center gap-3">
            <span className="flex-1">Serie di riscaldamento</span>
            <input
              type="checkbox"
              className="switch"
              checked={set.isWarmup}
              onChange={onToggleWarmup}
            />
          </label>
        )}
        <div className="pt-1">
          {done ? (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Fatto
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={!canComplete(set, tracking)}
              onClick={onConfirm}
            >
              <Check size={22} /> Conferma serie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Riscrivi `src/features/workout/ExerciseView.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { NamePlate } from '../../components/NamePlate';
import { RollingNumber } from '../../components/RollingNumber';
import { Tab } from '../../components/Tab';
import { exerciseHistory, updateExercise } from '../../db/exercises';
import type { WorkoutItem } from '../../db/sessions';
import { addSet, applyWeight, type CompleteResult, completeSet } from '../../db/workout';
import {
  formatList,
  formatNumber,
  formatSets,
  formatTarget,
  relativeDay,
} from '../../domain/format';
import { computeRecords, isRecordSet } from '../../domain/records';
import {
  firstPending,
  offeredWeight,
  setLabel,
  suggestWeight,
  weightStep,
  workSetCounter,
} from '../../domain/workout';
import type { Settings } from '../../types';
import { PlateSheet } from './PlateSheet';
import { syncRestPush } from './restPush';
import { SetEditor, SetRow } from './SetRows';

interface Props {
  item: WorkoutItem;
  settings: Settings;
  /** Called after a set is confirmed, with the outcome (where to go next). */
  onSetCompleted: (result: CompleteResult) => void;
  /** Names of the other members when the exercise is in a superset. */
  supersetWith?: string[];
  onMenu?: () => void;
}

export function ExerciseView({ item, settings, onSetCompleted, supersetWith, onMenu }: Props) {
  const { se, exercise, sets, dayNote } = item;
  const tracking = exercise.trackingType;
  const history = useLiveQuery(() => exerciseHistory(exercise.id), [exercise.id]) ?? [];
  const last = history[0];
  const before = computeRecords(
    history.map((h) => h.sets),
    tracking,
  );
  const step = weightStep(exercise, settings.weightSteps);
  const suggestion = offeredWeight(
    tracking === 'weight_reps'
      ? suggestWeight(last?.sets, se.plannedSets, se.repMax, step)
      : undefined,
    sets,
  );
  const counter = workSetCounter(sets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [platesKg, setPlatesKg] = useState<number | null>(null);
  const selected = sets.find((s) => s.id === selectedId) ?? firstPending(sets);

  const confirm = async (setId: string) => {
    const result = await completeSet(setId);
    void syncRestPush(result.timer);
    setSelectedId(null);
    onSetCompleted(result);
  };

  return (
    <>
      <section className="px-4 pt-2 pb-4">
        <div className="flex items-start gap-1">
          {/* The lower third wipes in each time an exercise comes on (the view is keyed by it). */}
          <div className="flex min-w-0 flex-1 animate-wipe items-stretch">
            {counter && (
              <Tab className="num text-title">
                <span className="sr-only">
                  Serie {counter.current} di {counter.total}
                </span>
                <RollingNumber
                  value={counter.current}
                  text={`${counter.current}/${counter.total}`}
                />
              </Tab>
            )}
            <NamePlate>{exercise.name}</NamePlate>
          </div>
          {onMenu && (
            <button
              type="button"
              aria-label="Opzioni dell'esercizio"
              className="-mr-3 flex size-14 shrink-0 items-center justify-center text-fumo active:text-luce"
              onClick={onMenu}
            >
              <MoreHorizontal />
            </button>
          )}
        </div>
        <p className="mt-3 text-small text-fumo">
          {formatTarget({ ...se, sets: se.plannedSets }, tracking)}
        </p>
        {supersetWith && supersetWith.length > 0 && (
          <p className="text-small text-fumo">In superserie con {formatList(supersetWith)}</p>
        )}
        {se.status === 'skipped' && (
          <p className="text-small text-fumo">Saltato: completa una serie per riprenderlo.</p>
        )}
        <label className="mt-1 block">
          <span className="sr-only">Nota permanente</span>
          <textarea
            key={exercise.id}
            rows={1}
            className="field-sizing-content w-full resize-none bg-transparent outline-none placeholder:text-fumo"
            defaultValue={exercise.notes}
            placeholder="Aggiungi una nota, es. sedile al 4"
            onChange={(e) => void updateExercise(exercise.id, { notes: e.target.value })}
          />
        </label>
        {dayNote && <p className="text-small text-fumo">{dayNote}</p>}
        {last && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-small text-fumo first-letter:uppercase">
              {relativeDay(last.startedAt)}:{' '}
              <span className="num text-body text-luce">{formatSets(last.sets, tracking)}</span>
            </p>
            {suggestion !== undefined && (
              <button
                type="button"
                className="chip-action"
                aria-label={`Aumenta a ${formatNumber(suggestion)} kg le serie da fare`}
                onClick={() => void applyWeight(se.id, suggestion)}
              >
                Aumenta a {formatNumber(suggestion)} kg
              </button>
            )}
          </div>
        )}
      </section>

      <ul className="border-t border-luce">
        {sets.map((set) => (
          <li key={set.id}>
            {set.id === selected?.id ? (
              <SetEditor
                set={set}
                label={setLabel(sets, set)}
                se={se}
                exercise={exercise}
                step={step}
                onConfirm={() => confirm(set.id)}
                onClose={() => setSelectedId(null)}
                onShowPlates={
                  exercise.equipment === 'barbell' && (set.weightKg ?? 0) > 0
                    ? () => setPlatesKg(set.weightKg ?? 0)
                    : undefined
                }
              />
            ) : (
              <SetRow
                set={set}
                label={setLabel(sets, set)}
                tracking={tracking}
                record={isRecordSet(set, tracking, before)}
                onSelect={() => setSelectedId(set.id)}
              />
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-x-2 px-2 py-2">
        <button type="button" className="btn-text min-h-14" onClick={() => addSet(se.id, false)}>
          <Plus size={20} /> Aggiungi serie
        </button>
        <button
          type="button"
          className="btn-text min-h-14 text-fumo"
          onClick={() => addSet(se.id, true)}
        >
          <Plus size={20} /> Aggiungi riscaldamento
        </button>
      </div>

      <PlateSheet
        weightKg={platesKg ?? 0}
        open={platesKg !== null}
        onClose={() => setPlatesKg(null)}
      />
    </>
  );
}
```

- [ ] **Step 6: Riscrivi `src/features/workout/WorkoutScreen.tsx`**

La logica resta identica; cambiano header, piede, l'entrata dal basso e le classi. Contenuto completo:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useNow } from '../../components/useNow';
import { getWorkout } from '../../db/sessions';
import { getSettings } from '../../db/settings';
import {
  addSessionExercise,
  removeSessionExercise,
  replaceExercise,
  skipExercise,
} from '../../db/workout';
import { formatClock } from '../../domain/format';
import { supersetRun } from '../../domain/superset';
import { resumeIndex } from '../../domain/workout';
import { useWakeLock } from '../../platform/wakeLock';
import { ExercisePicker } from '../library/ExercisePicker';
import { ExerciseMenu } from './ExerciseMenu';
import { ExerciseView } from './ExerciseView';
import { discardWorkout, finishWorkout } from './finish';
import { SessionSheet } from './SessionSheet';
import { TimerBar } from './TimerBar';

type SheetName = 'list' | 'menu' | 'replace' | 'add';

export function WorkoutScreen() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const workout = useLiveQuery(async () => (await getWorkout(sessionId)) ?? null, [sessionId]);
  const settings = useLiveQuery(getSettings);
  const [index, setIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const now = useNow(1000);
  useWakeLock();

  if (workout === undefined || !settings) return null;
  if (workout === null) return <Navigate to="/" replace />;
  const { session, items } = workout;
  // Also catches the live query refreshing right after "Termina allenamento".
  if (session.status === 'completed')
    return <Navigate to={`/workout/${session.id}/summary`} replace />;

  const current = Math.min(index ?? resumeIndex(items), Math.max(0, items.length - 1));
  const item = items[current];
  const isLast = current >= items.length - 1;
  const partners = item
    ? supersetRun(
        items.map((i) => i.se.supersetKey),
        current,
      )
        .filter((i) => i !== current)
        .map((i) => items[i]?.exercise.name ?? '')
    : [];
  const goTo = (i: number) => {
    setIndex(i);
    if (i !== current) window.scrollTo(0, 0); // a lone superset member stays where it is
  };
  const close = () => setSheet(null);
  const position = items.length > 0 ? current + 1 : 0;

  return (
    <div className="flex min-h-dvh animate-enter-rise flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 bg-arena px-2 pt-[env(safe-area-inset-top)] rule-b">
        <Link
          to="/"
          aria-label="Esci dall'allenamento"
          className="flex size-14 items-center justify-center text-fumo active:text-luce"
        >
          <X />
        </Link>
        <div className="flex flex-1 items-baseline justify-center gap-3">
          <span className="font-semibold">Giornata {session.dayLabel}</span>
          <span className="num text-title text-fumo">{formatClock(now - session.startedAt)}</span>
        </div>
        <button
          type="button"
          aria-label={`Elenco degli esercizi, ${position} di ${items.length}`}
          className="flex h-14 items-center gap-1 px-3 active:opacity-60"
          onClick={() => setSheet('list')}
        >
          <span className="num text-title">{position}</span>
          <span className="text-small text-fumo">di</span>
          <span className="num text-title">{items.length}</span>
          <ChevronDown size={18} aria-hidden="true" className="text-fumo" />
        </button>
      </header>

      <main className="flex-1 pb-4">
        {item ? (
          <>
            <ExerciseView
              key={item.se.id}
              item={item}
              settings={settings}
              onMenu={() => setSheet('menu')}
              supersetWith={partners}
              onSetCompleted={({ exerciseDone, next }) => {
                const target = next ? items.findIndex((i) => i.se.id === next) : -1;
                if (target !== -1) goTo(target);
                else if (exerciseDone && !isLast) goTo(current + 1);
              }}
            />
            {isLast && (
              <div className="px-2">
                <button type="button" className="btn-text min-h-14" onClick={() => setSheet('add')}>
                  <Plus size={20} /> Aggiungi esercizio
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 px-4 pt-8">
            <p className="text-fumo">
              Nessun esercizio in questa sessione. Aggiungine uno per iniziare.
            </p>
            <button type="button" className="btn-secondary" onClick={() => setSheet('add')}>
              <Plus size={20} /> Aggiungi esercizio
            </button>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-arena">
        <nav className="flex items-center px-2 rule-t">
          <button
            type="button"
            className="btn-text min-h-14"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft /> Precedente
          </button>
          <span className="flex-1" />
          {isLast ? (
            <button
              type="button"
              className="my-1 inline-flex min-h-14 items-center rounded-control bg-plate-blue px-4 font-semibold text-luce transition-transform duration-120 ease-out active:scale-[0.97]"
              onClick={() => finishWorkout(session.id, navigate)}
            >
              Termina allenamento
            </button>
          ) : (
            <button type="button" className="btn-text min-h-14" onClick={() => goTo(current + 1)}>
              Successivo <ChevronRight />
            </button>
          )}
        </nav>
        <TimerBar timer={settings.activeTimer} sound={settings.timerSound} item={item} />
      </footer>

      <SessionSheet
        open={sheet === 'list'}
        onClose={close}
        items={items}
        current={current}
        onJump={(i) => {
          goTo(i);
          close();
        }}
      >
        <div className="space-y-2 px-4 pt-4">
          <button type="button" className="btn-secondary" onClick={() => setSheet('add')}>
            <Plus size={20} /> Aggiungi esercizio
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => finishWorkout(session.id, navigate)}
          >
            Termina allenamento
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => discardWorkout(session.id, navigate)}
          >
            <Trash2 size={20} /> Scarta allenamento
          </button>
        </div>
      </SessionSheet>
      <ExerciseMenu
        item={item}
        open={sheet === 'menu'}
        onClose={close}
        onReplace={() => setSheet('replace')}
        onSkip={async () => {
          if (item) await skipExercise(item.se.id);
          close();
          if (!isLast) goTo(current + 1);
        }}
        onRemove={async () => {
          if (item) await removeSessionExercise(item.se.id);
          close();
        }}
      />
      <ExercisePicker
        open={sheet === 'replace'}
        onClose={close}
        title="Sostituisci con"
        initialGroup={item?.exercise.muscleGroup}
        onPick={async (exerciseId) => {
          if (item && (await replaceExercise(item.se.id, exerciseId)) === 'inserted')
            goTo(current + 1);
        }}
      />
      <ExercisePicker
        open={sheet === 'add'}
        onClose={close}
        onPick={async (exerciseId) => {
          await addSessionExercise(session.id, exerciseId);
          goTo(items.length); // the new last exercise
        }}
      />
    </div>
  );
}
```

- [ ] **Step 7: Riscrivi `SessionSheet` e ritocca `ExerciseMenu`**

`src/features/workout/SessionSheet.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Lights } from '../../components/Lights';
import { Sheet } from '../../components/Sheet';
import type { WorkoutItem } from '../../db/sessions';

interface Props {
  open: boolean;
  onClose: () => void;
  items: WorkoutItem[];
  current: number;
  onJump: (index: number) => void;
  /** Session actions (add, finish, discard). */
  children?: ReactNode;
}

/** The session's start list: current on the blue band, done with lit lights, skipped struck. */
export function SessionSheet({ open, onClose, items, current, onJump, children }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Esercizi">
      <ol className="border-t border-luce">
        {items.map(({ se, exercise, sets }, i) => {
          const work = sets.filter((s) => !s.isWarmup);
          const done = work.filter((s) => s.completedAt !== undefined).length;
          const isCurrent = i === current;
          return (
            <li key={se.id}>
              <button
                type="button"
                className={`row ${isCurrent ? 'bg-plate-blue active:bg-plate-blue' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onJump(i)}
              >
                <span className={`num w-6 text-title ${isCurrent ? 'text-luce' : 'text-fumo'}`}>
                  {i + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 ${isCurrent ? 'font-semibold' : ''} ${se.status === 'skipped' ? 'text-fumo line-through' : ''}`}
                >
                  {exercise.name}
                </span>
                {se.status === 'skipped' ? (
                  <span className="text-small text-fumo">Saltato</span>
                ) : se.status === 'done' ? (
                  <Lights total={3} lit={3} label="Completato" />
                ) : (
                  <span className="num text-title">
                    {done}/{work.length}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {children}
    </Sheet>
  );
}
```

In `src/features/workout/ExerciseMenu.tsx` sostituisci `text-steel` con `text-fumo`.

- [ ] **Step 8: Verifica (Review Focus 2)**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: `bun run screens --only=workout`. In `workout-390.png` e `workout-375.png` controlla, dall'alto: header con "Giornata A", "24:1x" e "1 di 6"; sottopancia con la linguetta di legno "2/4" e la targa chiara "Panca piana con bilanciere"; target, nota, "Ultima volta"; il filetto pieno; la riga "R" attenuata con una luce grigia; la serie 1 "92,5 kg × 8" in giallo con il trofeo e tre luci verdi; la banda blu "Serie 2" con gli stepper a 44 px; "Conferma serie". A 375 px niente va a capo male.

Nel browser (`/workout/demo-session?demo=workout`): premi "Conferma serie". Le tre luci della riga si accendono in sequenza, la banda blu scivola sulla serie 3 e la linguetta passa a "3/4" con le cifre che scorrono.

- [ ] **Step 9: Commit**

```bash
git add src/domain/workout.ts src/domain/workout.test.ts src/features/workout
git commit -m "feat(workout): lower third, set board with judges' lights and sliding current set

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Orologio del recupero e segnale a due toni

**Files:**
- Modify: `src/features/workout/TimerBar.tsx` (riscritto), `src/platform/sound.ts`

**Interfaces:**
- Consumes: `restState`, `formatClock`, `formatSeconds`, le azioni del timer (invariate).
- Produces: `TimerBar` con le stesse props (`timer`, `sound`, `item`); `beep()` con lo stesso nome e un suono nuovo.

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: Riscrivi `src/features/workout/TimerBar.tsx`**

L'effetto del suono e le funzioni `stop`, `startTimer`, `extendTimer` restano identici; cambia il markup. Contenuto completo:

```tsx
import { BellOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNow } from '../../components/useNow';
import type { WorkoutItem } from '../../db/sessions';
import { clearTimer, extendTimer, startTimer } from '../../db/workout';
import { formatClock, formatSeconds } from '../../domain/format';
import { restState } from '../../domain/workout';
import { beep } from '../../platform/sound';
import type { ActiveTimer } from '../../types';
import { syncRestPush } from './restPush';

interface Props {
  timer: ActiveTimer | null;
  sound: boolean;
  /** Exercise on screen: its rest is offered when no timer runs. */
  item: WorkoutItem | undefined;
}

const SAFE_BOTTOM = 'pb-[env(safe-area-inset-bottom)]';

/**
 * The competition clock (SPEC §7.1). Remaining time always comes from endAt, recomputed every
 * 250 ms and on visibility. The wood line on top shortens as the rest runs out; at zero the whole
 * band turns green and counts the extra time.
 */
export function TimerBar({ timer, sound, item }: Props) {
  const now = useNow(timer ? 250 : null);
  const beepedFor = useRef<number | null>(null);
  const state = timer ? restState(timer, now) : null;
  const finished = state?.finished ?? false;

  useEffect(() => {
    if (!timer || !finished || beepedFor.current === timer.endAt) return;
    beepedFor.current = timer.endAt;
    // Beep only when the end happens on screen, not when coming back from the background later.
    if (sound && Date.now() - timer.endAt < 2000 && document.visibilityState === 'visible') beep();
  }, [timer, finished, sound]);

  const stop = async () => {
    await clearTimer();
    void syncRestPush(null);
  };

  if (!timer || !state) {
    if (!item) return <div className={SAFE_BOTTOM} />;
    return (
      <div className={`flex min-h-16 items-center gap-3 bg-tribuna px-4 ${SAFE_BOTTOM}`}>
        <span className="flex-1 text-small text-fumo">
          Recupero {formatSeconds(item.se.restSec)}
        </span>
        <button
          type="button"
          className="btn-text min-h-14"
          onClick={async () => void syncRestPush(await startTimer(item.se.id))}
        >
          Avvia recupero
        </button>
      </div>
    );
  }

  if (state.finished) {
    return (
      <button
        type="button"
        onClick={stop}
        className={`flex min-h-24 w-full animate-enter-fade items-center gap-3 bg-plate-green px-4 text-left text-arena ${SAFE_BOTTOM}`}
      >
        <span className="flex-1 text-body font-semibold">Recupero finito</span>
        <span className="num text-timer">+{formatClock(state.overtimeMs)}</span>
      </button>
    );
  }

  return (
    <div className={`relative bg-tribuna ${SAFE_BOTTOM}`} role="timer">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-pedana transition-transform duration-250 ease-linear"
        style={{ transform: `scaleX(${state.progress})` }}
      />
      <div className="flex min-h-24 items-center gap-1 px-4">
        {/* Label above the time: "10:00" at 72px still fits a 375pt screen with both buttons. */}
        <span className="flex flex-1 flex-col">
          <span className="label-text text-fumo">Recupero</span>
          <span className="num text-timer">
            {formatClock(Math.ceil(state.remainingMs / 1000) * 1000)}
          </span>
        </span>
        {timer.pushFailed && (
          <span role="img" aria-label="Notifica non programmata" className="text-fumo">
            <BellOff size={20} />
          </span>
        )}
        <button
          type="button"
          className="btn-text min-h-14"
          onClick={async () => void syncRestPush(await extendTimer(15_000))}
        >
          +15 s
        </button>
        <button type="button" className="btn-text min-h-14" onClick={stop}>
          Salta
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Segnale a due toni**

In `src/platform/sound.ts` sostituisci la funzione `beep` con:

```ts
/**
 * Two rising tones, like the competition clock calling the lifter. No vibration:
 * navigator.vibrate does not exist on iOS.
 */
export function beep(): void {
  if (context?.state !== 'running') return;
  const t = context.currentTime;
  const tones = [
    { start: 0, frequency: 660, length: 0.16 },
    { start: 0.2, frequency: 990, length: 0.32 },
  ];
  for (const { start, frequency, length } of tones) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t + start);
    gain.gain.exponentialRampToValueAtTime(0.5, t + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + start + length);
    osc.connect(gain).connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + length + 0.02);
  }
}
```

- [ ] **Step 4: Verifica (Review Focus 2)**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: `bun run screens --only=workout,workout-rest-done`. In `workout-375.png` l'orologio mostra "Recupero" sopra "1:1x" a 72 px, con "+15 s" e "Salta" sulla stessa riga e il filo di legno in alto accorciato a circa il 40%. In `workout-rest-done-390.png` la banda è verde con "Recupero finito" e "+0:1x" in nero.

Prova "10:00": nel browser apri `/?demo` con DevTools a 375 px, tocca "Scegli un'altra giornata", scegli D e conferma la prima serie di Military press (recupero 600 s): "10:00" e i due pulsanti stanno su una riga. Per il suono, conferma una serie con "+15 s" e lascia scadere il recupero a schermo acceso: si sentono due toni crescenti.

- [ ] **Step 5: Commit**

```bash
git add src/features/workout/TimerBar.tsx src/platform/sound.ts
git commit -m "feat(workout): competition rest clock with a draining wood line and a two-tone call

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Record in sovraimpressione

**Files:**
- Modify: `src/domain/records.ts`, `src/domain/records.test.ts`, `src/features/workout/ExerciseView.tsx`, `src/features/workout/WorkoutScreen.tsx`
- Create: `src/features/workout/RecordFlash.tsx`

**Interfaces:**
- Consumes: `computeRecords`, `e1rm`, `isWorkSetDone`; `Tab` (Task 3).
- Produces:
  - `setRecord(set: LoggedSet, tracking: TrackingType, before: Records): { kind: RecordKind; value: number } | undefined`; `isRecordSet` diventa `setRecord(...) !== undefined` (stesso comportamento);
  - `RecordFlash({ flash: Flash | null; onDone: () => void })` con `Flash = { id: number; kind: RecordKind; value: number }`;
  - `ExerciseView` riceve la prop facoltativa `onRecord?: (record: { kind: RecordKind; value: number }) => void`.

- [ ] **Step 1: Scrivi il test (fallisce)**

In `src/domain/records.test.ts` aggiungi `setRecord` all'import da `./records` e:

```ts
describe('setRecord (the on-screen record flash)', () => {
  const before = computeRecords([[set(80, 10)]], 'weight_reps');
  it('names the e1RM first, then the load', () => {
    const estimate = setRecord(set(80, 11), 'weight_reps', before);
    expect(estimate?.kind).toBe('e1rm');
    expect(estimate?.value).toBeCloseTo(109.33, 2);
    expect(setRecord(set(82.5, 1), 'weight_reps', before)).toEqual({
      kind: 'maxWeight',
      value: 82.5,
    });
    expect(setRecord(set(80, 10), 'weight_reps', before)).toBeUndefined();
  });
  it('uses reps and duration for the other tracking types, and ignores warmups', () => {
    expect(setRecord(set(0, 13), 'bodyweight_reps', { maxReps: 12 })).toEqual({
      kind: 'maxReps',
      value: 13,
    });
    const hold = { durationSec: 65, isWarmup: false, completedAt: 1 };
    expect(setRecord(hold, 'duration', { maxDuration: 60 })).toEqual({
      kind: 'maxDuration',
      value: 65,
    });
    expect(setRecord(set(100, 10, { isWarmup: true }), 'weight_reps', before)).toBeUndefined();
  });
});
```

Run: `bun run test src/domain/records.test.ts`
Expected: FAIL, `setRecord` non esportata.

- [ ] **Step 2: Implementa `setRecord` e riusala in `isRecordSet`**

In `src/domain/records.ts` sostituisci la funzione `isRecordSet` con:

```ts
/**
 * The record a completed work set beats, against the history before this session: the e1RM
 * first, then the load. No history means no records.
 */
export function setRecord(
  set: LoggedSet,
  tracking: TrackingType,
  before: Records,
): { kind: RecordKind; value: number } | undefined {
  if (!isWorkSetDone(set)) return undefined;
  if (tracking === 'weight_reps') {
    const estimate = e1rm(set.weightKg ?? 0, set.reps ?? 0);
    if (estimate !== undefined && before.e1rm !== undefined && estimate > before.e1rm)
      return { kind: 'e1rm', value: estimate };
    const load = set.weightKg ?? 0;
    return before.maxWeight !== undefined && load > before.maxWeight
      ? { kind: 'maxWeight', value: load }
      : undefined;
  }
  if (tracking === 'bodyweight_reps') {
    const reps = set.reps ?? 0;
    return before.maxReps !== undefined && reps > before.maxReps
      ? { kind: 'maxReps', value: reps }
      : undefined;
  }
  const duration = set.durationSec ?? 0;
  return before.maxDuration !== undefined && duration > before.maxDuration
    ? { kind: 'maxDuration', value: duration }
    : undefined;
}

/** A completed work set beating the history before this session. No history means no records. */
export function isRecordSet(set: LoggedSet, tracking: TrackingType, before: Records): boolean {
  return setRecord(set, tracking, before) !== undefined;
}
```

Run: `bun run test src/domain/records.test.ts`
Expected: PASS, compresi i test esistenti di `isRecordSet`.

- [ ] **Step 3: `RecordFlash`**

`src/features/workout/RecordFlash.tsx`:

```tsx
import { Trophy } from 'lucide-react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Tab } from '../../components/Tab';
import { formatRecord, RECORD_LABELS, type RecordKind } from '../../domain/records';

export interface Flash {
  /** Changes on every record, so two records in a row each wipe in. */
  id: number;
  kind: RecordKind;
  value: number;
}

const SHOW_MS = 2500;

/**
 * Yellow lower third over the set board when a confirmed set is a personal record (spec §8.2).
 * It never takes a tap and is announced politely. onDone must be stable (useCallback).
 */
export function RecordFlash({ flash, onDone }: { flash: Flash | null; onDone: () => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [flash, onDone]);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+64px)] z-20"
    >
      <AnimatePresence>
        {flash && (
          <m.div
            key={flash.id}
            initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-stretch bg-tribuna"
          >
            <Tab tone="record" className="py-2">
              <Trophy size={20} aria-hidden="true" />
            </Tab>
            <p className="flex flex-1 items-center justify-between gap-3 px-3 py-2">
              <span className="leading-tight">
                <span className="block font-semibold">Record</span>
                <span className="block text-small text-fumo">{RECORD_LABELS[flash.kind]}</span>
              </span>
              <span className="num text-score text-plate-yellow">
                {formatRecord(flash.kind, flash.value)}
              </span>
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Collega il rilevamento in `ExerciseView`**

In `src/features/workout/ExerciseView.tsx`:

- l'import da `../../domain/records` diventa `import { computeRecords, isRecordSet, type RecordKind, setRecord } from '../../domain/records';`
- in `interface Props` aggiungi:

```tsx
  /** A confirmed set beat a personal record: the screen shows it over the board. */
  onRecord?: (record: { kind: RecordKind; value: number }) => void;
```

- la firma diventa `export function ExerciseView({ item, settings, onSetCompleted, supersetWith, onMenu, onRecord }: Props) {`
- la funzione `confirm` diventa:

```tsx
  const confirm = async (setId: string) => {
    const set = sets.find((s) => s.id === setId);
    const result = await completeSet(setId);
    void syncRestPush(result.timer);
    setSelectedId(null);
    // Values were saved live while typing, so the set read before completing is the one confirmed.
    const record = set && setRecord({ ...set, completedAt: Date.now() }, tracking, before);
    if (record) onRecord?.(record);
    onSetCompleted(result);
  };
```

- [ ] **Step 5: Mostra il record in `WorkoutScreen`**

Il record si mostra a livello di schermata perché `ExerciseView` si smonta quando l'ultima serie porta all'esercizio dopo. In `src/features/workout/WorkoutScreen.tsx`:

- l'import da `react` diventa `import { useCallback, useState } from 'react';` e aggiungi `import { type Flash, RecordFlash } from './RecordFlash';`
- subito dopo `const [sheet, setSheet] = useState<SheetName | null>(null);` aggiungi:

```tsx
  const [flash, setFlash] = useState<Flash | null>(null);
  const clearFlash = useCallback(() => setFlash(null), []);
```

- su `<ExerciseView …>` aggiungi la prop:

```tsx
              onRecord={(record) => setFlash({ id: Date.now(), ...record })}
```

- subito prima di `<SessionSheet` aggiungi:

```tsx
      <RecordFlash flash={flash} onDone={clearFlash} />
```

- [ ] **Step 6: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Nel browser, `/workout/demo-session?demo=workout`: porta il peso della serie 2 a 95 e conferma. Un sottopancia giallo "Record, Massimale stimato, 11x kg" entra da sinistra sotto l'header, resta circa 2,5 s e sparisce; la riga diventa gialla con il trofeo. I tocchi sugli stepper funzionano anche mentre il record è visibile.

- [ ] **Step 7: Commit**

```bash
git add src/domain/records.ts src/domain/records.test.ts src/features/workout
git commit -m "feat(workout): flash a yellow lower third when a set beats a personal record

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Calcolatore dei dischi

**Files:**
- Modify: `src/features/workout/PlateSheet.tsx`

**Interfaces:**
- Consumes: `platesPerSide` (invariata), `Segmented`, `Sheet`.
- Produces: `PlateSheet` con le stesse props.

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: Ridisegna i dischi**

In `src/features/workout/PlateSheet.tsx` sostituisci `PLATE_STYLE` con:

```tsx
/**
 * SPEC §11.2: the only place where plates wear their real colours. Competition plates from 25 to
 * 10 kg share the 450 mm diameter and differ in thickness; change plates are smaller.
 */
const PLATE_STYLE: Record<number, string> = {
  25: 'h-32 w-[22px] bg-plate-red',
  20: 'h-32 w-[18px] bg-plate-blue',
  15: 'h-32 w-[15px] bg-plate-yellow',
  10: 'h-32 w-[13px] bg-plate-green',
  5: 'h-[72px] w-[11px] bg-plate-white',
  2.5: 'h-[60px] w-[9px] bg-acciaio',
  1.25: 'h-[52px] w-2 bg-acciaio',
};
```

e sostituisci il blocco `<>…</>` del ramo con i dischi (dal `<div className="flex h-32 …">` fino al paragrafo del carico più vicino incluso) con:

```tsx
          <>
            {/* The bar seen from the side: shaft, collar, plates, sleeve. Text says the same. */}
            <div className="flex h-36 items-center" aria-hidden="true">
              <span className="h-2.5 w-8 bg-acciaio/60" />
              <span className="h-7 w-2 rounded-[1px] bg-acciaio" />
              {plates.map(({ key, kg }) => (
                <span key={key} className={`ml-px rounded-[2px] ${PLATE_STYLE[kg]}`} />
              ))}
              <span className="h-3.5 flex-1 bg-acciaio/80" />
            </div>
            <p className="flex items-baseline gap-2">
              {plates.length === 0 ? (
                'Solo il bilanciere, nessun disco.'
              ) : (
                <>
                  <span className="text-small text-fumo">Per lato:</span>
                  <span className="num text-title">
                    {plates.map((p) => formatNumber(p.kg)).join(' + ')}
                  </span>
                </>
              )}
            </p>
            {remainderKg > 0 && (
              <p className="text-small text-fumo">
                Con questi dischi il carico più vicino è {formatNumber(weightKg - remainderKg)} kg (
                {formatNumber(remainderKg)} kg in meno).
              </p>
            )}
          </>
```

- [ ] **Step 3: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Nel browser, `/workout/demo-session?demo=workout`, "Dischi" sulla banda blu (92,5 kg): bilanciere di lato con 25 rosso, 10 verde, 1,25 acciaio per lato (stessa altezza per 25 e 10, spessori diversi) e "Per lato: 25 + 10 + 1,25" sul tabellone. Prova il bilanciere da 15 kg dal segmented.

- [ ] **Step 4: Commit**

```bash
git add src/features/workout/PlateSheet.tsx
git commit -m "feat(workout): draw the plate calculator as a loaded bar seen from the side

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Oggi, la chiamata in pedana

**Files:**
- Modify: `src/domain/program.ts`, `src/domain/program.test.ts`, `src/domain/superset.ts`, `src/domain/superset.test.ts`, `src/features/today/TodayScreen.tsx` (riscritto)
- Create: `src/components/SupersetBracket.tsx`

**Interfaces:**
- Consumes: `Header` (`large`), `Lights`, `Tab`, `Sheet`; `getWorkout`, `resumeIndex`.
- Produces:
  - `planTotals(items: { de: { sets: number } }[]): { exercises: number; sets: number }`;
  - `supersetPosition(keys: (string | undefined)[], index: number): 'first' | 'middle' | 'last' | undefined`;
  - `SupersetBracket({ position })`: parentesi di legno nella colonna sinistra di una riga `relative` (usata anche nel Task 12).

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: Scrivi i test (falliscono)**

In `src/domain/program.test.ts` aggiungi `planTotals` all'import da `./program` e:

```ts
describe('planTotals', () => {
  it('counts the exercises and the planned work sets of a day', () => {
    expect(planTotals([{ de: { sets: 4 } }, { de: { sets: 3 } }])).toEqual({
      exercises: 2,
      sets: 7,
    });
    expect(planTotals([])).toEqual({ exercises: 0, sets: 0 });
  });
});
```

In `src/domain/superset.test.ts` aggiungi `supersetPosition` all'import da `./superset` e:

```ts
describe('supersetPosition (the bracket on Today and in the day editor)', () => {
  const keys = [undefined, 'x', 'x', 'x', undefined, 'y', 'y'];
  it('places each member of a run', () => {
    expect(supersetPosition(keys, 1)).toBe('first');
    expect(supersetPosition(keys, 2)).toBe('middle');
    expect(supersetPosition(keys, 3)).toBe('last');
    expect(supersetPosition(keys, 5)).toBe('first');
    expect(supersetPosition(keys, 6)).toBe('last');
  });
  it('is undefined outside supersets', () => {
    expect(supersetPosition(keys, 0)).toBeUndefined();
    expect(supersetPosition(keys, 4)).toBeUndefined();
  });
});
```

Run: `bun run test src/domain/program.test.ts src/domain/superset.test.ts`
Expected: FAIL, funzioni non esportate.

- [ ] **Step 3: Implementa**

In fondo a `src/domain/program.ts`:

```ts
/** "6 esercizi, 22 serie": the size of a day, under its start list on Today. */
export function planTotals(items: { de: { sets: number } }[]): { exercises: number; sets: number } {
  return { exercises: items.length, sets: items.reduce((n, item) => n + item.de.sets, 0) };
}
```

In fondo a `src/domain/superset.ts`:

```ts
/** Where item `index` sits in its superset, for the bracket; undefined outside supersets. */
export function supersetPosition(
  keys: (string | undefined)[],
  index: number,
): 'first' | 'middle' | 'last' | undefined {
  const run = supersetRun(keys, index);
  if (run.length < 2) return undefined;
  if (index === run[0]) return 'first';
  return index === run[run.length - 1] ? 'last' : 'middle';
}
```

Run: `bun run test src/domain/program.test.ts src/domain/superset.test.ts`
Expected: PASS.

- [ ] **Step 4: `SupersetBracket`**

`src/components/SupersetBracket.tsx`:

```tsx
const SHAPE = {
  first: 'top-3 bottom-0 border-t-[1.5px]',
  middle: 'inset-y-0',
  last: 'top-0 bottom-3 border-b-[1.5px]',
} as const;

/** Wood bracket in the left gutter of a `relative` row, joining the exercises of a superset. */
export function SupersetBracket({
  position,
}: {
  position: 'first' | 'middle' | 'last' | undefined;
}) {
  if (!position) return null;
  return (
    <span
      aria-hidden="true"
      className={`absolute left-1.5 w-1.5 border-l-[1.5px] border-pedana ${SHAPE[position]}`}
    />
  );
}
```

- [ ] **Step 5: Riscrivi `src/features/today/TodayScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Header } from '../../components/Header';
import { Lights } from '../../components/Lights';
import { Sheet } from '../../components/Sheet';
import { SupersetBracket } from '../../components/SupersetBracket';
import { Tab } from '../../components/Tab';
import { useNow } from '../../components/useNow';
import {
  countCompletedSince,
  getActiveSession,
  getTodayPlan,
  getWorkout,
  lastCompletedSession,
  startSession,
  type Workout,
} from '../../db/sessions';
import { getSettings } from '../../db/settings';
import { needsBackupReminder } from '../../domain/backup';
import { startOfWeek } from '../../domain/dates';
import {
  countLabel,
  formatClock,
  formatDate,
  formatSetsReps,
  formatTime,
  relativeDay,
} from '../../domain/format';
import { planTotals } from '../../domain/program';
import { supersetPosition } from '../../domain/superset';
import { resumeIndex } from '../../domain/workout';
import type { Session } from '../../types';
import { exportAndShare } from '../settings/exportBackup';

/** The day's bib wipes in once per launch, not on every return to the tab. */
let bibShown = false;

export function TodayScreen() {
  const navigate = useNavigate();
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null);
  const workout = useLiveQuery(
    async () => (active ? ((await getWorkout(active.id)) ?? null) : null),
    [active?.id],
  );
  const plan = useLiveQuery(getTodayPlan);
  const settings = useLiveQuery(getSettings);
  const weekCount = useLiveQuery(() => countCompletedSince(startOfWeek(Date.now())));
  const lastWorkout = useLiveQuery(async () => (await lastCompletedSession()) ?? null);
  const [choosing, setChoosing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [wipe] = useState(() => !bibShown);
  useEffect(() => {
    bibShown = true;
  }, []);
  const now = useNow(active ? 1000 : null);
  if (
    active === undefined ||
    plan === undefined ||
    !settings ||
    weekCount === undefined ||
    lastWorkout === undefined
  )
    return null;

  const start = async (dayId: string) => {
    setStarting(true);
    // A double tap can race with itself: the loser falls back to the session that won.
    const id = await startSession(dayId).catch(async () => (await getActiveSession())?.id);
    if (id) navigate(`/workout/${id}`);
    else setStarting(false);
  };

  const remindBackup = needsBackupReminder(
    settings.lastBackupAt,
    lastWorkout ? (lastWorkout.endedAt ?? lastWorkout.startedAt) : undefined,
    Date.now(),
  );
  const keys = plan?.items.map((item) => item.de.supersetKey) ?? [];
  const totals = plan ? planTotals(plan.items) : undefined;

  return (
    <>
      <Header
        large
        title="Oggi"
        right={
          <Link
            to="/settings"
            aria-label="Impostazioni"
            className="-mr-2 flex size-11 items-center justify-center text-fumo active:text-luce"
          >
            <SettingsIcon />
          </Link>
        }
      />
      <p className="-mt-1 px-4 text-small text-fumo first-letter:uppercase">
        {formatDate(Date.now())}
      </p>

      {active ? (
        <ActiveSummary session={active} workout={workout ?? null} now={now} />
      ) : !plan ? (
        <p className="px-4 pt-6">Nessun programma attivo. Crea il primo per iniziare ad allenarti.</p>
      ) : !plan.day ? (
        <p className="px-4 pt-6">
          Il programma {plan.program.name} non ha giornate. Aggiungine una per iniziare.
        </p>
      ) : (
        <section className="pt-6">
          {/* The bib: the day's letter on the scoreboard, its name in the plate face. */}
          <div className={`flex items-end gap-4 px-4 ${wipe ? 'animate-wipe' : ''}`}>
            <span aria-hidden="true" className="num text-bib">
              {plan.day.label}
            </span>
            <div className="min-w-0 flex-1 pb-1.5">
              <h2 className="plate text-name">
                <span className="sr-only">Giornata {plan.day.label}: </span>
                {plan.day.name || `Giornata ${plan.day.label}`}
              </h2>
              <p className="text-small text-fumo">{plan.program.name}</p>
            </div>
          </div>
          {plan.items.length === 0 ? (
            <p className="px-4 pt-4 text-fumo">
              Nessun esercizio in questa giornata: potrai aggiungerli durante l'allenamento.
            </p>
          ) : (
            <>
              <ol className="mt-4 border-t border-luce">
                {plan.items.map(({ de, exercise }, i) => (
                  <li key={de.id} className="relative flex min-h-14 items-center gap-3 px-4 rule-b">
                    <SupersetBracket position={supersetPosition(keys, i)} />
                    <span className="num w-6 text-title text-fumo">{i + 1}</span>
                    <span className="min-w-0 flex-1">{exercise.name}</span>
                    <span className="num shrink-0 text-title">
                      {formatSetsReps(de, exercise.trackingType)}
                    </span>
                  </li>
                ))}
              </ol>
              {totals && (
                <p className="flex items-baseline justify-between px-4 py-3 text-small text-fumo">
                  <span>{countLabel(totals.exercises, 'esercizio', 'esercizi')}</span>
                  <span>
                    <span className="num text-title text-luce">{totals.sets}</span> serie
                  </span>
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section className="flex items-center gap-3 px-4 pt-6">
        <h2 className="flex-1 text-small text-fumo">Questa settimana</h2>
        <Lights total={Math.max(settings.weeklyGoal, weekCount)} lit={weekCount} />
        <p className="text-small text-fumo">
          <span className="num text-title text-luce">{weekCount}</span> di{' '}
          <span className="num text-title text-luce">{settings.weeklyGoal}</span>
        </p>
      </section>

      {remindBackup && (
        <section className="mx-4 mt-6 py-3 rule-t rule-b">
          <div className="flex items-start gap-3">
            <Tab className="py-1 label-text">Backup</Tab>
            <p className="flex-1 text-small">
              {settings.lastBackupAt
                ? `Ultimo backup ${relativeDay(settings.lastBackupAt)}.`
                : 'Non hai ancora un backup.'}{' '}
              I dati sono solo su questo iPhone.
            </p>
          </div>
          <button type="button" className="btn-text -ml-2 mt-1" onClick={() => exportAndShare()}>
            Esporta backup
          </button>
        </section>
      )}

      <div className="mt-auto space-y-1 px-4 pt-6 pb-4">
        {active ? (
          <Link to={`/workout/${active.id}`} className="btn-primary">
            Riprendi allenamento
          </Link>
        ) : !plan ? (
          <Link to="/programs" className="btn-primary">
            Vai ai programmi
          </Link>
        ) : !plan.day ? (
          <Link to={`/programs/${plan.program.id}`} className="btn-primary">
            Aggiungi una giornata
          </Link>
        ) : (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={starting}
              onClick={() => plan.day && start(plan.day.id)}
            >
              Inizia allenamento
            </button>
            {plan.days.length > 1 && (
              <button
                type="button"
                className="btn-text w-full justify-center text-fumo"
                onClick={() => setChoosing(true)}
              >
                Scegli un'altra giornata
              </button>
            )}
          </>
        )}
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Scegli la giornata">
        <ul className="border-t border-luce">
          {plan?.days.map((day) => (
            <li key={day.id}>
              <button
                type="button"
                className="row"
                disabled={starting}
                onClick={() => start(day.id)}
              >
                <span className="num w-10 text-score">{day.label}</span>
                <span className="flex-1">{day.name || `Giornata ${day.label}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

/** Today while a workout is open: the day's bib, the elapsed time and where it stands. */
function ActiveSummary({
  session,
  workout,
  now,
}: {
  session: Session;
  workout: Workout | null;
  now: number;
}) {
  const index = workout ? resumeIndex(workout.items) : -1;
  const item = workout?.items[index];
  return (
    <section className="pt-6">
      <div className="flex items-end gap-4 px-4">
        <span aria-hidden="true" className="num text-bib">
          {session.dayLabel}
        </span>
        <div className="min-w-0 flex-1 pb-1.5">
          <h2 className="plate text-name">
            <span className="sr-only">Giornata {session.dayLabel}: </span>
            Allenamento in corso
          </h2>
          <p className="text-small text-fumo">
            {session.dayName || `Giornata ${session.dayLabel}`}, iniziato alle{' '}
            {formatTime(session.startedAt)}
          </p>
        </div>
      </div>
      <dl className="mx-4 mt-4 border-t border-luce">
        <div className="flex min-h-14 items-center justify-between rule-b">
          <dt className="text-small text-fumo">Durata</dt>
          <dd className="num text-score">{formatClock(now - session.startedAt)}</dd>
        </div>
        {item && workout && (
          <div className="flex min-h-14 items-center gap-3 rule-b">
            <dt className="sr-only">Esercizio</dt>
            <dd className="min-w-0 flex-1 truncate">{item.exercise.name}</dd>
            <dd className="shrink-0 text-small text-fumo">
              <span className="num text-title text-luce">{index + 1}</span> di{' '}
              <span className="num text-title text-luce">{workout.items.length}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
```

- [ ] **Step 6: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: `bun run screens --only=today,today-active`. In `today-390.png`: titolo "Oggi" grande, data, la "A" da 96 px con "Petto e tricipiti" e "Forza 4 giorni" allineati alla base, la lista di partenza numerata con "4 × 6–8" a destra, la parentesi di legno che unisce Croci ai cavi e Pushdown ai cavi, la riga "6 esercizi … 19 serie", "Questa settimana" con 2 luci verdi su 3 e "2 di 3", il promemoria del backup con la linguetta, "Inizia allenamento" in basso. In `today-active-390.png`: "Allenamento in corso", la durata sul tabellone, "Panca piana con bilanciere" e "1 di 6", "Riprendi allenamento". Niente etichetta sopra i titoli.

- [ ] **Step 7: Commit**

```bash
git add src/domain/program.ts src/domain/program.test.ts src/domain/superset.ts src/domain/superset.test.ts src/components/SupersetBracket.tsx src/features/today/TodayScreen.tsx
git commit -m "feat(today): the day's bib, a numbered start list and the week as judges' lights

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Allenamento terminato, il tabellone dei risultati

**Files:**
- Create: `src/components/CountUp.tsx`
- Modify: `src/features/workout/SummaryScreen.tsx` (riscritto)

**Interfaces:**
- Consumes: `animate`, `useReducedMotion` di `motion/react`; `Header`, `Tab`.
- Produces: `CountUp({ value: number; format: (n: number) => string })`, decorativo (`aria-hidden`).

- [ ] **Step 1: Leggi il craft floor, il contratto e `reference/delight.md` di impeccable**

- [ ] **Step 2: `CountUp`**

`src/components/CountUp.tsx`:

```tsx
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Counts from zero up to value once, on mount (the results scoreboard). Tabular figures keep
 * the width steady. Decorative: the container carries the final value for assistive technology.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [value, reduced]);
  return <span aria-hidden="true">{format(shown)}</span>;
}
```

- [ ] **Step 3: Riscrivi `src/features/workout/SummaryScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { CountUp } from '../../components/CountUp';
import { Header } from '../../components/Header';
import { Tab } from '../../components/Tab';
import { getSummaryContext } from '../../db/history';
import { getWorkout } from '../../db/sessions';
import { setSessionNotes } from '../../db/workout';
import { formatChange, formatClock, formatNumber, formatSet } from '../../domain/format';
import { beatenRecords, formatRecord, RECORD_LABELS } from '../../domain/records';
import { bestSet, summarize } from '../../domain/stats';

const whole = (n: number) => formatNumber(Math.round(n));
/** The records wipe in after the totals have counted up. */
const RECORDS_DELAY_MS = 600;

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
  const change =
    context.previous && formatChange(totals.volume, totalsOf(context.previous.items).volume);
  const beaten = items.flatMap(({ se, exercise, sets }) =>
    beatenRecords(sets, exercise.trackingType, context.recordsBefore.get(exercise.id) ?? {}).map(
      (r) => ({
        ...r,
        key: `${se.id}-${r.kind}`,
        name: exercise.name,
      }),
    ),
  );
  const duration = (session.endedAt ?? session.startedAt) - session.startedAt;

  return (
    <div className="flex min-h-dvh animate-enter-fade flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header large title="Allenamento terminato" />
      <p className="-mt-1 px-4 text-small text-fumo">
        Giornata {session.dayLabel}
        {session.dayName && `, ${session.dayName}`}
      </p>

      {/* The results scoreboard: duration and sets side by side, the volume on its own row. */}
      <dl className="mx-4 mt-6 grid grid-cols-2 border-t border-luce">
        <Stat label="Durata" value={duration} format={formatClock} />
        <Stat
          label="Serie"
          value={totals.sets}
          format={whole}
          className="border-l-[0.5px] border-filetto pl-4"
        />
        <div className="col-span-2 py-3 rule-t">
          <dt className="label-text text-fumo">Volume</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="sr-only">{whole(totals.volume)} kg</span>
            <span className="num text-value">
              <CountUp value={totals.volume} format={whole} />
            </span>
            <span aria-hidden="true" className="label-text text-fumo">
              kg
            </span>
          </dd>
          {change && (
            <dd className="mt-1 text-small text-fumo">
              Volume <span className="num text-luce">{change}</span> rispetto all'ultima giornata{' '}
              {session.dayLabel}
            </dd>
          )}
        </div>
      </dl>

      {beaten.length > 0 && (
        <section>
          <h2 className="section-title">
            <span>Record battuti</span>
            <span className="num text-small text-luce">{beaten.length}</span>
          </h2>
          <ul className="border-t border-luce">
            {beaten.map(({ key, name, kind, value }, i) => (
              <li
                key={key}
                className="flex min-h-16 animate-wipe items-stretch rule-b"
                style={{ animationDelay: `${RECORDS_DELAY_MS + i * 120}ms` }}
              >
                <Tab tone="record">
                  <Trophy size={18} aria-hidden="true" />
                </Tab>
                <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
                  <span className="truncate">{name}</span>
                  <span className="text-small text-fumo">{RECORD_LABELS[kind]}</span>
                </span>
                <span className="num flex shrink-0 items-center pr-4 text-score text-plate-yellow">
                  {formatRecord(kind, value)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="section-title">
        <span>Esercizi</span>
        <span className="num text-small text-luce">{items.length}</span>
      </h2>
      <ul className="border-t border-luce">
        {items.map(({ se, exercise, sets }) => {
          const tracking = exercise.trackingType;
          const best = bestSet(sets, tracking);
          const previousItem = context.previous?.items.find((i) => i.exercise.id === exercise.id);
          const previousBest = previousItem && bestSet(previousItem.sets, tracking);
          return (
            <li key={se.id} className="row">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{exercise.name}</span>
                {best && previousBest && (
                  <span className="block text-small text-fumo">
                    l'ultima volta <span className="num">{formatSet(previousBest, tracking)}</span>
                  </span>
                )}
              </span>
              {best ? (
                <span className="num shrink-0 text-title">{formatSet(best, tracking)}</span>
              ) : (
                <span className="text-small text-fumo">Nessuna serie</span>
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

function Stat({
  label,
  value,
  format,
  className = '',
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  return (
    <div className={`py-3 ${className}`}>
      <dt className="label-text text-fumo">{label}</dt>
      <dd className="num text-score">
        <span className="sr-only">{format(value)}</span>
        <CountUp value={value} format={format} />
      </dd>
    </div>
  );
}
```

- [ ] **Step 4: Verifica (Review Focus 1 e 2)**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: `bun run screens --only=summary` e `bun run screens --only=summary --reduced`. In `summary-390.png` e `summary-375.png`: "Allenamento terminato", Durata e Serie affiancate, Volume a 44 px su una riga sua, i record con la linguetta gialla e il trofeo, i valori in giallo, la lista degli esercizi. A 375 px "12.xxx kg" non va a capo. In `summary-390-reduced.png` i record sono visibili (nessuna attesa). Nel browser i totali contano fino al valore e poi i record entrano uno dopo l'altro.

- [ ] **Step 5: Commit**

```bash
git add src/components/CountUp.tsx src/features/workout/SummaryScreen.tsx
git commit -m "feat(summary): a results scoreboard that counts up, then wipes in the records

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Programmi, editor del programma e della giornata

**Files:**
- Modify: `src/features/programs/ProgramsScreen.tsx`, `src/features/programs/ProgramEditor.tsx`, `src/features/programs/DayEditor.tsx`

**Interfaces:**
- Consumes: `Header` (`large`), `Tab`, `SupersetBracket`, `supersetPosition`, `m` di `motion/react` (animazioni di layout del riordino).
- Produces: nessuna interfaccia nuova. `DayExerciseSheet` non cambia: usa già classi e primitive ridisegnate.

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: `ProgramsScreen`**

In `src/features/programs/ProgramsScreen.tsx`:

- aggiungi `ChevronDown` all'import da `lucide-react` e `import { Tab } from '../../components/Tab';`
- `<Header title={…} />` diventa `<Header large title={tab === 'programs' ? 'Programmi' : 'Esercizi'} />`
- in `ProgramList`, il paragrafo vuoto usa `text-fumo` invece di `text-steel`; `<ul>` diventa `<ul className="rule-t">`
- sostituisci i due blocchi `<details>` (in `ProgramList` e in `ExerciseLibrary`) con la stessa forma; in `ProgramList`:

```tsx
      {archived.length > 0 && (
        <details className="group">
          <summary className="section-title min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span>Archiviati</span>
            <span className="flex items-center gap-1">
              <span className="num text-small text-luce">{archived.length}</span>
              <ChevronDown size={16} aria-hidden="true" className="transition-transform duration-180 group-open:rotate-180" />
            </span>
          </summary>
          <ul className="rule-t">
            {archived.map((row) => (
              <ProgramLink key={row.program.id} row={row} active={false} />
            ))}
          </ul>
        </details>
      )}
```

e in `ExerciseLibrary`:

```tsx
      {archived.length > 0 && (
        <details className="group">
          <summary className="section-title min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span>Archiviati</span>
            <span className="flex items-center gap-1">
              <span className="num text-small text-luce">{archived.length}</span>
              <ChevronDown size={16} aria-hidden="true" className="transition-transform duration-180 group-open:rotate-180" />
            </span>
          </summary>
          <ul className="rule-t">
            {archived.map((e) => (
              <li key={e.id}>
                <Link to={`/exercises/${e.id}`} className="row">
                  <span className="flex-1">{e.name}</span>
                  <ChevronRight size={20} className="text-fumo" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
```

- `ProgramLink` diventa:

```tsx
function ProgramLink({ row, active }: { row: ProgramRow; active: boolean }) {
  return (
    <li>
      <Link to={`/programs/${row.program.id}`} className="row">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{row.program.name || 'Senza nome'}</span>
          <span className="block text-small text-fumo">
            {countLabel(row.dayCount, 'giornata', 'giornate')}
          </span>
        </span>
        {active && <Tab className="py-1 label-text">Attivo</Tab>}
        <ChevronRight size={20} className="shrink-0 text-fumo" />
      </Link>
    </li>
  );
}
```

- [ ] **Step 3: `ProgramEditor`**

In `src/features/programs/ProgramEditor.tsx`:

- aggiungi `import { m } from 'motion/react';` e `import { Tab } from '../../components/Tab';`
- il campo del nome diventa grande, nel carattere della targa:

```tsx
        <label className="block">
          <span className="label">Nome</span>
          <input
            className="field plate text-name"
            defaultValue={program.name}
            onChange={(e) => void updateProgram(program.id, { name: e.target.value })}
          />
        </label>
```

- `{active && <p className="text-small font-semibold">Programma attivo</p>}` diventa `{active && <Tab className="py-1 label-text">Programma attivo</Tab>}`
- `<h2 className="section-title">Giornate</h2>` diventa:

```tsx
      <h2 className="section-title">
        <span>Giornate</span>
        <span className="num text-small text-luce">{days.length}</span>
      </h2>
```

- il paragrafo vuoto usa `text-fumo`; la lista delle giornate diventa (le righe scivolano al nuovo posto quando si riordina):

```tsx
      <ul className="border-t border-luce">
        {days.map((day, i) => (
          <m.li
            layout
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            key={day.id}
            className="flex items-center bg-(--surface) rule-b"
          >
            <Link
              to={`/programs/${program.id}/days/${day.id}`}
              className="flex min-h-16 flex-1 items-center gap-4 py-2 pl-4 active:bg-fondale"
            >
              <span className="num w-10 text-score">{day.label}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{day.name || `Giornata ${day.label}`}</span>
                <span className="block text-small text-fumo">
                  {countLabel(counts[day.id] ?? 0, 'esercizio', 'esercizi')}
                </span>
              </span>
            </Link>
            <MoveButtons
              first={i === 0}
              last={i === days.length - 1}
              label={`giornata ${day.label}`}
              onMove={(dir) => moveDay(day.id, dir)}
            />
          </m.li>
        ))}
      </ul>
```

- il paragrafo "È il programma attivo…" usa `text-fumo`.

- [ ] **Step 4: `DayEditor`**

In `src/features/programs/DayEditor.tsx`:

- aggiungi `import { m } from 'motion/react';` e `import { SupersetBracket } from '../../components/SupersetBracket';`; l'import da `../../domain/superset` diventa `import { supersetPosition, supersetRun } from '../../domain/superset';`
- `<h2 className="section-title">Esercizi</h2>` diventa:

```tsx
      <h2 className="section-title">
        <span>Esercizi</span>
        <span className="num text-small text-luce">{items.length}</span>
      </h2>
```

- il paragrafo vuoto usa `text-fumo`; la lista diventa:

```tsx
      <ul className="border-t border-luce">
        {items.map(({ de, exercise }, i) => {
          const position = supersetPosition(keys, i);
          return (
            <m.li
              layout
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              key={de.id}
              className="relative flex items-center bg-(--surface) rule-b"
            >
              <SupersetBracket position={position} />
              <button
                type="button"
                className="flex min-h-16 flex-1 flex-col justify-center py-2 pl-4 text-left active:bg-fondale"
                onClick={() => setEditingId(de.id)}
              >
                <span>{exercise.name}</span>
                <span className="text-small text-fumo">
                  <span className="num text-body text-luce">
                    {formatShortTarget(de, exercise.trackingType)}
                  </span>
                  {position && ', in superserie'}
                </span>
              </button>
              <MoveButtons
                first={i === 0}
                last={i === items.length - 1}
                label={exercise.name}
                onMove={(dir) => moveDayExercise(de.id, dir)}
              />
            </m.li>
          );
        })}
      </ul>
```

`supersetRun` resta importata: serve ancora a `linkedToNext`.

- [ ] **Step 5: Verifica**

Run: `bun run format && bun run check`
Expected: PASS. Poi `grep -nE "steel|chalk|rubber|iron" src/features/programs` non trova niente.

Con `bun run dev`: `bun run screens --only=programs,program,day`. In `programs-390.png` "Forza 4 giorni" ha la linguetta "Attivo". In `program-390.png` il nome del programma è grande in corsivo condensato e le giornate hanno la lettera a 32 px. In `day-390.png` Croci ai cavi e Pushdown ai cavi sono uniti dalla parentesi di legno. Nel browser, in un editor di giornata, "sposta giù" fa scivolare la riga al nuovo posto.

- [ ] **Step 6: Commit**

```bash
git add src/features/programs
git commit -m "feat(programs): restyle programs and editors, animate reordering, bracket supersets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Libreria esercizi e dettaglio esercizio

**Files:**
- Modify: `src/features/library/ExerciseList.tsx`, `src/features/library/ExerciseDetail.tsx`, `src/features/library/ExerciseForm.tsx`

**Interfaces:**
- Consumes: variabili CSS `--surface` e `--sticky-top` (Task 2); `Header`.
- Produces: nessuna interfaccia nuova. `ExercisePicker` non cambia. I grafici del dettaglio sono nel Task 15.

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: `ExerciseList`**

In `src/features/library/ExerciseList.tsx` aggiungi `import { Search } from 'lucide-react';` e sostituisci il `return` con:

```tsx
  return (
    <div>
      <div className="space-y-3 px-4 pb-2">
        <label className="relative block">
          <span className="sr-only">Cerca esercizio</span>
          <Search
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fumo"
          />
          <input
            type="search"
            className="field pl-10"
            placeholder="Cerca esercizio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            className="chip"
            aria-pressed={group === 'all'}
            onClick={() => setGroup('all')}
          >
            Tutti
          </button>
          {GROUPS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={group === key}
              onClick={() => setGroup(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 && (
        <p className="px-4 py-6 text-fumo">
          Nessun esercizio trovato. Crealo con "Nuovo esercizio".
        </p>
      )}
      {GROUPS.map(([key, label]) => {
        const items = visible.filter((e) => e.muscleGroup === key);
        if (items.length === 0) return null;
        return (
          <section key={key}>
            {/* Sticky under the status bar in a page, at the top inside a sheet (--sticky-top). */}
            <h3 className="sticky top-(--sticky-top) z-[1] flex items-baseline justify-between bg-(--surface) px-4 pt-5 pb-2">
              <span className="plate text-title">{label}</span>
              <span className="num text-small text-fumo">{items.length}</span>
            </h3>
            <ul className="border-t border-luce">
              {items.map((e) => (
                <li key={e.id}>
                  <button type="button" className="row" onClick={() => onSelect(e)}>
                    <span className="min-w-0 flex-1">{e.name}</span>
                    <span className="shrink-0 text-small text-fumo">{EQUIPMENT[e.equipment]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
```

- [ ] **Step 3: `ExerciseDetail` ed `ExerciseForm`**

In `src/features/library/ExerciseDetail.tsx`:

- `<dl className="border-t border-steel/25">` diventa `<dl className="rule-t">`
- `<h2 className="section-title">Ultime sessioni</h2>` resta; i paragrafi vuoti usano `text-fumo`
- la riga delle ultime sessioni diventa:

```tsx
            <li key={h.sessionId} className="row">
              <span className="w-28 shrink-0 text-small text-fumo first-letter:uppercase">
                {relativeDay(h.startedAt)}
              </span>
              <span className="num flex-1 text-right text-title">
                {formatSets(h.sets, trackingType)}
              </span>
            </li>
```

- in `Info`, `<dt className="flex-1 text-steel">` diventa `<dt className="flex-1 text-fumo">`.

In `src/features/library/ExerciseForm.tsx` sostituisci `text-steel` con `text-fumo` (la nota sotto "Tipo di registrazione"). I `<select>` prendono da soli la freccia e il fondo di `.field` (Task 2).

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS. `grep -nE "steel|chalk|rubber|iron" src/features/library/ExerciseList.tsx src/features/library/ExerciseDetail.tsx src/features/library/ExerciseForm.tsx` non trova niente.

Con `bun run dev`: `bun run screens --only=library,exercise`. In `library-390.png` la ricerca ha la lente, i chip "Tutti" è invertito (luce con testo scuro), i gruppi hanno il titolo in corsivo condensato e il conteggio. Nel browser, scorrendo la libreria i titoli dei gruppi restano fissi sotto la barra di stato; nel selettore "Aggiungi esercizio" (foglio) restano fissi in cima al foglio, con il fondo `tribuna`.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/ExerciseList.tsx src/features/library/ExerciseDetail.tsx src/features/library/ExerciseForm.tsx
git commit -m "feat(library): searchable list with sticky group heads, restyled exercise detail

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Storico e dettaglio della sessione

**Files:**
- Modify: `src/domain/format.ts`, `src/domain/format.test.ts`, `src/features/history/HistoryScreen.tsx` (riscritto), `src/features/history/SessionDetail.tsx`

**Interfaces:**
- Consumes: `SetRow`, `SetEditor` (Task 6); `Header`; variabili `--surface`, `--sticky-top`.
- Produces: `formatDayParts(ts: number): { day: string; weekday: string }` (es. `{ day: '3', weekday: 'sab' }`).

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: Scrivi il test (fallisce)**

In `src/domain/format.test.ts` aggiungi `formatDayParts` all'import da `./format` e:

```ts
describe('formatDayParts (history date block)', () => {
  it('splits a date into the day of the month and the short weekday', () => {
    expect(formatDayParts(new Date(2026, 9, 3, 18, 30).getTime())).toEqual({
      day: '3',
      weekday: 'sab',
    });
  });
});
```

Run: `bun run test src/domain/format.test.ts`
Expected: FAIL, `formatDayParts` non esportata.

- [ ] **Step 3: Implementa**

In `src/domain/format.ts`, dopo `formatMonth`:

```ts
const weekdayShort = new Intl.DateTimeFormat('it-IT', { weekday: 'short' });

/** { day: "3", weekday: "sab" }: the date block at the start of a history row. */
export const formatDayParts = (ts: number): { day: string; weekday: string } => ({
  day: String(new Date(ts).getDate()),
  weekday: weekdayShort.format(ts),
});
```

Run: `bun run test src/domain/format.test.ts`
Expected: PASS.

- [ ] **Step 4: Riscrivi `src/features/history/HistoryScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { listHistory } from '../../db/history';
import {
  countLabel,
  formatClock,
  formatDayParts,
  formatMonth,
  formatNumber,
} from '../../domain/format';

export function HistoryScreen() {
  const rows = useLiveQuery(listHistory);
  if (!rows) return null;
  const months = Map.groupBy(rows, (row) => formatMonth(row.session.startedAt));

  return (
    <>
      <Header large title="Storico" />
      {rows.length === 0 && (
        <p className="px-4 py-6 text-fumo">
          Nessun allenamento registrato. Inizia il primo dalla schermata Oggi.
        </p>
      )}
      {[...months].map(([month, list]) => (
        <section key={month}>
          <h2 className="sticky top-(--sticky-top) z-[1] flex items-baseline justify-between bg-(--surface) px-4 pt-5 pb-2">
            <span className="plate text-title first-letter:uppercase">{month}</span>
            <span className="text-small text-fumo">
              {countLabel(list.length, 'allenamento', 'allenamenti')}
            </span>
          </h2>
          <ul className="border-t border-luce">
            {list.map(({ session, durationMs, sets, volume }) => {
              const { day, weekday } = formatDayParts(session.startedAt);
              return (
                <li key={session.id}>
                  <Link to={`/history/${session.id}`} className="row">
                    <span className="flex w-10 shrink-0 flex-col items-center">
                      <span className="num text-score">{day}</span>
                      <span className="label-text text-fumo">{weekday}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">Giornata {session.dayLabel}</span>
                      {session.dayName && (
                        <span className="block truncate text-small text-fumo">
                          {session.dayName}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-title">{formatClock(durationMs)}</span>
                      <span className="block text-small text-fumo tabular-nums">
                        {countLabel(sets, 'serie', 'serie')}
                        {volume > 0 && `, ${formatNumber(volume)} kg`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 5: `SessionDetail`**

In `src/features/history/SessionDetail.tsx`:

- sostituisci i due paragrafi sotto `<Header …>` (data e durata) con:

```tsx
      <p className="-mt-1 px-4 text-small text-fumo first-letter:uppercase">
        {formatDateYear(session.startedAt)}, alle {formatTime(session.startedAt)}
      </p>
      <dl className="mx-4 mt-4 grid grid-cols-3 border-t border-luce">
        <SmallStat
          label="Durata"
          value={formatClock((session.endedAt ?? session.startedAt) - session.startedAt)}
        />
        <SmallStat
          label="Serie"
          value={formatNumber(totals.sets)}
          className="border-l-[0.5px] border-filetto pl-3"
        />
        <SmallStat
          label="Volume"
          value={formatNumber(totals.volume)}
          unit="kg"
          className="border-l-[0.5px] border-filetto pl-3"
        />
      </dl>
```

- il titolo di ogni esercizio diventa `<h2 className="plate px-4 pt-6 pb-2 text-title">{exercise.name}</h2>`; "Nessuna serie" usa `text-fumo`; `<ul className="border-t border-steel/25">` diventa `<ul className="border-t border-luce">`
- togli `countLabel` dall'import da `../../domain/format` (non serve più) e aggiungi in fondo al file:

```tsx
function SmallStat({
  label,
  value,
  unit,
  className = '',
}: {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={`py-2 ${className}`}>
      <dt className="label-text text-fumo">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className="num text-title">{value}</span>
        {unit && <span className="label-text text-fumo">{unit}</span>}
      </dd>
    </div>
  );
}
```

- [ ] **Step 6: Verifica (Review Focus 2)**

Run: `bun run format && bun run check`
Expected: PASS. `grep -nE "steel|chalk|rubber|iron" src/features/history` non trova niente.

Con `bun run dev`: `bun run screens --only=history,session`. In `history-390.png` i mesi hanno il titolo in corsivo condensato e il numero di allenamenti a destra; ogni riga ha il giorno sul tabellone con il giorno della settimana sotto. A 375 px la sessione da "1:02:15" non va a capo. In `session-390.png` i tre totali stanno su una riga e le serie usano il tabellone dell'allenamento (luci verdi, record in giallo nel caso di `demo-done`).

- [ ] **Step 7: Commit**

```bash
git add src/domain/format.ts src/domain/format.test.ts src/features/history
git commit -m "feat(history): month heads, date blocks and the set board in session detail

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Progressi e grafici

**Files:**
- Modify: `src/components/chartTheme.tsx` (riscritto), `src/domain/groups.ts`, `src/domain/groups.test.ts`, `src/features/progress/ProgressScreen.tsx`, `src/features/progress/GroupsView.tsx`, `src/features/progress/ConsistencyView.tsx`, `src/features/progress/BodyweightScreen.tsx`, `src/features/progress/BodyweightChart.tsx`, `src/features/library/ExerciseCharts.tsx`

**Interfaces:**
- Consumes: `Tab` (Task 3).
- Produces: `CHART = { luce, fumo, pedana, yellow, surface, grid, hover, band }` (le chiavi `chalk` e `steel` spariscono); `AXIS`; `TooltipBox({ value, label })`; `inGroupBand(sets: number): boolean`.

- [ ] **Step 1: Leggi il craft floor, il contratto e carica la skill `dataviz`**

I grafici seguono anche le regole di Fase 3: una serie per grafico, etichette dirette sulle barre orizzontali, tabella dei dati per gli andamenti, niente animazioni, mai due assi.

- [ ] **Step 2: Scrivi il test (fallisce)**

In `src/domain/groups.test.ts` aggiungi `inGroupBand` all'import da `./groups` e:

```ts
describe('inGroupBand', () => {
  it('includes both ends of the indicative 10–20 band', () => {
    expect(inGroupBand(10)).toBe(true);
    expect(inGroupBand(20)).toBe(true);
    expect(inGroupBand(9.5)).toBe(false);
    expect(inGroupBand(20.5)).toBe(false);
  });
});
```

Run: `bun run test src/domain/groups.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementa `inGroupBand`**

In `src/domain/groups.ts`, dopo `GROUP_BAND`:

```ts
/** Whether a weekly count sits inside the indicative band: those bars are drawn bright. */
export const inGroupBand = (sets: number): boolean =>
  sets >= GROUP_BAND.min && sets <= GROUP_BAND.max;
```

Run: `bun run test src/domain/groups.test.ts`
Expected: PASS.

- [ ] **Step 4: Riscrivi `src/components/chartTheme.tsx`**

```tsx
import { Tab } from './Tab';

// Recharts takes colour strings, not classes: these mirror the @theme tokens in src/styles/index.css.
export const CHART = {
  luce: '#F2F1EC',
  fumo: '#8F949B',
  pedana: '#B8875A', // reference bands and goal lines
  yellow: '#F6D43A', // records only
  surface: '#0B0C0E',
  grid: 'rgba(242, 241, 236, 0.14)',
  hover: 'rgba(242, 241, 236, 0.08)',
  band: 'rgba(184, 135, 90, 0.18)',
} as const;

/** Recessive axes: no lines, fumo 13px ticks with tabular figures. */
export const AXIS = {
  tick: {
    fill: CHART.fumo,
    fontSize: 13,
    fontFamily: 'Archivo, system-ui, sans-serif',
    style: { fontVariantNumeric: 'tabular-nums' },
  },
  tickLine: false,
  axisLine: false,
} as const;

/** A small lower third: the label on the wood tab, the value on the scoreboard. */
export function TooltipBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-tribuna">
      <Tab className="py-0.5 label-text">{label}</Tab>
      <p className="num px-3 py-1.5 text-title">{value}</p>
    </div>
  );
}
```

- [ ] **Step 5: Sostituzioni nei file di Progressi**

In `ExerciseCharts.tsx`, `GroupsView.tsx`, `ConsistencyView.tsx`, `BodyweightChart.tsx`, `BodyweightScreen.tsx`, `ProgressScreen.tsx` applica queste sostituzioni, nell'ordine:

| Da | A |
|---|---|
| `CHART.chalk` | `CHART.luce` |
| `CHART.steel` | `CHART.fumo` |
| `border-b border-steel/25` | `rule-b` |
| `border-t border-steel/25` | `border-t border-luce` |
| `text-tiny text-steel` | `label-text text-fumo` |
| `text-steel` | `text-fumo` |
| `bg-chalk text-rubber` | `bg-luce text-arena` |
| `ring-1 ring-chalk` | `ring-[1.5px] ring-pedana` |
| `radius={[4, 4, 0, 0]}` | `radius={[2, 2, 0, 0]}` |
| `radius={[0, 4, 4, 0]}` | `radius={[0, 2, 2, 0]}` |

Poi queste modifiche puntuali.

`ProgressScreen.tsx`: `<Header title="Progressi" />` diventa `<Header large title="Progressi" />`.

`GroupsView.tsx`:

- l'import da `../../domain/groups` diventa `import { GROUP_BAND, inGroupBand, weeklySetsByGroup } from '../../domain/groups';`
- nelle due `<ReferenceArea …>` `fill={CHART.hover}` diventa `fill={CHART.band}`
- il testo sotto "Serie di questa settimana" diventa:

```tsx
        <p className="px-4 pb-2 text-small text-fumo">
          La fascia da {GROUP_BAND.min} a {GROUP_BAND.max} serie è un riferimento indicativo: le
          barre chiare ci stanno dentro. I gruppi secondari contano mezza serie.
        </p>
```

- la `<Bar>` del primo grafico diventa:

```tsx
              <Bar dataKey="sets" maxBarSize={24} radius={[0, 2, 2, 0]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.key} fill={inGroupBand(r.sets) ? CHART.luce : CHART.fumo} />
                ))}
                <LabelList
                  dataKey="sets"
                  position="right"
                  fill={CHART.luce}
                  fontSize={13}
                  formatter={(value) => formatNumber(Number(value))}
                />
              </Bar>
```

`ConsistencyView.tsx`:

- il titolo del mese `<h2 className="font-semibold first-letter:uppercase">` diventa `<h2 className="plate text-title first-letter:uppercase">`
- l'intestazione dei giorni della settimana `className="grid grid-cols-7 text-center text-tiny text-steel"` (già diventata `label-text text-fumo` con le sostituzioni) resta così
- la `<ReferenceLine …>` diventa:

```tsx
              <ReferenceLine
                y={goal}
                stroke={CHART.pedana}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: `Obiettivo ${goal}`,
                  position: 'insideBottomRight', // above the line: the current week's bar ends at it
                  fill: CHART.pedana,
                  fontSize: 13,
                }}
              />
```

`ExerciseCharts.tsx`:

- aggiungi `Cell` all'import da `recharts`
- il valore in testa al grafico del massimale diventa giallo se l'ultimo punto è un record:

```tsx
            {last && (
              <p className={`num text-title ${last.record ? 'text-plate-yellow' : ''}`}>
                {metric.format(last.value)}
              </p>
            )}
```

- la `<Bar dataKey="volume" …>` diventa (l'ultima sessione chiara, le altre fumo):

```tsx
                    <Bar dataKey="volume" maxBarSize={24} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      {points.map((p, i) => (
                        <Cell
                          key={p.sessionId}
                          fill={i === points.length - 1 ? CHART.luce : CHART.fumo}
                        />
                      ))}
                    </Bar>
```

- nella tabella dei record il valore diventa giallo: `<td className="num text-right text-title">` diventa `<td className="num text-right text-title text-plate-yellow">`.

- [ ] **Step 6: Verifica**

Run: `bun run format && bun run check`
Expected: PASS. `grep -nE "chalk|steel|rubber|iron" src/features/progress src/features/library/ExerciseCharts.tsx src/components/chartTheme.tsx` non trova niente.

Con `bun run dev`: `bun run screens --only=progress,progress-groups,progress-consistency,bodyweight,exercise`. Nei gruppi la fascia 10–20 è color legno tenue e le barre dentro la fascia sono chiare; nella costanza i giorni allenati sono cerchi chiari, oggi ha l'anello di legno, la linea dell'obiettivo è tratteggiata in legno; nel dettaglio di Panca piana l'ultimo massimale è giallo (record nella demo) e l'ultima barra del volume è chiara. Tocca un punto nel browser: il tooltip è un piccolo sottopancia.

- [ ] **Step 7: Commit**

```bash
git add src/components/chartTheme.tsx src/domain/groups.ts src/domain/groups.test.ts src/features/progress src/features/library/ExerciseCharts.tsx
git commit -m "feat(progress): charts in the arena palette with wood reference bands and lower-third tooltips

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Impostazioni

**Files:**
- Modify: `src/features/settings/SettingsScreen.tsx`, `src/features/settings/BackupSection.tsx`, `src/features/settings/NotificationsSection.tsx`

**Interfaces:**
- Consumes: classi globali del Task 2.
- Produces: nessuna interfaccia nuova.

- [ ] **Step 1: Leggi il craft floor e il contratto**

- [ ] **Step 2: Sostituzioni e ritocchi**

In tutti e tre i file sostituisci `text-steel` con `text-fumo`. Poi in `SettingsScreen.tsx`:

- `<div className="border-b border-steel/25 px-4 py-3">` (il blocco del recupero predefinito) diventa `<div className="px-4 py-3 rule-b">`
- il campo dell'incremento di peso diventa:

```tsx
          <input
            className="field num w-24 text-right text-title"
            inputMode="decimal"
            defaultValue={formatNumber(settings.weightSteps[key])}
            onBlur={(e) => {
              const step = parseWeight(e.target.value);
              if (step !== undefined && step > 0) {
                void setSetting('weightSteps', { ...settings.weightSteps, [key]: step });
              } else {
                e.target.value = formatNumber(settings.weightSteps[key]);
              }
            }}
          />
          <span className="label-text text-fumo">kg</span>
```

- lo spazio usato diventa `<span className="num text-title">` invece di `<span className="tabular-nums">`
- la versione diventa:

```tsx
      <p className="px-4 pb-8">
        Palestra <span className="num text-title">{__APP_VERSION__}</span>
      </p>
```

- [ ] **Step 3: Verifica**

Run: `bun run format && bun run check`
Expected: PASS. `grep -nE "steel|chalk|rubber|iron" src/features/settings` non trova niente.

Con `bun run dev`: `bun run screens --only=settings`. Gli interruttori accesi sono blu con il pomello chiaro, gli incrementi e lo spazio usato sono sul tabellone, i titoli di sezione sono etichette `fumo`.

- [ ] **Step 4: Commit**

```bash
git add src/features/settings
git commit -m "feat(settings): restyle settings in the Pedana di gara world

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Icone dell'app

**Files:**
- Modify: `scripts/gen-icons.ts` (riscritto), `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png` (rigenerati)

**Interfaces:**
- Consumes: niente.
- Produces: le quattro icone nel nuovo mondo (disco blu da 20 kg in piedi sulla pedana, fondo arena).

- [ ] **Step 1: Riscrivi `scripts/gen-icons.ts`**

```ts
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];
// Pedana di gara palette (src/styles/index.css).
const ARENA: Rgb = [0x0b, 0x0c, 0x0e];
const BLUE: Rgb = [0x24, 0x53, 0xd6];
const LUCE: Rgb = [0xf2, 0xf1, 0xec];
const PEDANA: Rgb = [0xb8, 0x87, 0x5a];

/**
 * The 20 kg plate standing on the wood platform. x and y go from -1 to 1 across the icon;
 * scale < 1 shrinks the artwork into the safe zone of maskable and Apple icons.
 */
function pixel(x: number, y: number, scale: number): Rgb {
  const px = x / scale;
  const py = y / scale;
  const r = Math.hypot(px, py) / 0.62; // 1 = edge of the plate
  if (r <= 1) {
    if (r > 0.8 && r <= 0.84) return ARENA; // groove near the rim
    if (r > 0.3) return BLUE;
    if (r > 0.17) return LUCE; // the hub
    return ARENA;
  }
  if (py > 0.62 && py <= 0.8) return PEDANA; // the platform under the plate
  return ARENA;
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

function png(size: number, scale: number): Buffer {
  const SS = 4; // 4×4 supersampling for smooth edges
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((col + (sx + 0.5) / SS) / size) * 2 - 1;
          const y = ((row + (sy + 0.5) / SS) / size) * 2 - 1;
          const c = pixel(x, y, scale);
          for (let i = 0; i < 3; i++) sum[i] = (sum[i] as number) + c[i];
        }
      }
      for (let i = 0; i < 3; i++)
        raw[row * stride + 1 + col * 3 + i] = Math.round((sum[i] as number) / (SS * SS));
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

writeFileSync('public/icon-192.png', png(192, 1));
writeFileSync('public/icon-512.png', png(512, 1));
// Maskable icons are cropped to a circle of 80% diameter: keep the artwork inside it.
writeFileSync('public/icon-maskable-512.png', png(512, 0.8));
writeFileSync('public/apple-touch-icon.png', png(180, 0.92));
```

- [ ] **Step 2: Rigenera e guarda**

Run: `bun scripts/gen-icons.ts`
Expected: le quattro PNG cambiano. Aprile: fondo quasi nero, disco blu con mozzo chiaro e scanalatura scura, banda di legno sotto il disco; nella maskable tutto il disco sta nel cerchio centrale. A 60 px (rimpicciolisci l'anteprima) il disco resta leggibile.

- [ ] **Step 3: Verifica e commit**

Run: `bun run format && bun run check`
Expected: PASS.

```bash
git add scripts/gen-icons.ts public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png
git commit -m "feat(pwa): new app icon, the 20 kg plate standing on the platform

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

L'icona già installata sulla Home dell'iPhone non cambia da sola: iOS la aggiorna solo reinstallando, e togliere l'icona cancella i dati. Lo si dice all'utente nel Task 19.

---

### Task 18: Pulizia, casi limite, adattamento e audit

**Files:**
- Modify: `src/styles/index.css` (via gli alias) e i file che le verifiche indicano

**Interfaces:**
- Consumes: tutto quanto sopra.
- Produces: un'interfaccia senza i vecchi token, verificata a 375, 390 e 430 px e con reduced motion; `.impeccable/review/detect.json` per la revisione finale.

- [ ] **Step 1: Leggi `reference/harden.md`, `reference/adapt.md` e `reference/audit.md` di impeccable, oltre al craft floor**

- [ ] **Step 2: Togli gli alias dei vecchi colori**

In `src/styles/index.css`, dentro `@theme`, cancella il commento "Old names mapped…" e le righe `--color-rubber`, `--color-iron`, `--color-chalk`, `--color-steel`.

Run: `grep -rnE "\b(rubber|iron|chalk|steel)\b" src`
Expected: nessun risultato. Se ne trovi, sostituisci con il token del nuovo mondo (`arena`, `tribuna`, `luce`, `fumo`) secondo il ruolo.

- [ ] **Step 3: Casi limite e larghezze (Review Focus 1 e 2)**

Aggiungi temporaneamente `[430, 932]` all'elenco `viewports` di `scripts/screens.ts`, poi, con `bun run dev`:

Run: `bun run screens` e `bun run screens --reduced`

Controlla tutte le immagini contro questo elenco (spec §9) e correggi in un solo giro:

- nomi lunghi: "Estensioni sopra la testa con manubrio" va su due righe nella targa e tronca con l'ellissi oltre (screenshot del giorno A e, nel browser, dell'esercizio in allenamento);
- numeri: "92,5", volumi a cinque cifre, "1:02:15", "10:00" non vanno a capo a 375 px;
- tipi di registrazione: Dip alle parallele mostra "× 12" o "12 rip", Plank mostra i secondi;
- reduced motion: nelle immagini `-reduced` i record del riepilogo e la lettera di Oggi sono visibili;
- 430 px: nessuna colonna si allarga in modo strano;
- nessun testo sotto i 13 px, nessun target sotto i 44 pt (56 in allenamento);
- stati vuoti: nel browser, in una finestra anonima su `http://localhost:5173/` (database vuoto, senza `?demo`), Oggi, Programmi, Storico e Progressi mostrano gli inviti all'azione in `fumo`.

Togli `[430, 932]` da `scripts/screens.ts` quando hai finito.

- [ ] **Step 4: Budget e audit**

Run: `bun run build`
Confronta la riga del chunk principale (`dist/assets/index-*.js`, colonna gzip) con `.impeccable/review/bundle-before.txt`.
Expected: crescita di 45 KB gzip al massimo; `motionFeatures-*.js` è un chunk separato. `wc -c public/fonts/*.woff2` dà meno di 250 KB in tutto. `grep -o "archivo-[a-z]*\.woff2" dist/sw.js | sort -u` dà due righe.

Audit da browser desktop su `/?demo` e `/workout/demo-session?demo=workout`: con Tab sulla tastiera il focus è sempre visibile (anello chiaro); la selezione del testo è color legno; i campi hanno il cursore chiaro; i `<select>` e il campo data del peso corporeo sono scuri.

- [ ] **Step 5: Detector di impeccable**

Con `bun run dev` attivo:

```bash
.claude/skills/impeccable/scripts/impeccable detect --json src > .impeccable/review/detect.json
.claude/skills/impeccable/scripts/impeccable detect --json --viewport 390x844 "http://localhost:5173/?demo" "http://localhost:5173/workout/demo-session?demo=workout" "http://localhost:5173/workout/demo-done/summary?demo" >> .impeccable/review/detect.json
```

Correggi i rilievi meccanici (contrasto, dimensioni, proprietà animate fuori da transform, opacity e clip-path). Quelli che contraddicono una scelta della spec (per esempio la tabella dei token o il taglio a 12°) restano nel file per il revisore del Task 19. Non rilanciare il detector una seconda volta.

- [ ] **Step 6: Format, check, commit**

Run: `bun run format && bun run check`
Expected: PASS.

```bash
git add -A src scripts
git commit -m "refactor(ui): drop the old colour names and harden edge cases, widths and reduced motion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Revisione finale, documentazione e prova sul telefono

**Eseguito dalla sessione principale (il controller SDD), non da un subagente:** deve lanciare i subagenti di impeccable e parlare con l'utente.

**Files:**
- Create: `DESIGN.md`, `.impeccable/design.json` (dal documentatore)
- Modify: `docs/SPEC.md` (§10, §11, §12)

**Interfaces:**
- Consumes: tutto il redesign, `.impeccable/review/*`, il surface brief.
- Produces: verdetto del revisore, `DESIGN.md` con i token, SPEC aggiornata, anteprima sul telefono.

- [ ] **Step 1: Catture finali e riferimento della direzione**

Con `bun run dev`: `bun run screens` e `bun run screens --reduced`. Poi:

```bash
cp .impeccable/review/today-390.png .impeccable/review/mobile.png
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=1200,2400 --screenshot="$(pwd)/.impeccable/mocks/decision/pedana-di-gara.png" "file:///$(pwd)/.impeccable/mocks/decision/palestra-direzioni.html"
```

Apri ogni immagine una volta e controlla che mostri quello che dice il nome (niente nero, niente schermata sbagliata, niente caricamento a metà). Ricattura quelle sbagliate.

- [ ] **Step 2: Revisione di `impeccable-finish-reviewer`**

Lancia un subagente nuovo `impeccable-finish-reviewer`, senza storia della conversazione, con questo pacchetto:

- richiesta originale: "Voglio migliorare la UX/UI utilizzando la skill impeccable. Voglio renderla più bella, accattivante e dargli un aspetto premium.";
- risposte confermate: spec §2;
- artefatto: `src/` (schermate in `src/features/`, primitive in `src/components/`, token in `src/styles/index.css`);
- screenshot: tutti i `.impeccable/review/*-390.png`, `*-375.png`, `*-390-reduced.png`, più `.impeccable/review/mobile.png`, tutti obbligatori; il "prima" in `.impeccable/review/before/`. Il prodotto è solo per telefono, in verticale: non esiste una cattura desktop;
- contratto di direzione: output di `impeccable surface-brief read src/App.tsx`;
- rilievi del detector: `.impeccable/review/detect.json`;
- QUALITY BAR: nessuna (la direzione è la scelta di impeccable, non una carta del catalogo); riferimento critico della direzione (build code-led, nessun mock approvato): `.impeccable/mocks/decision/pedana-di-gara.png`, card "Pedana di gara";
- craft floor: `.claude/skills/impeccable/reference/craft-floor.md`;
- spec del redesign: `docs/superpowers/specs/2026-10-03-redesign-pedana-di-gara.md`.

Aspetta la risposta con un solo timeout lungo e controlla che contenga le cinque sezioni del contratto. Agisci sulla parola della disposizione:

- **recapture:** ricattura le immagini indicate e rifai la revisione completa;
- **rebuild:** rifai le regioni indicate e rimanda a una revisione completa;
- **fix:** applica tutte le correzioni in un solo blocco, `bun run format && bun run check`, ricattura le stesse immagini e rimandale allo stesso revisore per il verdetto su ogni correzione;
- **ship:** prosegui.

Il budget è di due giri. Se dopo il secondo restano punti aperti, mostra la tabella all'utente e lascia a lui la scelta tra spedire e finanziare un altro giro.

- [ ] **Step 3: Provenienza delle immagini**

Run: `.claude/skills/impeccable/scripts/impeccable embed-prompt --scan public`
Per ogni PNG segnalata, scrivi in un file `provenance.txt` la riga "Generated procedurally by scripts/gen-icons.ts (no image model): the 20 kg plate standing on the wood platform, Pedana di gara palette." e lancia `.claude/skills/impeccable/scripts/impeccable embed-prompt <file> --prompt-file provenance.txt`. Rilancia `--scan`: nessuna segnalazione.

- [ ] **Step 4: Documentazione con `impeccable-documenter`**

Lancia un subagente `impeccable-documenter` con: radice del progetto, artefatto `src/`, contratto di direzione (output di `surface-brief read`), `PRODUCT.md`, `.claude/skills/impeccable/reference/document.md`, confini di scrittura `DESIGN.md` e `.impeccable/design.json` (nient'altro).
Expected: `DESIGN.md` con i token reali (colori, tipografia, scala, raggi, movimento) e `.impeccable/design.json` esistono. Se manca uno dei due, rilancia una volta.

- [ ] **Step 5: Aggiorna `docs/SPEC.md`**

In §10 cambia `background_color` e `theme_color`: `#0B0C0E`, e il `theme-color` di `index.html` nell'esempio.

Sostituisci §11 tranne §11.4, che resta parola per parola, con:

```markdown
## 11. Design

Il design "Pedana di gara" è descritto per intero in `DESIGN.md` (token e componenti) e in `docs/superpowers/specs/2026-10-03-redesign-pedana-di-gara.md` (direzione e decisioni). Qui restano le regole che il codice deve rispettare.

### 11.1 Principi

- **Il numero è l'interfaccia.** In allenamento peso, ripetizioni e recupero sono gli elementi più grandi dello schermo.
- **Pedana di gara.** L'app prende la grafica di una gara di pesistica: sottopancia con linguetta di legno e targa chiara, tabellone delle serie con le luci dei giudici, orologio del recupero a tutta larghezza. Navigazione e controlli restano quelli di iOS; nei testi non c'è gergo di gara.
- **Zona del pollice.** Le azioni principali stanno nella metà inferiore, le informazioni in alto.
- **Movimento che dice cosa è successo:** tendina per le grafiche che entrano, luci in sequenza alla conferma, banda della serie corrente che scivola, cifre che scorrono, totali che contano. Tutto rispetta `prefers-reduced-motion`. Niente ombre, gradienti o bagliori.
- Testi allineati a sinistra; numeri con cifre tabellari. Target touch di almeno 44 pt, 56 pt in modalità allenamento.
- Solo tema scuro: un'arena con la luce sulla pedana.

### 11.2 Colori

| Token | Hex | Uso |
|---|---|---|
| `arena` | `#0B0C0E` | fondo |
| `tribuna` | `#17191D` | fogli, editor della serie, orologio del recupero |
| `fondale` | `#23262B` | riempimento dei controlli, stato premuto |
| `luce` | `#F2F1EC` | testo e numeri; selezione invertita |
| `fumo` | `#8F949B` | testo secondario |
| `filetto` | `luce` al 14% | separatori di un pixel |
| `pedana` | `#B8875A` | linguette, filo del cronometro, tab attiva, riferimenti nei grafici |
| `plate-blue` | `#2453D6` | azione primaria, serie corrente, allenamento in corso |
| `plate-yellow` | `#F6D43A` | record personali |
| `plate-green` | `#2BA55B` | serie completate, recupero finito |
| `plate-red` | `#D93A2F` | azioni distruttive (solo icona o riempimento) |

- Ogni colore dei dischi ha un solo significato e non decora mai; il colore non è mai l'unica informazione.
- Il calcolatore dei dischi usa i colori reali: 25 rosso, 20 blu, 15 giallo, 10 verde, 5 bianco, 2,5 e 1,25 acciaio (`#9AA0A6`).

### 11.3 Tipografia

- Una sola famiglia, **Archivo** (OFL), self-hosted in due woff2 variabili (tondo e corsivo, peso 100–900, larghezza 62–125%) inclusi nel precache.
- Ruoli: testo in tondo a larghezza normale; numeri sul "tabellone" (corsivo, larghezza 62%, peso 800, cifre tabellari); nomi e titoli nella "targa" (corsivo, larghezza 75%, peso 800); etichette a 13 px, larghezza 87,5%, peso 600.
- Scala: lettera della giornata 96 px; timer 72; valori degli stepper 44; titoli grandi 34; tabellone delle serie 32; nome dell'esercizio 26; titoli 22; testo 17; secondario 15; minimo 13.
```

E sostituisci §11.5 con:

````markdown
### 11.5 Wireframe della modalità allenamento

```
┌───────────────────────────────────────┐
│ ✕     Giornata A   24:13      3 di 6 ⌄│
├───────────────────────────────────────┤
│ ▐2/4▌ Panca piana con bilanciere      │  linguetta di legno + targa chiara
│ 4 serie da 8–12, recupero 2 min       │
│ Sedile al 4                           │
│ 4 giorni fa: 80×10 / 80×9 / 80×8      │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│  filetto pieno in luce
│  R      60 kg  × 10                ●  │  riscaldamento, una luce grigia
│  1    82,5 kg  × 10            ● ● ●  │  completata, luci verdi
│█ Serie 2 ████████████ Dischi  cestino │  banda blu della serie corrente
│  [−]      82,5      kg          [+]   │  stepper da 56 pt, valori a 44 px
│  [−]         9      rip         [+]   │
│  [         Conferma serie         ]   │
│  3    82,5 kg  × 8             ○ ○ ○  │  prevista
│  ‹ Precedente            Successivo › │
├━━━━━━━━━━━━━━━━━━━━━━─────────────────┤  filo di legno che si accorcia
│  Recupero                             │
│  1:42                  +15 s   Salta  │  orologio, cifre da 72 px
└───────────────────────────────────────┘
```
````

In §12 aggiungi, prima di "## 13":

```markdown
### Redesign "Pedana di gara"

- [x] Token, carattere Archivo, base e primitive
- [x] Modalità allenamento: sottopancia, tabellone delle serie, orologio del recupero, record in sovraimpressione
- [x] Oggi, riepilogo, programmi, libreria, storico, progressi, impostazioni
- [x] Icone, dati dimostrativi e screenshot di revisione
- [x] Revisione finale impeccable e `DESIGN.md`
- [ ] Criteri sul telefono: allenamento completo in modalità aereo, ripresa dopo chiusura forzata, notifica del recupero a schermo bloccato, reduced motion
```

Run: `bun run format && bun run check`

```bash
git add DESIGN.md .impeccable docs/SPEC.md public
git commit -m "docs: record the Pedana di gara design system and update the spec

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Anteprima sul telefono**

Run: `bun run deploy:preview` (origine separata dalla produzione: dati separati).
Chiedi all'utente di aprire `https://gym-log-preview.fs-personal.workers.dev` sull'iPhone, aggiungerla alla Home (vedrà la nuova icona) e provare:

1. un allenamento completo in modalità aereo, con il carattere giusto anche offline;
2. chiusura forzata a metà e ripresa dalla stessa serie;
3. recupero con notifica a schermo bloccato, "+15 s" e "Salta";
4. conferma di una serie: luci in sequenza, banda che scivola, linguetta che avanza; un record in sovraimpressione;
5. tastiera aperta sullo stepper: "Conferma serie" raggiungibile;
6. fogli: trascinamento per chiudere, scorrimento delle liste interne, menu → "Sostituisci";
7. Impostazioni iOS, Accessibilità, Movimento, "Riduci movimento" attivo: niente si muove e niente resta nascosto.

Ricordagli che l'icona dell'app di produzione già sulla Home non cambia da sola: per vederla serve esportare un backup, togliere l'icona, reinstallare e importare il backup.

- [ ] **Step 7: Chiusura**

Con l'ok dell'utente spunta l'ultima voce di §12 in SPEC, fai commit e usa superpowers:finishing-a-development-branch. Il deploy in produzione (`bun run deploy`) si fa solo dopo l'ok esplicito dell'utente sull'anteprima.
