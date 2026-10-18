---
spec: M2 interview system
status: implemented and verified (approved by Nolan, 2026-10-17: "for gameplay decisions, do whatever is most realistic"; written without the interactive /spec gate)
sources: ROADMAP.md (M2), GAME-DESIGN.md (Interviews: the signal model), the Mom Test shelf, docs/specs/M1-simulation-core.md
---

# M2: Interview system

## Context

The game's central lesson is that customer conversations only count as evidence when you ask about what people did, not what they might do. M2 adds the `interview` action and a signal model grounded in the Mom Test: past-behavior questions give real information, hypothetical and pitch questions give flattery, commitment questions give decisive answers but lose people, and friends say what you want to hear. It builds on M1 (keyed randomness, `Secret`/`PublicState`, one reducer). Everything stays pure, deterministic and integer-only.

## What the player does

`{ type: "interview", segment, questions: [q1, q2, q3] }`: spend one week and $300 to try to hold three conversations with people from one customer segment, choosing a question type for each. Question types:

| Type | The question | Realistic effect |
|---|---|---|
| `past-behavior` | "Tell me about the last time this came up." | Best information about real pain. Needs a customer who has the problem. |
| `commitment` | "Would you pay this today, or introduce me to someone who would?" | Decisive answer, but people end the call, so fewer finish. |
| `hypothetical` | "Would you use something that did X?" | Mostly polite noise. |
| `pitch` | "Here is my idea, what do you think?" | Compliments, hides real behavior. |

## Rules

### Who shows up (per conversation slot `i` of round `n`, keys `("iv", n, i, ...)`)

`n` is the number of interview actions already taken. Conversation slots are independent draws.

1. Friend: `randChance(seed, 0.10, "iv", n, i, "friend")`. Friends always answer and are not from the segment, so they say what you want to hear.
2. Otherwise a stranger from the chosen segment answers only if `randInt(seed, 1, 100, "iv", n, i, "reach") <= reachability`. If not: outcome `no-response`.
3. Archetype of an answering stranger, weighted draw (`randInt(seed, 1, total, "iv", n, i, "arch")`): polite weight `politeness`, blunt weight `100 - politeness`, curious weight 30, hostile weight 20 (total 150).
4. Does this person actually have the problem: `needsIt = randInt(seed, 1, 10000, "iv", n, i, "need") <= pain * (100 - incumbentSatisfactionPct)`.

### Ending early

Friends never end a call early (`endEarlyPct` is 0). For strangers: `endEarlyPct = (hostile ? 40 : 0) + (question === "commitment" ? 50 - floor(pain / 4) : 0)`, clamped to `[0, 95]`. If `randInt(seed, 1, 100, "iv", n, i, "end") <= endEarlyPct` the outcome is `ended-early` and nothing is learned.

### Signal quality (0 to 100)

Start from the base: `past-behavior` 80, `commitment` 70, `hypothetical` 35, `pitch` 15. Add the archetype modifier:

| Archetype | past-behavior | commitment | hypothetical | pitch |
|---|---|---|---|---|
| polite | -5 | -10 | -20 | -10 |
| blunt | +5 | +5 | +5 | +5 |
| curious | +10 | 0 | 0 | 0 |
| hostile | -15 | -15 | -15 | -15 |
| friend | none | none | none | none |

For `past-behavior` and `commitment` add `floor((pain - 60) / 4)` (about -10 to +10). A friend's quality is capped: 45 for `past-behavior`, 25 otherwise. Clamp to `[0, 100]`. Pain is the focus segment's `pain` for strangers and the chosen segment's `pain` for friends (a friend is still describing that market).

Debrief tag: quality 60 or more is `fact`; 30 to 59 is `fluff`; below 30 is `compliment` for polite, curious and friend customers and `fluff` for blunt and hostile ones.

### What a completed conversation reveals

`truth = needsIt ? pain : floor(pain / 4)`. `painReading = clamp(truth + noise + flattery, 0, 100)` where `noise = randInt(seed, -m, m, "iv", n, i, "noise")` with `m = floor((100 - quality) / 2)`, and `flattery = floor((100 - quality) / 4)` when the question is `hypothetical` or `pitch` and the customer is polite or a friend (else 0).

For a completed `commitment` question: strangers `committed = needsIt && randInt(seed, 1, 100, "iv", n, i, "buy") <= conversionPct(priceRatioPct(priceCents, wtp))` using the segment's willingness to pay and the current price. Friends: `committed = randInt(seed, 1, 100, "iv", n, i, "buy") <= 70` whatever the product is, and their tag is a compliment, so the player can learn to discount them. Other question types set `committed` to null.

`quote` is a short sentence chosen from a fixed table by question type, tag and (for commitment) the answer, with `randPick(seed, ..., "iv", n, i, "quote")` for variety. Quotes teach: a fact quote names a real moment; a compliment quote says "great idea" without a specific.

