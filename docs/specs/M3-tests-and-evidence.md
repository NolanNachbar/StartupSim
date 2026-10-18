---
spec: M3 tests and evidence
status: implemented and verified (approved by Nolan, 2026-10-17: "for gameplay decisions, do whatever is most realistic"; written without the interactive /spec gate)
sources: ROADMAP.md (M3), GAME-DESIGN.md (actions, evidence, the chart), the Lean Startup shelf (MVP, validated learning, vanity vs actionable metrics), docs/specs/M1 and M2
---

# M3: Tests and evidence

## Context

After M2 the player can talk to people. M3 lets them act on what they hear the way real founders do: build something small, find out which channel reaches a segment, then ask for money. Money is the strongest evidence, so only payment can turn a belief into a verified hypothesis. This is also the first milestone where a run can be won: a built product plus paying customers is what lets revenue cover costs.

## New actions

All three cost one week or more, pay cash first, and record evidence even if the run ends that week. Effects of a build are skipped if the run ends before it finishes.

| Action | Time | Cash | Effect |
|---|---|---|---|
| `buildTest { kind: "landing-page" }` | 1 week | $300 | Sets `landingPageBuilt`; progress +5. Only once. |
| `buildTest { kind: "concierge" }` | 2 weeks | $800 | Progress +20 (delivering the service by hand). |
| `buildTest { kind: "prototype" }` | 3 weeks | $2,500 | Progress +40. |
| `pickChannel { segment, channel }` | 1 week | $200 | Tries a channel on a segment; produces `channel-test` evidence. |
| `chargeTest { segment, channel }` | 1 week | $200 | Asks real leads for money at the current price; produces `paid-test` evidence. Needs a landing page. |

Progress is capped at 100; a concierge or prototype build when progress is already 100 is `"already-built"`.

## Channels

The three channels and their price per lead are public (a price list). Each channel's fit with each segment is hidden. Leads reached for a $200 budget: `floor(20_000 / costPerLeadCents)` = 25 (Cold outreach, 800), 66 (Communities, 300), 8 (Paid ads, 2,500).

## Channel test (per lead `i` of channel round `n`, keys `("ch", n, i, ...)`)

`n` = number of `pickChannel` actions already taken. A lead is reached if `randInt(seed, 1, 100, "ch", n, i, "fit") <= fit`; interested if reached and `randInt(seed, 1, 100, "ch", n, i, "care") <= pain`. Evidence: `{ kind: "channel-test", week, segment, channel, leads, interested }`.

## Paid test (keys `("pt", n, i, ...)`, `n` = `chargeTest` actions taken)

A lead is reached by the same fit draw (`"fit"`). A reached lead has the problem if `randInt(seed, 1, 10000, "pt", n, i, "need") <= pain * (100 - incumbentSatisfactionPct)`. A lead pays if they have the problem and `randInt(seed, 1, 100, "pt", n, i, "buy") <= floor(conversionPct(priceRatioPct(priceCents, wtp)) * credibility / 100)` where `credibility = max(40, productProgressPct)`: pre-selling a landing page is much harder than selling a working product. Evidence: `{ kind: "paid-test", week, segment, channel, leads, payments, priceCents }`.

Each payment is real money: `cash += payments * priceCents` immediately. If the segment is the current focus segment, the payers become paying customers (`payingCustomers += payments`); sales to another segment bring cash and evidence only.

## Hypotheses (what the chart shows)

One per segment, derived from evidence only (never from the hidden world):

```ts
export type HypothesisState = "untested" | "weak" | "verified";
export interface Hypothesis {
  readonly segment: number;
  readonly state: HypothesisState;
  readonly interviews: number;       // completed interviews
  readonly interested: number;       // total interested leads from channel tests
  readonly payments: number;         // total payments from paid tests
  readonly failedPaidTests: number;  // paid tests with 10+ leads and no payment
}
```

`verified` if `payments >= 1`. Otherwise `weak` if `interviews >= 1` or `interested >= 1`. Otherwise `untested`. So compliments, fluff and interest never verify anything, and payment always outranks them. The function takes only the evidence list and the segment count and ignores the order of the list.

## Public state additions

`landingPageBuilt: boolean`, `channels: readonly { name; costPerLeadCents }[]` (price list, no fit), `hypotheses: readonly Hypothesis[]` (recomputed whenever evidence is added). `evidence` becomes `readonly (InterviewEvidence | ChannelTestEvidence | PaidTestEvidence)[]`. `SIM_VERSION` becomes 2 (state shape and engine changed).

## Actions, validation and errors

Validation order: shape, segment (`"invalid-segment"`), channel index (`"invalid-channel"`), build kind (`"invalid-build"`), `"already-built"`, `"nothing-to-sell"` (charge without a landing page), `"insufficient-cash"`. The reserved list shrinks to `hire` and `doubleDown`. `legalActions` lists every build that is allowed and affordable, and one `pickChannel` per segment and channel, and one `chargeTest` per segment and channel when a landing page exists, each when cash covers the cost. Stored actions are frozen canonical copies; save shape checks require integer indices and known kinds.

## Acceptance criteria

1. Build: each kind costs its cash plus the weeks of burn, adds its progress (capped at 100), sets `landingPageBuilt` only for the landing page, logs it, and is not applied if the run ends first. Landing page twice, and a concierge or prototype at progress 100, are `"already-built"`. Bad kinds are `"invalid-build"`; low cash is `"insufficient-cash"`.
2. Channel test: costs $200 plus burn; `leads` is 25, 66 or 8 by channel; `interested <= leads`; deterministic; keyed by round index, not week. Across seeds, a segment with channel fit 70+ yields at least 20 points higher interest rate than fit 30 or below.
3. Paid test: needs a landing page (`"nothing-to-sell"`); `payments <= leads`; cash rises by `payments * price` on top of the $200 cost; payers join `payingCustomers` only for the focus segment; at progress 100 payments are higher than at progress 5 across seeds (credibility).
4. Hypotheses: empty evidence is all untested; a completed interview or an interested lead makes weak; ended-early and no-response change nothing; any payment makes verified; compliment-tagged, fluff-tagged and committed-true interviews never verify; the result does not depend on evidence order; adding any evidence never lowers a state, and adding a payment always yields verified for its segment (property tests).
5. The stored `hypotheses` always equal the function applied to the stored evidence (checked after random play), and are identical for worlds that differ only in hidden parameters.
6. No leak: the new evidence kinds contain only the documented keys; hidden keys (`fit`, `needsIt`, `reached`) never appear.
7. Winnable: a scripted validator policy (test code) lands (default alive) in at least 10 percent of 200 seeds, and one seed's run is saved as a golden replay.
8. Saves with the new actions round trip; malformed shapes are `"invalid"`. `SIM_VERSION` is 2; golden fixtures are regenerated for it.
9. `npm run verify` passes; nothing weakened; no new dependency.

## Out of scope

Growth engines and word of mouth beyond the existing demand pull (M4), price discovery tools, the cause classifier (M5), UI. Known simplification: after the first payments, customers still arrive through the existing market-pull model rather than through the channel that sold them.

## Results (2026-10-17)

The scripted validator lands in 301 of 400 seeds (75 percent), far above the 25 to 45 percent design target, which confirms the known simplification: customers arrive by free market pull. Growth and acquisition cost move to M4 and the tuning to M7 (see ROADMAP.md). A payer's first month is paid up front and the weekly revenue model also counts them, a small overlap accepted for now.
