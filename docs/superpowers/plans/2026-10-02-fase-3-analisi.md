# Fase 3 — Analisi e rifiniture: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- serie settimanali per gruppo muscolare, con i gruppi secondari che contano mezza serie;
- costanza (calendario e obiettivo settimanale);
- suggerimento di doppia progressione;
- superserie con timer solo a fine giro;
- peso corporeo;
- calcolatore dei dischi.

**Architecture:** non cambia lo schema. `Exercise.secondaryGroups`, `DayExercise.supersetKey`, `SessionExercise.supersetKey` e la tabella `bodyweights` esistono già dalla versione 1 di Dexie, e il seed della Fase 1 ha già i gruppi secondari di §13. Quindi niente nuova `db.version` e niente migrazione del backup.
- Le regole nuove (conteggio per gruppo, calendario, progressione, superserie, dischi) sono funzioni pure in `src/domain/`, con test.
- I due nuovi segmenti di Progressi e il grafico del peso corporeo sono componenti caricati in lazy, perché usano Recharts.

**Tech Stack:** come la Fase 2. Nessuna dipendenza nuova.

**Spec:** `docs/SPEC.md` §5.5, §8.2, §8.6, §8.7, §11.2 (colori del calcolatore), §12 "Fase 3". Prerequisito: Fase 2 completata (`2026-10-02-fase-2-notifiche-storico.md`).

## Global Constraints

Valgono tutte quelle delle Fasi 1 e 2, più queste.

- **Serie per gruppo (SPEC §8.2).** Ogni serie valida conta 1 per il gruppo principale e 0,5 per ogni gruppo secondario. La fascia di riferimento di 10–20 serie è etichettata come indicativa.
- **Progressione (SPEC §8.6).** Si suggerisce un incremento solo se nell'ultima sessione tutte le serie di lavoro previste hanno raggiunto `repMax`. Il suggerimento non si applica mai da solo: serve un tocco.
- **Superserie.** Esercizi consecutivi con lo stesso `supersetKey` si alternano. Il timer parte solo a fine giro (SPEC §7.1).
- **Calcolatore dei dischi (SPEC §11.2).** È l'unico posto in cui i colori dei dischi sono quelli reali: 25 rosso, 20 blu, 15 giallo, 10 verde, 5 bianco (`chalk`), 2,5 e 1,25 acciaio (`steel`). Ogni disco ha anche il numero scritto, quindi il colore non è mai l'unica informazione. Il bilanciere è da 20 kg di default.
- **Grafici.** Come nella Fase 2: una serie per grafico o enfasi (`chalk` per l'elemento corrente o l'obiettivo raggiunto, `steel` per il contesto). Etichette dirette sulle barre orizzontali, tabella dei dati per gli andamenti, niente animazioni, mai due assi.

## Deviazioni dalla spec, decise in questo piano

1. **Gruppi secondari degli allenamenti passati.** Le serie per gruppo usano i gruppi secondari attuali dell'esercizio, non uno snapshot: `SessionExercise` non li salva. Correggere i gruppi di un esercizio ricalcola quindi anche le settimane passate, ed è il comportamento più utile per una statistica indicativa.
2. **Andamento di 12 settimane.** Un gruppo alla volta, scelto con i chip, invece di sette serie nello stesso grafico: oltre quattro serie ci vorrebbero piccoli multipli (skill dataviz).
3. **Peso corporeo.** Si apre da una riga in cima al segmento Esercizi di Progressi (`/progress/bodyweight`), perché la spec non indica dove. Una sola misurazione al giorno: salvarne un'altra con la stessa data la sostituisce.
4. **Superserie nella giornata.** Si impostano dal foglio dell'esercizio con l'interruttore "In superserie con il successivo", non con pulsanti tra le righe. Una superserie è una sequenza di esercizi *consecutivi* con la stessa chiave: due esercizi con la stessa chiave ma separati non formano un gruppo.
5. **Conferma a metà giro.** In una superserie, la conferma di una serie a metà giro azzera il timer precedente invece di avviarne uno nuovo. Vale la regola "una nuova conferma sostituisce il timer".

## Review Focus

1. **Superserie sbilanciata** (A con 4 serie, B con 3): nell'ultimo giro resta solo A, quindi ogni sua serie chiude il giro e fa partire il timer. Finito tutto, si passa all'esercizio dopo il gruppo. Test nel Task 5 ("uneven superset").
2. **Chiave ripetuta ma non contigua** dopo un riordino della giornata: due esercizi separati non diventano una superserie. Test nel Task 5 ("non-contiguous keys").
3. **Peso corporeo e fusi orari:** la data `YYYY-MM-DD` resta quella scelta. `new Date('2026-10-25')` sarebbe mezzanotte UTC e, a ovest di Greenwich, mostrerebbe il giorno prima. Test nel Task 6 ("dateKeyToTs").
4. **Carico non realizzabile o inferiore al bilanciere** (61 kg, 15 kg su un bilanciere da 20): il calcolatore lo dice in modo esplicito e non si rompe. Test nel Task 7.
5. **Progressione con dati incompleti:** l'ultima volta meno serie del previsto, una serie sotto `repMax`, nessuno storico o peso zero. Nessun suggerimento. Test nel Task 4.

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/domain/groups.ts` | serie per gruppo, settimane per gruppo, fascia 10–20 |
| `src/domain/dates.ts` | `lastWeekStarts`, `monthCells`, `weeklyCounts`, `dateKeyToTs` |
| `src/domain/workout.ts` | `suggestWeight` |
| `src/domain/superset.ts` | gruppi contigui, giro della superserie, collegamento nella giornata |
| `src/domain/plates.ts` | dischi per lato |
| `src/db/history.ts` | `listGroupEntries`, `listCompletedSessions` |
| `src/db/bodyweights.ts` | misurazioni del peso corporeo |
| `src/db/workout.ts` | `applyWeight`; `completeSet` gestisce le superserie |
| `src/db/programs.ts` | `toggleDayExerciseLink` |
| `src/features/progress/*` | segmenti Gruppi muscolari e Costanza, peso corporeo |
| `src/features/workout/PlateSheet.tsx` | calcolatore dei dischi |

---

### Task 1: Gruppi secondari e serie per gruppo (dominio e dati)

**Files:**
- Create: `src/domain/groups.ts`
- Modify: `src/domain/dates.ts`, `src/db/exercises.ts`, `src/db/history.ts`, `src/features/library/ExerciseForm.tsx`
- Test: `src/domain/groups.test.ts`, `src/domain/dates.test.ts`, `src/db/history.test.ts`

**Interfaces:**
- Consumes: `startOfWeek` (Fase 1, Task 3); `MUSCLE_GROUPS`.
- Produces:
  - date: `lastWeekStarts(now, count): number[]` (dalla più vecchia);
  - gruppi: `GroupEntry { startedAt; muscleGroup; secondaryGroups }`, `GROUP_BAND = { min: 10, max: 20 }`, `setsByGroup(entries): Record<MuscleGroup, number>`, `weeklySetsByGroup(entries, now, weeks?)`;
  - DB: `listGroupEntries(since): Promise<GroupEntry[]>`;
  - `NewExercise` accetta `secondaryGroups?`.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/dates.test.ts` importa `lastWeekStarts` e aggiungi:

```ts
describe('lastWeekStarts', () => {
  it('lists Monday midnights, oldest first, across the end of daylight saving time', () => {
    expect(lastWeekStarts(new Date(2026, 9, 28, 12).getTime(), 2)).toEqual([
      new Date(2026, 9, 19).getTime(),
      new Date(2026, 9, 26).getTime(),
    ]);
  });
});
```

`src/domain/groups.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { startOfWeek } from './dates';
import { setsByGroup, weeklySetsByGroup } from './groups';

const bench = { muscleGroup: 'chest', secondaryGroups: ['triceps', 'shoulders'] } as const;
const squat = { muscleGroup: 'legs', secondaryGroups: [] } as const;

describe('setsByGroup (SPEC §8.2)', () => {
  it('counts 1 for the main group and 0.5 for each secondary group', () => {
    const totals = setsByGroup([bench, bench, bench, squat, squat].map((e) => ({ ...e, secondaryGroups: [...e.secondaryGroups] })));
    expect(totals).toEqual({ chest: 3, triceps: 1.5, shoulders: 1.5, legs: 2, back: 0, biceps: 0, abs: 0 });
  });
});

describe('weeklySetsByGroup', () => {
  it('returns the last 12 weeks, oldest first, and ignores older sets', () => {
    const now = new Date(2026, 9, 2, 18).getTime();
    const lastWeek = now - 7 * 86_400_000;
    const longAgo = now - 13 * 7 * 86_400_000;
    const entry = (startedAt: number) => ({ startedAt, muscleGroup: 'back' as const, secondaryGroups: [] });
    const weeks = weeklySetsByGroup([entry(now), entry(now), entry(lastWeek), entry(longAgo)], now);
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)?.weekStart).toBe(startOfWeek(now));
    expect(weeks.at(-1)?.totals.back).toBe(2);
    expect(weeks.at(-2)?.totals.back).toBe(1);
    expect(weeks.reduce((sum, w) => sum + w.totals.back, 0)).toBe(3);
  });
});
```

In `src/db/history.test.ts` importa `listGroupEntries` e aggiungi:

```ts
describe('listGroupEntries', () => {
  it('returns one entry per completed work set with the exercise groups', async () => {
    const since = Date.now() - 1000;
    await train(await benchDay(), 80, 10);
    const entries = await listGroupEntries(since);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ muscleGroup: 'chest', secondaryGroups: [] });
  });
});
```

Run: `bun run test src/domain src/db/history.test.ts`
Expected: FAIL, con `lastWeekStarts`, `./groups` e `listGroupEntries` mancanti.

- [ ] **Step 2: Implementa**

In `src/domain/dates.ts`:

```ts
/** Monday 00:00 of the last `count` weeks, oldest first, the current week last. */
export function lastWeekStarts(now: number, count: number): number[] {
  const current = startOfWeek(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * (count - 1 - i)); // calendar days: DST-safe
    return d.getTime();
  });
}
```

`src/domain/groups.ts`:

```ts
import { MUSCLE_GROUPS, type MuscleGroup } from '../types';
import { lastWeekStarts, startOfWeek } from './dates';

