# Engineering plan review, 2026-10-17

Target (fixed): the M1 and M2 simulation-core plan in `./`. Documents: GAME-DESIGN.md, ROADMAP.md (M0b to M2), LOOP.md, CLAUDE.md, and existing code `src/sim/rng.ts` with `src/sim/rng.test.ts`. Method: gstack /plan-eng-review. Outside voice: disabled by user config. Evidence kind: static read of plan and code, plus one web search for the cross-engine math question; nothing proposed was built.

## Scope record

feature answers: none proposed for cut; structure: A, original arrangement of about 10 source files (D1, user answer, chosen over the recommendation B); accepted scope: M1 and M2 as written in ROADMAP.md with one file per concern (types, world, archetypes, state, actions, reducer, runway, view, interview, signal); pending remedies: R1 plus the review findings listed in the sections below.

## Decision ledger

### R1: Randomness architecture for replay and saved seeds
Finding: S1, P1, confidence 9/10, `src/sim/rng.ts:13-21` (`let a = seed >>> 0;` inside a closure; `next` mutates `a` on every draw), reviewer: Claude.
Plan baseline: not yet approved. Original proposal: ROADMAP.md:10 marks "Seeded RNG with property tests" done, and CLAUDE.md:29 requires "State changes go through a single reducer so runs can be replayed from a seed and an action list."
Runtime evidence: `createRng(seed)` returns a mutable closure, so a reducer that calls it is not a pure function of (state, action), and any added or reordered draw shifts every later value in the run. Unverified across a real save: no save format exists yet.
Comparison grid:

| Choice | Current | A | B | C |
|---|---|---|---|---|
| R1 randomness model | One sequential mutable stream per `createRng(seed)` | Stateless keyed draws: `rand(seed, ...keys)` hashes the seed and a key path to a number, no mutable state | Forked named streams (`fork(seed, "world")`, `fork(seed, "week", n)`), stream position kept in game state | Keep one sequential stream, store its position in game state |
| Replay after adding a new random event | Shifts all later outcomes | Unrelated outcomes unchanged | Unchanged across streams, shifts within a stream | Shifts all later outcomes |
| Reducer purity | Not pure (closure) | Pure | Pure if stream positions live in state | Pure if position lives in state |
| Work now | none | rewrite rng.ts, about 40 lines, plus golden and statistics tests (human: ~2h / CC: ~15min) | rewrite rng.ts plus state plumbing (human: ~4h / CC: ~30min) | add position to state (human: ~1h / CC: ~10min) |
| Other approved values | structure A (ten files, D1) | same | same | same |
| Pending choices | enforcement of hidden-truth boundary, numeric policy, test strategy, save versioning | pending | pending | pending |

Question D2:
D2 — Which randomness design should the simulation use?

Project/branch/task: Runway (main), engineering review, architecture finding S1 on `src/sim/rng.ts:13-21`.

ELI10: The game needs dice rolls that come out the same every time you replay a run from its seed, and stay the same even after you add a new kind of event later. Right now there is one stream of dice rolls, so adding any new roll changes every roll after it. Saved runs and shared seed links from last week would then play out differently, with no error.

Stakes if we pick wrong: Every balance tweak or new event silently changes old saves and shared seeds, and the balance bots chase a moving target.

Recommendation: A because each roll is addressed by what it is for, so new events never disturb existing outcomes and the reducer stays a pure function.

Completeness: A=9/10, B=8/10, C=5/10

Pros / cons:
A) Keyed stateless draws (recommended)
  ✅ Outcomes depend only on the seed and the named purpose, so adding events never shifts old ones and saves stay compatible.
  ❌ Needs a well-tested hash and a rule that every draw names its key, a bit more ceremony per call.
B) Forked named streams with positions in game state
  ✅ Familiar stream style, and different parts of the game cannot disturb each other.
  ❌ Within one stream the order problem remains, and stream positions must be carried and saved in state.
C) Keep one sequential stream, store its position
  ✅ Smallest change, a few lines, no new hash to trust.
  ❌ Any added or reordered roll still shifts all later outcomes, so old saves and seeds drift silently.

Net: You are trading a little per-call ceremony against saves and shared seeds that survive future changes.
Header: Randomness
Options:
A) Keyed stateless draws (recommended)
Each roll is a pure function of the seed and a named key path, for example rand(seed, "world", segmentIndex) or rand(seed, "interview", week, callIndex). No mutable stream and no random state in saves. Adds a golden-vector test and a uniformity test. Rewrites rng.ts (human: ~2h / CC: ~15min).
B) Forked named streams, positions in state
Independent named streams per purpose, with each stream's position stored in game state and saved. Rewrites rng.ts and adds state plumbing (human: ~4h / CC: ~30min).
C) Keep one sequential stream
One stream, with its position stored in game state so the reducer is pure. A few lines (human: ~1h / CC: ~10min). Adding or reordering any roll still shifts later outcomes.

