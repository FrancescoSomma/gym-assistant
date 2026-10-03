---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/features/workout/WorkoutScreen.tsx","src/features/today/TodayScreen.tsx","src/features/workout/SummaryScreen.tsx"]
---

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
