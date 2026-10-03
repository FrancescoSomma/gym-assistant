# Redesign "Pedana di gara": specifica

- **Data:** 2026-10-03
- **Stato:** bozza da rivedere. Fase 1 di 3: specifica, poi piano (superpowers:writing-plans), poi implementazione in modalità SDD.
- **Fonti:** `PRODUCT.md` (verità di prodotto), `docs/SPEC.md` (comportamento, dati, testi), `CLAUDE.md` (vincoli). Questa specifica sostituisce SPEC §11 (Design) e le parti visive di §10. Tutto il resto di SPEC resta valido.
- **Direzione:** Pedana di gara, scelta dall'utente il 2026-10-03 nel giro di direzione impeccable (seed `c766838c`, modalità Operate, percorso code-led perché in sessione non c'è generazione di immagini). Confronto delle tre direzioni: https://claude.ai/artifact/PYcz9A2F2RrPLCkiWbZ53Y

## 1. Obiettivo

Rendere Palestra bella, accattivante e premium, senza rallentare di un tocco la registrazione di una serie. È un redesign: si sostituisce il linguaggio visivo (palette, tipografia, superfici, componenti, movimento). Restano funzioni, dati, testi, regole di calcolo e vincoli iOS.

Successo:

- In palestra peso, ripetizioni e recupero si leggono a un braccio di distanza, e la serie ripetuta si registra ancora con un tocco.
- Ogni schermata appartiene allo stesso mondo, riconoscibile anche senza testo.
- I quattro momenti che l'utente vuole memorabili hanno ciascuno un momento firma: Oggi all'apertura, allenamento e timer, fine allenamento e record, progressi e grafici.
- `bun run check` passa, nessun test cambia comportamento e l'allenamento completo in modalità aereo funziona come prima.

## 2. Decisioni prese con l'utente

| Tema | Decisione |
|---|---|
| Identità | Mondo nuovo. Del vecchio resta solo la semantica dei dischi: blu = azione primaria e serie corrente, giallo = record, verde = recupero finito e serie completate, rosso = azioni distruttive. Le tonalità si possono ritoccare, la corrispondenza no. |
| Regole di SPEC §11 | Decadono "righe, non card", "movimento solo su azione", "font di sistema per il testo" e "solo tema scuro". Le regole sui testi (§11.4) restano. |
| Momenti da curare | Tutti e quattro: Oggi, allenamento e timer, fine allenamento e record, progressi e grafici. |
| Dipendenze | Approvati font self-hosted e una libreria di animazioni. |
| Direzione | Pedana di gara. |
| Percorso | Code-led: nessun mock generato. L'ambizione sta nel contratto di direzione (§4) e il revisore finale la verifica sul comportamento. |

## 3. La direzione

### 3.1 Tesi

Ogni serie è un tentativo sulla pedana e il recupero è l'orologio di gara. L'app prende la grafica di una gara di pesistica olimpica (tabellone dei tentativi, sottopancia della diretta, orologio del minuto, luci dei giudici) e la mette al servizio di un solo atleta, l'utente.

Rifiuta il cruscotto fitness di categoria: card arrotondate su nero, anelli di progresso, un accento al neon, SF Pro ovunque.

### 3.2 Cosa il mondo presta, e cosa no

La modalità è Operate: chi apre l'app deve sapere dove sono le cose prima di accorgersi del mondo. Il mondo presta quattro cose: tipografia, palette, densità e una mossa firma. Non presta la navigazione (tab bar, header, fogli dal basso e pulsanti restano quelli che un utente iPhone conosce) né il vocabolario.

- **Nessun gergo di gara nei testi.** L'interfaccia dice "serie", "recupero", "allenamento" come oggi. "Tentativo", "pedana" e "giudici" sono nomi di lavoro di questa specifica, mai etichette.
- **Niente costumi.** Nessuna cornice da televisore, nessun LED a puntini, nessun logo di federazione, nessun legno fotografico. Il legno della pedana è solo un colore piatto.
- **Tutti i maiuscoli restano vietati** (SPEC §11.4), anche dove la grafica TV li userebbe.

### 3.3 Discipline prese dai concorrenti scartati

Nel giro di direzione sei concorrenti del catalogo sono stati scartati. Ognuno lascia una disciplina che questa direzione adotta:

1. **Dallo specimen tipografico.** Gerarchia per solo contrasto di scala: peso, ripetizioni e recupero hanno dimensioni monumentali, le etichette restano piccole, e nessun riquadro fa il lavoro della tipografia.
2. **Dalle piastrelle Metro.** Niente cromature: nessun bordo, ombra o riquadro che non porti un'informazione. Solo gli stati vivi usano il colore pieno.
3. **Dalla mappa dello zoo.** Colore a campiture intere: la riga corrente, la fine del recupero e la targa del nome sono campi di colore a tutta larghezza, non accenti minuscoli su grigio.
4. **Dalla copertina della cassetta.** La somma deve tornare: ogni elenco dichiara il suo totale allineato a destra (serie della giornata, allenamenti del mese, volume della sessione).
5. **Dal catalogo della fiera.** Un solo vocabolario di segni per gli stati, uguale in tutta l'app (§8.1).
6. **Dalla composizione a binario.** Filetti di un pixel di dispositivo e tre soli valori di inchiostro per il testo (luce, fumo, filetto).

## 4. Contratto di direzione

Va scritto nel surface brief con `impeccable surface-brief write` prima di toccare il codice (primo task del piano). Non va mai copiato nel codice sorgente, nel DOM, in commenti o in attributi.