State: approved
Actual answer: A) Keyed stateless draws (recommended), user answer to D2
Accepted scope: Replace `createRng` with stateless keyed draws, `rand(seed, ...keys)`, a pure function of the seed and a named key path; no mutable stream and no random state in saves; every draw names its key. Adds a golden-vector test and a statistical uniformity test. All other values unchanged: structure A (ten files, D1) stays; hidden-truth enforcement, numeric policy, test strategy and save versioning remain pending.
History: none

### R2: Keep the mechanical plan amendments already applied
Finding: S2 to S10, P1 to P3, confidence 6 to 9, files ROADMAP.md, CLAUDE.md, GAME-DESIGN.md, reviewer: Claude.
Plan baseline: before this review the documents contained the original M1 and M2 items and the architecture rules CLAUDE.md:26-29. The amendments were applied by the delegated "taste calls only, mechanical fixes with a changelog" preference from the design review, not by an individual answer.
Runtime evidence: static read only. Amendments are plan text; no code was changed or built.
Comparison grid:

| Choice | Current (applied) | A | B | C |
|---|---|---|---|---|
| M1 golden vector and uniformity tests for rng (S2) | applied | keep | decide each | revert |
| M2 ESLint rules enforcing sim purity (S10) | applied | keep | decide each | revert |
| M3 Secret/PublicState split, view(), non-interference test, import ban (S3) | applied | keep | decide each | revert |
| M4 integer cents, no transcendental Math, cross-engine check at M8 (S4) | applied | keep | decide each | revert |
| M5 Result-returning reducer, legalActions, terminal states (S5) | applied | keep | decide each | revert |
| M6 pivotCost definition and floored runway (S6) | applied | keep | decide each | revert |
| M7 M2 check margin of 0.15 and monotonicity (S7) | applied | keep | decide each | revert |
| M8 balance as separate script, smoke subset in verify, no per-step deep clone (S8) | applied | keep | decide each | revert |
| M9 simVersion and safe replay fallback (S9) | applied | keep | decide each | revert |
| D1 ten-file structure, D2 keyed randomness | approved by answers | unchanged | unchanged | unchanged |

Question D3:
D3 — Keep the nine engineering amendments I already applied to the plan documents?

Project/branch/task: Runway (main), engineering review, mechanical findings S2 to S10 applied to ROADMAP.md, CLAUDE.md and GAME-DESIGN.md.

ELI10: Besides the two big decisions you made, the review found nine smaller gaps, like a test that locks the random numbers so they never silently change, a lint rule that stops the screen from reading hidden game data, and a rule that money is whole cents. I wrote them into the plan documents as text, with no code. You said earlier you only wanted questions on real judgment calls, so I applied them, but I should confirm you agree.

Stakes if we pick wrong: Keep a fix you did not want and the build loop enforces it from M1. Revert one that you did want and the sim ships with a gap that is expensive to fix after saves exist.

Recommendation: A because each one is a test, a rule or a definition the code needs anyway, and git can revert any of them in seconds.

Completeness: A=9/10, B=10/10, C=4/10

Pros / cons:
A) Keep all nine as applied (recommended)
  ✅ The plan is already updated and consistent, and the build loop can start M1 immediately.
  ❌ You approve nine changes at once, so a single one you dislike needs a follow-up to undo.
B) Go through them one at a time
  ✅ Strict per-item approval, so nothing stays unless you said yes to that exact item.
  ❌ Nine more questions, most of them obvious, which is the cost you said you wanted to avoid.
C) Revert all nine and keep only the two decisions
  ✅ The plan returns to your original text plus D1 and D2.
  ❌ Leaves known gaps (silent hidden-data leaks, number drift across browsers, unversioned saves) for later.

Net: You are trading your time against having each small fix explicitly approved.
Header: Amendments
Options:
A) Keep all nine (recommended)
Keep the plan documents as applied: nine amendments plus D1 and D2. No further edits (human: none / CC: none).
B) Go through them one at a time
Ask about each amendment separately and revert any you decline (human: ~10 min / CC: ~5 min).
C) Revert all nine
Restore the original M1, M2, M7, M8 text, CLAUDE.md rules and GAME-DESIGN.md pivot cost wording, keeping only D1 and D2 (human: ~10 min / CC: ~5 min).

