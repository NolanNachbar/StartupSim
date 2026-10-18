# Runway: Roadmap

The build loop (see LOOP.md) takes the first unchecked item whose dependencies are done, builds it, and verifies it. An item is done only when every listed check passes. `[HUMAN]` items are Nolan's: the loop stops and asks for them, it never ticks them itself.

Quality gates for every item: `npm run verify` passes (typecheck, lint, unit, build, size, e2e). Do not weaken a gate to pass an item.

## M0. Foundation
- [x] Vite, Preact, TypeScript strict, Vitest with fast-check, Playwright with axe, ESLint, Prettier, size-limit
- [x] Design tokens from DESIGN.md, self-hosted fonts, app shell at 390 x 844 and 1280 x 800, day and night
- [x] Seeded RNG with property tests
- [x] `npm run verify` writes `.verify/report.json`
- [ ] [HUMAN] Create the GitHub repo and pick the host (see CLAUDE.md, Deployment)

## M1. Simulation core (depends on M0)
- [ ] World generator: segments, trueDemand, competitors, channels, weather, all from a seed
- [ ] State, action reducer, week advance, burn and revenue
- [ ] Runway in pivots calculation
- [ ] Checks: same seed gives an identical world (property test); no action can produce negative time or NaN; 1,000 random action sequences never throw

## M2. Interview system (depends on M1)
- [ ] Customer archetypes and four question types
- [ ] Signal quality model with debrief outputs (compliment, fluff, fact)
- [ ] Checks: across 500 seeds, past-behavior questions give higher average signal quality than hypotheticals, and pitch questions give the lowest; commitment questions cut sample size; results are deterministic per seed

## M3. Tests and evidence (depends on M2)
- [ ] Hypothesis model with untested, weak and verified states
- [ ] Build a test (landing page, concierge, prototype) with cost, time and signal
- [ ] Charge for a test with payment-based verification
- [ ] Channels: reach cost and conversion
- [ ] Checks: payment evidence outranks compliment evidence in every state transition; chart data derives only from evidence, never from hidden truth

## M4. Money (depends on M1; can run after M3)
- [ ] Pricing curve with learnable optimum
- [ ] Cash-flow events: late payer, predatory loan offer, payroll growth
- [ ] Fundraising: weeks cost, dilution, investor expectation
- [ ] Checks: lowest price reliably starves cash on the balance set; no money path produces negative runway without a crash state

## M5. Events and accident report (depends on M3, M4)
- [ ] Event system tied to pattern IDs (V1 to V9, M1 to M7 where supported)
- [ ] Cause classifier with explicit rules and evidence
- [ ] Report generator: summary, probable cause, contributing factors, what would have changed the outcome
- [ ] Checks: for hand-built run histories, each pattern's classifier rule fires on its fixture and not on controls; every report cites at least one number from its own run; no report text is reused across different causes

## M6. Vertical slice UI (depends on M5)
- [ ] Flight board: instrument strip, chart, detail sheet, action tray, per DESIGN.md
- [ ] Full run playable from start to crash and to landing on phone portrait and desktop
- [ ] Interview card UI with post-call debrief
- [ ] Accident report screen with the reveal sequence and "Fly again"
- [ ] Checks: e2e plays a scripted full run on both viewports; axe has zero violations; screenshots of every screen at both viewports and both themes pass the DESIGN.md verify checklist; no console errors
- [ ] [HUMAN] Playtest the slice. Write what feels wrong in plain words. The loop converts that into roadmap items.

## M7. Balance (depends on M6)
- [ ] Strategy bots (Builder, Pitcher, Validator, Underpricer, Random) run headless on 200 fixed seeds
- [ ] Report script prints outcomes against the GAME-DESIGN.md targets
- [ ] Checks: all bot targets met, or the deviation is written into the report and flagged to Nolan

## M8. Meta-progression and persistence (depends on M6)
- [ ] Field notes codex and run history in localStorage with a safe-failure wrapper
- [ ] Seed share link: a run can be replayed from a URL
- [ ] Share card image generated from the report
- [ ] Checks: storage failure never breaks the game; a shared seed reproduces the same world

## M9. Polish pass (depends on M7, M8)
- [ ] Generated sound (Web Audio) with mute control
- [ ] Motion per DESIGN.md, reduced-motion path
- [ ] Keyboard and controller navigation; focus order audit
- [ ] Performance: first load under 1.5 MB, interactive under 2 s on throttled mobile, 60 fps interactions
- [ ] Lighthouse accessibility score 95 or higher, best-practices 95 or higher
- [ ] Checks: all measured in the verify report
- [ ] [HUMAN] Game feel and "does it look expensive" review

## M10. Launch (depends on M9)
- [ ] [HUMAN] Choose a name and domain
- [ ] Static deploy to the chosen host, privacy-friendly analytics, social preview image
- [ ] Error reporting that sends no personal data
- [ ] [HUMAN] Soft launch to a small group, collect their first-minute reactions

## Later
Selling skill (offers, objections, Hormozi-style), mindset layer (sunk cost, ego, persistence), hiring and co-founder events, broader problem spaces, a 3D hub, and the stages beyond default-alive toward the billionaire arc. Each needs its own shaping pass first.