export interface GroupEntry {
  startedAt: number;
  muscleGroup: MuscleGroup;
  secondaryGroups: MuscleGroup[];
}

/** Indicative weekly range shown on the charts (SPEC §8.2). */
export const GROUP_BAND = { min: 10, max: 20 };

/** SPEC §8.2: 1 for the main group, 0.5 for each secondary group. */
export function setsByGroup(entries: Pick<GroupEntry, 'muscleGroup' | 'secondaryGroups'>[]): Record<MuscleGroup, number> {
  const totals = Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((g) => [g, 0])) as Record<MuscleGroup, number>;
  for (const entry of entries) {
    totals[entry.muscleGroup] += 1;
    for (const group of entry.secondaryGroups) totals[group] += 0.5;
  }
  return totals;
}

export function weeklySetsByGroup(
  entries: GroupEntry[],
  now: number,
  weeks = 12,
): { weekStart: number; totals: Record<MuscleGroup, number> }[] {
  const byWeek = Map.groupBy(entries, (e) => startOfWeek(e.startedAt));
  return lastWeekStarts(now, weeks).map((weekStart) => ({
    weekStart,
    totals: setsByGroup(byWeek.get(weekStart) ?? []),
  }));
}
```

In `src/db/history.ts`:

```ts
import type { GroupEntry } from '../domain/groups';
```

```ts
/** One entry per completed work set since `since`, with the exercise's current groups. */
export async function listGroupEntries(since: number): Promise<GroupEntry[]> {
  const sessions = await db.sessions
    .where('startedAt')
    .aboveOrEqual(since)
    .filter((s) => s.status === 'completed')
    .toArray();
  const startedAt = new Map(sessions.map((s) => [s.id, s.startedAt]));
  const sets = await db.setLogs
    .where('sessionId')
    .anyOf([...startedAt.keys()])
    .filter((s) => s.completedAt !== undefined && !s.isWarmup)
    .toArray();
  const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
  return sets.flatMap((s) => {
    const exercise = exercises.get(s.exerciseId);
    if (!exercise) return [];
    return [
      {
        startedAt: startedAt.get(s.sessionId) ?? 0,
        muscleGroup: exercise.muscleGroup,
        secondaryGroups: exercise.secondaryGroups,
      },
    ];
  });
}
```

In `src/db/exercises.ts`:

```ts
import type { Exercise, MuscleGroup, SetLog } from '../types';
```

```ts
export type NewExercise = Pick<Exercise, 'name' | 'muscleGroup' | 'equipment' | 'trackingType' | 'notes'> & {
  secondaryGroups?: MuscleGroup[];
};
```

e in `createExercise` sostituisci `secondaryGroups: []` con:

```ts
    secondaryGroups: input.secondaryGroups ?? [],
```

Run: `bun run test src/domain src/db`
Expected: PASS.

- [ ] **Step 3: Gruppi secondari nel form dell'esercizio**

In `src/features/library/ExerciseForm.tsx`:
- nello stato iniziale di `Form` aggiungi `secondaryGroups: exercise.secondaryGroups` (in modifica) e `secondaryGroups: []` (nuovo esercizio);
- nel `<select>` del gruppo muscolare, togli dai secondari il nuovo gruppo principale:

```tsx
          onChange={(e) => {
            const muscleGroup = e.target.value as MuscleGroup;
            setDraft({
              ...draft,
              muscleGroup,
              secondaryGroups: (draft.secondaryGroups ?? []).filter((g) => g !== muscleGroup),
            });
          }}
```

- dopo il campo "Gruppo muscolare" aggiungi:

```tsx
      <fieldset>
        <legend className="label">Gruppi secondari, contano mezza serie</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(MUSCLE_GROUPS) as [MuscleGroup, string][])
            .filter(([key]) => key !== draft.muscleGroup)
            .map(([key, label]) => {
              const secondary = draft.secondaryGroups ?? [];
              const on = secondary.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      secondaryGroups: on ? secondary.filter((g) => g !== key) : [...secondary, key],
                    })
                  }
                >
                  {label}
                </button>
              );
            })}
        </div>
      </fieldset>
```

- in `save`, `updateExercise(exercise.id, { ...draft, name })` salva già `secondaryGroups`.

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`: "Panca piana con bilanciere" → Modifica mostra "Tricipiti" e "Spalle" già attivi (dal seed). Imposta il gruppo principale "Tricipiti": il chip "Tricipiti" sparisce dai secondari e la selezione si aggiorna.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(groups): count weekly sets per muscle group with half secondary sets"
```

---

### Task 2: Progressi — segmento "Gruppi muscolari"

**Files:**
- Create: `src/features/progress/GroupsView.tsx`
- Modify: `src/features/progress/ProgressScreen.tsx`

**Interfaces:**
- Consumes: `listGroupEntries` (Task 1); `weeklySetsByGroup`, `GROUP_BAND`, `lastWeekStarts`; `CHART`, `AXIS`, `TooltipBox` (Fase 2, Task 6); `Segmented`; `formatNumber`, `formatShortDate`.
- Produces:
  - `ProgressScreen` con il controllo segmentato (`?tab=groups`), a cui il Task 3 aggiunge `consistency`;
  - `GroupsView` (default export, lazy).

Forme (skill dataviz):
- **Questa settimana:** barre orizzontali, perché sono categorie nominali con nomi lunghi. Un solo colore per tutte le barre, perché i gruppi sono identità e non valori. Il valore sta in chiaro sulla punta di ogni barra e la fascia 10–20 è una zona chiara dietro.
- **Ultime 12 settimane:** colonne per il gruppo scelto con i chip, la settimana corrente in `chalk` e le altre in `steel` (enfasi), la stessa fascia, il tooltip e la tabella dei dati.

- [ ] **Step 1: Segmenti nella schermata Progressi**

`src/features/progress/ProgressScreen.tsx` (sostituisce la versione della Fase 2; l'elenco degli esercizi diventa `ExerciseProgress`):

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Header } from '../../components/Header';
import { Segmented } from '../../components/Segmented';
import { listTrainedExercises } from '../../db/history';
import { relativeDay } from '../../domain/format';
import { formatRecord, headlineRecord, RECORD_LABELS } from '../../domain/records';

const GroupsView = lazy(() => import('./GroupsView'));

type Tab = 'exercises' | 'groups';

const TABS: [Tab, string][] = [
  ['exercises', 'Esercizi'],
  ['groups', 'Gruppi muscolari'],
];

export function ProgressScreen() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find(([key]) => key === params.get('tab'))?.[0] ?? 'exercises';
  return (
    <>
      <Header title="Progressi" />
      <div className="px-4 pb-2">
        <Segmented<Tab>
          options={TABS}
          value={tab}
          onChange={(next) => setParams(next === 'exercises' ? {} : { tab: next }, { replace: true })}
        />
      </div>
      <Suspense fallback={null}>
        {tab === 'exercises' && <ExerciseProgress />}
        {tab === 'groups' && <GroupsView />}
      </Suspense>
    </>
  );
}

function ExerciseProgress() {
  const rows = useLiveQuery(listTrainedExercises);
  if (!rows) return null;
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-steel">Nessun progresso da mostrare. Completa un allenamento e torna qui.</p>;
  }
  return (
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
  );
}
```

In `src/components/Segmented.tsx` aggiungi `leading-tight` alla classe dei pulsanti: "Gruppi muscolari" può andare su due righe a 375pt.

- [ ] **Step 2: Vista dei gruppi**