```
THESIS: Ogni serie è un tentativo in pedana e il recupero è l'orologio di gara:
Palestra è la grafica di una gara di pesistica con un solo atleta. Rifiuta il
cruscotto fitness a card arrotondate, anelli di progresso e accento al neon.

OWN-WORLD: Arena #0B0C0E come fondo, tribuna #17191D per fogli e pannelli, luce
#F2F1EC per numeri e testo, legno di pedana #B8875A per linguette, filo del
cronometro e riferimenti; i colori dei dischi con un solo significato ciascuno.
Archivo: tondo e largo per il testo, corsivo extra-condensato nero per numeri e
nomi. Angoli quasi vivi, filetti di un pixel, nessuna ombra.

STORY: Apri e vedi la giornata come lista di partenza; inizi; registri ogni
serie con un tocco mentre il tabellone avanza; l'orologio ti richiama; a fine
allenamento il tabellone dei risultati mostra totali e record.

FIRST VIEWPORT: Modalità allenamento. In alto l'header (chiudi, giornata,
durata, "3 di 6"). Sotto, il sottopancia: linguetta di legno "2/4" e targa
chiara con il nome dell'esercizio, poi target e riga "Ultima volta". Al centro
il tabellone delle serie: numeri condensati da 32 px, tre luci per riga, la
serie corrente come banda blu con stepper da 56 pt e valori da 44 px, "Conferma
serie" blu nella zona del pollice. In fondo l'orologio del recupero a tutta
larghezza, cifre da 72 px, filo di legno che si accorcia.

FORM: Pedana di gara; candidato 1 della lista ordinata (scelta di impeccable,
preferita dall'utente all'assegnato, La scheda); seed c766838c.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance
```

## 5. Sistema visivo

### 5.1 Scena e tema

Un uomo solo in una sala pesi illuminata da pannelli LED, il telefono sulla panca a un braccio di distanza tra una serie e l'altra; la sera, sul divano, a pianificare. Il mondo è un'arena scura con la luce sulla pedana: **tema scuro unico**. Il tema chiaro, permesso dall'utente, non serve a questa direzione e resta fuori ambito (SPEC §14). I numeri chiari e grandi su fondo scuro reggono anche la luce forte della palestra.

### 5.2 Palette

I token sostituiscono quelli attuali in `@theme` (`rubber`, `iron`, `chalk`, `steel` spariscono). Si mantiene `--color-*: initial`, così nessun colore di Tailwind entra per sbaglio.

| Token | Hex | Ruolo |
|---|---|---|
| `arena` | `#0B0C0E` | fondo di ogni schermata, tab bar, header |
| `tribuna` | `#17191D` | fogli, editor della serie, orologio del recupero, pannelli |
| `fondale` | `#23262B` | riempimento dei controlli (stepper ±, campi, segmented a riposo), stato premuto |
| `luce` | `#F2F1EC` | testo principale, numeri, targa del nome, selezione invertita |
| `fumo` | `#8F949B` | testo secondario, etichette, valori previsti |
| `filetto` | `luce` al 14% | separatori di un pixel |
| `pedana` | `#B8875A` | linguette, filo del cronometro, marcatore della tab attiva, bande e linee di riferimento nei grafici |
| `plate-blue` | `#2453D6` | azione primaria, serie corrente, allenamento in corso, interruttori accesi |
| `plate-yellow` | `#F6D43A` | record personali, mai altro |
| `plate-green` | `#2BA55B` | serie completate (le luci), recupero finito, settimana raggiunta |
| `plate-red` | `#D93A2F` | azioni distruttive (icona o riempimento, mai testo piccolo) |
| `plate-white` | `#F2F1EC` | disco da 5 kg nel calcolatore |
| `acciaio` | `#9AA0A6` | dischi da 2,5 e 1,25 kg e bilanciere nel calcolatore |

Contrasti misurati (WCAG):

| Coppia | Rapporto | Uso permesso |
|---|---|---|
| luce su arena / tribuna / fondale | 17,3 / 15,6 / 13,4 | tutto |
| fumo su arena / tribuna / fondale | 6,4 / 5,8 / 5,0 | testo secondario ovunque |
| pedana su arena / tribuna | 6,2 / 5,6 | testo ed etichette |
| arena su pedana | 6,2 | testo nelle linguette |
| arena su luce | 17,3 | testo nella targa e nella selezione invertita |
| luce su plate-blue | 5,7 | testo dei pulsanti primari e della banda corrente |
| arena su plate-green | 6,2 | testo della banda "Recupero finito" |
| plate-yellow su arena / tribuna | 13,4 / 12,1 | numeri e testo dei record |
| plate-red su arena | 4,3 | solo icone e riempimenti; il testo resta `luce` |
| plate-blue su arena | 3,1 | solo riempimenti e anelli, mai testo |

Regole:

- I colori dei dischi hanno un solo significato e non decorano mai. Ogni uso è accompagnato da testo, forma o icona: il colore non è mai l'unica informazione.
- **Selezione = inversione.** Segmento scelto, chip di filtro attivo e targa del nome sono `luce` con testo `arena`. Il blu resta per l'azione primaria e per ciò che è in corso.
- Il legno è il secondo colore strutturale, con lavori precisi: linguette, il filo che si accorcia nell'orologio, il marcatore della tab attiva, le fasce e linee di riferimento nei grafici, la parentesi delle superserie. Non diventa uno sfondo di schermata.
- Nessun gradiente, nessun bagliore, nessuna ombra. La profondità nasce dai toni delle superfici: arena, poi tribuna, poi fondale.
- `theme-color` e `background_color` del manifest diventano `#0B0C0E`.

