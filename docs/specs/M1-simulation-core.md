---
spec: M1 simulation core
status: approved (Nolan, 2026-10-17, /spec Phase 4)
date: 2026-10-17
sources: ROADMAP.md (M1), GAME-DESIGN.md, CLAUDE.md architecture rules, docs/eng-review-2026-10-17.md (D1, D2, D3)
outside_review: disabled (codex_reviews disabled by user config)
---

# M1: Simulation core

## Context

Runway is a roguelike where the player runs a startup and learns why most fail. Every later milestone (interviews, tests, money events, the accident report, the UI) sits on a pure, deterministic simulation. If the simulation is not replayable, or leaks hidden world data to the screen, saved runs, shared seeds and the whole "learn from evidence" idea break, and the damage grows with every save written. M1 builds that core and nothing else. Affected: Nolan and the build loop now; players later.

## Current State (verified 2026-10-17)

- `src/sim/rng.ts:13-21`: `createRng(seed)` returns a mutable closure (`let a = seed >>> 0`). One sequential stream, so adding any draw shifts all later outcomes.
- `src/sim/rng.test.ts:5-39`: three property tests (replay in one process, range, int bounds). None locks actual output values.
- `CLAUDE.md:26-33`: architecture rules, including the amendments from the eng review.
- `eslint.config.js`: only `js.configs.recommended` and `typescript-eslint` recommended, with a no-unused-vars override. No sim-specific rules.
- No world, state, reducer, view or save code exists. `src/ui/` does not exist yet (the shell is `src/app.tsx`, `src/main.tsx`).

## Proposed Change

Replace the sequential RNG with keyed stateless draws, then add a world generator, a pure reducer with legal-action enumeration, runway math, a public projection, and a versioned save format. All in `src/sim/`, all pure, all integer money.

```
seed ──> rand(seed, ...keys) ──> generateWorld(seed) ──> Secret (hidden)
                                                          │
actions[] ──> step(run, action) ──> { ok: true, run } | { ok: false, reason }
                                                          │
                                        view(run) ──> PublicState (evidence only) ──> UI
Save = { simVersion, seed, actions[] } ──> fromSave ──> Run, or { ok: false, reason }
```

### Public API (`src/sim/index.ts` is the only module `src/ui/` may import)

```ts
export const SIM_VERSION = 1;
export type Run;                                   // opaque: contains the Secret, UI cannot read it by type
export type PublicState = { /* see below */ };
export type Action = /* see below */;
export type IllegalReason =
  | "unknown-action" | "run-finished" | "not-implemented"
  | "invalid-price" | "invalid-segment" | "no-pivots-left" | "raise-limit";
export type StepResult = { ok: true; run: Run } | { ok: false; reason: IllegalReason };
export type LoadError = "invalid" | "version-mismatch" | "replay-failed";
export interface Save { simVersion: number; seed: number; actions: Action[] }

export function newRun(seed: number): Run;               // seed: integer in [0, 0xFFFFFFFF], else RangeError
export function legalActions(run: Run): readonly Action[];
export function step(run: Run, action: Action): StepResult;
export function view(run: Run): PublicState;
export function toSave(run: Run): Save;
export function fromSave(save: unknown): { ok: true; run: Run } | { ok: false; reason: LoadError; atAction?: number };
```

### Randomness (`src/sim/rng.ts`, decision D2)

```ts
export type Key = string | number;                    // numbers must be integers with |n| < 2**31
export function rand(seed: number, ...keys: Key[]): number;          // float in [0, 1), 32-bit resolution
export function randInt(seed: number, min: number, max: number, ...keys: Key[]): number;  // inclusive
export function randChance(seed: number, p: number, ...keys: Key[]): boolean;
export function randPick<T>(seed: number, items: readonly T[], ...keys: Key[]): T;
```

Algorithm (fixed; a change is a `SIM_VERSION` bump):
```
mix(h, v):    h = Math.imul(h ^ v, 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0
rand(seed, ...keys):
  h = mix(0x811c9dc5, seed >>> 0)
  for each key:
    number: h = mix(h, 1); h = mix(h, key | 0)
    string: h = mix(h, 2); h = mix(h, key.length); for each UTF-16 code unit c: h = mix(h, c)
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16
  return (h >>> 0) / 0x100000000
randInt = min + Math.floor(rand(...) * (max - min + 1));  randChance = rand(...) < p;  randPick = items[Math.floor(rand(...) * items.length)]
```
Number keys that are non-integers or out of range throw `RangeError`. `createRng` is deleted; no caller remains.

