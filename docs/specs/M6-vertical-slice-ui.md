---
spec: M6 vertical-slice UI
status: in progress (decisions by realism, no interactive gate, per Nolan 2026-10-17)
sources: ROADMAP.md (M6), DESIGN.md (screens, interaction states, first-run teaching, accessibility), GAME-DESIGN.md
---

# M6: Vertical-slice UI

## Context

The sim is complete through M5. M6 makes it playable end to end in the browser: board, run setup, week view, action forms, interview debrief, result, accident report, menu and settings. The UI reads the sim only through `src/sim` (public index) and never computes rules.

## Decisions

- Screens are views, not overlays. Menu, action forms and the report replace the main area, so there is never more than one filled button on screen and focus handling stays simple.
- The primary button on the Week screen is "Choose an action". "Wait a week" is an outlined secondary beside it.
- Run setup offers three problem spaces (three consecutive seeds starting from a base seed; `?seed=N` fixes the base for tests and later share links). The "founder" choice is dropped: no mechanic uses it.
- Result screen appears after any action that produced log lines or evidence; a plain wait stays on the Week screen and is announced in the live region.
- Saves: the run auto-saves after every action to localStorage through a wrapper that never throws. A corrupt save shows the DESIGN.md message. Field notes and run history are M8.
- Seen causes (for the compressed reveal) and shown callouts are stored with the same wrapper.
- Reveal: CSS only. Full 2.4 s once per new cause, 0.8 s repeats, skippable by tap, removed under reduced motion. A landing uses `--ok`, a crash `--blackbox`.
- Keyboard: Escape goes back, 1 to 4 trigger the first four actions in the action list, arrow keys move between hypotheses. Gamepad: D-pad moves focus, A clicks, B goes back, Start opens the menu.

## Acceptance criteria

1. Unit: money and label formatting, diffing of a step, callout selection, storage wrapper, save restore (including corrupt and blocked storage).
2. E2E on phone, tablet and desktop: a scripted full run from the board to a finished report (interview, build, charge, marketing, wait), then Fly again returns to setup.
3. axe has zero violations on board, setup, week, form, result, interview debrief, report and menu, both color schemes.
4. No console errors; no horizontal scroll; every button at least 44 px; reading text at least 16 px; at most one filled button per screen and it is `--ink` with `--paper` text; black-box orange appears only on the report.
5. A refresh in the middle of a run restores it ("Continue flight").
6. Screenshots of each screen are written to `.verify/screens/`.
7. `npm run verify` passes; nothing weakened.

## Out of scope

Field notes and run history (M8), share link and card (M8), sound (M9), motion polish and Lighthouse (M9).