State: approved
Actual answer: A) Keep all nine (recommended), user answer to D3
Accepted scope: Keep amendments M1 to M9 exactly as applied to ROADMAP.md (M1, M2, M7, M8 items), CLAUDE.md (architecture rules and the new Testing section) and GAME-DESIGN.md (pivotCost). No code changed. D1 and D2 unchanged.
History: Applied first under the delegated design-review preference, then confirmed by D3.

Approval readiness: PASS. Checked R1 (D2, answer A) and R2 (D3, answer A); the structure scope record cites D1 (answer A). No accepted remedy lacks its own answer.

## Review findings and dispositions

### 1. Architecture review (4 issues)
- [P1] (confidence: 9/10) src/sim/rng.ts:13-21: `let a = seed >>> 0;` inside a mutable closure. Adding or reordering any draw shifts all later outcomes, and a reducer calling it is not pure. Disposition: accepted, D2 (keyed stateless draws).
- [P1] (confidence: 8/10) CLAUDE.md:28: "Hidden world truth ... must never reach the UI" has no enforcement. Disposition: accepted, M3 (D3).
- [P1] (confidence: 7/10) GAME-DESIGN.md:76: a conversion curve implies Math.exp, pow or log, which ECMAScript classifies as implementation-approximated. Real divergence between engines is supported only by a secondary report. Disposition: accepted, M4 (D3).
- [P2] (confidence: 6/10, medium confidence, verify) CLAUDE.md:29: replay from a seed and action list with no version. Disposition: accepted, M9 (D3).

### 2. Code quality review (3 issues)
- [P2] (confidence: 8/10) ROADMAP.md:24: "1,000 random action sequences never throw" mixes legal and illegal actions. Disposition: accepted, M5 (D3).
- [P2] (confidence: 8/10) GAME-DESIGN.md:75: "typical pivot cost" is undefined and can divide by zero. Disposition: accepted, M6 (D3).
- [P3] (confidence: 6/10, medium confidence, verify) CLAUDE.md:26: purity rules exist only as prose. Disposition: accepted, M2 (D3).

Shared-code evaluation: no extraction proposed. Only one caller of `createRng` exists today (its own tests), so the rubric's two-caller bar is not met; revisit when `rand` has real callers.

### 3. Test review (2 gaps in existing tests, 12 proposed paths)
- [P1] (confidence: 8/10) src/sim/rng.test.ts:5-39: three property tests prove determinism within one process, but none locks actual output, so changing the constant 0x6d2b79f5 at rng.ts:16 still passes. Disposition: accepted, M1 (D3).
- [P2] (confidence: 7/10) ROADMAP.md:29: "higher average signal quality" passes at any tiny difference. Disposition: accepted, M7 (D3).

```
CODE PATHS (proposed)                                USER FLOWS
[+] src/sim/rand (keyed)                             [+] Replay a saved run
  ├── [GAP] golden vector (locks output)               ├── [GAP] [->E2E] same end state in 3 engines
  └── [GAP] uniformity                                 └── [GAP] old simVersion falls back cleanly
[+] src/sim/world + engine                           [+] Interview
  ├── [GAP] determinism per seed                       ├── [GAP] past-behavior beats hypothetical by >=0.15
  ├── [GAP] legal actions never throw or NaN           └── [GAP] monotonic in question specificity
  ├── [GAP] illegal action leaves state unchanged
  ├── [GAP] terminal states reject actions
  └── [GAP] pivotCost 0 or huge never gives Infinity
[+] src/sim/view
  └── [GAP] non-interference: hidden params never change the view

COVERAGE: 0/12 proposed paths have tests (proposal stage); existing rng tests 3, rated two stars (no golden vector)
QUALITY: three stars 0, two stars 3, one star 0 | GAPS: 12 (1 E2E, 0 eval)
Legend: [GAP] no test yet | [->E2E] needs a browser-level test
```

No LLM or prompt features, so no eval scope. Tests made obsolete by this plan: the three rng tests change with D2 (replaced by keyed-draw equivalents plus golden vectors); the property shapes carry over.

Regression rule: no existing behavior outside `rng` is at risk. Existing callers of `createRng`: its own test file only (src/sim/rng.test.ts:3). Behavior to preserve: same seed, same values (now locked by golden vectors). Intended difference: the API changes from a stream to keyed draws, so the sequences differ from the current ones.