`src/features/progress/GroupsView.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { listGroupEntries } from '../../db/history';
import { lastWeekStarts } from '../../domain/dates';
import { formatNumber, formatShortDate } from '../../domain/format';
import { GROUP_BAND, weeklySetsByGroup } from '../../domain/groups';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../types';

const GROUPS = Object.entries(MUSCLE_GROUPS) as [MuscleGroup, string][];

export default function GroupsView() {
  const now = Date.now();
  const since = lastWeekStarts(now, 12)[0] ?? 0;
  const entries = useLiveQuery(() => listGroupEntries(since), [since]);
  const [group, setGroup] = useState<MuscleGroup>('chest');
  if (!entries) return null;

  const weeks = weeklySetsByGroup(entries, now);
  const thisWeek = weeks[weeks.length - 1]?.totals;
  const rows = GROUPS.map(([key, label]) => ({ key, label, sets: thisWeek?.[key] ?? 0 }));
  const trend = weeks.map((w, i) => ({ weekStart: w.weekStart, sets: w.totals[group], current: i === weeks.length - 1 }));
  const top = Math.max(GROUP_BAND.max + 4, ...rows.map((r) => r.sets), ...trend.map((t) => t.sets));
  const ticks = [0, GROUP_BAND.min, GROUP_BAND.max];

  return (
    <>
      <section>
        <h2 className="section-title">Serie di questa settimana</h2>
        <p className="px-4 pb-2 text-small text-steel">
          La fascia chiara, da {GROUP_BAND.min} a {GROUP_BAND.max} serie, è un riferimento indicativo. I gruppi
          secondari contano mezza serie.
        </p>
        <div
          className="h-72 pr-2"
          role="img"
          aria-label={`Serie di questa settimana: ${rows.map((r) => `${r.label} ${formatNumber(r.sets)}`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 32, bottom: 0, left: 0 }}>
              <ReferenceArea x1={GROUP_BAND.min} x2={GROUP_BAND.max} fill={CHART.hover} stroke="none" />
              <CartesianGrid horizontal={false} stroke={CHART.grid} />
              <XAxis type="number" domain={[0, top]} ticks={ticks} {...AXIS} />
              <YAxis type="category" dataKey="label" width={84} {...AXIS} />
              <Bar dataKey="sets" fill={CHART.chalk} maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="sets"
                  position="right"
                  fill={CHART.chalk}
                  fontSize={13}
                  formatter={(value) => formatNumber(Number(value))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="section-title">Ultime 12 settimane</h2>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          {GROUPS.map(([key, label]) => (
            <button key={key} type="button" className="chip" aria-pressed={group === key} onClick={() => setGroup(key)}>
              {label}
            </button>
          ))}
        </div>
        <div
          className="h-48 pr-4"
          role="img"
          aria-label={`Serie per settimana di ${MUSCLE_GROUPS[group]}. I valori sono nella tabella dei dati.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <ReferenceArea y1={GROUP_BAND.min} y2={GROUP_BAND.max} fill={CHART.hover} stroke="none" />
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="weekStart" tickFormatter={formatShortDate} minTickGap={24} {...AXIS} />
              <YAxis width={32} domain={[0, top]} ticks={ticks} {...AXIS} />
              <Tooltip
                cursor={{ fill: CHART.hover }}
                content={({ active, payload }) => {
                  const p = (payload?.[0] as { payload?: (typeof trend)[number] } | undefined)?.payload;
                  return active && p ? (
                    <TooltipBox value={`${formatNumber(p.sets)} serie`} label={`Settimana del ${formatShortDate(p.weekStart)}`} />
                  ) : null;
                }}
              />
              <Bar dataKey="sets" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {trend.map((t) => (
                  <Cell key={t.weekStart} fill={t.current ? CHART.chalk : CHART.steel} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="pt-2">
          <summary className="section-title min-h-11 cursor-pointer">Mostra i dati</summary>
          <table className="w-full text-small tabular-nums">
            <thead>
              <tr className="text-steel">
                <th scope="col" className="pl-4 text-left font-normal">Settimana del</th>
                <th scope="col" className="pr-4 text-right font-normal">Serie di {MUSCLE_GROUPS[group].toLowerCase()}</th>
              </tr>
            </thead>
            <tbody>
              {[...trend].reverse().map((t) => (
                <tr key={t.weekStart} className="border-b border-steel/25">
                  <td className="py-2 pl-4">{formatShortDate(t.weekStart)}</td>
                  <td className="pr-4 text-right">{formatNumber(t.sets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verifica**

Run: `bun run format && bun run check && bun run build`
Expected: PASS, con un chunk `GroupsView-*.js` separato.

Con `bun run dev`, dopo un allenamento con 4 serie di panca piana con bilanciere:
1. Progressi → "Gruppi muscolari":
   - Petto ha una barra con "4" in chiaro sulla punta;
   - Tricipiti e Spalle hanno "2" ciascuno (0,5 × 4);
   - la fascia chiara va da 10 a 20.
2. Il chip "Tricipiti" cambia l'andamento: la settimana corrente è `chalk`, le altre `steel`. Il tooltip dice "2 serie, Settimana del 28 set". "Mostra i dati" apre la tabella.
3. A 375pt le etichette dei gruppi non sono tagliate.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(progress): add weekly sets per muscle group with indicative 10-20 band"
```

---

### Task 3: Progressi — segmento "Costanza"

**Files:**
- Create: `src/features/progress/ConsistencyView.tsx`
- Modify: `src/domain/dates.ts`, `src/db/history.ts`, `src/features/progress/ProgressScreen.tsx`
- Test: `src/domain/dates.test.ts`, `src/db/history.test.ts`

**Interfaces:**
- Consumes: `lastWeekStarts`, `toDateKey`, `startOfWeek`; `getSettings` (`weeklyGoal`); `CHART`, `AXIS`, `TooltipBox`.
- Produces:
  - date: `CalendarCell { key: string; day?: number }`, `monthCells(year, month): CalendarCell[]` (lunedì per primo, celle vuote di riempimento), `weeklyCounts(startedAts, now, weeks?): { weekStart; count }[]`;
  - DB: `listCompletedSessions(since): Promise<Session[]>`;
  - `ConsistencyView` (default export, lazy), con `?tab=consistency`.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/dates.test.ts` importa `monthCells` e `weeklyCounts` e aggiungi:

```ts
describe('monthCells', () => {
  it('lays October 2026 out from Monday, padded to whole weeks', () => {
    const cells = monthCells(2026, 9); // 1 October 2026 is a Thursday
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 4).map((c) => c.day)).toEqual([undefined, undefined, undefined, 1]);
    expect(cells[33]?.day).toBe(31);
    expect(cells[34]?.day).toBeUndefined();
    expect(new Set(cells.map((c) => c.key)).size).toBe(35);
  });
});

describe('weeklyCounts', () => {
  it('counts workouts per week over the last weeks', () => {
    const now = new Date(2026, 9, 2, 18).getTime();
    const counts = weeklyCounts([now, now - 3_600_000, now - 7 * 86_400_000], now, 3);
    expect(counts.map((c) => c.count)).toEqual([0, 1, 2]);
  });
});
```

In `src/db/history.test.ts` importa `listCompletedSessions` e aggiungi:

```ts
describe('listCompletedSessions', () => {
  it('returns completed sessions since a time', async () => {
    const since = Date.now() - 1000;
    const day = await benchDay();
    await train(day, 80, 10);
    await startSession(day); // in progress
    expect(await listCompletedSessions(since)).toHaveLength(1);
  });
});
```

Run: `bun run test src/domain/dates.test.ts src/db/history.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementa**

In `src/domain/dates.ts`:

```ts
export interface CalendarCell {
  key: string;
  /** Day of the month; absent for the padding before day 1 and after the last day. */
  day?: number;
}

/** A month laid out in Monday-first weeks (SPEC §8.1), padded to whole weeks. */
export function monthCells(year: number, month: number): CalendarCell[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [
    ...Array.from({ length: offset }, (_, i) => ({ key: `before-${i}` })),
    ...Array.from({ length: days }, (_, i) => ({ key: `day-${i + 1}`, day: i + 1 })),
  ];
  const after = (7 - (cells.length % 7)) % 7;
  return [...cells, ...Array.from({ length: after }, (_, i) => ({ key: `after-${i}` }))];
}

export function weeklyCounts(startedAts: number[], now: number, weeks = 12): { weekStart: number; count: number }[] {
  const byWeek = Map.groupBy(startedAts, (ts) => startOfWeek(ts));
  return lastWeekStarts(now, weeks).map((weekStart) => ({ weekStart, count: byWeek.get(weekStart)?.length ?? 0 }));
}
```

In `src/db/history.ts`:

```ts
export const listCompletedSessions = (since: number): Promise<Session[]> =>
  db.sessions
    .where('startedAt')
    .aboveOrEqual(since)
    .filter((s) => s.status === 'completed')
    .toArray();
```

In `src/db/history.test.ts` aggiungi `startSession` all'import da `./sessions`, se non c'è già.

Run: `bun run test src/domain/dates.test.ts src/db/history.test.ts`
Expected: PASS.

- [ ] **Step 3: Vista della costanza**

