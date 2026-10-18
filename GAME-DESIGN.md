# Runway: Game Design

Source of truth for mechanics. The simulation lives in `src/sim/` as pure, seeded TypeScript with no UI imports, so it can be tested and replayed headlessly. The UI only reads state and sends actions.

Shaped in the private vault note "Startup Survival Sim Idea". Failure patterns come from the private vault note "Startup Failure Catalog - Research 2026-10-17". Pattern IDs (V1 to V9, M1 to M7) below refer to that note.

## Pitch

You run a startup, one week at a time, through the lean-startup loop: pick a problem, talk to customers, run a cheap test, read the result, then pivot or double down. Most runs fail. Every failure ends in an accident report that names the probable cause. Players learn by losing cheaply and flying again.

## What the player learns (v1)

1. Customer validation: ask about past behavior, discount compliments, test with money, find out who actually has the problem.
2. Money and runway: runway is pivots remaining, pricing matters, cheap tests beat big builds, cash-flow traps are real.

Selling skill, mindset, hiring and a 3D hub come after v1 (see ROADMAP).

## A run

- A run is a seeded flight. The same seed gives the same hidden world, so runs can be replayed and verified.
- Start: a founder (starting cash, skills), and a menu of three problem spaces drawn from the seed.
- A turn is one week. The player spends the week on one action.
- Fuel is cash. The main gauge is pivots remaining: how many times the player can afford to change course given burn and a typical test cost.
- End states: crash (cash gone before default-alive), or landing ("default alive": revenue covers burn for 8 consecutive weeks). v1 ends at landing. Later tiers extend beyond it toward the billionaire arc.

## Hidden world (generated from the seed, never shown directly)

- `trueDemand`: how many people in each customer segment have the problem badly enough to pay.
- `segments`: 3 to 5 customer groups, each with a pain level, a willingness to pay, a politeness level, and a reachability (V5 pattern: who-where).
- `competitors`: a free alternative that already satisfies some buyers ("we already solve this with a spreadsheet").
- `marketWeather`: slow shifts in demand and funding conditions (timing).
- `channels`: which routes to reach each segment work, and at what cost (V4 pattern).

The player sees only noisy evidence, and the quality of the evidence depends on how they gathered it.

## Actions (one per week)

| Action | Cost | What it does |
|---|---|---|
| Interview customers | 1 week, small cash | Run 3 conversations. The player chooses question types (below). Reveals noisy signal. |
| Build a test | 1 to 3 weeks, cash | Landing page, concierge service, or prototype. Higher fidelity costs more and reveals less per dollar early on. |
| Charge for a test | 1 week, small cash | Ask for money. Cuts the sample but gives the highest-quality signal (V3). |
| Pick a channel | 1 week, cash | Try to reach a segment. Reveals reach cost and conversion (V4). |
| Set a price | free, applies next week | Pricing affects who pays and revenue (M1). |
| Hire or contract | ongoing cost | Raises capacity and burn (M7). |
| Raise money | 3 to 9 weeks, no product progress | Adds cash with a dilution tradeoff and an investor-management drain (M2, M6). |
| Pivot | 1 week | Resets the problem or segment, keeps the knowledge learned. |
| Double down | 1 week | Invest further in the current direction. |

## Interviews: the signal model

This is the heart of the validation lesson (V2). Each conversation has:
- A segment and a customer archetype (polite, blunt, curious, hostile, a friend).
- A question the player picks from a type:
  - Past behavior ("Tell me about the last time you dealt with this.") returns high-quality signal about real pain and current workarounds.
  - Hypothetical ("Would you use something that did X?") returns flattering noise scaled by the customer's politeness.
  - Pitch ("Here is my idea, what do you think?") returns compliments and hides real behavior.
  - Commitment ("Would you pay $X now, or introduce me to someone who would?") returns a decisive but sample-reducing answer.
- The result is shown as what the customer said, with a hidden quality value. After the call, a short debrief reveals whether the signal was compliment, fluff, or fact, teaching the difference without a quiz.

The model has a deterministic core: signal quality = f(question type, archetype politeness, question specificity, segment pain). Noise comes from the seeded RNG.

## Evidence and the chart

Every belief the player holds is a hypothesis on the chart with a state:
- Untested (dotted grey).
- Weak evidence (dashed, from compliments or hypotheticals).
- Verified by behavior or payment (solid blue).

The core visual of the game is the ratio of dotted to solid route. A player who builds on dotted hypotheses sees why they crash.

## Money

- Burn = fixed costs + contracted people + test costs. Revenue comes from paying customers at the chosen price.
- Runway in pivots = floor(cash / pivotCost), shown beside raw cash. A pivot is one interview round plus one paid test, so `pivotCost` = (interview cash + test cash) + weekly burn x the weeks that round takes, held as integer cents of at least 1. It is fixed per run, visible to the player, and a tuning value.
- Pricing sets a conversion curve: too low attracts more demanding, lower-value customers and starves cash (M1); too high loses buyers. The optimum is hidden and learnable by testing.
- Cash-flow traps (M5): late-paying customers, bad short-term financing offers presented as help, payroll growing ahead of revenue.
- Fundraising (M2, M6): extends cash but costs weeks of progress and adds expectations that shorten the time before the next raise.

## Events (from the failure catalog)

Events are triggers for the lesson, not random punishments. Each event is tied to a pattern ID and fires based on the player's recent behavior, so the cause is traceable.

Examples: a friend loves the idea but is not the buyer (V2); free signups spike but payments do not (V3); the product is ready and no channel exists (V4); a feature request list grows while the core problem stays untested (V6); a large customer asks for a long pilot (V9); a lender offers fast cash on daily repayment (M5).

## The accident report

On a crash, a classifier reads the run history and ranks causes by pattern ID using explicit rules (for example V1 fires when 6 or more weeks of build precede the first interview or paid test). The report contains:
- Summary: how long the flight lasted and where it ended.
- Probable cause: the top pattern, stated factually, with the run's own numbers.
- Contributing factors: up to 3 further patterns.
- What would have changed the outcome: one concrete action available at a specific week, tied to a vault concept (Mom Test, Lean Startup).

The report must never be generic. If the classifier cannot name a cause with evidence from the run, it reports "no single dominant cause" and lists the closest factors.

## Meta-progression

Knowledge, not power. After each run the player's field notes grow: patterns they have met, questions that worked, a codex of cause explanations. The sim stays the same difficulty. Unlocks are new problem spaces and new event variety, which keeps runs fresh without inflating stats.

## Balance targets (initial, to be tuned by the balance bots)

| Strategy bot | Expected result on a fixed 200-seed set |
|---|---|
| Builder: builds for 8+ weeks before any interview | Crashes with V1 as the probable cause in at least 80% of runs |
| Pitcher: interviews only with pitch and hypothetical questions | Crashes, usually V2 or V3, in at least 70% |
| Validator: past-behavior interviews, then paid tests, then builds | Lands in 25% to 45% of runs |
| Underpricer: sets the lowest price | Cash-starved crash in at least 60%, M1 named |
| Random | Lands in under 10% |

If the Validator lands under 25% the game is too punishing; over 45% it is too easy. Tune the world generator, not the targets, unless Nolan changes them.

## Out of scope for v1

Selling and negotiation mechanics, mindset and psychology, hiring depth beyond a single cost line, co-founder events, multi-company portfolios, the billionaire stages, any 3D, multiplayer, accounts or cloud saves. Saves are local to the browser.