### 4. Performance review (1 issue)
- [P2] (confidence: 7/10) ROADMAP.md:61: 5 bots x 200 seeds x up to about 100 weeks is roughly 100,000 reducer steps [estimated], trivial if the world is shared by reference and never deep-cloned per step, but it must not run inside `npm run verify`. Disposition: accepted, M8 (D3).

### Outside voice
Disabled by user config (`codex_reviews disabled`). No outside process ran and no native replacement was dispatched. Recorded as disabled coverage.

## NOT in scope

- Selling, negotiation and mindset mechanics: v1 is validation and money (GAME-DESIGN.md out-of-scope list).
- UI work: covered by docs/design-review-2026-10-17.md.
- Accounts, cloud saves and multiplayer: saves are local only.
- Mutation testing and formal verification: fast-check properties plus golden fixtures are enough for v1.
- CI/CD and hosting: decided at M10.
- Version migration of old saves: M9 only requires a safe fallback to a new run.

## What already exists

- `src/sim/rng.ts` and its tests: reused as the starting point, replaced by keyed draws (D2).
- Vitest and fast-check, installed and passing: reused, no new dependency.
- `npm run verify` and the Playwright config: reused; M8 adds WebKit and Firefox projects (browser download only).
- GAME-DESIGN.md hidden world, actions and money rules: the contract the sim implements; amended only for pivotCost.

## Diagrams

```
seed ──> rand(seed, ...keys) ──> generateWorld ──> Secret (hidden, never imported by src/ui)
                                                      │
actions[] ──> reducer(Secret, PublicState, action) ──> { ok: true, state } | { ok: false, reason }
                                                      │
                                    view(state) ──> PublicState (evidence only) ──> UI
saved run = { simVersion, seed, actions[] } ──> replay ──> same state, or fall back to "Start a new run"
```

Files that should carry an inline version of this diagram: `src/sim/reducer.ts` and `src/sim/view.ts`.

## Failure modes

| New path | Realistic failure | Test or handling | User sees | Critical gap? |
|---|---|---|---|---|
| view() projection | A new field is added to PublicState from hidden data | non-interference test and import ban (M3) | silent without them, caught by test with them | Yes before M3, closed by M3 |
| Replay of a saved run | Sim changed since the save, a replayed action is now illegal | simVersion and safe fallback (M9) | "We could not restore your last flight. Start a new run." | Yes before M9, closed by M9 |
| Runway calculation | pivotCost is 0, giving Infinity or NaN on the main gauge | clamp to at least 1 and a property test (M6) | a sensible number | No |
| Shared seed in another browser | Math.exp or pow differs in the last bits and the run diverges | no transcendental math plus a three-engine golden check (M4) | same world | No |
| Illegal action | UI sends an action that is not currently legal | `{ ok: false, reason }` and unchanged state (M5) | action disabled or a plain message | No |

Critical gaps flagged: 2 (both closed by accepted amendments).

## Worktree parallelization strategy

Sequential implementation, no parallelization opportunity. M1 files share types and the reducer, and the project rule is one agent at a time.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding above.

- [ ] **T1 (P1, human: ~2h / CC: ~15min)** sim randomness: replace createRng with keyed stateless rand(seed, ...keys); golden-vector and uniformity tests
  - Surfaced by: Architecture, rng.ts:13-21; Test review, rng.test.ts:5-39
  - Files: src/sim/rng.ts, src/sim/rng.test.ts
  - Verify: `npm test`; changing the hash constant fails a test
- [ ] **T2 (P1, human: ~1h / CC: ~10min)** lint rules: ESLint rules for src/sim (no Math.random, Date, transcendental Math or `**`) and an import ban from src/ui
  - Surfaced by: Architecture and Code quality, CLAUDE.md:26-29
  - Files: eslint.config.js
  - Verify: `npm run lint` fails on a deliberate violation in a scratch file, then passes
- [ ] **T3 (P1, human: ~3h / CC: ~20min)** sim types and view: Secret and PublicState types, view() projection, non-interference test
  - Surfaced by: Architecture, CLAUDE.md:28
  - Files: src/sim/types.ts, src/sim/view.ts, src/sim/view.test.ts
  - Verify: `npm test`
- [ ] **T4 (P1, human: ~1d / CC: ~45min)** world and engine: world generator, action union, legalActions, Result-returning reducer, terminal states, runway with pivotCost
  - Surfaced by: Code quality, ROADMAP.md:24 and GAME-DESIGN.md:75
  - Files: src/sim/world.ts, state.ts, actions.ts, reducer.ts, runway.ts
  - Verify: `npm test`; 1,000 random legal sequences
