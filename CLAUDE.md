# Runway: Project Instructions

A free browser roguelike where the player runs a startup, learns why most fail, and flies again. Built solo by Nolan with Claude Code. Read DESIGN.md (look and feel), GAME-DESIGN.md (mechanics), ROADMAP.md (what to build next) and LOOP.md (how to build it) before substantial work.

Idea and research notes live in the parent vault:
- the private vault note "Startup Survival Sim Idea"
- the private vault note "Startup Failure Catalog - Research 2026-10-17"

## Stack

Vite, Preact with signals, TypeScript (strict), plain CSS with tokens. No game engine and no 3D in v1. Vitest and fast-check for the simulation, Playwright with axe for the browser, ESLint, Prettier, size-limit. Fonts are self-hosted through Fontsource.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on the local network (phone testing) |
| `npm run verify` | Every gate in order, writes `.verify/report.json`. Run before any commit |
| `npm test` | Unit and property tests |
| `npm run e2e` | Browser tests, also writes screenshots to `.verify/screens/` |
| `npm run build` | Typecheck plus production build |
| `npm run size` | Bundle budget check |
| `npm run balance` | 200-seed strategy-bot table, enforces the GAME-DESIGN balance targets |
| `npm run lighthouse` | Lighthouse on the production build, accessibility and best-practices at least 95 |

## Architecture rules

- `src/sim/` is pure, deterministic TypeScript. Randomness only through the keyed draw `rand(seed, ...keys)` (every draw names its key), no `Math.random`, no `Date.now`, no DOM or UI imports. The same seed must produce the same world and the same run.
- Numbers in `src/sim/`: money is integer cents; no `Math.exp`, `Math.log`, `Math.pow`, `**` or trig functions (engines may differ in the last bits); curves are piecewise-linear tables. ESLint enforces this.
- `src/ui/` reads the sim only through `view()` and sends actions. It never computes game rules.
- Hidden world truth (true demand, segment willingness to pay) lives in a `Secret` type that `src/ui/` may not import (ESLint). `view()` returns `PublicState`, which holds evidence only. A test checks that `view()` has no hidden-field keys and is the same for worlds that differ only in hidden parameters.
- State changes go through a single reducer, `{ ok, state }` or `{ ok: false, reason }`, so runs can be replayed from `{ simVersion, seed, actions }`. Bump `simVersion` whenever outcomes for a fixed seed and action list change.
- Every roadmap check gets a test written before the implementation.
- All visual assets are generated in code (SVG, CSS, Web Audio). No imported images or models in v1.
- Keep files small and named for what they hold. Prefer several focused modules over one large file.

## Testing

Framework: Vitest with fast-check for the simulation (`src/**/*.test.ts`, `tests/unit/**/*.test.ts`, run with `npm test`); Playwright with axe for the browser (`tests/e2e/`, run with `npm run e2e`). `npm run verify` runs every gate. Rules: write the test before the implementation; use property tests for sim invariants and golden fixtures for replay stability; never weaken an assertion, a lint rule, or a budget to make something pass. There are no LLM or prompt features, so no eval suites.

## Design rules (short form; DESIGN.md is authoritative)

- Aviation-paperwork vocabulary: pivots remaining is the largest number, dotted/dashed/solid lines mean untested/weak/verified.
- The black-box orange is only for the accident report and crash warnings.
- Sentence case, no ALL CAPS labels, no gradients, no shadows, radius 4 px panels and 6 px controls.
- Tap targets at least 44 px. WCAG AA. Respect reduced motion and color scheme.
- Copy is plain, active, and never lectures. No hustle slogans.

## Working rules

- One roadmap item at a time. Do not run parallel agents unless the user asks. The only sanctioned fan-out is the three read-only checkers in LOOP.md.
- Do not weaken a test, lint rule, size budget, or accessibility check to make something pass. Fix the cause.
- Ask before adding dependencies, changing DESIGN.md or GAME-DESIGN.md, or spending money.
- Game feel, fun, and "looks expensive" are Nolan's calls. Mark them `[HUMAN]` and stop.
- Commit after each verified item. The remote is the public repo https://github.com/NolanNachbar/StartupSim: push only when Nolan asks, never force-push, and keep local paths out of tracked files.
- No em dashes and no emojis in code, comments, docs or in-game copy.

## Deployment (decided at M10, defaults)

The GitHub repo exists (public). Static site. Default host: Cloudflare Pages (free, fast, unlimited bandwidth). Alternatives: Netlify, Vercel, GitHub Pages. Analytics: Plausible or Umami (no cookies). The GitHub repo is created by Nolan or with his approval via `gh`.

## Known environment notes

- Node 26, npm 11 on this machine. Playwright's Chromium is installed with `npx playwright install chromium`.
- `.verify/` is gitignored and holds reports and screenshots.
