# Runway: Design System

Working title: Runway. Placeholder, change freely.

This file is the visual source of truth. The verify step judges screenshots against it. If a screen conflicts with this file, the screen is wrong, unless Nolan changes the file.

## Concept

Every run is a flight. Cash is fuel, but the gauge counts pivots remaining, not months, because a startup's real runway is how many times it can change course before the money ends. Waypoints are hypotheses. Weather is the market. A failed run is an accident investigation: the player reads a report that names the probable cause and the contributing factors, then flies again.

The visual vernacular is aviation paperwork and instruments: sectional charts, airspace boundaries, flight-data readouts, investigation reports. It suits a game about navigating uncertainty and it is rare in indie games.

## Where the boldness goes

One element is allowed to be loud: the accident report. It is the moment players share, and it is where the lesson lands. Everything else stays quiet and precise so the report carries weight.

The black-box orange (`--blackbox`) is reserved for this moment and for true crash warnings. It never appears as a decorative accent elsewhere.

## Rejected defaults

The first instinct for a startup game is a dark theme with a neon accent, or cream paper with a warm clay accent, rounded cards, and gradient washes. All were rejected as interchangeable with every other generated product. Also rejected: ALL CAPS labels above every heading, middle-dot meta strings, and monospace for small data. Instrument labels use sentence case and a condensed sans.

## Color

Light is the default ("day chart"). Dark ("night chart") follows the system setting and the in-game toggle.

| Token | Day | Night | Role |
|---|---|---|---|
| `--paper` | #E8EEE9 | #0E1A2A | Page background, chart paper |
| `--paper-raised` | #F5F8F5 | #16263B | Panels, sheets |
| `--ink` | #16243A | #E6EDF2 | Primary text and linework |
| `--ink-soft` | #4A5A70 | #9FB0C2 | Secondary text |
| `--line` | #B5C2BC | #2C415A | Hairlines, grid |
| `--airspace` | #B5266B | #E0589A | Primary interactive color: boundaries, selected state, primary actions |
| `--on-airspace` | #F5F8F5 | #0E1A2A | Text and icons on `--airspace` fills (about 5.7:1 day, 5.0:1 night) |
| `--blue` | #2E6BB0 | #6BA3E0 | Information, charts, links |
| `--amber` | #B87500 | #E8A317 | Warnings, low fuel |
| `--ok` | #2F8F5B | #4FC17F | Confirmed good signal |
| `--blackbox` | #F2551B | #FF6A33 | Accident report and crash only |

Contrast rules: never put `--ink` on an `--airspace` fill, use `--on-airspace` (the night pairing with `--ink` measured 4.38:1 and failed AA). Body text on `--paper` must meet 4.5:1 (ink does, about 13:1). `--blackbox` is used as a fill with `--ink` text on top (about 4.6:1), never as small text on paper. `--airspace` text on paper is about 5:1.

Color is meaning. Magenta means "you can act here." Blue means "this is information." Amber means "attention soon." Green means "verified by paying customers or real behavior," never "you did something." Never use color alone: pair it with an icon or label.

## Type

Two families, clearly distinct.

- Barlow Semi Condensed for the interface: 400, 500, 600. Tabular figures on all numbers (`font-variant-numeric: tabular-nums`). Condensed width keeps instruments compact on a phone.
- Source Serif 4 for the accident report and any long reading. A report set in serif reads as an official document, which is the point.

Scale (px, mobile first; desktop scales the base by 1.0625):

| Step | Size / line | Use |
|---|---|---|
| `--t-xs` | 12 / 16 | Instrument captions |
| `--t-sm` | 14 / 20 | Secondary text, log entries |
| `--t-md` | 16 / 24 | Body, buttons |
| `--t-lg` | 20 / 26 | Panel titles |
| `--t-xl` | 28 / 32 | Key readouts |
| `--t-2xl` | 44 / 44 | Report headline, the pivots readout |

Serif body gets 1.55 line height, sans body 1.4. Line length under 70 characters. Sentence case everywhere. No ALL CAPS labels, no letterspaced eyebrows.

Fonts are self-hosted through Fontsource packages (no third-party request, works offline), `font-display: swap`, with system condensed and serif fallbacks. Load only the weights and Latin subset in use. Target: fonts under 120 KB combined.

## Layout

Phone portrait is the primary canvas (390 x 844). Desktop reuses the same composition and widens the chart; it does not become a different app.

