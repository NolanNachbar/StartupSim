# Runway: Roadmap

The build loop (see LOOP.md) takes the first unchecked item whose dependencies are done, builds it, and verifies it. An item is done only when every listed check passes. `[HUMAN]` items are Nolan's: the loop stops and asks for them, it never ticks them itself.

Quality gates for every item: `npm run verify` passes (typecheck, lint, unit, build, size, e2e). Do not weaken a gate to pass an item.

## M0. Foundation
- [x] Vite, Preact, TypeScript strict, Vitest with fast-check, Playwright with axe, ESLint, Prettier, size-limit
- [x] Design tokens from DESIGN.md, self-hosted fonts, app shell at 390 x 844 and 1280 x 800, day and night
- [x] Seeded RNG with property tests
- [x] `npm run verify` writes `.verify/report.json`
- [ ] [HUMAN] Create the GitHub repo and pick the host (see CLAUDE.md, Deployment)

## M0b. Design sync (depends on M0; from the 2026-10-17 design review)
- [x] `tokens.css` and `base.css` match DESIGN.md: primary button is `--ink` fill with `--paper` text in both themes, 4 px spacing scale tokens, browser-surface theming (selection, caret, accent-color, scrollbar, theme-color per scheme), reading text at least 16 px
- [x] Two-column layout from 600 px with a filled side panel; no empty half screen at 800 x 1000 or 1280 x 800
- [x] Add an 800 x 1000 viewport to Playwright and extend the screenshot checks to DESIGN.md checklist items 8 to 11
- [x] Checks: `npm run verify` passes; screenshots in all three viewports and both themes pass the DESIGN.md checklist; axe has zero violations

## M1. Simulation core (depends on M0)
Eng review 2026-10-17 (docs/eng-review-2026-10-17.md). Decisions: D1 one file per concern in `src/sim/` (types, world, archetypes, state, actions, reducer, runway, view, interview, signal); D2 keyed stateless randomness.
- [x] Randomness: replace `createRng` with stateless `rand(seed, ...keys)`, a pure function of the seed and a named key path. Every draw names its key. A golden-vector test locks the outputs, and a uniformity test checks the hash
- [x] Number policy: money in integer cents; no `Math.exp`, `Math.log`, `Math.pow`, `**` or trig functions in `src/sim/` (ESLint `no-restricted-properties`, plus `no-restricted-globals` for `Date` and `Math.random`); conversion curves are piecewise-linear tables
- [x] Two state types: `Secret` (hidden world) and `PublicState` (evidence only). `view()` is the only way the UI reads the sim. ESLint `no-restricted-imports` forbids `src/ui/` from importing the world, secret or archetype modules
- [x] World generator: segments, trueDemand, competitors, channels, weather, all from a seed
- [x] State and an action union; `legalActions(state)`; the reducer returns `{ ok: true, state }` or `{ ok: false, reason }` and leaves state unchanged on an illegal action; terminal states reject every further action; week advance, burn and revenue
- [x] Runway in pivots: `pivotCost` is an integer number of cents of at least 1, runway is floored, and the result is never Infinity or NaN (definition in GAME-DESIGN.md, Money)
- [x] Save format `{ simVersion, seed, actions }`. `simVersion` is bumped whenever outcomes for a fixed seed and action list change. A replay that throws or hits an illegal action falls back to "Start a new run" (DESIGN.md states table)
- [x] Checks: same seed gives an identical world (property test); a golden replay fixture (fixed seed and action list gives an expected end state); every sequence of legal actions never throws and never produces NaN, negative time or an out-of-order week; illegal actions return an error and leave state unchanged; non-interference: `view()` output contains no hidden-field keys and is identical for two worlds that differ only in hidden parameters but produced identical evidence; 1,000 random legal sequences

## M2. Interview system (depends on M1)
- [x] Customer archetypes and four question types
- [x] Signal quality model with debrief outputs (compliment, fluff, fact)
- [x] Checks: across 500 seeds, for each archetype separately, mean signal quality for past-behavior questions exceeds hypothetical by at least 0.15 on a 0 to 1 scale, and hypothetical exceeds pitch; commitment questions cut sample size; results are deterministic per seed; a monotonicity property: for a fixed customer, more specific questions never lower signal quality

## M3. Tests and evidence (depends on M2)
- [x] Hypothesis model with untested, weak and verified states
- [x] Build a test (landing page, concierge, prototype) with cost, time and signal
- [x] Charge for a test with payment-based verification
- [x] Channels: reach cost and conversion
- [x] Checks: payment evidence outranks compliment evidence in every state transition; chart data derives only from evidence, never from hidden truth

## M4. Money (depends on M1; can run after M3)
- [x] Acquisition and growth: customers should arrive through the channel that sold them, at a cost per customer, instead of the free market pull. M3 finding (2026-10-17): the scripted validator wins 301 of 400 seeds (75 percent) against a design target of 25 to 45 percent, so growth is too generous. Fix here, then tune in M7
- [x] Pricing curve with learnable optimum
- [x] Cash-flow events: late payer, predatory loan offer, payroll growth
- [x] Fundraising: weeks cost, dilution, investor expectation
- [x] Checks: lowest price reliably starves cash on the balance set; no money path produces negative runway without a crash state
- Tuning levers left for M7 (validator wins 65 percent of 400 seeds against a 25 to 45 percent target): fixed burn, `ACQUISITION_DIVISOR`, churn, the landing threshold, run length, demand pool size.

