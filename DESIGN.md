# Runway: Design System

Working title: Runway. Placeholder, change freely.

This file is the visual source of truth. The verify step judges screenshots against it. If a screen conflicts with this file, the screen is wrong, unless Nolan changes the file. Reviewed 2026-10-17 with gstack /plan-design-review; decisions D2 to D5 below are Nolan's, the rest were applied as recommended and listed in the review changelog.

## Current direction: Dusk (decision D7, supersedes conflicting rules below)

Decision D7 (Nolan, 2026-10-18): the first two builds looked like a styled web page. The game now commits to Dusk, chosen from four mockups (docs/design-options/): a painted night chart with a glowing cockpit HUD. Where this section conflicts with the rest of this file, this section wins.

- Default theme is the dusk (night) chart whatever the device says; the day chart and "follow my device" are settings.
- Palette tokens: `--paper` void, `--paper-raised` bezel and plate, `--ink` warm cream text, `--ink-soft`, `--line`, `--airspace` lit amber (primary action, pivots number, selected), `--blue` cyan (data, verified route), `--blackbox` emergency orange (report and crashes only), `--ok` green, `--on-airspace`, `--on-blackbox` for text on those fills.
- Type: Saira Condensed for the interface and instruments, Fraunces for the report and map labels (italic on the map).
- Glows (text-shadow, box-shadow, blurred strokes) and gradients are now allowed, used for light sources only: lit numbers, the primary button, waypoints, the route, the plane. Still no ALL CAPS.
- Radius is 10 px for panels and controls. The 4 px spacing scale, 44 px tap targets and 16 px reading text are unchanged.
- The primary button is lit amber with a pressed lip, text `--on-airspace`; one per screen.
- Layout is an app shell, not a page: the HUD and the dock are pinned and only the middle region scrolls (the report scrolls inside its card, and Fly again is always visible).
- Route chips encode evidence in their border: dotted untested, dashed weak, solid cyan verified.

## Concept

Every run is a flight. Cash is fuel, but the gauge counts pivots remaining, not months, because a startup's real runway is how many times it can change course before the money ends. Waypoints are hypotheses. Weather is the market. A failed run is an accident investigation: the player reads a report that names the probable cause and the contributing factors, then flies again.

The visual vernacular is aviation paperwork and instruments: sectional charts, airspace boundaries, flight-data readouts, investigation reports. It suits a game about navigating uncertainty and it is rare in indie games.

## Where the boldness goes

One element is allowed to be loud: the accident report. It is the moment players share, and it is where the lesson lands. Everything else stays quiet and precise so the report carries weight.

The black-box orange (`--blackbox`) is reserved for this moment and for true crash warnings. It never appears as a decorative accent elsewhere.

## Rejected defaults

The first instinct for a startup game is a dark theme with a neon accent, or cream paper with a warm clay accent, rounded cards, and gradient washes. All were rejected as interchangeable with every other generated product. Also rejected: ALL CAPS labels above every heading, middle-dot meta strings, and monospace for small data. Instrument labels use sentence case and a condensed sans.

The night theme is the likeliest place to slip back into the template (navy plus one hot accent), so its primary action is pale ink, not a bright color (decision D3). Cards are used only where a card is the interaction, such as a selectable problem space. Screens are layouts, not stacks of cards.

## Illustrated direction (added after the first playable build)

Decision D6 (Nolan, 2026-10-17): the first build read as a web form, so the game commits to illustrated aviation. All art is drawn in code, seeded so each world draws its own terrain.

- The world fills the screen behind the game. In a run and on the board the map is open, with a cockpit bar on top and a plate and dock at the bottom; every other screen is a card over the dimmed map. The route sits in the open band between the HUD parts, and the details panel is a sheet behind "Log and details" on phone.
- The route chart is a sectional map: grid, contour lines, a lake, tree marks, a compass, an airfield marker per customer group and a flag at the destination. The evidence line language is unchanged (dotted untested, dashed weak, solid blue verified) and every segment still carries a text label in the list below.
- A plane flies the route as weeks pass (the map is the answer to "Wait a week"; the move is 700 ms, ease-out, removed under reduced motion).
- Pivots remaining is also a cockpit dial: one arc per pivot beside the large number.
- Interview answers are paper entries with a tag that echoes the line language: solid border for fact, dashed for fluff, dotted for compliment.
- The accident report is a taped paper form with a flight number, weeks flown and outcome, the orange headline band, and a stamp that slams in once as part of the reveal ("Cause found", or "Default alive" in green for a landing).
- A faint paper grain sits behind the page. Still no gradients, no shadows, and the black-box orange stays on the report.