- [ ] **T5 (P1, human: ~2h / CC: ~15min)** save format: simVersion, `{ simVersion, seed, actions }`, replay with fallback, golden replay fixture
  - Surfaced by: Architecture, CLAUDE.md:29
  - Files: src/sim/save.ts, save.test.ts, tests/unit/fixtures/
  - Verify: `npm test`
- [ ] **T6 (P2, human: ~1d / CC: ~45min)** interview system: archetypes, question types, signal model, debrief, with the 0.15 margin and monotonicity checks
  - Surfaced by: Test review, ROADMAP.md:29
  - Files: src/sim/archetypes.ts, interview.ts, signal.ts
  - Verify: `npm test`
- [ ] **T7 (P2, human: ~2h / CC: ~15min)** balance script: `npm run balance` with the strategy bots and a 20-seed smoke subset in tests
  - Surfaced by: Performance, ROADMAP.md:61
  - Files: scripts/balance.mjs, package.json
  - Verify: `npm run balance` prints outcomes against GAME-DESIGN.md targets

T1 to T5 map to M1; T6 maps to M2; T7 maps to M7 (earlier is fine).

## TODOS.md updates

0 items proposed. No TODOS.md exists; deferred work is tracked in ROADMAP.md (Later) and the NOT in scope list above.

## Unresolved decisions

None in this review.

## Suppressed findings (confidence below 5)

None.

## Reality rows

```
REALITY: premise-table finding 6 claims checked, unverified=2: balance targets are untested estimates and "typical pivot cost" is undefined GAME-DESIGN.md:104
REALITY: already-done pass only commit 38086f9 ever touched src/sim and there is no remote to fetch, so nothing was merged elsewhere src/sim/rng.ts:13
REALITY: surface-check pass npm scripts verify, test and e2e exist; `npm run balance` is a proposal, not a claim of existence package.json:18
REALITY: binding-decisions pass gstack-decision-search found none; CLAUDE.md architecture rules treated as binding CLAUDE.md:26
REALITY: numbers finding ~100,000 reducer steps [estimated] and the 25 to 45 percent Validator band [estimated], neither measured yet GAME-DESIGN.md:106
REALITY: deferred-asks pass no linked issue, so nothing was requested and left out docs/eng-review-2026-10-17.md:1
REALITY: pr-count pass no ship-policy.json; one commit per roadmap item, queue cost not applicable to a solo repo LOOP.md:48
```

## Changelog of plan edits made in this review

ROADMAP.md (M1, M2 check, M7 bot line, M8 share-link line); CLAUDE.md (architecture rules, new Testing section); GAME-DESIGN.md (runway in pivots). Revert any with `git checkout -- <file>` before committing, or `git revert` after.

## Design Review and Eng Review Completion Summary

```
- Step 0: Scope Challenge: scope accepted as-is
- Reality rows: 7/7 applicable rows emitted (REALITY lines above), 2 unverified premises
- Architecture Review: 4 issues found
- Code Quality Review: 3 issues found
- Test Review: diagram produced, 14 gaps identified (2 in existing tests, 12 proposed paths)
- Performance Review: 1 issue found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 0 items proposed to user
- Failure modes: 2 critical gaps flagged (both closed by accepted amendments)
- Unresolved decisions: 0 in this review
- Outside voice: codex, disabled (codex_reviews disabled by user config)
- Parallelization: 1 lane, 0 parallel / 1 sequential
- Lake Score: 0/3 (D1 and D2 had no 10/10 option, D3's 10/10 option was B and A was chosen)
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | not run | none |
| Outside Review | Codex, plan-review | Independent 2nd opinion | 1 | disabled | codex_reviews disabled by user config |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | 10 issues, 2 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score: 2/10 → 8/10, 4 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | not applicable | none |

- **OUTSIDE COVERAGE:** codex, plan-review: disabled by user config. No outside process ran and no native replacement was dispatched, so this review has no independent second opinion.
- **VERDICT:** NOT CLEARED. Eng Review status is `issues_open`: all 10 findings are mapped and accepted (D1 to D3), and the work is queued as implementation tasks T1 to T7. It clears when the implemented M1 is re-reviewed with 0 open items. Design review is also `issues_open` (5 deferred decisions).

**UNRESOLVED DECISIONS:**
- + 5 unresolved from prior reviews (design review: run setup, event card, pivot rendering, share card, sound; see docs/design-review-2026-10-17.md)