```
Phone portrait                     Desktop
+------------------------+         +----------------------------------------+
| instruments            |         | instruments (full width strip)         |
|  pivots  cash  week    |         +------------------------+---------------+
+------------------------+         |                        | log and       |
|                        |         |  chart                 | selected      |
|  chart                 |         |  (hypotheses and       | item detail   |
|  (the map of what you  |         |   route so far)        |               |
|   believe and tested)  |         |                        +---------------+
|                        |         |                        | actions       |
+------------------------+         +------------------------+---------------+
| detail sheet (slides up)|
+------------------------+
| actions (thumb zone)   |
+------------------------+
```

Alignment: left-aligned text, numbers right-aligned in columns, instruments center their readouts. Primary actions live in the bottom third on phone. Minimum tap target 44 x 44.

Structure encodes information:
- Airspace lines (dashed magenta) mark a decision boundary you are about to cross.
- A solid blue line is what you have already tested and verified.
- A dotted grey line is an assumption not yet tested. The chart always shows how much of the route is dotted. That ratio is the core teaching visual.
- Numbered markers appear only for the actual sequence of weeks on the route.

Radius: panels 4 px, controls 6 px, nothing else rounded. Shadows: none. Depth comes from hairlines and the paper-raised fill, not drop shadows.

## Components

- Pivots gauge: a segmented bar, one segment per pivot remaining, with the count as the largest number on screen. Cash is secondary and sits next to it, so the pivots reading is what players learn to watch.
- Instrument strip: three to four readouts, each with a caption and a value. Values tick, they do not animate wildly.
- Chart: SVG, drawn in code. Gridlines, a compass rose that doubles as the loading mark, waypoint markers for hypotheses.
- Detail sheet: bottom sheet on phone, side panel on desktop. Shows one selected hypothesis, customer, or result.
- Action buttons: one primary per screen (filled magenta, ink-on-paper inverse text), secondaries as outlined. Labels are verbs: "Interview a customer," "Charge for a test," "Pivot."
- Interview card: transcript-style lines for a customer conversation, with the player's question type visible and the signal quality revealed after the call, not during.
- Accident report: the loud element, described below.

## The accident report

When a run ends, the screen does one orchestrated sequence, about 2.4 seconds, skippable with a tap:
1. The chart freezes and the instrument strip dims.
2. A black-box orange band wipes across from the left behind the report title.
3. The serif report sets in line by line: Summary, Probable cause, Contributing factors, What would have changed the outcome.

The report names the failure by its catalog ID (for example V1, build first and ask later) and cites the matching lesson from the Lean Startup or Mom Test shelf. Tone is the NTSB register: plain, factual, no blame, no jokes.

Example headline: "The product shipped after 11 months. The first buyer conversation happened in month 11."

A "Fly again" button sits at the bottom, large, and works immediately. Fast restart is a design requirement for a roguelike.

## Motion

- Only one non-triggered moment: the accident report reveal.
- Everything else answers input: 120 to 200 ms, ease-out, showing what changed (a segment fills, a line turns from dotted to solid).
- `prefers-reduced-motion` removes the wipe and typing and shows the report immediately.
- No entrance fades on sections, no hover lift on cards.

## Sound

Soft instrument ticks for readout changes, a low tone for warnings, one distinct sound for the report. Off until the first tap (browser rule), with a visible mute control. All sound is generated in code (Web Audio), no files.

## Copy voice

- Plain language, sentence case, active voice, verbs on buttons.
- The same action keeps the same name everywhere: "Charge for a test" produces a toast that says "Test charged."
- Errors say what happened and what to do. Empty states invite an action.
- The game never lectures. It shows consequences, then names the cause in the report.
- No hustle-culture slogans, no "crush it," no get-rich language. The tone treats the player as a capable adult.

## Accessibility and quality floor

- WCAG AA contrast, keyboard-complete, visible focus ring (2 px `--airspace` with 2 px offset), screen-reader labels on all instruments.
- Controller and keyboard navigation map to the same actions as touch.
- Responsive from 360 px up with no horizontal scroll and 16 px side gutters.
- Respects `prefers-color-scheme` and `prefers-reduced-motion`.
- Performance budget: first load under 1.5 MB total, interactive under 2 s on a mid-range phone, 60 fps interactions.

## Verify checklist for screenshots

A verifier node checks each screenshot (390 x 844 and 1280 x 800, day and night) against these questions:
1. Does the pivots count read as the largest number on the main screen?
2. Is the black-box orange absent everywhere except the report and crash warnings?
3. Are all text/background pairs at AA contrast?
4. Is anything ALL CAPS, rounded beyond spec, shadowed, or gradient-filled?
5. Are numbers tabular and right-aligned in columns?
6. Does the dotted, dashed, and solid line language match the meanings above?
7. Is there horizontal scroll or a tap target under 44 px?

Taste, game feel, and "does it look expensive" stay with Nolan. Mark those `[HUMAN]` in the roadmap.