## Screens and navigation

Screen inventory:

| Screen | Job | Reached from |
|---|---|---|
| Board (front door) | See the route and take the next action | Opening the game; Fly again |
| Run setup | Pick one of three problem spaces and a founder | Start a run |
| Week | The board during a run: instruments, chart, actions | Run setup |
| Interview | Hold a customer conversation and read the debrief | Interview a customer |
| Result | Read what a test or event revealed, see the chart update | Any test or event |
| Report | Learn the probable cause of a crash, then restart | Run end |
| Field notes | Review patterns met, questions that worked | Menu |
| Settings sheet | Theme, sound, reduced motion, reset progress | Menu |

Front door (decision D4): the board is the front door. There is no title screen. It shows the dotted route, the pivots gauge and one primary button, "Start a run". With a saved run in progress the primary button reads "Continue flight" and a secondary text button reads "Start a new run". A small menu control at the right end of the instrument strip opens one sheet holding Field notes and Settings.

```
Board ----> Run setup ----> Week <----> Interview / Result / Event
  ^                          |
  |                          v
  +---- Fly again <------ Report
Menu (any screen): Field notes, Settings
```

Navigation rules: no persistent tab bar. Sheets dismiss with a tap outside, a close control, Escape, or the system back gesture. The system back gesture never leaves the game in the middle of a run. A run saves after every action so a refresh restores it.

Hierarchy on the Week screen, in reading order:
1. Pivots remaining, the largest number.
2. The chart: how much of the route is dotted, dashed or solid.
3. The one primary action for this week.
4. Cash and week, as supporting readouts.
5. Log and detail, available on demand.

## Color

Light is the default ("day chart"). Dark ("night chart") follows the system setting and the in-game toggle.

| Token | Day | Night | Role |
|---|---|---|---|
| `--paper` | #E8EEE9 | #0E1A2A | Page background, chart paper |
| `--paper-raised` | #F5F8F5 | #16263B | Panels, sheets |
| `--ink` | #16243A | #E6EDF2 | Primary text, linework, primary action fill |
| `--ink-soft` | #4A5A70 | #9FB0C2 | Secondary text |
| `--line` | #B5C2BC | #2C415A | Hairlines, grid |
| `--airspace` | #B5266B | #E0589A | Boundaries, selected state, focus ring |
| `--on-airspace` | #F5F8F5 | #0E1A2A | Text and icons on `--airspace` fills (about 5.7:1 day, 5.0:1 night) |
| `--blue` | #2E6BB0 | #6BA3E0 | Information, verified route, links |
| `--amber` | #B87500 | #E8A317 | Warnings, low fuel |
| `--ok` | #2F8F5B | #4FC17F | Confirmed good signal |
| `--blackbox` | #F2551B | #FF6A33 | Accident report and crash only |

Primary action (decision D3): the primary button is filled with `--ink` and its text uses `--paper`, in both themes (about 12.9:1 day, 14.5:1 night). Magenta is kept for boundaries, selection and focus, so it keeps one meaning across screens. Because the primary button is quieter than a bright color, it is always full width at the bottom of the phone layout, 44 px minimum height, and the only filled button on screen.