### Number policy (applies to everything in `src/sim/`)

- Money is integer cents (`Cents = number`, always `Number.isSafeInteger`). All counts and percentages are integers. Division uses `Math.floor` or `Math.trunc`, stated at each use.
- Forbidden in `src/sim/` (ESLint, see Implementation Details): `Math.random`, `Date`, `performance`, DOM and storage globals, `**`, and `Math.exp/log/log2/log10/log1p/expm1/pow/sin/cos/tan/asin/acos/atan/atan2/sinh/cosh/tanh/sqrt/cbrt/hypot`.
- Allowed: `Math.floor/ceil/trunc/round/abs/min/max/sign/imul`. The only float in the sim is the `rand` return value.

### Tuning constants (initial values; tunable only through a `SIM_VERSION` bump)

| Constant | Value | Lives in |
|---|---|---|
| `START_CASH_CENTS` | 3_000_000 ($30,000) | `runway.ts` |
| `WEEKLY_BURN_CENTS` | 150_000 ($1,500) | `runway.ts` |
| `INTERVIEW_ROUND_CASH_CENTS` | 30_000 | `runway.ts` |
| `TEST_CASH_CENTS` | 200_000 | `runway.ts` |
| `ROUND_WEEKS` | 3 | `runway.ts` |
| `PIVOT_COST_CENTS` | `30_000 + 200_000 + 3 * 150_000` = 680_000 | `runway.ts` (derived) |
| `LANDING_STREAK_WEEKS` | 8 (revenue at least burn for 8 consecutive weeks) | `runway.ts` |
| `MAX_WEEKS` | 104 | `runway.ts` |
| `PRICE_LADDER_CENTS` (per month) | [900, 1900, 4900, 9900, 19900, 49900, 99900] | `actions.ts` |
| `RAISE_AMOUNT_CENTS` | 10_000_000; `RAISE_EQUITY_PCT` 15; `MAX_RAISES` 2; duration 3 to 9 weeks | `runway.ts` |
| `RAMP_PCT` | 20 (customers move toward target by this share, at least 1, per week) | `runway.ts` |
| `CONVERSION_TABLE` (price as % of willingness to pay, to % who buy) | [[0,100],[50,90],[100,50],[150,15],[200,0]], linear between points, truncate toward zero | `runway.ts` |

### World (`src/sim/world.ts`, `generateWorld(seed): Secret`)

Every draw is keyed. `Secret` fields (all integers except strings):

| Field | Draw | Range |
|---|---|---|
| `problemName` | `randPick(seed, PROBLEMS, "world", "problem")` | one of 3 fixed names: "Appointment booking for small clinics", "Invoice chasing for freelancers", "Route planning for lawn crews" |
| `segments` length | `randInt(seed, 3, 5, "world", "segmentCount")` | 3 to 5 |
| per segment `i`: `name` | `SEGMENT_NAMES[i]` | fixed list: "Solo operators", "Small teams", "Established shops", "Franchise owners", "Enterprise buyers" |
| `pain` | `randInt(seed, 20, 100, "seg", i, "pain")` | 20 to 100 |
| `willingnessToPayCents` | `randInt(seed, 10, 199, "seg", i, "wtp") * 100` | 1_000 to 19_900 per month |
| `politeness` | `randInt(seed, 0, 100, "seg", i, "polite")` | 0 to 100 |
| `reachability` | `randInt(seed, 10, 100, "seg", i, "reach")` | 10 to 100 |
| `size` | `randInt(seed, 200, 4999, "seg", i, "size")` | addressable customers |
| `incumbentSatisfactionPct` | `randInt(seed, 0, 80, "seg", i, "incumbent")` | 0 to 80 |
| `trueDemand` | `floor(size * pain * pain * (100 - incumbentSatisfactionPct) / 1_000_000)` | integer |
| `channels` | 3 fixed: "Cold outreach" (cost 800), "Communities" (300), "Paid ads" (2500) cents per lead; `fit[i] = randInt(seed, 0, 100, "chan", c, "fit", i)` | used from M3 |
| `weather` | event exists if `randChance(seed, 0.5, "world", "weather")`; `startWeek = randInt(seed, 20, 60, "world", "wstart")`, `endWeek = startWeek + randInt(seed, 10, 20, "world", "wlen")`, `demandMultiplierPct = 70` | `weatherPctAt(secret, week)` is 70 inside `[startWeek, endWeek)`, else 100 |
| `startFocus` | `randInt(seed, 0, segments.length - 1, "world", "focus")` | initial focus segment |

