---
# gstack: design-md-format=spec
name: Runway
description: A cozy 16 px pixel-art overworld you fly across, built from real tile art, where a plain accident report is the one loud moment.
colors:
  primary: "#ffcc00"
  on-primary: "#3f2631"
  ink: "#3f2631"
  surface: "#e9d6a8"
  surface-raised: "#f7efd6"
  text: "#3f2631"
  text-muted: "#6b4455"
  grass: "#84c669"
  dirt: "#eaa56c"
  stone: "#c0cbdc"
  sky: "#1ea7e1"
  verified: "#1ea7e1"
  accent: "#e86a17"
  flame: "#fc683b"
  success: "#73cd4b"
  warning: "#ffbd20"
  error: "#c34b35"
typography:
  display:
    fontFamily: Pixelify Sans
    fontWeight: 700
    fontSize: 2.5rem
  heading:
    fontFamily: Pixelify Sans
    fontWeight: 600
    fontSize: 1.25rem
  body:
    fontFamily: Pixelify Sans
    fontWeight: 400
    fontSize: 1.0625rem
    lineHeight: 1.4
  label:
    fontFamily: Pixelify Sans
    fontWeight: 400
    fontSize: 0.875rem
rounded:
  none: 0px
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
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  report-headline:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
---

# Runway

## Overview

**Creative North Star:** A real little indie game: a sunny pixel overworld you fly across, lit by hand-made art rather than interface effects, with one stark moment when it tells you why you crashed.

**Product context:** Runway is a free, phone-first browser roguelike. The player runs a startup through the lean-startup loop (interview customers, build, test channels, charge, price, raise) and either lands "default alive" or crashes and reads an accident report that names the probable cause. Players are curious, game-literate people on phones, not business readers.

**Mode per surface:** the world and report are Experience; the HUD, action dock and forms are Operate.

**Reference and art sources (all CC0, verified 2026-10-18):** Kenney Tiny Town (16 px terrain, trees, houses, fences, dirt paths, coins), Kenney Pixel Shmup (16 px planes, explosions, flags, pixel digits), Kenney Pixel UI Pack (colored and parchment 9-slice panels and buttons). Font: Pixelify Sans by Stefie Justprince, SIL OFL-1.1, weights 400 to 700, from Fontsource.

**Key characteristics:**
- The first five seconds: a bright tile map with a little plane, red-roof houses and a flag, framed by wooden panels, and one yellow button.
- Pivots remaining is the biggest number, repeated as a row of little planes, one per pivot, spent ones greyed.
- The map is real tile art assembled by code from the world's seed, so every run has its own island.
- No gradients, no glows, no blur. Depth is a hard pixel offset.
- Honest limit: Kenney art appears in many indie games. Distinctiveness comes from composition, palette discipline and the report, not from the sprites.

## Colors

