---
name: Palestra
description: "Pedana di gara: the graphics of a weightlifting meet with a single athlete, in dark arena, wood and plate colours."
colors:
  arena: "#0b0c0e"
  tribuna: "#17191d"
  fondale: "#23262b"
  luce: "#f2f1ec"
  fumo: "#8f949b"
  filetto: "rgb(242 241 236 / 0.14)"
  pedana: "#b8875a"
  acciaio: "#9aa0a6"
  plate-blue: "#2453d6"
  plate-yellow: "#f6d43a"
  plate-green: "#2ba55b"
  plate-red: "#d93a2f"
  plate-white: "#f2f1ec"
typography:
  bib:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "96px"
    fontWeight: 800
    lineHeight: 0.9
  timer:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "72px"
    fontWeight: 800
    lineHeight: 1
  value:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
  large:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
  score:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1
  step:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
  name:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.4
  small:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  tag: "2px"
  control: "6px"
  sheet: "16px"
spacing:
  tap-min: "44px"
  tap-main: "56px"
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.plate-blue}"
    textColor: "{colors.luce}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "56px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.fondale}"
    textColor: "{colors.luce}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "56px"
    padding: "0 16px"
  chip:
    backgroundColor: "{colors.fondale}"
    textColor: "{colors.luce}"
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  chip-selected:
    backgroundColor: "{colors.luce}"
    textColor: "{colors.arena}"
  field:
    backgroundColor: "{colors.fondale}"
    textColor: "{colors.luce}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px"
  name-plate:
    backgroundColor: "{colors.luce}"
    textColor: "{colors.arena}"
    typography: "{typography.name}"
    rounded: "0px"
    padding: "8px 10px"
  tab-wood:
    backgroundColor: "{colors.pedana}"
    textColor: "{colors.arena}"
    rounded: "{rounded.tag}"
  tab-record:
    backgroundColor: "{colors.plate-yellow}"
    textColor: "{colors.arena}"
    rounded: "{rounded.tag}"
  sheet:
    backgroundColor: "{colors.tribuna}"
    textColor: "{colors.luce}"
    rounded: "{rounded.sheet}"
  set-row-current:
    backgroundColor: "{colors.plate-blue}"
    textColor: "{colors.luce}"
  timer-bar:
    backgroundColor: "{colors.tribuna}"
    textColor: "{colors.luce}"
    typography: "{typography.timer}"
    height: "96px"
  timer-bar-over:
    backgroundColor: "{colors.plate-green}"
    textColor: "{colors.arena}"
---

# Design System: Palestra

## Overview

**Creative North Star: "Pedana di gara"**

Every set is an attempt on the platform and the rest is the meet clock: the app is the broadcast graphics of a weightlifting competition with one athlete. A dark arena carries the light-coloured numbers, wood marks tabs, the clock wire and references, and the plate colours each keep one meaning. It is built to be read at arm's length under strong gym light and operated with one thumb.

Density is that of a scoreboard: big condensed italic numbers, one-pixel rules, near-square corners, no shadows. The felt moment is the set confirmation: three lights come on, the blue band slides to the next set, the clock starts.

The system rejects the rounded-card fitness dashboard, progress rings and neon accents.

**Key Characteristics:**
- Dark only (`color-scheme: dark`), arena ground, tribuna panels, luce text.
- Numbers in extra-condensed black italic; names in a condensed black italic plate face; text in roman Archivo.
- Blue means "act / current", green means "done", yellow means "record", red is destructive (icon only), wood is reference.
- Hairlines (0.5px) instead of boxes; flat, no shadow anywhere.
- Tap targets 44px minimum, 56px on the workout path.

## Colors

A near-black arena, a lighter stand, warm wood and four plate colours, each with a single job.