`src/features/progress/ConsistencyView.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { listCompletedSessions } from '../../db/history';
import { getSettings } from '../../db/settings';
import { lastWeekStarts, monthCells, toDateKey, weeklyCounts } from '../../domain/dates';
import { countLabel, formatMonth, formatShortDate } from '../../domain/format';

const WEEKDAYS = [
  ['lun', 'L', 'lunedì'],
  ['mar', 'M', 'martedì'],
  ['mer', 'M', 'mercoledì'],
  ['gio', 'G', 'giovedì'],
  ['ven', 'V', 'venerdì'],
  ['sab', 'S', 'sabato'],
  ['dom', 'D', 'domenica'],
] as const;

export default function ConsistencyView() {
  const now = Date.now();
  const [shown, setShown] = useState(() => ({ year: new Date(now).getFullYear(), month: new Date(now).getMonth() }));
  const monthStart = new Date(shown.year, shown.month, 1).getTime();
  const since = Math.min(monthStart, lastWeekStarts(now, 12)[0] ?? monthStart);
  const sessions = useLiveQuery(() => listCompletedSessions(since), [since]);
  const settings = useLiveQuery(getSettings);
  if (!sessions || !settings) return null;

  const goal = settings.weeklyGoal;
  const trained = new Set(sessions.map((s) => toDateKey(s.startedAt)));
  const today = toDateKey(now);
  const isCurrentMonth = shown.year === new Date(now).getFullYear() && shown.month === new Date(now).getMonth();
  const weeks = weeklyCounts(
    sessions.map((s) => s.startedAt),
    now,
  );
  const shift = (delta: number) =>
    setShown(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <>
      <section className="px-4">
        <div className="flex items-center justify-between pt-4">
          <button type="button" aria-label="Mese precedente" className="flex size-11 items-center justify-center text-steel" onClick={() => shift(-1)}>
            <ChevronLeft />
          </button>
          <h2 className="font-semibold first-letter:uppercase">{formatMonth(monthStart)}</h2>
          <button
            type="button"
            aria-label="Mese successivo"
            disabled={isCurrentMonth}
            className="flex size-11 items-center justify-center text-steel disabled:opacity-30"
            onClick={() => shift(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <ol className="grid grid-cols-7 text-center text-tiny text-steel" aria-hidden="true">
          {WEEKDAYS.map(([key, short]) => (
            <li key={key} className="py-1">
              {short}
            </li>
          ))}
        </ol>
        <ol className="grid grid-cols-7">
          {monthCells(shown.year, shown.month).map((cell) => {
            if (!cell.day) return <li key={cell.key} />;
            const dateKey = toDateKey(new Date(shown.year, shown.month, cell.day).getTime());
            const done = trained.has(dateKey);
            return (
              <li key={cell.key} className="flex h-11 items-center justify-center">
                <span
                  role="img"
                  aria-label={`${cell.day}${done ? ', allenamento' : ''}${dateKey === today ? ', oggi' : ''}`}
                  className={`num flex size-9 items-center justify-center rounded-full text-body ${done ? 'bg-chalk text-rubber' : 'text-steel'} ${dateKey === today ? 'ring-1 ring-chalk' : ''}`}
                >
                  {cell.day}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="pt-2 text-small text-steel">
          {countLabel(
            sessions.filter((s) => s.startedAt >= monthStart && s.startedAt < new Date(shown.year, shown.month + 1, 1).getTime()).length,
            'allenamento',
            'allenamenti',
          )}{' '}
          in questo mese. I giorni pieni sono quelli in cui ti sei allenato.
        </p>
      </section>

      <section>
        <h2 className="section-title">Allenamenti per settimana</h2>
        <p className="px-4 pb-2 text-small text-steel">In chiaro le settimane in cui hai raggiunto l'obiettivo di {goal}.</p>
        <div className="h-44 pr-4" role="img" aria-label="Allenamenti per settimana rispetto all'obiettivo. I valori sono nella tabella dei dati.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="weekStart" tickFormatter={formatShortDate} minTickGap={24} {...AXIS} />
              <YAxis width={24} allowDecimals={false} domain={[0, Math.max(goal, ...weeks.map((w) => w.count))]} {...AXIS} />
              <ReferenceLine
                y={goal}
                stroke={CHART.chalk}
                strokeOpacity={0.6}
                label={{ value: `Obiettivo ${goal}`, position: 'insideTopRight', fill: CHART.steel, fontSize: 13 }}
              />
              <Tooltip
                cursor={{ fill: CHART.hover }}
                content={({ active, payload }) => {
                  const p = (payload?.[0] as { payload?: (typeof weeks)[number] } | undefined)?.payload;
                  return active && p ? (
                    <TooltipBox value={countLabel(p.count, 'allenamento', 'allenamenti')} label={`Settimana del ${formatShortDate(p.weekStart)}`} />
                  ) : null;
                }}
              />
              <Bar dataKey="count" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weeks.map((w) => (
                  <Cell key={w.weekStart} fill={w.count >= goal ? CHART.chalk : CHART.steel} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="pt-2">
          <summary className="section-title min-h-11 cursor-pointer">Mostra i dati</summary>
          <table className="w-full text-small tabular-nums">
            <thead>
              <tr className="text-steel">
                <th scope="col" className="pl-4 text-left font-normal">Settimana del</th>
                <th scope="col" className="pr-4 text-right font-normal">Allenamenti</th>
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => (
                <tr key={w.weekStart} className="border-b border-steel/25">
                  <td className="py-2 pl-4">{formatShortDate(w.weekStart)}</td>
                  <td className="pr-4 text-right">
                    {w.count} di {goal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </>
  );
}
```

La linea dell'obiettivo è continua ed etichettata in chiaro: è una soglia vera, non una griglia.

In `src/features/progress/ProgressScreen.tsx`:

```tsx
const ConsistencyView = lazy(() => import('./ConsistencyView'));

type Tab = 'exercises' | 'groups' | 'consistency';

const TABS: [Tab, string][] = [
  ['exercises', 'Esercizi'],
  ['groups', 'Gruppi muscolari'],
  ['consistency', 'Costanza'],
];
```

e dentro `<Suspense>`:

```tsx
        {tab === 'consistency' && <ConsistencyView />}
```

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev` → Progressi → "Costanza":
1. Il mese corrente parte di lunedì. I giorni con allenamento sono dischi `chalk` con il numero scuro e oggi ha un anello. "Mese successivo" è disattivato sul mese corrente.
2. L'intestazione dei giorni è "L M M G V S D".
3. Il grafico ha 12 colonne, con la linea "Obiettivo 3". Le settimane a obiettivo sono `chalk`, le altre `steel`.
4. Cambia l'obiettivo in Impostazioni a 2: linea e colori si aggiornano.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(progress): add consistency calendar and weekly goal chart"
```

---

### Task 4: Suggerimento di progressione

**Files:**
- Modify: `src/domain/workout.ts`, `src/domain/workout.test.ts`, `src/db/workout.ts`, `src/db/workout.test.ts`, `src/features/workout/ExerciseView.tsx`

**Interfaces:**
- Consumes: `isWorkSetDone`, `LoggedSet` (Fase 1, Task 4); `exerciseHistory`; `weightStep`.
- Produces: `suggestWeight(last: LoggedSet[] | undefined, plannedSets, repMax, stepKg): number | undefined`, `applyWeight(seId, weightKg): Promise<void>`.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/workout.test.ts` importa `suggestWeight` e aggiungi:

```ts
describe('suggestWeight (SPEC §8.6, double progression)', () => {
  const done = (weightKg: number, reps: number) => ({ weightKg, reps, isWarmup: false, completedAt: 1 });
  it('adds one increment when every planned work set reached repMax', () => {
    expect(suggestWeight([done(80, 12), done(80, 12), done(80, 12)], 3, 12, 2.5)).toBe(82.5);
  });
  it('does not suggest when a set fell short of repMax', () => {
    expect(suggestWeight([done(80, 12), done(80, 11), done(80, 12)], 3, 12, 2.5)).toBeUndefined();
  });
  it('does not suggest when last time had fewer sets than planned', () => {
    expect(suggestWeight([done(80, 12), done(80, 12)], 3, 12, 2.5)).toBeUndefined();
  });
  it('does not suggest without history or without load', () => {
    expect(suggestWeight(undefined, 3, 12, 2.5)).toBeUndefined();
    expect(suggestWeight([done(0, 12)], 1, 12, 2.5)).toBeUndefined();
  });
});
```

In `src/db/workout.test.ts` importa `applyWeight` e aggiungi:

```ts
describe('applyWeight', () => {
  it('sets the weight of planned work sets only', async () => {
    const sessionId = await setup();
    const bench = await fillBench(sessionId);
    await completeSet(bench.sets[0].id);
    await applyWeight(bench.se.id, 82.5);
    expect((await items(sessionId))[0].sets.map((s) => s.weightKg)).toEqual([80, 82.5, 82.5]);
  });
});
```

Run: `bun run test src/domain/workout.test.ts src/db/workout.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementa**

In `src/domain/workout.ts`:

```ts
import { isWorkSetDone, type LoggedSet } from './stats';
```

```ts
/**
 * SPEC §8.6: if every planned work set of last time reached repMax, suggest one increment more
 * than the heaviest of them. Never applied automatically.
 */
export function suggestWeight(
  last: LoggedSet[] | undefined,
  plannedSets: number,
  repMax: number,
  stepKg: number,
): number | undefined {
  const work = (last ?? []).filter(isWorkSetDone).slice(0, plannedSets);
  if (work.length < plannedSets || !work.every((s) => (s.reps ?? 0) >= repMax)) return undefined;
  const top = Math.max(...work.map((s) => s.weightKg ?? 0));
  return top > 0 ? Math.round((top + stepKg) * 100) / 100 : undefined;
}
```

In `src/db/workout.ts`:

```ts
/** Applies a weight to the planned (not yet completed) work sets of an exercise. */
export async function applyWeight(seId: string, weightKg: number): Promise<void> {
  await db.setLogs
    .where('sessionExerciseId')
    .equals(seId)
    .filter((s) => !s.isWarmup && s.completedAt === undefined)
    .modify({ weightKg });
}
```

Run: `bun run test src/domain/workout.test.ts src/db/workout.test.ts`
Expected: PASS.

- [ ] **Step 3: Suggerimento accanto alla riga "Ultima volta"**

In `src/features/workout/ExerciseView.tsx`:

```tsx
import { applyWeight, addSet, completeSet } from '../../db/workout';
import { formatNumber, formatSets, formatTarget, relativeDay } from '../../domain/format';
import { firstPending, setLabel, suggestWeight, weightStep } from '../../domain/workout';
```

(unisci con gli import esistenti), poi dopo il calcolo di `before`:

```tsx
  const step = weightStep(exercise, settings.weightSteps);
  const suggestion =
    tracking === 'weight_reps' ? suggestWeight(last?.sets, se.plannedSets, se.repMax, step) : undefined;
  const offerSuggestion =
    suggestion !== undefined &&
    sets.some((s) => !s.isWarmup && s.completedAt === undefined && (s.weightKg ?? 0) < suggestion);
```

Sostituisci il paragrafo "Ultima volta" con:

```tsx
        {last && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-small text-steel tabular-nums">
              {relativeDay(last.startedAt)}: {formatSets(last.sets, tracking)}
            </p>
            {offerSuggestion && suggestion !== undefined && (
              <button
                type="button"
                className="chip"
                aria-label={`Aumenta a ${formatNumber(suggestion)} kg le serie da fare`}
                onClick={() => applyWeight(se.id, suggestion)}
              >
                Aumenta a {formatNumber(suggestion)} kg
              </button>
            )}
          </div>
        )}
```

e passa `step={step}` a `SetEditor` invece di ricalcolarlo.

- [ ] **Step 4: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`:
1. Allenamento con Panca impostata a 3 × 8–10: completa 3 serie da 10 con 80 kg e termina.
2. Al prossimo allenamento, accanto a "… fa: 80×10 / 80×10 / 80×10" compare "Aumenta a 82,5 kg". Le serie restano a 80 finché non lo tocchi.
3. Toccandolo, le serie da fare passano a 82,5 e il chip sparisce.
4. Se l'ultima volta una serie era da 9, il chip non compare.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(workout): suggest double-progression weight increases on demand"
```

---

### Task 5: Superserie

**Files:**
- Create: `src/domain/superset.ts`
- Modify:
  - dati: `src/db/programs.ts`, `src/db/programs.test.ts`, `src/db/workout.ts`, `src/db/workout.test.ts`;
  - giornata: `src/features/programs/DayEditor.tsx`, `src/features/programs/DayExerciseSheet.tsx`;
  - allenamento: `src/features/workout/ExerciseView.tsx`, `src/features/workout/WorkoutScreen.tsx`.
- Test: `src/domain/superset.test.ts`

**Interfaces:**
- Consumes: `startSession` (che copia già `supersetKey` dalla giornata alla sessione); `completeSet`, `CompleteResult` (Fase 1, Task 15).
- Produces:
  - dominio: `supersetRun(keys, index): number[]`, `supersetNext(hasWork: boolean[], position): { next: number | null; roundEnd: boolean }`, `toggleSupersetLink(keys, index, newKey): (string | undefined)[]`;
  - DB: `toggleDayExerciseLink(dayId, index)`;
  - `CompleteResult.next?: string`, l'id dell'esercizio della sessione da mostrare dopo;
  - `ExerciseView` cambia props: `onSetCompleted(result)` sostituisce `onExerciseDone`, e c'è il nuovo `supersetWith?: string[]`.

Regole:
- **Gruppo.** Una superserie è una sequenza di esercizi consecutivi con la stessa chiave.
- **Dopo ogni serie di lavoro di un membro:**
  - si passa al membro successivo del giro che ha ancora serie da fare, senza timer;
  - se non ce n'è (fine del giro), parte il timer e si torna al primo membro con serie da fare;
  - quando nessun membro ha più serie, si passa all'esercizio dopo il gruppo.

- [ ] **Step 1: Scrivi i test di dominio (falliscono)**

`src/domain/superset.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { supersetNext, supersetRun, toggleSupersetLink } from './superset';

describe('supersetRun', () => {
  it('returns the contiguous run with the same key', () => {
    expect(supersetRun(['a', 'a', undefined, 'b'], 1)).toEqual([0, 1]);
    expect(supersetRun(['a', 'a', undefined, 'b'], 2)).toEqual([2]);
  });
  it('non-contiguous keys: separated exercises are not one superset', () => {
    expect(supersetRun(['a', 'a', undefined, 'a'], 3)).toEqual([3]);
  });
});

describe('supersetNext', () => {
  it('moves to the next member with work left, without rest', () => {
    expect(supersetNext([true, true], 0)).toEqual({ next: 1, roundEnd: false });
  });
  it('ends the round on the last member and goes back to the first with work left', () => {
    expect(supersetNext([true, true], 1)).toEqual({ next: 0, roundEnd: true });
  });
  it('uneven superset: a lone member ends the round at every set', () => {
    expect(supersetNext([true, false], 0)).toEqual({ next: 0, roundEnd: true });
  });
  it('returns null when every member is done', () => {
    expect(supersetNext([false, false], 1)).toEqual({ next: null, roundEnd: true });
  });
});

describe('toggleSupersetLink', () => {
  const keys = ['k1', 'k2', 'k3', 'k4'];
  const counter = () => {
    let n = 0;
    return () => keys[n++] ?? 'extra';
  };

  it('links two free exercises with a new key', () => {
    expect(toggleSupersetLink([undefined, undefined, undefined], 0, counter())).toEqual(['k1', 'k1', undefined]);
  });
  it('extends an existing superset', () => {
    expect(toggleSupersetLink(['x', 'x', undefined], 1, counter())).toEqual(['x', 'x', 'x']);
  });
  it('unlinks the first member', () => {
    expect(toggleSupersetLink(['x', 'x', 'x'], 0, counter())).toEqual([undefined, 'x', 'x']);
  });
  it('splitting a run gives each part its own key', () => {
    expect(toggleSupersetLink(['x', 'x', 'x', 'x'], 1, counter())).toEqual(['x', 'x', 'k1', 'k1']);
  });
});
```

Run: `bun run test src/domain/superset.test.ts`
Expected: FAIL, `Cannot find module './superset'`.

- [ ] **Step 2: Implementa `src/domain/superset.ts`**

```ts
/** Indices of the contiguous run that shares the key at `index` ([index] when it has none). */
export function supersetRun(keys: (string | undefined)[], index: number): number[] {
  const key = keys[index];
  if (key === undefined) return [index];
  let start = index;
  while (start > 0 && keys[start - 1] === key) start--;
  let end = index;
  while (end < keys.length - 1 && keys[end + 1] === key) end++;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * After a work set of member `position`: the next member of this round with work left (no rest),
 * or, at the end of the round, the first member with work left (rest). null = superset done.
 */
export function supersetNext(hasWork: boolean[], position: number): { next: number | null; roundEnd: boolean } {
  const later = hasWork.findIndex((left, i) => i > position && left);
  if (later !== -1) return { next: later, roundEnd: false };
  const first = hasWork.indexOf(true);
  return { next: first === -1 ? null : first, roundEnd: true };
}

/** Links or unlinks items `index` and `index + 1`; every contiguous run gets its own key. */
export function toggleSupersetLink(
  keys: (string | undefined)[],
  index: number,
  newKey: () => string,
): (string | undefined)[] {
  const links = keys.slice(0, -1).map((key, i) => key !== undefined && key === keys[i + 1]);
  links[index] = !links[index];
  const result: (string | undefined)[] = [];
  const used = new Set<string>();
  let start = 0;
  for (let i = 0; i < keys.length; i++) {
    if (i < keys.length - 1 && links[i]) continue; // the run goes on
    let key: string | undefined;
    if (i > start) {
      key = keys.slice(start, i + 1).find((k): k is string => k !== undefined && !used.has(k)) ?? newKey();
      used.add(key);
    }
    for (let j = start; j <= i; j++) result.push(key);
    start = i + 1;
  }
  return result;
}
```

Run: `bun run test src/domain/superset.test.ts`
Expected: PASS.

- [ ] **Step 3: Collegamento nella giornata (DB)**

In `src/db/programs.test.ts` importa `toggleDayExerciseLink` e aggiungi:

```ts
  it('links consecutive day exercises into a superset and unlinks them', async () => {
    const day = await addDay(await createProgram());
    for (const name of ['A', 'B', 'C']) await addDayExercise(day, await exercise(name));
    await toggleDayExerciseLink(day, 0);
    let keys = (await listDayItems(day)).map((i) => i.de.supersetKey);
    expect(keys[0]).toBeTypeOf('string');
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toBeUndefined();
    await toggleDayExerciseLink(day, 0);
    keys = (await listDayItems(day)).map((i) => i.de.supersetKey);
    expect(keys).toEqual([undefined, undefined, undefined]);
  });
```

(dentro `describe('programs', …)`). In `src/db/programs.ts`:

```ts
import { toggleSupersetLink } from '../domain/superset';
```

```ts
/** Links (or unlinks) the day exercise at `index` with the next one. */
export async function toggleDayExerciseLink(dayId: string, index: number): Promise<void> {
  await db.transaction('rw', db.dayExercises, async () => {
    const items = await db.dayExercises.where('dayId').equals(dayId).sortBy('order');
    const keys = toggleSupersetLink(
      items.map((de) => de.supersetKey),
      index,
      uid,
    );
    await db.dayExercises.bulkUpdate(items.map((de, i) => ({ key: de.id, changes: { supersetKey: keys[i] } })));
  });
}
```

Run: `bun run test src/db/programs.test.ts`
Expected: PASS.

- [ ] **Step 4: Giro della superserie in `completeSet` (test che fallisce)**

In `src/db/workout.test.ts` importa `toggleDayExerciseLink` da `./programs` e aggiungi:

```ts
async function supersetSetup(setsA: number, setsB: number) {
  const day = await addDay(await createProgram());
  const make = (name: string) =>
    createExercise({ name, muscleGroup: 'chest', equipment: 'barbell', trackingType: 'weight_reps', notes: '' });
  const a = await addDayExercise(day, await make('A'));
  const b = await addDayExercise(day, await make('B'));
  await addDayExercise(day, await make('C'));
  await updateDayExercise(a, { sets: setsA });
  await updateDayExercise(b, { sets: setsB });
  await toggleDayExerciseLink(day, 0);
  const sessionId = await startSession(day);
  for (const item of await items(sessionId)) {
    for (const s of item.sets) await db.setLogs.update(s.id, { weightKg: 50, reps: 10 });
  }
  return sessionId;
}

/** Completes the first pending set of the exercise called `name`. */
async function nextSetOf(sessionId: string, name: string) {
  const item = (await items(sessionId)).find((i) => i.exercise.name === name);
  return completeSet(item?.sets.find((s) => s.completedAt === undefined)?.id ?? '');
}

describe('supersets', () => {
  it('alternates members and starts the rest only at the end of a round', async () => {
    const sessionId = await supersetSetup(2, 2);
    const [a, b, c] = await items(sessionId);
    expect(await nextSetOf(sessionId, 'A')).toMatchObject({ next: b.se.id, timer: null });
    const endOfRound = await nextSetOf(sessionId, 'B');
    expect(endOfRound.next).toBe(a.se.id);
    expect(endOfRound.timer).toBeTruthy();
    await nextSetOf(sessionId, 'A');
    const last = await nextSetOf(sessionId, 'B');
    expect(last.next).toBe(c.se.id);
    expect(last.timer).toBeTruthy();
  });

  it('uneven superset: the longer member finishes alone and rests after each set', async () => {
    const sessionId = await supersetSetup(3, 2);
    const [a, , c] = await items(sessionId);
    for (const name of ['A', 'B', 'A']) await nextSetOf(sessionId, name);
    const bDone = await nextSetOf(sessionId, 'B');
    expect(bDone.next).toBe(a.se.id);
    const aDone = await nextSetOf(sessionId, 'A');
    expect(aDone.next).toBe(c.se.id);
    expect(aDone.timer).toBeTruthy();
  });

  it('leaves exercises outside supersets as before', async () => {
    const sessionId = await supersetSetup(1, 1);
    const [, , c] = await items(sessionId);
    await db.setLogs.update(c.sets[0].id, { weightKg: 50, reps: 10 });
    const result = await completeSet(c.sets[0].id);
    expect(result.next).toBeUndefined();
    expect(result.timer).toBeTruthy();
  });
});
```

Run: `bun run test src/db/workout.test.ts`
Expected: FAIL: `next` è `undefined` e il timer parte anche a metà giro.

- [ ] **Step 5: Implementa il giro in `src/db/workout.ts`**

```ts
import { supersetNext, supersetRun } from '../domain/superset';
```

In `CompleteResult` aggiungi:

```ts
  /** Session exercise to show next, set only inside supersets. */
  next?: string;
```

Aggiungi la funzione:

```ts
/** For a work set inside a superset: where to go next and whether the round ended. */
async function supersetFlow(se: SessionExercise): Promise<{ next?: string; roundEnd: boolean }> {
  if (!se.supersetKey) return { roundEnd: true };
  const siblings = await db.sessionExercises.where('sessionId').equals(se.sessionId).sortBy('order');
  const run = supersetRun(
    siblings.map((s) => s.supersetKey),
    siblings.findIndex((s) => s.id === se.id),
  );
  if (run.length < 2) return { roundEnd: true };
  const members = run.map((i) => siblings[i]);
  const sets = await db.setLogs.where('sessionId').equals(se.sessionId).toArray();
  const hasWork = members.map((m) =>
    sets.some((s) => s.sessionExerciseId === m.id && !s.isWarmup && s.completedAt === undefined),
  );
  const { next, roundEnd } = supersetNext(
    hasWork,
    members.findIndex((m) => m.id === se.id),
  );
  const after = siblings[(run.at(-1) ?? 0) + 1];
  return { next: next === null ? after?.id : members[next]?.id, roundEnd };
}
```

In `completeSet`, sostituisci il blocco dopo `if (set.isWarmup || set.completedAt !== undefined) return { exerciseDone };` con:

```ts
      const flow = await supersetFlow(se);
      const { autoStartTimer } = await getSettings();
      // Inside a superset the rest starts only at the end of the round (SPEC §7.1).
      const timer = autoStartTimer && flow.roundEnd ? await restTimer(se, exercise.name) : null;
      await setSetting('activeTimer', timer); // a new confirmation replaces the running timer
      return { exerciseDone, timer, next: flow.next };
```

Run: `bun run test src/db`
Expected: PASS: i test delle superserie e tutti quelli precedenti di `workout.test.ts`.

- [ ] **Step 6: Interfaccia — giornata**

`src/features/programs/DayExerciseSheet.tsx`: la firma diventa

```tsx
interface SheetProps {
  item: DayItem | null;
  onClose: () => void;
  /** Name of the next exercise of the day, when there is one. */
  nextName?: string;
  linked: boolean;
  onToggleLink: () => void;
}

export function DayExerciseSheet({ item, onClose, nextName, linked, onToggleLink }: SheetProps) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.exercise.name ?? ''}>
      {item && <Fields item={item} onClose={onClose} nextName={nextName} linked={linked} onToggleLink={onToggleLink} />}
    </Sheet>
  );
}
```

`Fields` riceve gli stessi tre props in più e, subito prima del pulsante "Fatto", mostra:

```tsx
      {nextName && (
        <label className="flex min-h-11 items-center gap-3">
          <span className="flex-1">In superserie con {nextName}</span>
          <input type="checkbox" className="switch" checked={linked} onChange={onToggleLink} />
        </label>
      )}
```

`src/features/programs/DayEditor.tsx`:

```tsx
import { addDayExercise, deleteDay, getDay, listDayItems, moveDayExercise, toggleDayExerciseLink, updateDay } from '../../db/programs';
import { supersetRun } from '../../domain/superset';
```

Dopo `const editing = …`:

```tsx
  const keys = items.map((item) => item.de.supersetKey);
  const editingIndex = items.findIndex((item) => item.de.id === editingId);
  const linkedToNext =
    editingIndex !== -1 && keys[editingIndex] !== undefined && keys[editingIndex] === keys[editingIndex + 1];
```

Ogni riga di un gruppo riceve un bordo sinistro e la dicitura. Nel `<li>`:

```tsx
          <li
            key={de.id}
            className={`flex items-center border-b border-steel/25 ${supersetRun(keys, i).length > 1 ? 'border-l-2 border-l-steel' : ''}`}
          >
```

e nella seconda riga del pulsante:

```tsx
              <span className="text-small text-steel tabular-nums">
                {formatShortTarget(de, exercise.trackingType)}
                {supersetRun(keys, i).length > 1 && ', in superserie'}
              </span>
```

Il foglio:

```tsx
      <DayExerciseSheet
        item={editing}
        onClose={() => setEditingId(null)}
        nextName={items[editingIndex + 1]?.exercise.name}
        linked={linkedToNext}
        onToggleLink={() => toggleDayExerciseLink(day.id, editingIndex)}
      />
```

- [ ] **Step 7: Interfaccia — allenamento**

`src/features/workout/ExerciseView.tsx`:
- nei props sostituisci `onExerciseDone: () => void` con `onSetCompleted: (result: CompleteResult) => void` e aggiungi `supersetWith?: string[]`; importa `type CompleteResult` da `../../db/workout`;
- `confirm` diventa:

```tsx
  const confirm = async (setId: string) => {
    const result = await completeSet(setId);
    void syncRestPush(result.timer);
    setSelectedId(null);
    onSetCompleted(result);
  };
```

- sotto la riga del target:

```tsx
        {supersetWith && supersetWith.length > 0 && (
          <p className="text-small text-steel">In superserie con {supersetWith.join(' e ')}</p>
        )}
```

`src/features/workout/WorkoutScreen.tsx`:

```tsx
import { supersetRun } from '../../domain/superset';
```

Dopo `const isLast = …`:

```tsx
  const partners = item
    ? supersetRun(
        items.map((i) => i.se.supersetKey),
        current,
      )
        .filter((i) => i !== current)
        .map((i) => items[i]?.exercise.name ?? '')
    : [];
```

e nell'`<ExerciseView …>` sostituisci `onExerciseDone` con:

```tsx
              supersetWith={partners}
              onSetCompleted={({ exerciseDone, next }) => {
                const target = next ? items.findIndex((i) => i.se.id === next) : -1;
                if (target !== -1) goTo(target);
                else if (exerciseDone && !isLast) goTo(current + 1);
              }}
```

- [ ] **Step 8: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`:
1. Nella giornata A, nel foglio di "Panca piana con bilanciere", attiva "In superserie con Croci ai cavi". Le due righe hanno il bordo sinistro e la dicitura ", in superserie".
2. Inizia l'allenamento. Sotto il target compare "In superserie con Croci ai cavi".
3. Conferma una serie di panca: si passa alle croci senza timer.
4. Conferma una serie di croci: parte il recupero e si torna alla panca.
5. Finite tutte le serie del gruppo, si passa all'esercizio successivo.
6. Disattiva l'interruttore: le righe tornano indipendenti.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(workout): alternate supersets and rest only at the end of a round"
```

---

### Task 6: Peso corporeo