### 5.3 Tipografia

Una sola famiglia: **Archivo** (Omnibus-Type, OFL), variabile su peso (100–900) e larghezza (62–125), tondo e corsivo. Verificato sui file di google/fonts: ha `tnum`, `case`, `zero`, `frac`, `lnum`. Self-hosted in woff2, sottoinsieme latino (comprende accenti italiani, `×`, `–`, `—`, `’`, `−`), due file (tondo e corsivo), inclusi nel precache. Il file Barlow Condensed sparisce. Si usa `font-display: swap` con `size-adjust` sul fallback di sistema, così il cambio di carattere non sposta il layout.

| Ruolo | Impostazione | Dove |
|---|---|---|
| Testo (`font-sans`) | Archivo tondo, larghezza 100, peso 400; enfasi 600 | testo, pulsanti, righe, campi |
| Etichette | Archivo tondo, larghezza 87, peso 600, 13 px, tracking +0,01em | etichette di sezione, intestazioni di colonna, tab bar |
| Tabellone (`font-num`) | Archivo corsivo, larghezza 62, peso 800, `tabular-nums` | ogni numero: peso, ripetizioni, timer, statistiche, indici, lettera della giornata |
| Targa (`font-plate`) | Archivo corsivo, larghezza 75, peso 800 | nome dell'esercizio in allenamento, titoli grandi delle tab, titoli dei fogli, nome della giornata |

Scala, in px fissi (Operate: niente tipografia fluida):

| Token | Dimensione / interlinea | Uso |
|---|---|---|
| `bib` | 112 / 0,9 | lettera della giornata in Oggi |
| `timer` | 72 / 1 | orologio del recupero, "+0:12" |
| `value` | 44 / 1 | valori negli stepper della serie corrente |
| `score` | 32 / 1 | peso nelle righe del tabellone, statistiche del riepilogo |
| `large-title` | 34 / 1,05 | titolo grande delle tab (Oggi, Programmi, Storico, Progressi) |
| `name` | 26 / 1,1 | nome dell'esercizio nella targa (al massimo due righe) |
| `title` | 22 / 1,2 | titoli di schermata e dei fogli |
| `body` | 17 / 1,4 | testo |
| `small` | 15 / 1,35 | secondario |
| `label` | 13 / 1,3 | etichette, minimo assoluto |

- Il tabellone corsivo condensato vale per i numeri, non per le frasi: "4 serie da 8–12" è testo; solo la cifra isolata va sul tabellone.
- Gli input restano ad almeno 16 px; i valori degli stepper in allenamento sono a 44 px.
- L'unità ("kg", "rip", "s") è testo `label` in `fumo`, appoggiata sulla linea di base del numero.

### 5.4 Forma

- **Griglia** di 4 px, margine laterale 16 px.
- **Raggi:** controlli 6 px, fogli 16 px solo in alto, linguette e targa 2 px. Niente pillole, tranne il grabber dei fogli e le luci.
- **Filetti:** `0.5px` in `filetto` (un pixel di dispositivo sugli iPhone retina). Un filetto pieno da 1 px in `luce` apre il tabellone delle serie, come la riga di testa di una tabella stampata.
- **Taglio a 12°:** il lato destro delle linguette di legno e la fine del filo del cronometro sono tagliati con l'inclinazione del corsivo di Archivo. È l'unico motivo grafico del mondo. Compare in tre punti soltanto: linguette, filo del cronometro, marcatore della tab attiva. `clip-path` a quattro vertici.
- **Target touch:** 44 pt, 56 pt in modalità allenamento (invariato).

### 5.5 Icone

lucide-react resta. Tratto 1,75 ovunque (una regola CSS su `.lucide`), 24 px di base, 20 px dentro il testo. Il colore segue il testo; il rosso solo sulle azioni distruttive, il giallo solo sul trofeo dei record.

### 5.6 Movimento

Libreria: **motion** (`motion/react`, approvata), caricata con `LazyMotion` e le sole funzioni necessarie, per contenere il peso. Le transizioni tra le route usano la View Transitions API nativa (React Router `viewTransition`), senza JavaScript in più.

Grammatica: il movimento nativo del mondo è la **tendina**, cioè la grafica TV che entra scoprendosi da sinistra a destra (`clip-path: inset()`). Niente rimbalzi, niente molle con overshoot: la grafica di gara è secca.

| Token | Valore | Uso |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | entrate, tendine |
| `--ease-in` | `cubic-bezier(0.5, 0, 0.75, 0)` | uscite |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | spostamenti |
| `--dur-press` | 120 ms | feedback del tocco |
| `--dur-state` | 180 ms | cambi di stato, cifre degli stepper |
| `--dur-enter` | 240 ms | tendine, transizioni di route |
| `--dur-sheet` | 320 ms | apertura dei fogli |

Cosa si muove:

- **Tocco:** i pulsanti scendono a `scale(0.97)` e schiariscono di un tono di superficie in 120 ms.
- **Route:** avanti, la nuova schermata entra da destra (240 ms) e la vecchia arretra del 30% scurendosi; indietro, il contrario. Cambio di tab: dissolvenza di 160 ms. Ingresso in modalità allenamento: sale dal basso (320 ms); uscita: scende. Tab bar e barra "Allenamento in corso" hanno un `view-transition-name` proprio e restano ferme.
- **Fogli:** salgono in 320 ms con `--ease-out`, escono in 200 ms. Si chiudono anche trascinandoli verso il basso dal grabber o dal titolo (soglia 120 px o velocità sopra 600 px/s), mai dall'area che scorre.
- **Cifre degli stepper:** a ogni ± la cifra che cambia scorre in verticale (su per +, giù per −) in 180 ms. L'orologio del recupero non scorre: cambia secco, come un cronometro di gara.
- **Riordino:** nei programmi e nelle giornate, "sposta su" e "sposta giù" fanno scivolare le righe al nuovo posto (animazione di layout, 200 ms).
- Momenti firma: §8.

