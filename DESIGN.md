---
# gstack: design-md-format=spec
name: Runway
description: A tiny startup in a huge buzzing isometric tech campus, rendered from real low-poly 3D kits in warm afternoon light, where a plain accident report is the one loud moment.
colors:
  primary: "#3556e6"
  on-primary: "#ffffff"
  primary-pressed: "#2440b8"
  ink: "#262a44"
  text: "#262a44"
  text-muted: "#565c7a"
  surface: "#ffffff"
  surface-raised: "#f4f6fc"
  line: "#d7dcec"
  glass: "#80b0ff"
  grass: "#86c05f"
  road: "#8888a0"
  verified: "#1b7a45"
  verified-line: "#3ddc84"
  accent: "#c93d14"
  on-accent: "#ffffff"
  flame: "#ff8a3d"
  warning: "#8a5a00"
  error: "#b3261e"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontWeight: 800
    fontSize: 3.5rem
  heading:
    fontFamily: Bricolage Grotesque
    fontWeight: 700
    fontSize: 1.25rem
  body:
    fontFamily: Bricolage Grotesque
    fontWeight: 500
    fontSize: 1.0625rem
    lineHeight: 1.4
  label:
    fontFamily: Bricolage Grotesque
    fontWeight: 500
    fontSize: 0.875rem
rounded:
  sm: 8px
  md: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  report-headline:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
---

# Runway

## Overview

**Creative North Star:** One tiny startup in a huge, buzzing, slightly absurd city: a sunlit isometric tech-campus diorama of white towers, blue glass, roads and parks, with one stark moment when it tells you why you crashed.

**Inspiration:** the isometric low-poly city in the title sequence of HBO's Silicon Valley (Nolan's references). That artwork and its company logos are copyrighted, so nothing is copied: the buildings, roads, vehicles and trees are Kenney's CC0 3D kits, and any signage uses original fictional names.

**Product context:** Runway is a free, phone-first browser roguelike. The player runs a startup through the lean-startup loop (interview customers, build, test channels, charge, price, raise) and either lands "default alive" or crashes and reads an accident report that names the probable cause. Players are curious, game-literate people on phones, not business readers.

**Mode per surface:** the campus and the report are Experience; the HUD, action dock and forms are Operate.

**Art sources (all CC0, verified 2026-10-18):** Kenney City Kit (Commercial 2.1, Industrial, Roads), Kenney Car Kit and Kenney Nature Kit (3D models, glTF), and Kenney Particle Pack (smoke and fire, PNG). The models are rendered to isometric WebP sprites in Blender 5.2 by `scripts/blender/render_city.py` (orthographic 2:1 camera, warm sun, soft shadows baked per sprite). Font: Bricolage Grotesque by Mathieu Triay, SIL OFL-1.1, from Fontsource.

**Key characteristics:**
- The first five seconds: a bright isometric campus, a delivery van on a road climbing into the city, white panels and one blue button.
- Pivots remaining is the biggest number, repeated as a row of little vans, one per pivot.
- The city is laid out by code from the world's seed, so every run has its own campus. Each customer group is a building beside the road.
- Depth is a soft offset shadow, the way the diorama is lit. No zero-offset glows, no gradients.
- Honest limit: Kenney's kits are widely used. Distinctiveness comes from the composition, the lighting and the report.

## Colors

**Strategy:** Committed. The city's own palette owns the page: white and lavender-gray structures, periwinkle glass, flat green parks and lavender-gray roads (all sampled from the renders). The interface uses white panels, a deep indigo ink and one saturated blue for the action.

**Light or dark:** Light. It is a sunny afternoon diorama played on a phone in ordinary light. There is no night theme.

Blue is the one primary action per screen. Green means verified (the solid route line). The accident orange-red belongs to the accident report and crash warnings only. Never rely on color alone: pair it with a line style, an icon or a label.

## Typography

One family: Bricolage Grotesque. 800 for the pivots number and the report headline, 700 for headings, 500 for body and labels. Body is 17 px; anything meant to be read is never below 16 px. Instrument captions (14 px) are the one exception. Loaded from the self-hosted Fontsource package (`@fontsource/bricolage-grotesque`), `font-display: swap`, Latin subset only. Sentence case, never ALL CAPS.

## Layout

An app shell, not a page. The isometric campus fills the screen. A white HUD card holds the instruments at the top, a white plate and the action dock sit at the bottom, and only the middle region scrolls. Phone portrait (390 x 844) is the primary canvas; from 600 px the same composition scales up and a side panel carries the log and the selected item. One ground tile is a 2:1 diamond, 64 px wide on phones and 88 px on desktop; sprites are rendered at 2x and drawn at their natural scale so edges stay crisp. Spacing uses a 4 px base: 4, 8, 12, 16, 24, 32, 48.

## Elevation & Depth

Panels lift off the map with a soft shadow that has a real offset (about 0 4px 0 for the button lip and 0 8px 24px at low opacity for panels), matching a sun from the upper left. No halo, no glow.

## Shapes

Rounded to 12 px for panels and buttons, 8 px for chips and fields, full only for the small van and pin glyphs. Nested elements subtract their padding from the outer radius.

## Components