### State and actions

```ts
export interface PublicState {
  readonly week: number;                    // starts 0; each elapsed week adds 1
  readonly status: "running" | "crashed" | "landed";
  readonly endReason: "cash" | "stalled" | "default-alive" | null;
  readonly cashCents: number;
  readonly weeklyBurnCents: number;
  readonly priceCents: number;              // per month; starts 4_900
  readonly pivotCostCents: number;
  readonly pivotsRemaining: number;         // floor(max(cash, 0) / pivotCost)
  readonly pivotsUsed: number;
  readonly raisesUsed: number;
  readonly equityGivenPct: number;
  readonly productProgressPct: number;      // 0 to 100; starts 0 (raised by M3 actions)
  readonly payingCustomers: number;
  readonly weeklyRevenueCents: number;
  readonly profitableStreakWeeks: number;
  readonly problemName: string;
  readonly segmentNames: readonly string[]; // names only, no numbers
  readonly focusSegment: number;
  readonly log: readonly { readonly week: number; readonly text: string }[];
  readonly evidence: readonly never[];      // reserved for M2 and M3
}

export type Action =
  | { type: "wait" }
  | { type: "setPrice"; priceCents: number }
  | { type: "raiseMoney" }
  | { type: "pivot"; toSegment: number }
  // reserved (typed now, rejected with "not-implemented" until their milestone):
  | { type: "interview" } | { type: "buildTest" } | { type: "chargeTest" }
  | { type: "pickChannel" } | { type: "hire" } | { type: "doubleDown" };
```

Rules (the whole reducer):

1. `step` on a finished run returns `{ ok: false, reason: "run-finished" }`. An unrecognized `type` returns `"unknown-action"`; a reserved type returns `"not-implemented"`. Illegal calls leave the run unchanged (same object returned to the caller untouched).
2. `wait`: advances 1 week (a "tick").
3. `setPrice`: legal only if `priceCents` is in `PRICE_LADDER_CENTS` (else `"invalid-price"`) and not the current price. Takes no time; applies from the next tick.
4. `raiseMoney`: legal only if `raisesUsed < MAX_RAISES` (else `"raise-limit"`). Duration `d = randInt(seed, 3, 9, "raise", raisesUsed)`. Runs `d` ticks (burn continues, no other progress). If the run ends during those ticks the money is not delivered. Otherwise `cash += RAISE_AMOUNT_CENTS`, `equityGivenPct += RAISE_EQUITY_PCT`, `raisesUsed += 1`, log "Raised $100,000 for 15% equity."
5. `pivot`: legal only if `pivotsRemaining >= 1` (else `"no-pivots-left"`) and `toSegment` is an integer in `[0, segmentCount)` different from `focusSegment` (else `"invalid-segment"`). Advances 1 tick, then `pivotsUsed += 1`, `focusSegment = toSegment`, `productProgressPct = floor(productProgressPct / 2)`, log "Pivoted to {segment name}."
6. A tick, in order: (a) `target = floor(trueDemand(focus) * productProgressPct * conv * weatherPct / 1_000_000)` where `conv` is the table lookup of `floor(priceCents * 100 / wtp(focus))` (ratio above 200 gives 0), `weatherPct = weatherPctAt(secret, week)`; (b) `payingCustomers` moves toward `target` by up to `max(1, floor(target * 20 / 100))` when below, or by up to `max(1, floor(payingCustomers * 20 / 100))` when above; (c) `weeklyRevenueCents = floor(payingCustomers * priceCents * 12 / 52)`; (d) `cashCents += weeklyRevenueCents - WEEKLY_BURN_CENTS`; (e) `week += 1`; (f) `profitableStreakWeeks` is `+1` if `weeklyRevenueCents >= WEEKLY_BURN_CENTS`, else 0; (g) end checks in this order: `cashCents < 0` gives `crashed`/`"cash"`; else `profitableStreakWeeks >= 8` gives `landed`/`"default-alive"`; else `week >= 104` gives `crashed`/`"stalled"`. A finished run runs no further ticks.
7. `legalActions(run)`: `[]` if finished; otherwise `wait`, one `setPrice` per ladder value other than the current, `raiseMoney` if allowed, one `pivot` per other segment if `pivotsRemaining >= 1`. Reserved actions are never listed.
8. `view(run)` reads only the run's public part. `Secret` never appears in its return value. The returned object, its arrays and log entries are frozen, so writes from the UI throw instead of changing the run.
9. Accepted actions are stored as frozen canonical copies (only the fields the action defines), so a caller mutating its own action object later cannot rewrite history, and `toSave` returns copies.