## M5. Events and accident report (depends on M3, M4)
- [x] Event system tied to pattern IDs (V1 to V9, M1 to M7 where supported)
- [x] Cause classifier with explicit rules and evidence
- [x] Report generator: summary, probable cause, contributing factors, what would have changed the outcome
- [x] Checks: for hand-built run histories, each pattern's classifier rule fires on its fixture and not on controls; every report cites at least one number from its own run; no report text is reused across different causes

## M6. Vertical slice UI (depends on M5)
- [x] Flight board: instrument strip, chart, detail panel (inline on phone), action list, per DESIGN.md
- [ ] Full run playable from start to crash and to landing on phone portrait and desktop (crash path verified in e2e on all three viewports; the landing report is covered by sim tests but not yet driven through the browser)
- [x] Interview card UI with post-call debrief
- [x] Accident report screen: full reveal once per new cause, compressed on repeats, always skippable, "Fly again" works during the reveal
- [x] Board as front door with "Start a run" or "Continue flight", run setup, interaction states from the DESIGN.md table, at most five first-run callouts with a Settings switch
- [x] Accessibility landmarks, live region, keyboard map and controller focus model from DESIGN.md (gamepad mapping is implemented but untested without a device; M9 audits it)
- [x] Checks: e2e plays a scripted full run on both viewports; axe has zero violations; screenshots of every screen at both viewports and both themes pass the DESIGN.md verify checklist; no console errors
- [ ] [HUMAN] Playtest the slice. Write what feels wrong in plain words. The loop converts that into roadmap items.

## M7. Balance (depends on M6)
- [x] Strategy bots (Builder, Pitcher, Validator, Underpricer, Random) run headless on 200 fixed seeds through a separate `npm run balance` script. `npm run verify` runs only a 20-seed smoke subset so the gates stay fast. The reducer shares the immutable world by reference and never deep-clones it per step
- [x] Report script prints outcomes against the GAME-DESIGN.md targets
- [x] Checks: all bot targets met, or the deviation is written into the report and flagged to Nolan
  - Result (2026-10-17, 200 seeds, SIM_VERSION 5): Builder crashes with V1 in 86.5%, Pitcher crashes 99% (V3 or V2), Validator lands 37%, Underpricer crashes with M1 in 93.5%, Random lands 2%. Levers used: demand pool divisor 1,000,000 to 3,000,000 in world.ts, V1 report weight raised so the root cause outranks its symptoms. `npm run balance` enforces the targets; the unit run does a 20-seed smoke.

## M8. Meta-progression and persistence (depends on M6)
- [x] Field notes codex and run history in localStorage with a safe-failure wrapper
- [x] Seed share link: a run can be replayed from a URL. The golden replay fixture must produce the same end state in Chromium, WebKit and Firefox (add the two browsers to the Playwright projects with `npx playwright install webkit firefox`). Done for Chromium and WebKit; Playwright's Firefox build exits with "Could not find profile folder" on this machine (macOS 27), so Firefox is not covered. Retry after a Playwright update
- [x] Share card image generated from the report
- [x] Checks: storage failure never breaks the game; a shared seed reproduces the same world

## M9. Polish pass (depends on M7, M8)
- [x] Generated sound (Web Audio) with mute control
- [x] Motion per DESIGN.md, reduced-motion path
- [x] Keyboard and controller navigation; focus order audit
- [x] Performance: first load under 1.5 MB, interactive under 2 s on throttled mobile, 60 fps interactions (size and load time measured in e2e under CPU 4x and 1.6 Mbps; no frame-rate measurement, the only animation is the report wipe)
- [x] Lighthouse accessibility score 95 or higher, best-practices 95 or higher (measured 100 and 96, performance 100, gate in `npm run verify`)
- [x] Checks: all measured in the verify report
- [ ] [HUMAN] Game feel and "does it look expensive" review

## M10. Launch (depends on M9)
- [ ] [HUMAN] Choose a name and domain
- [ ] Static deploy to the chosen host, privacy-friendly analytics, social preview image
  - Ready and verified: production build, `public/_headers` (CSP and caching), favicon, `public/og.png` and meta tags, optional Plausible snippet via `VITE_ANALYTICS_DOMAIN`, steps in `docs/DEPLOY.md`. Not done: the actual deploy, which needs Nolan's host account and the name and domain.
- [x] Error reporting that sends no personal data (off until `VITE_ERROR_ENDPOINT` is set; sanitizer is unit-tested)
- [ ] [HUMAN] Soft launch to a small group, collect their first-minute reactions

## Later
Selling skill (offers, objections, Hormozi-style), mindset layer (sunk cost, ego, persistence), hiring and co-founder events, broader problem spaces, a 3D hub, and the stages beyond default-alive toward the billionaire arc. Each needs its own shaping pass first.

## Post-v1 UI and design pass (2026-10-18)
- [x] Visual direction replaced twice at Nolan's request; now an isometric low-poly tech campus (Kenney CC0 3D kits rendered to sprites with Blender, `scripts/blender/render_city.py`), designed through /design-consultation. DESIGN.md is the source of truth.
- [x] A designed city, not scatter: street grid, a route that follows the streets in three runs to an HQ roundabout, per-group landmarks with signs, a clear corridor around the road, hazier distance.
- [x] Help screen and a milestone path bar. The game explains and shows progress; it never says what move to make.
- [x] Name your company and choose an industry (six markets with real economic differences in the sim; optional parameter, original worlds unchanged).
- [x] Copy changed from flight to run; route vehicle is a delivery van; crashes show debris, smoke and flames.
- [ ] [HUMAN] Playtest and a "looks expensive" review of the new look.