- **HUD card:** the pivots number (largest) beside a row of little vans, cash with a coin mark, and the week. Menu is a secondary button.
- **Path bar:** five milestone segments under "Your route" (Talk to customers, Build a test, Ask for money, Get paid, Cover your costs). It shows what has been achieved and never what to do next. The van advances along the road with these milestones, not with the calendar.
- **How to play:** a plain screen reachable from the HUD (the ? button), the menu and the h key. It explains the goal, the numbers, the map, the actions and how to read evidence, and ends with questions to think about. It never prescribes an order of play: working out how to win is the game.
- **Setup:** the player names their company (a name is suggested; free text, tidied to letters, digits and . , ' & -, at most 24 characters) and chooses an industry. Industries are real market differences in the sim (willingness to pay, reachability, market size, how polite interviewees are), described in plain words without numbers.
- **Route chips:** one per customer group. The border encodes evidence: dotted untested, dashed weak, solid green verified. Each chip also carries the words Untested, Weak evidence or Verified.
- **Primary button:** solid blue with a 4 px darker lip, white text, 56 px tall, one per screen. Pressed state drops the lip.
- **Secondary buttons:** white with a line border and indigo text.
- **The campus:** each customer group is a tower beside the road with a name plate; the route is a road that climbs the screen; evidence lines are painted on the road (white dots, white dashes, a solid green line); a delivery van drives the route as weeks pass.
- **Accident report:** the loud screen. A short crash scene (the van stopped on the road with scattered debris, smoke and flames) plays once per new cause (compressed on repeats, always skippable), then a red-orange headline panel over a white sheet with the cause, contributing factors, what would have changed it and the numbers. "Fly again" is always visible and works during the reveal.
- **States:** hover is never relied on. Focus is a 3 px indigo outline with a 2 px white gap, always visible. Empty, error and loading states keep the plain copy from the interaction table in `docs/DESIGN-aviation-dusk-2026-10-18.md`.

## Do's and Don'ts

- Do: use only sprites rendered from the Kenney kits, drawn at their render scale or an exact fraction.
- Do: keep pivots remaining the largest number on the main screen.
- Do: keep WCAG AA contrast, 44 px tap targets, 16 px reading text, a keyboard-complete UI and a reduced-motion path.
- Do: keep the accident orange-red for the accident report and crash warnings only.
- Don't: draw buildings, vehicles or logos with CSS or SVG shapes. Use the real renders or ship nothing.
- Don't: use real company logos or names. Signage uses original fictional names.
- Don't: use gradients, glows, ALL CAPS labels or a second typeface.
- Don't: use emoji, hustle slogans or get-rich language. The tone is plain and treats the player as a capable adult.

## Motion

- **Approach:** intentional, restrained.
- **Easing:** enter ease-out, exit ease-in, move ease-in-out.
- **Duration:** micro 100 ms (button press), short 200 ms (panel changes), the van's move between weeks 700 ms, the crash sequence about 2.4 s once.
- **The one authored moment:** the crash sequence before the accident report: the van stops, smoke rises, flames flicker, then the report appears. Under `prefers-reduced-motion` it shows the final frame at once. Everything else answers input.

## Game rules this design must serve

- Pivots remaining is the largest number; the gauge counts pivots, not months.
- Evidence language: dotted untested, dashed weak, solid verified, with a text label on each segment.
- Screens: board (front door, "Start a run" or "Continue run"), found your company (name and industry), week, how to play, interview, result, report, field notes, menu and settings. At most five first-run callouts, each shown once, with a Settings switch.
- Accessibility: landmarks (banner, main, labelled regions, report as an article), one polite live region, keyboard map (Tab order follows reading order, arrows between hypotheses, Escape closes, 1 to 4 for the first actions), controller map, text scales to 200 percent, no horizontal scroll from 360 px.
- Performance: first load under 1.5 MB, interactive under 2 s on a throttled phone. Only the sprites a screen needs are fetched (about 40 small WebP files); the world is drawn to one canvas.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-18 | Replaced the aviation-paperwork and Dusk look with a pixel overworld from Kenney 2D assets | Nolan rejected the hand-written CSS/SVG UI as AI slop. gstack's image generator needs an OpenAI key we do not have, so the look came from real licensed art |
| 2026-10-18 | Replaced the pixel overworld with an isometric low-poly tech campus | Nolan wanted the look of the Silicon Valley title sequence. Real assets: Kenney CC0 3D kits rendered to sprites in Blender. Approved under Nolan's standing delegation while away |
| 2026-10-18 | Light theme only, one typeface (Bricolage Grotesque, OFL-1.1) | A sunny diorama on a phone; one family with real personality keeps it coherent |
| 2026-10-18 | The route vehicle is a delivery van, not a plane | No CC0 aircraft kit exists; the Car Kit is real art and its debris pieces suit the crash. Copy changes from flight to run |
| 2026-10-18 | The game does not coach; it explains | Nolan: telling the player the exact move makes it not fun. A Help screen and a milestone bar replace a "next move" suggestion |
| 2026-10-18 | Name your company and choose an industry | Realism. Industries change the sim's hidden economics (optional parameter, original worlds unchanged); the name is display only |
| 2026-10-18 | No hand-drawn illustration, no real brand logos | Scenery and vehicles are real renders or absent; the show's logos are trademarks |