**Strategy:** Committed. Every hue is sampled from the assets (ink from Tiny Town's outline, the greens, dirt and stone from its tiles, yellow, blue, orange and green from the Pixel UI Pack, flame from the Shmup explosions), so the UI and the world share one palette.

**Light or dark:** Light. It is a daytime overworld played on a phone in ordinary light. There is no night theme.

Yellow is the one primary action per screen. Blue means verified or tested (the solid route line). Orange and flame belong to the accident report and crash warnings only. Green means a confirmed good signal. Red is for errors. Never rely on color alone: pair it with a line style, an icon or a label.

## Typography

One pixel family for every role: Pixelify Sans 700 for the display and the pivots number, 600 for headings and HUD values, 400 for body and labels. Body is 17 px; anything meant to be read is never below 16 px. Instrument captions (14 px) are the one exception. Pixelify Sans is loaded from the self-hosted Fontsource package (`@fontsource/pixelify-sans`), no third-party request, `font-display: swap`, Latin subset only. Sentence case everywhere, never ALL CAPS.

## Layout

An app shell, not a page. The tile world fills the screen. A pixel top bar holds the HUD, a wooden dock holds the actions, and only the middle region scrolls. Phone portrait (390 x 844) is the primary canvas. From 600 px the same composition scales up and a side panel carries the log and the selected item. Art is drawn at 16 px and scaled by whole numbers only (3x on phone, 4x on desktop) so pixels stay crisp; the canvas never uses fractional scaling. Spacing uses a 4 px base: 4, 8, 12, 16, 24, 32, 48.

## Elevation & Depth

Panels sit on the map with a hard one-pixel-unit offset shadow in `ink`, as in the source art. No blur, no halo, no gradient.

## Shapes

Square, pixel-edged. Radius is zero; the Pixel UI Pack 9-slice frames provide the stepped corners. Buttons and panels are drawn with `border-image` from the pack, scaled by whole numbers.

## Components

- **Top bar (HUD):** a parchment panel with the pivots number (largest), a row of plane sprites (one per pivot, spent greyed), cash with a coin, and the week.
- **Route chips:** one per customer group on a raised-paper chip. Border encodes evidence: dotted untested, dashed weak, solid blue verified. Each chip also carries the words Untested, Weak evidence or Verified.
- **Primary button:** yellow 9-slice, ink text, 44 px minimum height, one per screen. Pressed state uses the pack's pressed frame.
- **Secondary buttons:** white or parchment 9-slice, ink text.
- **Map:** houses are customer-group airfields, a flag is the destination, a sprite plane flies the route. Evidence lines are drawn in pixels on the map: dotted, dashed, solid blue.
- **Accident report:** the loud screen. A 6-frame crash scene (plane falls, Shmup explosion sprites) plays once per new cause (compressed on repeats, always skippable), then an orange signboard headline over a parchment sheet with the cause, contributing factors, what would have changed it and the numbers. "Fly again" is always visible and works during the reveal.
- **States:** hover is never relied on. Focus is a 2 px ink outline with a yellow inner ring, always visible. Disabled uses the grey 9-slice. Empty, error and loading states keep the plain copy from the interaction table in `docs/DESIGN-aviation-dusk-2026-10-18.md`.

## Do's and Don'ts

- Do: scale pixel art by whole numbers and use `image-rendering: pixelated` everywhere art appears.
- Do: keep pivots remaining the largest number on the main screen.
- Do: keep WCAG AA contrast, 44 px tap targets, 16 px reading text, a keyboard-complete UI and a reduced-motion path.
- Do: keep the orange for the accident report and crash warnings only.
- Don't: draw scenery, sprites or mascots with CSS or SVG shapes. Use the real assets or ship nothing.
- Don't: use gradients, glows, blurred shadows, ALL CAPS labels or a second typeface.
- Don't: use emoji, hustle slogans or get-rich language. The tone is plain and treats the player as a capable adult.

## Motion

- **Approach:** intentional, stepped.
- **Easing:** `steps()` for sprite animation; 120 to 200 ms ease-out only for panel state changes.
- **Duration:** micro 100 ms (button press), short 200 ms (panel changes), long about 2.4 s once (the crash sequence).
- **The one authored moment:** the crash sequence before the accident report. Under `prefers-reduced-motion` it shows the final frame at once. Everything else answers input: the plane advances one step along the route when a week passes.

## Game rules this design must serve

- Pivots remaining is the largest number; the gauge counts pivots, not months.
- Evidence language: dotted untested, dashed weak, solid verified, with a text label on each segment.
- Screens: board (front door, "Start a run" or "Continue flight"), run setup, week, interview, result, report, field notes, menu and settings. At most five first-run callouts, each shown once, with a Settings switch.
- Accessibility: landmarks (banner, main, labelled regions, report as an article), one polite live region, keyboard map (Tab order follows reading order, arrows between hypotheses, Escape closes, 1 to 4 for the first actions), controller map, text scales to 200 percent, no horizontal scroll from 360 px.
- Performance: first load under 1.5 MB, interactive under 2 s on a throttled phone. The sprite sheets are small PNGs (a few tens of KB each); the world is drawn to one canvas.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-18 | Replaced the aviation-paperwork and Dusk look with a pixel overworld built from Kenney CC0 assets | Nolan rejected the hand-written CSS/SVG UI as AI slop. gstack's image generator was unavailable (no OpenAI key), so the look comes from real licensed art, designed through /design-consultation |
| 2026-10-18 | Light theme only, one pixel typeface (Pixelify Sans) | A daytime overworld on a phone; one family keeps the pixel look coherent |
| 2026-10-18 | No hand-drawn illustration | Scenery and sprites are real assets or absent |