Con `prefers-reduced-motion: reduce` le tendine e gli spostamenti diventano istantanei, i fogli appaiono in dissolvenza di 120 ms, le cifre cambiano senza scorrere e le transizioni di route si spengono. Si animano solo `transform`, `opacity` e `clip-path`.

### 5.7 Grafici

Recharts resta, nelle route lazy. `chartTheme.tsx` passa ai nuovi colori:

- Una serie per grafico. `luce` per l'elemento corrente o l'obiettivo raggiunto, `fumo` per il contesto, `pedana` per fasce e linee di riferimento (fascia 10–20 serie al 18% di opacità, linea dell'obiettivo settimanale), `plate-yellow` solo per i record. Griglia in `filetto`, niente assi disegnati.
- Etichette dei tick: Archivo tondo larghezza 87, 13 px, `tabular-nums`, `fumo`.
- Tooltip come un sottopancia: linguetta di legno con l'etichetta, valore sul tabellone a 22 px.
- Nessuna animazione d'ingresso dei grafici (invariato).
- Prima di toccare i grafici l'implementatore carica la skill `dataviz`.

## 6. Componenti

Ogni componente ha gli stati riposo, premuto, focus, disabilitato e, dove serve, caricamento ed errore. Le classi globali in `index.css` (`.btn-primary`, `.row`, `.field`, `.chip`, `.switch`, `.sheet`…) si riscrivono nel nuovo mondo mantenendo i nomi dove il ruolo non cambia.

| Componente | Stato attuale | Nel nuovo mondo |
|---|---|---|
| Pulsante primario | blu, raggio 12 | blu pieno, raggio 6, 56 pt, testo `luce` 17/600; premuto: scala 0,97 |
| Pulsante secondario | `steel/15` | `fondale`, testo `luce` |
| Pulsante distruttivo | come secondario con icona rossa | invariato nel principio: `fondale`, testo `luce`, icona `plate-red` |
| Pulsante testo | `chalk` | `luce` 17/600, 44 pt (56 in allenamento) |
| Stepper | ± in `steel/15`, valore 32 px | ± quadrati in `fondale`, raggio 6: 56 pt con valore a 44 px in allenamento, 44 pt con valore a 28 px nei fogli e nelle impostazioni; cifre che scorrono; unità in `label` |
| Segmented | fondo `iron`, scelto `rubber` | binario `tribuna`; segmento scelto invertito (`luce` con testo `arena`); cambio con la tendina |
| Chip di filtro | bordo `steel`, scelto `chalk` | `fondale`, scelto invertito |
| Chip d'azione ("Aumenta a 82,5 kg") | chip | contorno `plate-blue` di 1,5 px, testo `luce`, 56 pt in allenamento |
| Interruttore | `chalk` acceso | binario `fondale`, acceso `plate-blue`, pomello `luce` |
| Campo | bordo `steel/40` | riempimento `fondale`, niente bordo; focus: filetto `luce` di 1,5 px in basso |
| Riga | filetto in basso | invariata nel principio: 56 pt, filetto di un pixel; il valore a destra sul tabellone |
| Titolo di sezione | `small steel` | `label` in `fumo`, con il totale allineato a destra quando l'elenco ne ha uno |
| Header | 22 px | titolo grande `large-title` sulle quattro tab; titolo `title` con freccia indietro nelle schermate interne |
| Tab bar | icona + etichetta | `arena`, filetto in alto; tab attiva `luce` con marcatore di legno di 24×3 px tagliato a 12° sopra l'icona; inattive `fumo` |
| Foglio | `iron`, raggio 20 | `tribuna`, raggio 16, grabber, titolo in `font-plate` 22, chiusura da 56 pt, trascinamento verso il basso; resta un `<dialog>` nativo |
| Linguetta (nuovo, `Tab`) | — | blocco `pedana` con testo `arena` sul tabellone o in `label`, lato destro tagliato a 12° |
| Targa (nuovo, `NamePlate`) | — | blocco `luce` con testo `arena` in `font-plate`; con la linguetta forma il sottopancia |
| Luci (nuovo, `Lights`) | dischetto di stato | tre cerchi da 10 px: spenti = anello `fumo`, accesi = `plate-green` pieni; nome accessibile sempre presente |
| Numero (nuovo, `ScoreNumber`) | `.num` | numero sul tabellone con cifre che scorrono quando cambia per un'azione |

## 7. Schermate

Per ogni schermata: intento, composizione, stati. Le dimensioni seguono §5.3. I testi sono quelli attuali (SPEC §11.4), salvo dove indicato.

### 7.1 Shell

- Tab bar come in §6. La barra "Allenamento in corso" sta sopra la tab bar: banda `plate-blue` a tutta larghezza, 56 pt. A sinistra "Allenamento in corso" e "Giornata A"; a destra, se un recupero è attivo, "Recupero 1:12" sul tabellone, altrimenti la durata trascorsa; chevron.
- Avviso di aggiornamento: banda `tribuna` con linguetta "Nuova versione" e pulsante testo "Aggiorna". Mai durante un allenamento (invariato).
- Il foglio della sessione rimasta aperta da più di 6 ore usa il foglio standard.

### 7.2 Oggi

Intento: aprire l'app e sapere in un colpo d'occhio cosa si fa oggi, poi iniziare con il pollice.

Composizione, dall'alto:

1. Titolo grande "Oggi" e icona delle impostazioni; sotto, la data in `fumo`.
2. Etichetta "Prossima giornata, Forza 4 giorni" (`label`, `fumo`).
3. **Pettorale:** la lettera della giornata a 112 px sul tabellone, e accanto, allineati alla base, il nome della giornata in `font-plate` 26 e il totale "6 esercizi, 22 serie" in `fumo`.
4. **Lista di partenza:** una riga per esercizio con numero d'ordine (tabellone, `fumo`), nome e, allineato a destra, "4 × 8–12" con le cifre sul tabellone. Gli esercizi in superserie sono uniti a sinistra da una parentesi di legno di 2 px.
5. **Settimana:** "Questa settimana" e "2 di 3" sul tabellone a 28 px, poi una luce per ogni allenamento dell'obiettivo (accesa `plate-green` se fatto; gli allenamenti oltre l'obiettivo aggiungono luci).
6. Promemoria del backup, quando serve: riga con linguetta "Backup", testo e pulsante "Esporta backup".
7. In fondo, nella zona del pollice: "Inizia allenamento" primario e "Scegli un'altra giornata" come pulsante testo.