**Files:**
- Create: `src/db/bodyweights.ts`, `src/features/progress/BodyweightScreen.tsx`, `src/features/progress/BodyweightChart.tsx`
- Modify: `src/domain/dates.ts`, `src/features/progress/ProgressScreen.tsx`, `src/routes.tsx`
- Test: `src/db/bodyweights.test.ts`, `src/domain/dates.test.ts`

**Interfaces:**
- Consumes: tabella `bodyweights` (schema v1, indice `date`); `toDateKey`, `parseWeight`, `formatDate`, `formatNumber`, `formatShortDate`; `CHART`, `AXIS`, `TooltipBox`.
- Produces:
  - date: `dateKeyToTs(key): number`;
  - DB: `listBodyweights(): Promise<Bodyweight[]>` (dalla più recente), `saveBodyweight(date, kg)` (una sola per data), `deleteBodyweight(id)`;
  - route `/progress/bodyweight`.

- [ ] **Step 1: Scrivi i test (falliscono)**

In `src/domain/dates.test.ts` importa `dateKeyToTs` e aggiungi:

```ts
describe('dateKeyToTs', () => {
  it('reads YYYY-MM-DD as local midnight, so the day never shifts', () => {
    expect(dateKeyToTs('2026-10-25')).toBe(new Date(2026, 9, 25).getTime());
    expect(toDateKey(dateKeyToTs('2026-03-29'))).toBe('2026-03-29');
  });
});
```

`src/db/bodyweights.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deleteBodyweight, listBodyweights, saveBodyweight } from './bodyweights';

describe('bodyweights', () => {
  it('keeps one measurement per day, newest first', async () => {
    await saveBodyweight('2026-10-01', 80.4);
    await saveBodyweight('2026-10-02', 80.1);
    await saveBodyweight('2026-10-02', 79.9); // same day: replaces
    const list = await listBodyweights();
    expect(list.map((b) => [b.date, b.kg])).toEqual([
      ['2026-10-02', 79.9],
      ['2026-10-01', 80.4],
    ]);
    await deleteBodyweight(list[0]?.id ?? '');
    expect(await listBodyweights()).toHaveLength(1);
  });
});
```

Run: `bun run test src/domain/dates.test.ts src/db/bodyweights.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementa**

In `src/domain/dates.ts`:

```ts
/** YYYY-MM-DD as local midnight; new Date('YYYY-MM-DD') would be UTC and can shift the day. */
export function dateKeyToTs(key: string): number {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}
```

`src/db/bodyweights.ts`:

```ts
import type { Bodyweight } from '../types';
import { db, uid } from './db';

export const listBodyweights = (): Promise<Bodyweight[]> => db.bodyweights.orderBy('date').reverse().toArray();

/** One measurement per day: saving the same date replaces it. */
export async function saveBodyweight(date: string, kg: number): Promise<void> {
  await db.transaction('rw', db.bodyweights, async () => {
    const existing = await db.bodyweights.where('date').equals(date).first();
    await db.bodyweights.put({ id: existing?.id ?? uid(), date, kg });
  });
}

export async function deleteBodyweight(id: string): Promise<void> {
  await db.bodyweights.delete(id);
}
```

Run: `bun run test src/domain/dates.test.ts src/db/bodyweights.test.ts`
Expected: PASS.

- [ ] **Step 3: Grafico e schermata**

`src/features/progress/BodyweightChart.tsx`:

```tsx
import type { ReactElement } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, CHART, TooltipBox } from '../../components/chartTheme';
import { dateKeyToTs } from '../../domain/dates';
import { formatNumber, formatShortDate } from '../../domain/format';
import type { Bodyweight } from '../../types';

interface Point {
  ts: number;
  kg: number;
}