### Cost and timing

The round costs `INTERVIEW_ROUND_CASH_CENTS` (30,000). It is paid before the week's tick, then the week runs normally (burn, revenue). Evidence is recorded whether or not the run ends that week, because the conversations happened. A log entry reads "Interview round: {answered} of 3 answered." with `answered` counting completed conversations.

### Evidence shape (public)

```ts
export type QuestionType = "past-behavior" | "commitment" | "hypothetical" | "pitch";
export type DebriefTag = "fact" | "fluff" | "compliment";
export interface InterviewEvidence {
  readonly kind: "interview";
  readonly week: number;            // the week the round started
  readonly segment: number;
  readonly customer: "stranger" | "friend" | "none";   // "none" when nobody answered
  readonly question: QuestionType;
  readonly outcome: "no-response" | "ended-early" | "completed";
  readonly tag: DebriefTag | null;  // null unless completed
  readonly painReading: number | null;   // 0 to 100, noisy; null unless completed
  readonly committed: boolean | null;    // only a completed commitment question
  readonly quote: string;
}
```

The archetype, `needsIt`, the exact quality and the true pain never appear. The tag is the post-call debrief the design promises.

### Actions and errors

`Action` gains `{ type: "interview"; segment: number; questions: readonly QuestionType[] }` and `"interview"` leaves the reserved list. New `IllegalReason`s: `"invalid-questions"` (not exactly 3 known question types), `"insufficient-cash"` (cash below $300). An out-of-range or non-integer `segment` returns `"invalid-segment"`. `legalActions` lists one interview per segment and per question type using that type for all three slots (segments x 4 actions) when cash allows; `step` accepts any valid mix. Stored actions are frozen canonical copies (the `questions` array is copied and frozen). Save shape checks require an integer `segment` and exactly 3 known question types.

## Files

| File | Change |
|---|---|
| `src/sim/types.ts` | `QuestionType`, `DebriefTag`, `InterviewEvidence`; `PublicState.evidence` becomes `readonly InterviewEvidence[]`; `Action` and `IllegalReason` additions |
| `src/sim/archetypes.ts` | `Archetype` type, `archetypeWeights(politeness)`, `pickArchetype(weights, roll)` |
| `src/sim/signal.ts` | `signalQuality`, `debriefTag`, `endEarlyPct`, `painReading` (all pure, integer) |
| `src/sim/interview.ts` | `runInterviewRound(...)` returning three `InterviewEvidence`, quote tables |
| `src/sim/actions.ts` | interview in `legalActions`, shape check, leave the reserved list |
| `src/sim/reducer.ts` | `interview` case |
| `src/sim/view.ts` | freeze evidence entries |
| `src/sim/save.ts` | no logic change (shape check lives in `actions.ts`) |

## Acceptance criteria

1. `signalQuality` matches a hand-checked table of 12 cells and clamps to `[0, 100]`.
2. For every archetype and every pain from 20 to 100, quality is strictly ordered `pitch < hypothetical < past-behavior`.
3. Across 500 seeds, for each archetype separately, the mean quality for `past-behavior` exceeds `hypothetical` by at least 15 points, and `hypothetical` exceeds `pitch`.
4. Across 500 seeds of full interview rounds: at least 70 percent of completed `past-behavior` conversations are tagged `fact`; none of the `pitch` conversations are `fact`; at most 10 percent of `hypothetical` ones are.
5. `commitment` rounds finish (`completed` out of answered) at least 15 points less often than `past-behavior` rounds.
6. Friends: across 500 seeds, friend conversations are never tagged `fact`; friend `commitment` answers are `committed: true` between 55 and 85 percent of the time.
7. Reachability: low-reachability segments (30 or below) produce more `no-response` outcomes than high-reachability ones (70 or above), by at least 30 points.
8. Archetype weights: for politeness 100, no blunt strangers appear; for politeness 0, no polite ones.
9. Determinism: the same seed and action list gives identical evidence; evidence does not change when an unrelated earlier action (setPrice) is inserted (keyed draws use the interview index, not the week).
10. Reducer: an interview costs exactly 30,000 cents plus one week of burn; adds exactly 3 evidence entries; `"invalid-questions"`, `"invalid-segment"` and `"insufficient-cash"` are returned with the run unchanged; `legalActions` includes `segments x 4` interviews on a fresh run and none when cash is under 30,000.
11. No leak: evidence JSON has only the documented keys; the hidden keys test also forbids `needsIt`, `archetype`, `quality`.
12. Saves: runs containing interviews round trip; a save with 2 or 4 questions or an unknown question type is `"invalid"`.
13. A golden replay fixture with interviews replays to the committed state.
14. `npm run verify` passes (all gates); nothing weakened; no new dependency.

## Out of scope

Hypotheses and the chart (M3), paying for tests, channels in play, the report classifier (M5), any UI. Interviews cannot change the world; they only produce evidence.