Stati:

- **Allenamento in corso:** il pettorale mostra la giornata in corso, la durata trascorsa sul tabellone che scorre dal vivo e "3 di 6, Panca piana con bilanciere". Il pulsante diventa "Riprendi allenamento".
- **Nessun programma attivo, programma senza giornate, giornata senza esercizi:** testi attuali come inviti, con il pulsante che porta all'azione.
- **Momento firma:** §8.4.

Nuovo calcolo di dominio: i totali della lista di partenza (esercizi e serie di lavoro previste) diventano una funzione pura in `src/domain/` con test.

### 7.3 Modalità allenamento

Intento: registrare la serie corrente con un tocco, sapere cosa viene dopo e quando riprendere.

Composizione: come nel FIRST VIEWPORT del contratto (§4).

- **Header** fisso su `arena`: chiudi (56 pt), "Giornata A" e la durata sul tabellone in `fumo`, poi "3 di 6" sul tabellone, che apre il foglio della sessione.
- **Sottopancia:** linguetta `pedana` con "2/4" (serie corrente sul totale delle serie di lavoro; nome accessibile "Serie 2 di 4") e targa `luce` con il nome dell'esercizio, al massimo due righe. Il menu ⋯ resta a destra, fuori dalla targa.
- Sotto: target ("4 serie da 8–12, recupero 2 min") in `fumo`, superserie, avviso di esercizio saltato, nota permanente modificabile, nota di giornata, riga "Ultima volta" (`4 giorni fa: 80×10 / 80×9 / 80×8`, cifre sul tabellone) e il chip "Aumenta a 82,5 kg".
- **Tabellone delle serie:** si apre con un filetto pieno in `luce`. Ogni riga è alta 56 pt: indice ("R" per il riscaldamento) sul tabellone in `fumo`, peso a 32 px, "× 10" a 22 px, unità piccole, luci a destra.
  - prevista: valori `fumo`, luci spente;
  - completata: valori `luce`, luci verdi;
  - record: valori `plate-yellow` e trofeo da 16 px;
  - riscaldamento: valori più piccoli (24 px) in `fumo`, una sola luce che diventa `fumo` piena quando è fatta.
- **Serie corrente:** banda `plate-blue` a tutta larghezza con "Serie 2" e, a destra, "Dischi" (bilanciere) e il cestino, poi il corpo su `tribuna` con stepper del peso e delle ripetizioni (o della durata) a 56 pt e valori a 44 px, interruttore del riscaldamento dove previsto, e "Conferma serie" primario. Una serie completata riaperta per correggerla mostra la banda in `fondale` invece del blu e "Fatto" come pulsante secondario (invariato nel comportamento).
- Sotto le serie: "Aggiungi serie" e "Aggiungi riscaldamento" (pulsanti testo, 56 pt).
- **Piede fisso:** "Precedente" e "Successivo", oppure "Termina allenamento" primario sull'ultimo esercizio; poi l'orologio del recupero.

**Orologio del recupero** (sostituisce la barra del timer):

- **A riposo:** banda `tribuna` da 64 pt con "Recupero 2 min" e il pulsante testo "Avvia recupero".
- **In corso:** banda `tribuna` con il filo di legno di 3 px sul bordo alto che si accorcia da destra a sinistra (fine tagliata a 12°), "Recupero" in `label`, il tempo a 72 px sul tabellone, l'icona "notifica non programmata" quando serve, "+15 s" e "Salta" da 56 pt.
- **Finito:** tutta la banda diventa `plate-green` con testo `arena`: "Recupero finito" e "+0:12" a 72 px. Un tocco la chiude (invariato). Il cambio è una dissolvenza del fondo di 240 ms.
- Il calcolo resta da `endAt` (invariato, SPEC §7).

Fogli: elenco degli esercizi della sessione (stesso vocabolario di segni: corrente = banda blu, fatto = luci verdi, saltato = nome barrato e "Saltato"), menu dell'esercizio, selettore per sostituire o aggiungere, calcolatore dei dischi (§7.4), sessione da chiudere.

