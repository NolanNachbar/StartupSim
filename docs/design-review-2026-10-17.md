# Design plan review, 2026-10-17

Target: DESIGN.md (commit 38086f9 plus the review edits). Method: gstack /plan-design-review, text only. Mockups were not generated (the gstack designer needs an OpenAI key, which is not configured). Outside voices were not run (Codex reviews disabled in config).

## Design Review Completion Summary

```
  +====================================================================+
  |         DESIGN PLAN REVIEW: COMPLETION SUMMARY                     |
  +====================================================================+
  | System Audit         | DESIGN.md present, UI scope yes, no TODOS   |
  | Step 0               | 6/10 initial; mode B (taste calls only)     |
  | Pass 1  (Info Arch)  | 5/10 -> 9/10 after fixes                    |
  | Pass 2  (States)     | 2/10 -> 9/10 after fixes                    |
  | Pass 3  (Journey)    | 4/10 -> 8/10 after fixes                    |
  | Pass 4  (AI Slop)    | 7/10 -> 9/10 after fixes                    |
  | Pass 5  (Design Sys) | 7/10 -> 9/10 after fixes                    |
  | Pass 6  (Responsive) | 6/10 -> 9/10 after fixes                    |
  | Pass 7  (Decisions)  | 4 resolved, 5 deferred                      |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (6 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 0 items proposed (debt tracked in ROADMAP)  |
  | Approved Mockups     | 0 generated, 0 approved                     |
  | Decisions made       | 4 added to plan (D2 to D5)                  |
  | Decisions deferred   | 5 (listed below)                            |
  | Overall design score | 2/10 -> 8/10                                |
  +====================================================================+
```

Overall score is the lowest of the six rated passes. The 2/10 start was Pass 2 (no interaction states were specified). The 8/10 finish is Pass 3 (the emotional arc is specified but only a playtest can confirm it).

### Pass notes

- Pass 1: no screen inventory or navigation existed beyond the board and report. Added the inventory, flow, front-door rule and hierarchy order. Cap at 9 because run setup and the event card have no visual spec yet.
- Pass 2: no states were specified. Added the full states table.
- Pass 3: storyboard below. The repeat-death fatigue risk is addressed by D2. 8 because the arc cannot be verified before M6 playtesting.
- Pass 4: hard rejections, none triggered. Litmus: brand unmistakable in first screen, yes (pivots plus dotted route); one visual anchor, yes (the route); scannable by headlines, yes; one job per section, yes; cards necessary, no cards used except as selectable interaction; motion improves hierarchy, yes (one moment); premium without shadows, yes (none used). Findings: the night theme drifted toward the dark-plus-neon template (resolved by D3), and browser surfaces were unthemed (fixed).
- Pass 5: added a spacing scale, the 16 px reading-text floor and the `--on-airspace` token that came out of a real axe failure. `tokens.css` is out of sync until M0b, which keeps this pass at 9.
- Pass 6: the 1280 px desktop shell leaves the right half empty. Added viewport specs, keyboard and controller models, landmarks and live-region rules.

### Journey storyboard

| Step | Player does | Player feels | Plan specifies |
|---|---|---|---|
| 1 | Opens the link | Curious, five seconds to decide | Board as front door, dotted route, one button |
| 2 | Taps Start a run | Oriented | Run setup; callout 1 when pivots first changes |
| 3 | First interview | Engaged, slightly exposed | Question types, debrief tags, callout 3 |
| 4 | First test result | Surprise | Evidence tier, route turns solid or stays dotted, callouts 2 and 4 |
| 5 | Crash | Shock, then curiosity | Full report reveal, callout 5 |
| 6 | Reads the cause | Recognition ("that was me") | Probable cause with the run's own numbers |
| 7 | Fly again | Determination | Restart under one second, works during the reveal |
| 8 | Fifth crash | Mastery | Compressed reveal for seen causes |
| 9 | Returns next day | Pulled back | Continue flight or Start a run, field notes |

Time horizons: 5 seconds is the board's visual identity, 5 minutes is the first run and first crash, 5 years is remembering the lesson (a founder asking a customer about the last time they hit the problem).

## NOT in scope