export default function BodyweightChart({ entries }: { entries: Bodyweight[] }) {
  const points: Point[] = [...entries].reverse().map((e) => ({ ts: dateKeyToTs(e.date), kg: e.kg }));
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;
  const renderDot = ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }): ReactElement =>
    index === points.length - 1 && cx !== undefined && cy !== undefined ? (
      <circle key="end" cx={cx} cy={cy} r={5} fill={CHART.chalk} stroke={CHART.surface} strokeWidth={2} />
    ) : (
      <g key={`dot-${index}`} />
    );

  return (
    <section className="pt-4">
      <div className="flex items-baseline justify-between px-4">
        <h2 className="text-small text-steel">Andamento</h2>
        <p className="num text-title">{formatNumber(last.kg)} kg</p>
      </div>
      <div
        className="h-48 pr-4"
        role="img"
        aria-label={`Peso corporeo da ${formatNumber(first.kg)} a ${formatNumber(last.kg)} kg. I valori sono nell'elenco delle misurazioni.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatShortDate}
              minTickGap={32}
              {...AXIS}
            />
            <YAxis width={40} domain={['auto', 'auto']} tickFormatter={(v: number) => formatNumber(v)} {...AXIS} />
            <Tooltip
              cursor={{ stroke: CHART.steel, strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = (payload?.[0] as { payload?: Point } | undefined)?.payload;
                return active && p ? <TooltipBox value={`${formatNumber(p.kg)} kg`} label={formatShortDate(p.ts)} /> : null;
              }}
            />
            <Line
              dataKey="kg"
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
    </section>
  );
}
```

`src/features/progress/BodyweightScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { type FormEvent, lazy, Suspense, useState } from 'react';
import { Header } from '../../components/Header';
import { deleteBodyweight, listBodyweights, saveBodyweight } from '../../db/bodyweights';
import { dateKeyToTs, toDateKey } from '../../domain/dates';
import { formatDate, formatNumber, parseWeight } from '../../domain/format';

const BodyweightChart = lazy(() => import('./BodyweightChart'));

export function BodyweightScreen() {
  const entries = useLiveQuery(listBodyweights);
  const today = toDateKey(Date.now());
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState('');
  if (!entries) return null;
  const value = parseWeight(kg);
  const valid = value !== undefined && value > 0;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    await saveBodyweight(date, value);
    setKg('');
  };

  return (
    <>
      <Header title="Peso corporeo" back="/progress" />
      <form className="flex items-end gap-3 px-4" onSubmit={save}>
        <label className="flex-1">
          <span className="label">Data</span>
          <input type="date" className="field" value={date} max={today} required onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="w-28">
          <span className="label">Peso (kg)</span>
          <input
            className="field text-right"
            inputMode="decimal"
            placeholder="80,5"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary w-auto px-5" disabled={!valid}>
          Salva
        </button>
      </form>

      {entries.length >= 2 && (
        <Suspense fallback={null}>
          <BodyweightChart entries={entries} />
        </Suspense>
      )}

      <h2 className="section-title">Misurazioni</h2>
      {entries.length === 0 ? (
        <p className="px-4 text-steel">Nessuna misurazione. Registra il peso di oggi per iniziare.</p>
      ) : (
        <ul className="border-t border-steel/25">
          {entries.map((entry) => (
            <li key={entry.id} className="row">
              <span className="flex-1 first-letter:uppercase">{formatDate(dateKeyToTs(entry.date))}</span>
              <span className="num text-title">{formatNumber(entry.kg)} kg</span>
              <button
                type="button"
                aria-label={`Elimina la misurazione di ${formatDate(dateKeyToTs(entry.date))}`}
                className="-mr-2 flex size-11 items-center justify-center text-plate-red"
                onClick={() => deleteBodyweight(entry.id)}
              >
                <Trash2 size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

L'elenco delle misurazioni fa anche da tabella dei dati del grafico.

- [ ] **Step 4: Accesso da Progressi e route**

In `src/features/progress/ProgressScreen.tsx`, `ExerciseProgress` mostra in cima la riga del peso corporeo:

```tsx
import { listBodyweights } from '../../db/bodyweights';
import { formatNumber, relativeDay } from '../../domain/format';
```

```tsx
function ExerciseProgress() {
  const rows = useLiveQuery(listTrainedExercises);
  const latest = useLiveQuery(async () => (await listBodyweights())[0] ?? null);
  if (!rows || latest === undefined) return null;
  return (
    <>
      <Link to="/progress/bodyweight" className="row border-t border-steel/25">
        <span className="flex-1">Peso corporeo</span>
        {latest && <span className="num text-title">{formatNumber(latest.kg)} kg</span>}
        <ChevronRight size={20} className="shrink-0 text-steel" />
      </Link>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-steel">Nessun progresso da mostrare. Completa un allenamento e torna qui.</p>
      ) : (
        <ul>
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

In `src/routes.tsx`, tra i figli di `AppLayout`:

```tsx
import { BodyweightScreen } from './features/progress/BodyweightScreen';
```

```tsx
      { path: 'progress/bodyweight', Component: BodyweightScreen },
```

- [ ] **Step 5: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`:
1. Progressi → "Peso corporeo".
2. Salva "80,4" con la data di oggi, poi "80,1" con la stessa data: resta una sola riga, 80,1.
3. Aggiungi una misurazione di ieri: compare il grafico con il dischetto finale. Il tocco mostra il valore.
4. Il cestino (icona rossa) elimina una misurazione.
5. La riga in Progressi mostra l'ultimo peso.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(progress): log body weight with one measurement per day"
```

---

### Task 7: Calcolatore dei dischi

**Files:**
- Create: `src/domain/plates.ts`, `src/features/workout/PlateSheet.tsx`
- Modify: `src/features/workout/SetRows.tsx`, `src/features/workout/ExerciseView.tsx`
- Test: `src/domain/plates.test.ts`

**Interfaces:**
- Consumes: `Sheet`, `Segmented`; `formatNumber`.
- Produces:
  - `PLATES_KG`, `PlateCount { kg; count }`;
  - `platesPerSide(totalKg, barKg = 20): { perSide: PlateCount[]; remainderKg: number }`. Con `remainderKg` negativo il carico è sotto il bilanciere; con un valore positivo il carico non è realizzabile esattamente.
  - `PlateSheet({ weightKg, open, onClose })`;
  - `SetEditor` riceve il prop opzionale `onShowPlates`.

- [ ] **Step 1: Scrivi il test (fallisce)**

`src/domain/plates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { platesPerSide } from './plates';

describe('platesPerSide', () => {
  it('loads the biggest plates first on a 20 kg bar', () => {
    expect(platesPerSide(100)).toEqual({
      perSide: [
        { kg: 25, count: 1 },
        { kg: 15, count: 1 },
      ],
      remainderKg: 0,
    });
    expect(platesPerSide(140).perSide).toEqual([
      { kg: 25, count: 2 },
      { kg: 10, count: 1 },
    ]);
  });

  it('uses the small change plates', () => {
    expect(platesPerSide(82.5).perSide.map((p) => p.kg)).toEqual([25, 5, 1.25]);
  });

  it('handles other bars', () => {
    expect(platesPerSide(60, 15).perSide.map((p) => p.kg)).toEqual([20, 2.5]);
    expect(platesPerSide(20)).toEqual({ perSide: [], remainderKg: 0 });
  });

  it('reports loads it cannot build exactly, or below the bar', () => {
    expect(platesPerSide(61)).toEqual({ perSide: [{ kg: 20, count: 1 }], remainderKg: 1 });
    expect(platesPerSide(15)).toEqual({ perSide: [], remainderKg: -5 });
  });
});
```

Run: `bun run test src/domain/plates.test.ts`
Expected: FAIL, `Cannot find module './plates'`.

- [ ] **Step 2: Implementa `src/domain/plates.ts`**

```ts
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateCount {
  kg: number;
  count: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Plates for one side of the bar, biggest first. Greedy is exact here because 1.25 divides
 * every plate. remainderKg < 0: the load is below the bar; > 0: not buildable exactly.
 */
export function platesPerSide(totalKg: number, barKg = 20): { perSide: PlateCount[]; remainderKg: number } {
  let side = round((totalKg - barKg) / 2);
  if (side < 0) return { perSide: [], remainderKg: round(totalKg - barKg) };
  const perSide: PlateCount[] = [];
  for (const kg of PLATES_KG) {
    const count = Math.floor(side / kg + 1e-9);
    if (count === 0) continue;
    perSide.push({ kg, count });
    side = round(side - count * kg);
  }
  return { perSide, remainderKg: round(side * 2) };
}
```

Run: `bun run test src/domain/plates.test.ts`
Expected: PASS.

- [ ] **Step 3: Foglio del calcolatore**

`src/features/workout/PlateSheet.tsx`:

```tsx
import { useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { formatNumber } from '../../domain/format';
import { platesPerSide } from '../../domain/plates';

/** SPEC §11.2: the only place where plate colors are the real ones. */
const PLATE_STYLE: Record<number, string> = {
  25: 'h-28 bg-plate-red',
  20: 'h-24 bg-plate-blue',
  15: 'h-20 bg-plate-yellow',
  10: 'h-16 bg-plate-green',
  5: 'h-12 bg-chalk',
  2.5: 'h-10 bg-steel',
  1.25: 'h-8 bg-steel',
};

type Bar = '20' | '15' | '10';

export function PlateSheet({ weightKg, open, onClose }: { weightKg: number; open: boolean; onClose: () => void }) {
  const [bar, setBar] = useState<Bar>('20');
  const { perSide, remainderKg } = platesPerSide(weightKg, Number(bar));
  const plates = perSide.flatMap(({ kg, count }) =>
    Array.from({ length: count }, (_, n) => n).map((n) => ({ key: `${kg}-${n}`, kg })),
  );

  return (
    <Sheet open={open} onClose={onClose} title={`Dischi per ${formatNumber(weightKg)} kg`}>
      <div className="space-y-4 px-4">
        <div>
          <p className="label">Bilanciere</p>
          <Segmented<Bar>
            options={[
              ['20', '20 kg'],
              ['15', '15 kg'],
              ['10', '10 kg'],
            ]}
            value={bar}
            onChange={setBar}
          />
        </div>
        {remainderKg < 0 ? (
          <p>Il carico è inferiore al peso del bilanciere.</p>
        ) : (
          <>
            <div className="flex h-32 items-center" aria-hidden="true">
              <span className="h-3 w-10 rounded-l-full bg-steel/60" />
              {plates.map(({ key, kg }) => (
                <span key={key} className={`ml-0.5 w-4 rounded-[3px] ${PLATE_STYLE[kg]}`} />
              ))}
              <span className="h-3 flex-1 bg-steel/60" />
            </div>
            <p className="tabular-nums">
              {plates.length === 0
                ? 'Solo il bilanciere, nessun disco.'
                : `Per lato: ${plates.map((p) => formatNumber(p.kg)).join(' + ')}`}
            </p>
            {remainderKg > 0 && (
              <p className="text-small text-steel">
                Con questi dischi il carico più vicino è {formatNumber(weightKg - remainderKg)} kg (
                {formatNumber(remainderKg)} kg in meno).
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
```

Il disegno è nascosto agli screen reader (`aria-hidden`): il testo "Per lato: 25 + 5 + 1,25" dice la stessa cosa a parole, quindi il colore non è mai l'unica informazione.

- [ ] **Step 4: Apri il calcolatore dall'editor della serie**

In `src/features/workout/SetRows.tsx` aggiungi a `EditorProps` il campo `onShowPlates?: () => void` e ricevilo in `SetEditor`. Nell'intestazione dell'editor, prima del pulsante "Elimina serie":

```tsx
        <div className="flex items-center">
          {onShowPlates && (
            <button type="button" className="btn-text text-small" onClick={onShowPlates}>
              Dischi
            </button>
          )}
          <button
            type="button"
            aria-label="Elimina serie"
            className="-mr-2 flex size-11 items-center justify-center text-steel"
            onClick={remove}
          >
            <Trash2 size={20} />
          </button>
        </div>
```

(sostituisce il solo pulsante "Elimina serie" esistente).

In `src/features/workout/ExerciseView.tsx`:

```tsx
import { PlateSheet } from './PlateSheet';
```

```tsx
  const [platesKg, setPlatesKg] = useState<number | null>(null);
```

Su `SetEditor`:

```tsx
                onShowPlates={
                  exercise.equipment === 'barbell' && (set.weightKg ?? 0) > 0
                    ? () => setPlatesKg(set.weightKg ?? 0)
                    : undefined
                }
```

In fondo al frammento restituito:

```tsx
      <PlateSheet weightKg={platesKg ?? 0} open={platesKg !== null} onClose={() => setPlatesKg(null)} />
```

- [ ] **Step 5: Verifica**

Run: `bun run format && bun run check`
Expected: PASS.

Con `bun run dev`, in un allenamento con Panca piana con bilanciere a 82,5 kg:
1. L'editor della serie mostra "Dischi". Il foglio disegna, dopo il manicotto, un disco rosso, uno bianco e uno acciaio, e scrive "Per lato: 25 + 5 + 1,25".
2. "15 kg" ricalcola: "Per lato: 25 + 5 + 2,5 + 1,25".
3. Con 61 kg: "Con questi dischi il carico più vicino è 60 kg (1 kg in meno)".
4. Per un esercizio con manubri il pulsante "Dischi" non compare.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(workout): add plate calculator with real plate colors"
```

---

### Task 8: Collaudo della Fase 3

**Files:**
- Modify: `docs/SPEC.md` (checklist §12)

**Interfaces:**
- Consumes: tutta la Fase 3.
- Produces: la Fase 3 in produzione.

- [ ] **Step 1: Controllo completo e anteprima**

```bash
bun run format && bun run check && bun run build
bun run deploy:preview
```

- [ ] **Step 2: Prova sull'iPhone (anteprima dalla Home)**

1. **Gruppi.** Dopo un allenamento di petto, "Gruppi muscolari" mostra mezze serie su tricipiti e spalle, con la fascia indicativa e i valori sulle barre.
2. **Costanza.** Il calendario segna il giorno di oggi e il grafico settimanale ha la linea dell'obiettivo.
3. **Progressione.** Completa tutte le serie al massimo delle ripetizioni. Alla volta dopo compare "Aumenta a …", che si applica solo con un tocco.
4. **Superserie.** Due esercizi collegati si alternano e il recupero parte solo a fine giro. Con la notifica del timer attiva, a schermo bloccato la notifica arriva solo a fine giro.
5. **Peso corporeo.** Due misurazioni nello stesso giorno restano una sola. Il grafico compare dalla seconda data.
6. **Dischi.** Con 100 kg sul bilanciere da 20: "25 + 15" per lato, con i colori rosso e giallo.

- [ ] **Step 3: Backup**

Esporta un backup, reimporta lo stesso file e controlla che superserie, peso corporeo e gruppi secondari siano tutti presenti. Nessuna migrazione serve, perché lo schema è ancora la versione 1.

- [ ] **Step 4: Produzione e checklist**

```bash
bun run deploy
```

In `docs/SPEC.md` §12 "Fase 3" spunta tutte le voci.

```bash
git add -A
git commit -m "chore: complete phase 3 acceptance"
```