### Primary
- **Plate Blue** (#2453d6): the action and the current: primary button, the current set band, outlined progression suggestion, switch on, accent-color of inputs.

### Secondary
- **Platform Wood** (#b8875a): wood tabs (e.g. "2/4"), the shrinking clock wire on the timer bar, chart reference bands, text selection. Always a reference, never an action.

### Tertiary
- **Plate Green** (#2ba55b): completed. Lit judges' lights, "Recupero finito" bar.
- **Plate Yellow** (#f6d43a): personal record tab and flash.
- **Plate Red** (#d93a2f): destructive icon only; text stays luce because red text on arena is 4.3:1.
- **Plate White** (#f2f1ec): plate colour for the plate calculator, same value as luce.

### Neutral
- **Arena** (#0b0c0e): app background, text on light plates and tabs.
- **Tribuna** (#17191d): sheets, timer bar, panels, current-exercise body.
- **Fondale** (#23262b): secondary buttons, chips, fields, stepper buttons, pressed rows.
- **Luce** (#f2f1ec): numbers, text, focus ring, name plate, selected chip.
- **Fumo** (#8f949b): secondary text, labels, units, placeholders, unlit light outline.
- **Acciaio** (#9aa0a6): steel grey for the bar and neutral plate elements.
- **Filetto** (rgb(242 241 236 / 0.14)): the hairline for row and section rules.

### Named Rules
**The One Meaning Rule.** Each plate colour carries one meaning (blue act, green done, yellow record, red destroy). Never use one as decoration.
**The Wood Is Reference Rule.** Pedana wood marks labels, the clock wire and reference bands; it is never a button fill.

## Typography

**Display / Body Font:** Archivo (variable, self-hosted woff2 roman + italic, weight 100-900, width 62-125%), fallback system-ui, -apple-system, sans-serif.

**Character:** one family at different widths: roman and wide for reading, extra-condensed black italic for anything that is a number or a name, like on-screen meet graphics.

### Hierarchy
The scale is fixed in px (the default Tailwind scale is removed); only these steps exist.
- **Bib** (800 italic, 96px, 0.9): the largest result figure, Summary.
- **Timer** (800 italic, 72px, 1): the rest clock, full width.
- **Value** (800 italic, 44px, 1): stepper values of the current set (large steppers).
- **Large** (800 italic, 34px, 1.05): the four tab-screen titles.
- **Score** (800 italic, 32px, 1): numbers of the set board.
- **Step** (800 italic, 28px, 1): stepper values in sheets and forms.
- **Name** (800 italic, 26px, 1.1): exercise name on its plate, two lines max.
- **Title** (800 italic, 22px, 1.2): screen and sheet titles, small figures.
- **Body** (400, 17px, 1.4): text, buttons at weight 600.
- **Small** (600, 15px, 1.35): chips, secondary actions.
- **Label** (600, 13px, 87.5% width, 0.01em, sentence case): section titles, column heads, units, tab bar.

### Named Rules
**The Tabellone Rule.** Every number on screen uses the `num` face: italic, 62% width, 800, tabular figures.
**The Targa Rule.** Names and large titles use the `plate` face: italic, 75% width, 800.
**The Sentence Case Rule.** Labels are sentence case and never all caps.
**The 16px Input Rule.** Inputs are never below 16px (`max(16px, 1em)`); weights use decimal keyboard, reps numeric.

## Layout

Single column, portrait, phone only, 16px horizontal gutter. Rows are at least 56px (`row`), taps at least 44px, workout controls 56px (stepper 56pt targets, primary confirm 56px high in the thumb zone). Section titles sit with 24px top, 8px bottom padding. Safe areas are honoured with `env(safe-area-inset-*)` on the header, tab bar and timer bar; in standalone mode the page keeps `100lvh` min height. The workout screen stacks: header, lower-third (wood tab + light name plate, target, last time), set board, then the timer bar full width at the bottom.

## Elevation & Depth

Flat, with no shadows at all. Depth is tonal layering: arena below, tribuna for sheets and bars, fondale for controls, with 0.5px filetto hairlines between rows. Sheets are separated from the page by a 70% black backdrop (rgb(0 0 0 / 0.7)).

### Named Rules
**The No Shadow Rule.** No box-shadow in the system. Separation comes from tone and hairlines.

## Shapes

Almost square. Wood and record tabs have a 2px left radius and the right edge cut at the 12° italic angle (6px clip). Controls (buttons, chips, fields, stepper buttons) are 6px. Sheets are 16px at the top corners only. Exceptions in the world's own materials: the judges' lights (10px circles) and the switch (pill) are round. Fields show state through a 1.5px bottom border that turns luce on focus.

## Components

### Buttons
- **Shape:** 6px radius, 56px tall, full width.
- **Primary:** plate blue, luce text, body 17px weight 600. Pressed: scale 0.97 in 120ms. Disabled 40% opacity.
- **Secondary / danger:** fondale with luce text; danger keeps luce text with a red icon.
- **Text button:** 44px min, luce, pressed at 60% opacity.
- **Stepper buttons:** fondale, 56x56 (large) or 44x44, press scale 0.94.

### Chips
- Fondale, luce, small 15px/600, 44px tall; selected (`aria-pressed`) inverts to luce on arena. The action chip (progression suggestion) is outlined with a 1.5px blue inset ring, fills blue when pressed.

### Inputs / Fields
- Fondale fill, 6px radius, placeholder fumo, 1.5px transparent bottom border to luce on focus; native select with a fumo chevron. Stepper value digits roll (RollingNumber) on ±, and show the raw input while typing.

### Navigation
- Header: title in plate face (22px, or 34px on the four tab screens), back chevron in a 44px target. Tab bar: labels in the label style. Screen transitions slide 24px forward/back, 240ms.

### Lower third (name plate + wood tab)
- A wood tab (arena text, cut right edge) paired with a luce plate (arena text, name face 26px, 2.5/2 padding, two-line clamp). Record variant of the tab is yellow.

### Judges' lights
- Three 10px circles per set: green when lit, fumo (muted) for warm-ups, luce on a blue row; unlit ones are 1.5px outlines. On confirm they light in sequence, 70ms apart, `light-on` 180ms (scale from 0.4).

### Set board and current set
- Rows with hairline rules; the current set is a plate-blue band with 56pt steppers and 44px values; done sets sit on fondale. The confirm button is the blue primary.

### Timer bar
- Tribuna, 96px min height, 72px clock digits, a 3px wood wire across the top that shortens linearly (250ms). When rest ends the bar becomes plate green with arena text and counts overtime ("+m:ss").

### Sheets
- Native `<dialog>`, tribuna, 16px top radius, max 92dvh; in 320ms ease-out, out 200ms ease-in; backdrop fades.

### Motion
- Curves: ease-out cubic-bezier(0.22, 1, 0.36, 1) (default), ease-in cubic-bezier(0.5, 0, 0.75, 0), ease-in-out cubic-bezier(0.65, 0, 0.35, 1). Durations: wipe 240ms (clip-path from the left, the world's native motion), enter-forward/back 240ms, enter-fade 160ms, enter-rise 320ms, light-on 180ms, press 120ms, switch 180ms, rolling digits 180ms, count-up 600ms. Fills are `backwards` so no transform stays behind.
- Reduced motion: under `prefers-reduced-motion` all CSS transition and animation durations and delays are forced to 0s, and the motion library runs with `reducedMotion: "user"`.

## Do's and Don'ts

### Do:
- **Do** set every number in the `num` face and every name in the `plate` face.
- **Do** use plate blue for the single current action, green for done, yellow for record.
- **Do** separate with 0.5px filetto hairlines and tone steps (arena, tribuna, fondale).
- **Do** keep taps at 44px and workout-path controls at 56px, inputs at 16px or more.
- **Do** compute everything from the fixed px type scale; add a step only when a new role needs one.
- **Do** reveal graphics with the left-to-right wipe or the 240ms ease-out slide; honour reduced motion.

### Don't:
- **Don't** add shadows, gradients or rounded dashboard cards.
- **Don't** use progress rings or a neon accent.
- **Don't** set labels in all caps.
- **Don't** use wood as a button fill or a plate colour for decoration.
- **Don't** use red for text (4.3:1 on arena); use the icon.
- **Don't** put an animation on a transform that must persist (fixed or sticky children).