Contrast rules: never put `--ink` text on an `--airspace` fill, use `--on-airspace` (that pairing measured 4.38:1 at night and failed AA). Body text on `--paper` must meet 4.5:1. `--blackbox` is used as a fill with dark text on top, never as small text on paper. In the night theme `--ink` is light and fails on orange, so text on `--blackbox` and `--ok` fills uses the fixed dark tokens `--on-blackbox` (#16243A, about 5.7:1) and `--on-ok` (#0E1A2A), in both themes. `--airspace` text on paper is about 5:1.

Color is meaning. Magenta means "boundary or selected." Blue means "information, and tested route." Amber means "attention soon." Green means "verified by paying customers or real behavior," never "you did something." Never use color alone: pair it with an icon, a line style or a label.

## Type

Two families, clearly distinct.

- Barlow Semi Condensed for the interface: 400, 500, 600. Tabular figures on all numbers (`font-variant-numeric: tabular-nums`). Condensed width keeps instruments compact on a phone.
- Source Serif 4 for the accident report and any long reading. A report set in serif reads as an official document, which is the point.

Scale (px, mobile first; desktop scales the base by 1.0625):

| Step | Size / line | Use |
|---|---|---|
| `--t-xs` | 12 / 16 | Instrument captions only |
| `--t-sm` | 14 / 20 | Captions, timestamps, numeric deltas only |
| `--t-md` | 16 / 24 | Body, log entries, interview transcript, callouts, buttons |
| `--t-lg` | 20 / 26 | Panel titles |
| `--t-xl` | 28 / 32 | Key readouts |
| `--t-2xl` | 44 / 44 | Report headline, the pivots readout |

Reading text is never below 16 px. 12 and 14 px are for captions and labels only. Serif body gets 1.55 line height, sans body 1.4. Line length under 70 characters. Sentence case everywhere. No ALL CAPS labels, no letterspaced eyebrows.

Fonts are self-hosted through Fontsource packages (no third-party request, works offline), `font-display: swap`, with system condensed and serif fallbacks. Load only the weights and Latin subset in use. Target: fonts under 120 KB combined.

## Spacing

A 4 px base scale: 4, 8, 12, 16, 24, 32, 48. Use only these values.

- Side gutter 16 px on phone, 24 px from 600 px up.
- Space between related items 8 px, between groups 16 or 24 px, between sections 32 or 48 px.
- A heading always has more space above it than below it (at least 1.5 times), so it reads as belonging to what follows.
- Instrument strip padding 12 px vertical.

## Layout

Phone portrait is the primary canvas (390 x 844). Wider screens reuse the same composition and widen the chart; they do not become a different app.

| Viewport | Layout |
|---|---|
| 360 to 599 wide (phone portrait) | Single column. Instrument strip, chart, detail as a bottom sheet, primary action pinned to the bottom with the safe-area inset |
| 600 to 899 wide, or phone landscape (height under 500) | Two columns. Chart on the left, a side panel on the right holding detail and the primary action. The instrument strip becomes one compact row |
| 900 and up | Same two columns, chart up to 560 px, side panel 320 px, centered with a 960 px maximum. No empty right half: the side panel always carries the log and the selected item |

```
Phone portrait                     600 and up
+------------------------+         +----------------------------------------+
| instruments            |         | instruments (one row)                  |
|  pivots  cash  week  = |         +------------------------+---------------+
+------------------------+         |                        | log and       |
|                        |         |  chart                 | selected      |
|  chart                 |         |  (hypotheses and       | item detail   |
|  (the map of what you  |         |   route so far)        +---------------+
|   believe and tested)  |         |                        | primary action|
|                        |         |                        | secondaries   |
+------------------------+         +------------------------+---------------+
| detail sheet (slides up)|
+------------------------+
| primary action          |
+------------------------+
```

Alignment: left-aligned text, numbers right-aligned in columns, instruments center their readouts. Primary actions live in the bottom third on phone. Minimum tap target 44 x 44.

Structure encodes information:
- Airspace lines (dashed magenta) mark a decision boundary you are about to cross.
- A solid blue line is what you have already tested and verified.
- A dashed grey line is weak evidence, such as compliments or a hypothetical answer.
- A dotted grey line is an assumption not yet tested. The chart always shows how much of the route is dotted. That ratio is the core teaching visual.
- Each route segment also carries a text label ("Untested", "Weak evidence", "Verified") so the meaning never depends on line style or color alone.
- Numbered markers appear only for the actual sequence of weeks on the route.

Radius: panels 4 px, controls 6 px, nothing else rounded. Shadows: none. Depth comes from hairlines and the paper-raised fill, not drop shadows.

## Components

- Pivots gauge: a segmented bar, one segment per pivot remaining, with the count as the largest number on screen. Cash is secondary and sits next to it, so the pivots reading is what players learn to watch.
- Instrument strip: three to four readouts, each with a caption and a value, plus the menu control. Values tick, they do not animate wildly.
- Chart: SVG, drawn in code. Gridlines, a compass rose that doubles as the loading mark, waypoint markers for hypotheses.
- Detail sheet: bottom sheet on phone, side panel from 600 px. Shows one selected hypothesis, customer, or result.
- Action buttons: one primary per screen (filled `--ink`, `--paper` text), secondaries as outlined. Labels are verbs: "Interview a customer," "Charge for a test," "Pivot."
- Interview card: transcript-style lines for a customer conversation, with the player's question type visible and the signal quality revealed after the call, not during.
- Callout: a short note anchored to the thing it explains (see First-run teaching).
- Accident report: the loud element, described below.

## Interaction states

What the player sees in each state. "Instant" means the simulation answers in the same frame, so no spinner is shown.

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Chart | Instant | Grid and one dotted route with "No tests yet. Interview a customer to start your route." | If drawing fails, show the hypotheses as a text list with the same labels | A segment turns solid blue and its label changes to "Verified" | Mix of dotted, dashed and solid with counts: "2 verified, 1 weak, 3 untested" |
| Interview | Instant | Four question types to choose from, each with one example question | Not applicable | Transcript plus a debrief tag on each answer: Fact, Fluff or Compliment | Customer ends the call early: "The customer ended the call after 2 questions." Shows what was learned so far |
| Result | Instant | "No one paid. That is information." with the next action offered | Not applicable | Evidence tier and the change on the chart | Small sample: "Only 4 visitors. Treat this as weak evidence." |
| Detail sheet | Instant | "Select a point on the route to see what you know about it." | Not applicable | Selected item with its evidence | Evidence from only one source is marked as such |
| Report | Reveal sequence (see below) | Not applicable | If no cause is found: "No single dominant cause." followed by the closest factors with the run's numbers | Probable cause, contributing factors, what would have changed it | Fewer than three contributing factors are shown without padding |
| Field notes | Instant | "No patterns met yet. Each flight adds a page." | Not applicable | Pattern pages with the run that taught each one | Pages for patterns seen once are marked "Seen once" |
| Saved run | "Restoring your flight" shown only if it takes over 300 ms | "Start a run" | Blocked storage: "Progress will not be saved in this browser. You can keep playing." Corrupt save: "We could not restore your last flight. Start a new run." | "Continue flight" | Not applicable |
| Settings | Instant | Not applicable | Not applicable | Change applies immediately and is announced to screen readers | Not applicable |

## First-run teaching

Decision D5: contextual callouts, never a tutorial. There are at most five, each shown once, at the moment it first matters, one at a time, dismissible with a tap, never blocking an action:

1. The first time pivots remaining changes: what a pivot is and why the gauge counts them instead of months.
2. The first time the chart shows a dotted segment: that it means untested.
3. The first interview: that question types give different quality of answer.
4. The first verified (solid blue) segment: that paying customers or real behavior is what turns a line solid.
5. The first crash: that the report names a cause and that Fly again starts a new run.

Callout copy is one or two plain sentences at 16 px, anchored with a small pointer to the element it explains. A "Callouts" switch in Settings turns them off, and Reset progress turns them back on.

## The accident report

Decision D2: the full reveal plays once per new cause, and a compressed reveal plays for causes the player has already seen. The reveal is always skippable with a tap.

Full reveal, about 2.4 seconds:
1. The chart freezes and the instrument strip dims.
2. A black-box orange band wipes across from the left behind the report title.
3. The serif report sets in line by line: Summary, Probable cause, Contributing factors, What would have changed the outcome.

Compressed reveal, about 0.8 seconds: the band wipes in and the report appears at once, with no line-by-line typing. The game stores the list of causes already seen.

The report names the failure by its catalog ID (for example V1, build first and ask later) and cites the matching lesson from the Lean Startup or Mom Test shelf. Tone is the NTSB register: plain, factual, no blame, no jokes.

Example headline: "The product shipped after 11 months. The first buyer conversation happened in month 11."

A "Fly again" button sits at the bottom, large, and works immediately, including during the reveal. Fast restart is a design requirement for a roguelike.

## Motion

- Only one non-triggered moment: the accident report reveal.
- Everything else answers input: 120 to 200 ms, ease-out, showing what changed (a segment fills, a line turns from dotted to solid).
- `prefers-reduced-motion` removes the wipe and typing and shows the report immediately.
- No entrance fades on sections, no hover lift on cards, no bounce easing, no pulsing indicators.

## Sound

Soft instrument ticks for readout changes, a low tone for warnings, one distinct sound for the report. Off until the first tap (browser rule), with a visible mute control. All sound is generated in code (Web Audio), no files.

## Copy voice

- Plain language, sentence case, active voice, verbs on buttons.
- The same action keeps the same name everywhere: "Charge for a test" produces a toast that says "Test charged."
- Errors say what happened and what to do. Empty states invite an action.
- The game never lectures. It shows consequences, then names the cause in the report.
- No hustle-culture slogans, no "crush it," no get-rich language. The tone treats the player as a capable adult.

## Browser surfaces

Theme the parts of the page the browser draws, so nothing looks like an unstyled default:
- `color-scheme: light dark` on the root, with the `data-theme` override.
- `::selection` uses `--airspace` at about 25% opacity behind `--ink` text.
- `caret-color` and form `accent-color` use `--airspace`.
- Scrollbars: `scrollbar-color` with `--line` on a transparent track, thin width.
- `<meta name="theme-color">` set per scheme to `--paper`.
- `-webkit-tap-highlight-color` transparent, with the focus ring and pressed state doing the work.
- Links that appear in long text keep a visited color different from unvisited, with an underline offset of 3 px.

## Accessibility, input and quality floor

- WCAG AA contrast, keyboard-complete, visible focus ring (2 px `--airspace` with 2 px offset), screen-reader labels on all instruments.
- Landmarks: the instrument strip is the banner, the board is main, the detail sheet is a labelled region, the report is an article with real headings. Readout changes that matter (week, pivots) go to one polite live region, no more than once per action.
- Keyboard: Tab order follows the reading hierarchy. Arrow keys move between hypotheses on the chart, Enter selects, Escape closes a sheet, number keys 1 to 4 trigger the first four actions.
- Controller: the D-pad moves a visible focus between regions and items, A confirms, B goes back or closes a sheet, Start opens the menu. Focus never gets lost after a sheet closes.
- Touch: no action depends on hover or on a swipe alone. Safe-area insets respected.
- Text scales to 200% without clipping or horizontal scroll.
- Controller and keyboard navigation map to the same actions as touch.
- Responsive from 360 px up with no horizontal scroll.
- Respects `prefers-color-scheme` and `prefers-reduced-motion`.
- Performance budget: first load under 1.5 MB total, interactive under 2 s on a mid-range phone, 60 fps interactions.

## Verify checklist for screenshots

A verifier node checks each screenshot (390 x 844, 800 x 1000 and 1280 x 800, day and night) against these questions:
1. Does the pivots count read as the largest number on the main screen?
2. Is the black-box orange absent everywhere except the report and crash warnings?
3. Are all text/background pairs at AA contrast?
4. Is anything ALL CAPS, rounded beyond spec, shadowed, or gradient-filled?
5. Are numbers tabular and right-aligned in columns?
6. Does the dotted, dashed, and solid line language match the meanings above, with a text label on each segment?
7. Is there horizontal scroll or a tap target under 44 px?
8. Is any reading text below 16 px?
9. Is there exactly one filled button, and is it `--ink` with `--paper` text?
10. Does every spacing value come from the 4 px scale?
11. At 600 px and wider, is the side panel filled, with no empty half screen?

Taste, game feel, and "does it look expensive" stay with Nolan. Mark those `[HUMAN]` in the roadmap.

## Review decisions

- D1: review mode. Taste calls asked individually, mechanical fixes applied and listed.
- D2: report reveal is full once per new cause, compressed on repeats.
- D3: primary action is `--ink` fill in both themes. Magenta stays for boundaries, selection and focus. This also changes the day button from magenta to ink.
- D4: the board is the front door, no title screen.
- D5: contextual callouts for first-run teaching, at most five.
- Applied as recommended: screen inventory and navigation, interaction states table, spacing scale, 16 px reading-text floor, browser-surface theming, viewport and input specs, accessibility landmarks, expanded verify checklist.

## Not in scope for this design pass

Sound asset direction beyond the generated-ticks rule, the share-card image design (M8), the stages beyond default-alive and any billionaire-arc visuals, localization, a tablet-specific layout beyond the 600 px two-column, and a 3D hub.
