---
spec: M5 events and the accident report
status: implemented and verified (approved by Nolan, 2026-10-17: "for gameplay decisions, do whatever is most realistic"; written without the interactive /spec gate)
sources: ROADMAP.md (M5), GAME-DESIGN.md (The accident report), the failure catalog (patterns V1 to V9, M1 to M7), DESIGN.md (the report is the one loud moment)
---

# M5: The accident report

## Context

Every run that does not land ends in a report that names the probable cause, with evidence from that run, and says what would have changed the outcome. The report is pure: it replays the run's seed and actions to rebuild the history, applies explicit rules, and returns text built only from numbers in that history. The events that feed it (loan offers, late payers, investor proof) already exist from M4; M5 adds the books they need and the classifier.

## State additions (the books)

`ledger: { revenueCents, marketingCents, buildCents, payrollCents }` (cumulative; revenue is accrual revenue, marketing is weekly spend, build is cash paid for builds, payroll is `hires x 100,000` per week), `firstPaymentWeek: number | null` (week of the first paid test with a payment), `raiseWeeks` (weeks spent raising money). `SIM_VERSION` becomes 4.

## History

`buildHistory(seed, actions)` replays the run and returns one step per action: `{ action, before, after }` (public states). The final state is the last `after` (or the initial state with no actions). Rules read only this history, never the hidden world.

## Patterns and rules (all rules run only for runs that did not land)

Each rule returns evidence lines (with numbers), a weight (bigger means closer to the cause of death), a title, a one-sentence fix tied to a vault lesson. `usd()` formats cents with integer math.

| ID | Pattern | Fires when | Weight |
|---|---|---|---|
| V1 | Built first, asked later | The first interview, channel test or paid test came at week 6 or later and at least a builds worth 20+ progress points existed before it; or builds happened and there was never any customer conversation | week of the first conversation (or the end week) |
| V2 | Polite-lie validation | 3+ completed interviews, at least 60 percent of them pitches, hypotheticals or friends, and at most 1 tagged fact | 40 + conversations |
| V3 | Interest mistaken for demand | A product reached 20+ progress and nobody was ever asked to pay (no paid test) | 50 |
| V4 | Distribution as an afterthought | Progress reached 60 and marketing stayed off for 8+ weeks after (or never started) | weeks idle + 30 |
| V5 | Sold to people never talked to | A product exists and the final focus segment has no completed interview and no paid test | 45 |
| V6 | Over-built before proof | Build spend reached $6,000 before the first payment (or without any) | build spend in thousands |
| V8 | Restarted instead of learning | 3+ pivots, or a pivot away from a segment that already had a payment | 35 + 5 per pivot |
| M1 | Underpricing | Crashed or stalled and 40+ percent of weeks ran at a price of $19 or less | 55 |
| M2 | Money ran out before proof | Crashed on cash and the first payment came after week 30 or never | 50 |
| M3 | Growth on bad unit economics | Marketing spend of $4,000+ and at least 1.5 times lifetime revenue | 55 |
| M4 | The zombie | Stalled at week 104 after raising money | 60 |
| M5 | Cash-flow trap | Crashed on cash after taking the loan offer (weight 70), or while profitable on paper for 3+ weeks in a row (weight 60) | 70 or 60 |
| M6 | Fundraising as a second job | Crashed on cash after 10+ weeks spent raising | 5 per raise week |
| M7 | Hired ahead of revenue | Payroll was paid and the first hire came before the first payment (or there was none), and the run did not land | 50 |

V7 and V9 (selling a tool instead of a result, and B2B sales cycles) are not supported by the v1 mechanics and are left out.

## Report

```ts
interface Report {
  readonly outcome: "landed" | "crashed" | "stalled";
  readonly headline: string;
  readonly summary: string;
  readonly probableCause: Cause | null;       // null for a landing or when no single cause stands out
  readonly contributing: readonly Cause[];    // up to 3 more, by weight
  readonly wouldHaveChanged: string | null;   // the fix of the probable cause
  readonly noDominantCause: boolean;
  readonly numbers: readonly string[];        // every number the text quotes, as written
}
interface Cause { readonly id: PatternId; readonly title: string; readonly evidence: readonly string[]; readonly lesson: string }
```

Probable cause is the highest weight (ties by table order); contributing are the next three. If nothing fires the report says "No single dominant cause" and lists the closest facts (weeks, cash, customers, evidence counts). A landing gets a landing report (what verified the idea and when), no causes. `report(run)` returns `null` while the run is still going.

## Acceptance criteria

1. Ledger: revenue, marketing, build and payroll totals match hand-computed scenarios; `firstPaymentWeek` and `raiseWeeks` are set correctly; the ledger never decreases.
2. Each of the 14 patterns fires on its hand-built history and does not fire on its control (a history that differs only in the triggering fact), including the boundary values in the table.
3. A history that landed produces no patterns.
4. Probable cause is the highest weight; contributing has at most 3 and excludes the probable cause; with nothing firing, `noDominantCause` is true and the report still quotes numbers.
5. Every report quotes at least one number from its own run (the end week and a money or count figure) and `numbers` lists them; no report text is shared between two different causes (sentence sets are disjoint after removing digits).
6. `buildHistory` has one step per action; replaying is deterministic; `report(run)` is `null` for a running run; the report never reads the hidden world (static check: the module does not import `Secret` types or world code).
7. Real runs: across 400 seeds of the validator policy and 200 of random play, every finished run yields a well-formed report (outcome matches status, headline and summary non-empty, at most 3 contributing, no duplicate ids).
8. Golden fixtures regenerated for `SIM_VERSION` 4; a golden report fixture (the landing run's report and one crash's report) is committed; `npm run verify` passes; nothing weakened; no new dependency.

## Out of scope

The report screen and its reveal (M6), the share card (M8), a seen-causes store (M8). Patterns V7 and V9.