### 7.4 Calcolatore dei dischi

È l'unico posto in cui i colori dei dischi sono quelli reali (invariato). Il disegno diventa un bilanciere visto di lato a tutta larghezza: manicotto in `acciaio`, dischi con altezza proporzionale al diametro reale e il numero scritto dentro ciascun disco (il colore non è mai l'unica informazione). Sotto, "Per lato: 20 + 10 + 2,5" con le cifre sul tabellone. Il segmented sceglie il bilanciere da 20, 15 o 10 kg.

### 7.5 Allenamento terminato (riepilogo)

Intento: il momento di soddisfazione. Totali, record, confronto con l'ultima volta.

1. Titolo grande "Allenamento terminato" e "Giornata A, Petto e tricipiti".
2. **Tabellone dei risultati:** tre colonne separate da filetti verticali, senza riquadri. Durata, Serie, Volume ("12.450 kg"), etichette in `label` sopra, valori sul tabellone a 32 px. Sotto, "Volume +4,2% rispetto all'ultima giornata A" con le cifre sul tabellone.
3. **Record battuti**, con il numero allineato a destra nel titolo di sezione: ogni record è un sottopancia con linguetta `plate-yellow` e trofeo, il nome dell'esercizio e il tipo di record, e il valore in `plate-yellow` sul tabellone a 28 px.
4. **Esercizi:** lista con la serie migliore e "l'ultima volta 80×8" in `fumo`.
5. Note e "Fatto".

Momento firma: §8.3.

### 7.6 Programmi ed esercizi

- **Programmi:** titolo grande, segmented "Programmi" / "Esercizi". Il programma attivo porta la linguetta di legno "Attivo". Le righe mostrano nome e "4 giornate". Azioni come oggi. Gli archiviati stanno in una sezione richiudibile con il conteggio a destra.
- **Editor del programma:** il nome è un campo grande in `font-plate`, poi note e giornate. Ogni giornata ha la lettera sul tabellone a 32 px, il nome e "6 esercizi"; i pulsanti di riordino fanno scivolare la riga; poi "Aggiungi giornata".
- **Editor della giornata:** righe con numero d'ordine, nome, "4 × 8–12, 2 min" con le cifre sul tabellone, la parentesi di legno per le superserie, il riordino animato e "Aggiungi esercizio".
- **Foglio dell'esercizio di giornata:** stepper da 44 pt con valori a 28 px; recupero come chip (60, 90, 120, 180 s, "Personalizzato"); interruttore "In superserie con il successivo"; nota.
- **Libreria:** campo di ricerca su `fondale` con la lente; chip dei gruppi scorrevoli in orizzontale (scelto invertito); elenco per gruppo con intestazioni fisse (nome del gruppo in `font-plate` 20 e conteggio a destra).
- **Dettaglio esercizio:** nome in `font-plate`; attrezzo, incremento e gruppi in righe; nota permanente; tabella dei record con i valori in `plate-yellow`; grafici (§5.7); ultime sessioni con data e serie sul tabellone.
- **Nuovo esercizio e modifica:** campi, segmented per il tipo di registrazione, chip per i gruppi.

### 7.7 Storico

- Titolo grande "Storico"; sezioni per mese con intestazione fissa ("Ottobre 2026" in `font-plate` 20, "9 allenamenti" allineato a destra).
- Riga di sessione: a sinistra il giorno del mese sul tabellone a 28 px con il giorno della settimana in `label`; al centro "Giornata A" e il nome della giornata; a destra la durata sul tabellone e "22 serie, 12.450 kg" in `fumo`.
- **Dettaglio:** tabellone compatto dei totali come nel riepilogo, poi esercizi con le righe del tabellone delle serie (stesso componente della modalità allenamento, modificabili come oggi), note, "Elimina allenamento".
- Stato vuoto: "Nessun allenamento registrato. Inizia il primo dalla schermata Oggi."

### 7.8 Progressi

- Titolo grande "Progressi"; segmented "Esercizi" / "Gruppi muscolari" / "Costanza".
- **Esercizi:** riga "Peso corporeo" con l'ultimo valore sul tabellone; elenco degli esercizi con l'ultimo e1RM sul tabellone e la data.
- **Gruppi muscolari:** barre orizzontali delle serie della settimana, etichette dirette, fascia 10–20 in `pedana` al 18% con la dicitura "indicativa"; barra `luce` dentro la fascia, `fumo` fuori. Andamento di 12 settimane per il gruppo scelto con i chip.
- **Costanza:** calendario del mese a sette colonne; i giorni di allenamento sono cerchi `luce` pieni con il numero in `arena`; oggi ha un anello `pedana`. Sotto, gli allenamenti per settimana: barre `fumo`, `luce` quando l'obiettivo è raggiunto, linea dell'obiettivo in `pedana`.
- **Peso corporeo:** campo con stepper, grafico a linea, elenco delle misurazioni.
- Momento firma: §8.5.

### 7.9 Impostazioni