Clarifications made during the build (no change to approved behavior): a `pivot` or `raiseMoney` whose weeks end the run is recorded but its effect is not applied (stated for `raiseMoney` above, and the same for `pivot`); `fromSave` rejects more than 5,000 actions as `"invalid"` without replaying, so a crafted save cannot make loading loop for a long time.

### Save format (decision D3, amendment M9)

`Save = { simVersion, seed, actions }`. `toSave(run)` returns the run's original seed and the accepted action list. `fromSave(x)`: shape check first (object; `simVersion` safe integer; `seed` integer in `[0, 0xFFFFFFFF]`; `actions` an array of objects with known `type` fields) else `"invalid"`; then `simVersion !== SIM_VERSION` gives `"version-mismatch"`; then replay every action through `step`; the first rejected action gives `{ ok: false, reason: "replay-failed", atAction: index }`. `fromSave` never throws. `SIM_VERSION` is bumped whenever outcomes for a fixed `(seed, actions)` change (constants, formulas, key names, the hash).

## Implementation Details

Ten files, per decision D1 (the milestone's slice of them), under `./`:

| File | Change |
|---|---|
| `src/sim/rng.ts` | Replace `createRng` with `rand`, `randInt`, `randChance`, `randPick` (algorithm above) |
| `src/sim/rng.test.ts` | Replace the three tests with the keyed-draw tests listed under Acceptance Criteria |
| `src/sim/types.ts` | `Cents`, `Key`, `PublicState`, `Action`, `IllegalReason`, `StepResult`, `Save`, `LoadError`, internal `Secret`, `Segment`, `Channel`, `Weather` |
| `src/sim/world.ts` | `generateWorld(seed)`, `weatherPctAt(secret, week)`, fixed name lists |
| `src/sim/state.ts` | Internal `Run` (`{ seed, actions, secret, pub }`), `initialRun(seed)`, test-only `unsafeRunForTest(seed, pubOverrides, secretOverrides)` (not exported from `index.ts`) |
| `src/sim/actions.ts` | `PRICE_LADDER_CENTS`, `isAction(x)`, `legalActions` |
| `src/sim/reducer.ts` | `step`, the tick function |
| `src/sim/runway.ts` | Constants table, `pivotsRemaining`, `conversionPct`, `weeklyRevenue` helpers |
| `src/sim/view.ts` | `view` |
| `src/sim/save.ts` | `toSave`, `fromSave`, `SIM_VERSION` |
| `src/sim/index.ts` | The public API above; exports `Run` as an opaque type |
| `eslint.config.js` | Two config blocks (below) |
| `package.json` | No change in M1 |

(`archetypes.ts`, `interview.ts` and `signal.ts` are M2.)

ESLint blocks to add:
```js
{ files: ["src/sim/**/*.ts"],
  rules: {
    "no-restricted-properties": ["error", ...["random","exp","log","log2","log10","log1p","expm1","pow","sin","cos","tan","asin","acos","atan","atan2","sinh","cosh","tanh","sqrt","cbrt","hypot"].map((property) => ({ object: "Math", property, message: "Not allowed in src/sim: engines may differ in the last bits." }))],
    "no-restricted-globals": ["error", ...["Date","performance","window","document","localStorage","sessionStorage","navigator"].map((name) => ({ name, message: "Not allowed in src/sim: the sim is pure and deterministic." }))],
    "no-restricted-syntax": ["error",
      { selector: "BinaryExpression[operator='**']", message: "`**` is not allowed in src/sim." },
      { selector: "AssignmentExpression[operator='**=']", message: "`**=` is not allowed in src/sim." },
      { selector: "NewExpression[callee.name='Date']", message: "Date is not allowed in src/sim." }],
  } },
{ files: ["src/ui/**/*.{ts,tsx}", "src/app.tsx", "src/main.tsx"],
  rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/sim/*", "!**/sim/index", "!**/sim"], message: "UI may import only from src/sim (its public index)." }] }] } }
```

## Acceptance Criteria

Each test states its card as `protects / fails_when / no_claim`. Numbered, pass or fail.

1. `rand` golden vectors: for 12 fixed `(seed, keys)` inputs (seeds 0, 1, 42, 0xFFFFFFFF with keys `"world"`, `"seg",0,"pain"`, and `1` vs `"1"`) the outputs equal the values committed in `tests/unit/fixtures/rand-golden.json`. protects=rand output never changes silently; fails_when=hash constant, key encoding or number handling changes; no_claim=statistical quality.
2. `rand` is deterministic: same `(seed, keys)` gives the same value across 1,000 random inputs (property).
3. `rand` stays in `[0, 1)` (property, 1,000 inputs including seeds 0 and 0xFFFFFFFF).
4. Key type separation: `rand(s, 1)` differs from `rand(s, "1")`, and `rand(s, "a", "b")` differs from `rand(s, "ab")` for 100 seeds.
5. Order sensitivity: `rand(s, "a", 1)` differs from `rand(s, 1, "a")` for 100 seeds.
6. Uniformity: 100,000 draws `rand(7, "u", i)` split into 16 equal bins; every bin within 5 percent of 6,250.
7. Non-integer or out-of-range number keys throw `RangeError`; `randInt` returns values within inclusive bounds (property).
8. `generateWorld(seed)` is deep-equal for equal seeds (1,000 seeds, property) and differs across at least 95 percent of 100 adjacent seed pairs.
9. World invariants over 1,000 seeds: 3 to 5 segments; every numeric field in its stated range; `trueDemand` equals its formula; every integer is a safe integer.
10. `newRun(seed)` rejects non-integer, negative, or above-range seeds with `RangeError`.
11. Initial state: week 0, `running`, cash 3_000_000, pivotsRemaining 4, price 4_900, progress 0, customers 0, empty log and evidence.
12. Legal-action fuzz: for 1,000 seeds, choose each action deterministically with `rand(seed, "fuzz", stepIndex)` from `legalActions` (never two `setPrice` in a row, so time always advances) until the run ends, with a cap of 300 steps; no call throws; every `PublicState` number is a safe integer; `week` never decreases and never exceeds 104; every run is finished (`crashed` or `landed`) within the 300-step cap.
13. Illegal actions: for each `IllegalReason` there is a test that returns that reason and leaves the returned-to-caller run unchanged (same `view` result and same `toSave` result).
14. Terminal absorption: after `crashed` or `landed`, `step` on any action returns `"run-finished"` and `legalActions` is `[]`.
15. Reserved actions return `"not-implemented"` (6 cases) and never appear in `legalActions`.
16. Tick order: a table-driven test with 6 hand-computed scenarios (using `unsafeRunForTest`) covers target, ramp up, ramp down, revenue, cash, streak and each end check (`cash`, `default-alive`, `stalled`).
17. Conversion: price ratios 0, 50, 75, 100, 150, 175, 200, 250 give the table-interpolated values (including truncation toward zero).
18. `pivotsRemaining` for cash -1, 0, 679_999, 680_000, 3_000_000 is 0, 0, 0, 1, 4; `PIVOT_COST_CENTS` equals 680_000.
19. `raiseMoney`: duration is in 3 to 9 weeks for 200 seeds; money arrives only if the run survives; a third raise returns `"raise-limit"`.
20. `pivot`: costs one week, halves progress (floor), changes focus; `"invalid-segment"` for the current segment, a negative, a fraction, or an out-of-range index.
21. Non-interference: for 200 seeds, a `Run` and a copy whose `Secret` has randomly changed hidden fields (pain, wtp, trueDemand, size, politeness, reachability, incumbent, weather, channels) but identical public state produce deep-equal `view` output. protects=the UI sees evidence only.
22. No-leak keys: the JSON of `view(run)` for 200 seeds contains none of these keys: `pain, willingnessToPayCents, politeness, reachability, size, incumbentSatisfactionPct, trueDemand, channels, weather, secret, seed`.
23. Save round trip: for 200 random legal runs, `fromSave(toSave(run))` yields a run whose `view` deep-equals the original. `fromSave` returns `"invalid"` for 8 malformed inputs (null, number, missing fields, bad seed, non-array actions, unknown action type, fractional price, NaN), `"version-mismatch"` for `simVersion` 0 and 2, and `"replay-failed"` with the right `atAction` for a save whose second action is illegal. It never throws (property over arbitrary JSON values).
24. Golden replay: `tests/unit/fixtures/golden-replay.json` holds a fixed seed, an action list, and the expected final `PublicState`; the test replays it and compares deeply. The fixture is generated once by the reference implementation and committed; changing it requires a `SIM_VERSION` bump.
25. Lint rules: a script test writes a scratch file under `src/sim/` containing each forbidden construct (`Math.random`, `Math.exp`, `Date.now`, `2 ** 3`, `localStorage`) and confirms ESLint reports each; a scratch `src/ui/` file importing `../sim/world` is reported and one importing `../sim` is not. Scratch files are deleted afterwards.
26. `npm run verify` passes (typecheck, lint, unit, build, size, e2e); no test, lint rule or budget is weakened.
27. No new dependency; bundle size gates unchanged.

## Testing Plan

| Layer | What | Count |
|---|---|---|
| Unit (property) | `rand` family determinism, range, key separation, order, uniformity, RangeError (criteria 2 to 7) | +6 |
| Unit (golden) | `rand` vectors, golden replay (criteria 1, 24) | +2 |
| Unit | World generation and invariants (criteria 8 to 9) | +2 |
| Unit | State, `newRun`, runway, conversion, pivots remaining (10, 11, 17, 18) | +4 |
| Unit (table) | Tick order scenarios (16) | +1 (6 rows) |
| Unit (property) | Legal-action fuzz and illegal-action cases, terminal absorption, reserved actions, raise, pivot (12 to 15, 19, 20) | +7 |
| Unit (property) | Non-interference and no-leak keys (21, 22) | +2 |
| Unit | Save round trip, malformed input, version mismatch, replay failure (23) | +3 |
| Integration | ESLint rule checks using scratch files (25) | +1 |
| E2E | None in M1 (the sim is not wired to the UI until M6); the existing shell test must keep passing | 0 |

## Rules for the implementing agent

1. Acceptance criteria are the `protects / fails_when / no_claim` profile of each test: the observable it protects, the wrong result it rejects, and what green does not prove. Never "make the tests pass".
2. Real code and real tests land in the same change; a placeholder, a stub assertion or a test deferred to a follow-up is not done.
3. Any change to a test, validator, CI step, timeout, tolerance, threshold, snapshot or suppression pragma is reported on its own line in your summary with its justification, before any other result.
4. A reported command names the command and its observed result (exit status, counts, the failing line); a command you did not run is not reported, and stderr is never silenced in a command you cite.
5. Your report is a claim until the parent re-executes it: say what you verified, what you reused, and what you could not check.
6. Write each test before its implementation. Commit only when `npm run verify` is green.
7. Do not add `src/ui/`, persistence, or any M2 to M5 behavior.

## Rollback Plan

Nothing persists in M1 (no UI, no storage). Revert the commit(s). If only `rng.ts` is wrong, restore it from git; no other module depends on the old `createRng`.

## Effort Estimate

| Component | Human | CC |
|---|---|---|
| rng and tests (golden, uniformity) | ~2h | ~15min |
| types, world, generation tests | ~3h | ~20min |
| state, actions, reducer, runway | ~1d | ~45min |
| view and non-interference tests | ~2h | ~15min |
| save and golden replay | ~2h | ~15min |
| ESLint rules and lint tests | ~1h | ~10min |
| Total | ~2.5d | ~2h |

## Out of Scope

- Interviews, archetypes, signal quality (M2); tests, evidence and channels in play (M3); pricing effects on customer quality, cash-flow events, hiring (M4); the cause classifier and report (M5); any UI, persistence or browser storage (M6, M8); cross-browser replay (M8); balance bots (M7).
- Founder choice and run setup (open design question in docs/design-review-2026-10-17.md).
- Reading hidden data through browser devtools. The `Run` type is opaque but the data exists in memory; this is a single-player game and tamper-proofing is a non-goal.

## Related

- docs/eng-review-2026-10-17.md (decisions D1 to D3, findings S1 to S10)
- ROADMAP.md (M1), GAME-DESIGN.md (hidden world, money, actions), CLAUDE.md (architecture rules)