- Sound asset direction beyond the generated-ticks rule. Revisit at M9.
- Share-card image design. Revisit at M8.
- Stages beyond default-alive and any billionaire-arc visuals. Needs its own shaping pass.
- Localization.
- A tablet-specific layout beyond the 600 px two-column.
- A 3D hub.

## What already exists

- `DESIGN.md`: tokens, type, concept, the report as the one loud moment.
- `src/styles/tokens.css` and `base.css`: the M0 shell, including the instrument strip, pivots gauge and chart panel to reuse.
- `.verify/screens/`: M0 screenshots in two viewports and both themes, used as review evidence.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding above.

- [ ] **T1 (P1, human: ~1h / CC: ~10min)**: design tokens: sync tokens.css and base.css with DESIGN.md
  - Surfaced by: Pass 4 and 5, primary button, browser surfaces, spacing scale, 16 px floor
  - Files: src/styles/tokens.css, src/styles/base.css, src/app.tsx
  - Verify: `npm run verify`; checklist items 8 to 10 on screenshots
- [ ] **T2 (P1, human: ~2h / CC: ~15min)**: layout: two-column from 600 px with a filled side panel
  - Surfaced by: Pass 6, desktop shell leaves the right half empty
  - Files: src/styles/base.css, src/app.tsx
  - Verify: screenshots at 800 x 1000 and 1280 x 800, checklist item 11
- [ ] **T3 (P1, human: ~1h / CC: ~10min)**: verify harness: add 800 x 1000 viewport and checklist items 8 to 11
  - Surfaced by: Pass 6, new viewport and checks
  - Files: playwright.config.ts, tests/e2e/smoke.spec.ts
  - Verify: `npm run e2e` produces three viewports
- [ ] **T4 (P2, human: ~1d / CC: ~30min)**: interaction states: empty, error, partial per the states table
  - Surfaced by: Pass 2
  - Files: src/ui/
  - Verify: e2e covers each state
- [ ] **T5 (P2, human: ~4h / CC: ~20min)**: first-run callouts with seen-flags and a Settings switch
  - Surfaced by: D5 and Pass 3
  - Files: src/ui/, src/state/
  - Verify: each callout shows once and can be turned off
- [ ] **T6 (P2, human: ~1d / CC: ~30min)**: accident report: full versus compressed reveal driven by seen causes
  - Surfaced by: D2
  - Files: src/ui/report/, src/state/
  - Verify: second crash with the same cause plays the compressed reveal; Fly again works during both
- [ ] **T7 (P2, human: ~1d / CC: ~30min)**: accessibility landmarks, live region, keyboard map, controller focus
  - Surfaced by: Pass 6
  - Files: src/ui/, tests/e2e/
  - Verify: axe zero violations; keyboard-only run completes

T1 to T3 are scheduled as roadmap milestone M0b. T4 to T7 are folded into M6.

## Approved Mockups

None. The gstack designer needs an OpenAI API key; none is configured.

## Unresolved Decisions

1. Run setup: what a "founder" is (does it change starting cash or skills) and how the three problem spaces are presented. Owner: before M6.
2. Event card: the visual treatment of market events and weather on the chart. Owner: M5 to M6.
3. How a pivot looks on the chart (a fork in the route, a reset, or a new segment). Owner: M3 to M6.
4. Share-card design. Owner: M8.
5. Sound character beyond the rule (pitch and timbre of ticks and the report tone). Owner: M9.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | not run | none |
| Outside Review | Codex, plan-design-review | Independent 2nd opinion | 0 | disabled | codex_reviews disabled by user config |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | not run | none |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score: 2/10 → 8/10, 4 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | not applicable | none |

- **OUTSIDE COVERAGE:** plan-design-review, Codex: disabled by user config (`codex_reviews disabled`). The native subagent voice was not run. No outside coverage exists for this review.
- **VERDICT:** DESIGN REVIEWED with open items; eng review required.

**UNRESOLVED DECISIONS:**
- Run setup: founder definition and problem-space presentation (before M6)
- Event card visual treatment (M5 to M6)
- How a pivot is drawn on the chart (M3 to M6)
- Share-card design (M8)
- Sound character beyond the rule (M9)