Sezioni con titoli in `label`: Allenamento (obiettivo settimanale, recupero predefinito, avvio automatico del timer, suono), Incrementi di peso (una riga per attrezzo con il valore sul tabellone), Notifiche del timer, Backup (data dell'ultimo backup, "Esporta backup", "Importa backup"), Archiviazione (barra sottile `luce` su `fondale` con "12,4 MB" e lo stato della persistenza), Versione. Valori allineati a destra sul tabellone.

## 8. Momenti firma

### 8.1 Vocabolario dei segni

Uguale in tutta l'app (disciplina 5 di §3.3):

| Stato | Segno |
|---|---|
| Corrente, in corso | banda `plate-blue` a tutta larghezza |
| Completata, fatta | luci `plate-green` accese |
| Prevista, da fare | valori in `fumo`, luci spente |
| Saltato | nome barrato e "Saltato" in `fumo` |
| Record | numeri `plate-yellow` e trofeo |
| Riscaldamento | "R", valori ridotti in `fumo` |
| Selezionato (filtro, segmento) | inversione `luce` / `arena` |

### 8.2 Il tabellone dei tentativi (mossa firma)

È la mossa firma del mondo. Alla pressione di "Conferma serie":

1. Le tre luci della riga si accendono in sequenza (70 ms l'una dall'altra).
2. La banda blu scivola sulla serie successiva (`--dur-enter`), e i valori della riga completata passano da `fumo` a `luce`.
3. La linguetta passa da "2/4" a "3/4" con la tendina.
4. L'orologio del recupero parte (comportamento invariato).

La conferma si scrive in IndexedDB subito, come oggi: l'animazione segue il dato e non lo ritarda mai. Se è l'ultima serie e l'app passa all'esercizio successivo, il nuovo sottopancia entra con la tendina.

**Record in sovraimpressione:** quando la serie confermata è un record, un sottopancia giallo entra con la tendina sopra il tabellone, con trofeo, "Record" e il tipo e il valore ("Miglior e1RM, 110 kg"). Resta 2,5 s ed esce. Non blocca nessun tocco ed è annunciato con `aria-live="polite"`. Il rilevamento esiste già (Fase 2): cambia solo la presentazione.

### 8.3 Il tabellone dei risultati

All'apertura del riepilogo, una volta sola:

1. I tre totali contano da zero al valore in 600 ms (`--ease-out`), con cifre tabellari, quindi senza spostamenti.
2. I record entrano uno dopo l'altro con la tendina (120 ms di distanza).

Con reduced motion tutto è subito al suo posto.

### 8.4 La chiamata in pedana (Oggi)

All'apertura dell'app il pettorale entra con la tendina (240 ms), una volta sola per avvio, non a ogni ritorno sulla tab. Nient'altro si anima all'avvio: la lista di partenza è subito ferma.

### 8.5 Progressi

Il punto del valore più recente nel grafico dell'e1RM è un'etichetta diretta (sottopancia piccolo con il valore). Se è un record, è gialla. Nessun'altra animazione.

## 9. Stati e casi limite

Da verificare nella fase di implementazione (impeccable `harden`):

- Nomi lunghi ("Estensioni sopra la testa con manubrio"): la targa va su due righe, poi tronca con l'ellissi; il nome completo resta accessibile.
- Numeri: "122,5", "1.000", volume "12.450 kg", durata oltre l'ora ("1:02:15"), recupero oltre 9:59, tempo extra lungo ("+12:30"), dieci o più serie, settimane con più allenamenti dell'obiettivo.
- Tipi di registrazione: `bodyweight_reps` ("× 12", zavorra "+10 kg × 8"), `duration` ("45 s").
- Primo utilizzo: nessuno storico (segnaposto del target negli stepper), nessun programma, nessun record, grafici con un solo punto.
- iPhone SE (375 × 667) e Pro Max (430 × 932): il tabellone delle serie e l'orologio non vanno a capo, il piede fisso lascia spazio alla serie corrente.
- Tastiera aperta sullo stepper in allenamento: "Conferma serie" resta raggiungibile.
- Dynamic Island e safe area in alto e in basso.
- Caricamento: oggi le schermate restituiscono `null` finché le query non rispondono; resta così, ma senza salti di layout quando arrivano i dati. Niente spinner.

## 10. Accessibilità

- Contrasti di §5.2. Nessun testo piccolo in `plate-red` o `plate-blue` su `arena`.
- Target di 44 pt, 56 pt in allenamento. Azioni primarie nella metà inferiore dello schermo.
- Ogni stato ha un nome accessibile, non solo un colore: le luci ("completata"), i record ("record"), la serie corrente, la linguetta ("Serie 2 di 4").
- Focus visibile: anello di 2 px in `luce` con 2 px di distanza.
- `prefers-reduced-motion` rispettato ovunque (§5.6).
- Il carattere personalizzato non rimpicciolisce nulla: minimo 13 px, input a 16 px o più.

## 11. Vincoli tecnici

- **Non cambiano:** `src/db/`, lo schema Dexie, il formato del backup, il Worker, le push, il service worker, le regole di `src/domain/`. Si aggiungono solo funzioni pure di presentazione, con test (totali della lista di partenza; altre se servono, sempre in `src/domain/`).
- **I componenti non fanno calcoli** (CLAUDE.md): conti di animazione a parte, ogni numero mostrato viene da `src/domain/`.
- **Dipendenze:** `motion` (approvata). Versione e uso con React 19 e Vite 8 verificati sulla documentazione aggiornata al momento del piano. Nessun'altra.
- **Font:** due woff2 in `public/fonts/` (Archivo tondo e corsivo, latino), presi dal servizio di Google Fonts o sottoinsiemati dai file OFL; licenza OFL accanto ai file. Sono già coperti dal precache (`globPatterns` include `woff2`).
- **Budget:** font in tutto 250 KB al massimo; il JavaScript principale cresce di 45 KB gzip al massimo; nessun calo di fluidità sul tabellone (si animano solo transform, opacity e clip-path).
- **Icone dell'app:** `scripts/gen-icons.ts` genera le nuove icone nel mondo: fondo `arena`, il disco blu da 20 kg con il mozzo `luce` e un anello sottile in `pedana`, leggibile a 60 px e dentro l'area sicura delle maskable. Attenzione: iOS non aggiorna l'icona di una web app già sulla Home, e togliere l'icona cancella i dati. La nuova icona si vede dopo un export, una reinstallazione e un import, a discrezione dell'utente.
- **Documenti da aggiornare:** SPEC §10 (colori del manifest e di `theme-color`), §11 riscritto per il nuovo design (o rimando a `DESIGN.md`), §12 con una sezione "Redesign" e la sua checklist. `DESIGN.md` e `.impeccable/design.json` li scrive il documentatore di impeccable a fine lavoro.
- **Dati dimostrativi** solo in sviluppo: `src/db/demo.ts` riempie IndexedDB con un programma realistico, otto settimane di sessioni con record e una sessione in corso con il recupero attivo. Si carica con un import dinamico solo se `import.meta.env.DEV` e l'URL contiene `?demo`, e non deve mai finire nel bundle di produzione (verifica sul build). Serve agli screenshot di verifica.
- **Ambiente:** su questa macchina Bun non è installato e manca `node_modules`. Il piano parte installando Bun e le dipendenze.

## 12. Verifica e criteri di accettazione

- `bun run check` passa (typecheck, lint, test).
- `grep` dei vecchi token (`rubber`, `iron`, `chalk`, `steel`) in `src/` restituisce zero risultati.
- Screenshot del server di sviluppo con `?demo`, viewport 390 × 844 e 375 × 667, in `.impeccable/review/`: Oggi, allenamento (serie corrente, recupero in corso, recupero finito, record), riepilogo, programmi, editor della giornata, libreria, dettaglio esercizio, storico, dettaglio sessione, i tre segmenti di Progressi, impostazioni, un foglio aperto. Browser headless disponibile sulla macchina (Edge o Chrome), senza dipendenze nuove.
- `impeccable detect --json` sui file cambiati, una volta, con i rilievi meccanici corretti.
- Revisione finale di `impeccable-finish-reviewer` con esito "ship", entro due giri di correzioni.
- Regressione sul telefono con `bun run deploy:preview` (dati separati dalla produzione): allenamento completo in modalità aereo, chiusura forzata e ripresa dalla stessa serie, recupero con notifica a schermo bloccato, "+15 s" e "Salta", reduced motion attivo in Impostazioni iOS.
- Deploy in produzione solo dopo l'ok dell'utente sull'anteprima.

## 13. Uso di impeccable nelle fasi 2 e 3

Il piano (fase 2) segue questo ordine. Ogni task UI inizia leggendo `reference/craft-floor.md` della skill e il surface brief con il contratto di direzione.

| Passo | Comando impeccable | Contenuto |
|---|---|---|
| 0 | `surface-brief write` | contratto di direzione (§4) nel surface brief |
| 1 | `typeset`, `colorize` | token di `@theme`, font, base CSS, classi globali, `chartTheme`, colori del manifest, icone |
| 2 | `extract` | primitive: pulsanti, Stepper con cifre che scorrono, Segmented, Sheet con trascinamento, Header con titolo grande, tab bar, Tab, NamePlate, Lights, ScoreNumber |
| 3 | — | modalità allenamento e orologio del recupero, calcolatore dei dischi, barra "Allenamento in corso" |
| 4 | — | Oggi |
| 5 | `delight` | riepilogo e record in sovraimpressione |
| 6 | — | programmi, giornate, libreria, dettaglio esercizio |
| 7 | — | storico e dettaglio sessione |
| 8 | (skill `dataviz`) | progressi e peso corporeo |
| 9 | — | impostazioni e avviso di aggiornamento |
| 10 | `animate` | transizioni di route, momenti firma, reduced motion |
| 11 | `harden`, `adapt` | casi limite di §9, iPhone SE e Pro Max |
| 12 | `audit` | accessibilità, prestazioni, budget |
| 13 | `detect`, screenshot, `impeccable-finish-reviewer` | revisione finale, al massimo due giri |
| 14 | `impeccable-documenter` | `DESIGN.md` e `.impeccable/design.json`; aggiornamento di SPEC |

`polish` chiude il passo 13, sulle sole indicazioni del revisore. Le schermate dei passi 3–9 sono task indipendenti dopo i passi 1–2, quindi si prestano all'esecuzione SDD con un subagente per task.

## 14. Fuori ambito

- Tema chiaro (scelta della direzione, §5.1).
- Nuove funzioni: si aggiungono solo presentazioni di dati che esistono già (totali, recupero nella barra "Allenamento in corso", record in sovraimpressione).
- Dialoghi di conferma personalizzati: `confirmAction` resta il `confirm()` nativo di iOS.
- Feedback aptico (non esiste su iOS web), riordino con il trascinamento, gergo di gara nei testi.
- Modifiche a dati, schema, backup, Worker e push.

## 15. Da confermare nella revisione

1. **Solo tema scuro**, anche se il tema chiaro era permesso: la direzione è un'arena.
2. **Recupero nella barra "Allenamento in corso"**: piccola aggiunta di presentazione, usa `settings.activeTimer` che esiste già.
3. **Dati dimostrativi in sviluppo** (`src/db/demo.ts` con `?demo`), solo per gli screenshot.
4. **Nuova icona dell'app**, con il limite di iOS descritto in §11.
5. **Segnale sonoro di fine recupero**: oggi è un beep. Facoltativo: un segnale a due toni da cronometro di gara, sempre in Web Audio e senza file audio.
