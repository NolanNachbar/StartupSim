---
spec: M4 money and growth
status: implemented and verified (approved by Nolan, 2026-10-17: "for gameplay decisions, do whatever is most realistic"; written without the interactive /spec gate)
sources: ROADMAP.md (M4), GAME-DESIGN.md (Money, events), the failure catalog (M1 underpricing, M2 too little raised, M3 growth on bad unit economics, M5 cash-flow trap and bad loans, M6 investor drain, M7 hiring ahead of revenue)
---

# M4: Money and growth

## Context

M3 left customers arriving by free market pull, so a scripted good founder won 75 percent of runs against a 25 to 45 percent target. Real customers cost money to acquire, leave, and can only be found where the market has them. M4 replaces the free pull with paid acquisition, adds churn and a market ceiling, and adds the money problems the failure catalog says founders hit: payroll, late payers, predatory loans and investor strings.

## Marketing and acquisition

`setMarketing { channel: number | null, level: 0 | 1 | 2 | 3 }` is free and takes effect from the next tick. Weekly budgets by level: 0, 40,000, 120,000, 300,000 cents. Level 0 requires `channel: null`; levels 1 to 3 require a valid channel index (`"invalid-channel"`, `"invalid-level"`). Public state: `marketing: { channel, level }`.

Each tick, when marketing is active, the budget is spent (it is a cost) and reaches `leads = floor(budget * (100 + 25 * hires) / (costPerLeadCents * 100))` leads in the focus segment. Expected customers won:

`num = leads * fit * need * buyPct` and `den = 100_000_000`, where `fit` is the channel's hidden fit with the focus segment, `need = pain * (100 - incumbentSatisfactionPct)`, `buyPct = floor(conversionPct(priceRatioPct(price, wtp)) * credibility / 100)` and `credibility = max(40, productProgressPct)`. Acquired customers are `floor(num / den)` plus 1 with probability `(num mod den) / den` (one keyed draw `randInt(seed, 1, den, "acq", week)`; "randomized rounding"). The market ceiling is the share of the demand pool willing to pay at the current price, shrunk by weather: `floor(trueDemand * conversionPct(priceRatio) * weatherPct / 10000)`. Price therefore changes both how fast customers arrive and how many can exist, which gives the pricing curve a learnable optimum.

## Churn and the ceiling

Weekly churn in basis points: `churnBp = 150 + 4 * (100 - productProgressPct)` (150 for a finished product, 550 for none). `churned = floor(customers * churnBp / 10000)` plus 1 with probability `(customers * churnBp mod 10000) / 10000` (key `"churn", week`). After acquisition and churn, customers are capped at the market ceiling. The old market-pull ramp is removed.

## Payroll

`hire` (free action, takes effect immediately): up to 2 hires. Each hire adds 100,000 cents to the weekly fixed burn (`weeklyBurnCents`), shortens every build by 1 week (minimum 1) and adds 25 percent to marketing leads. Illegal beyond 2 (`"hire-limit"`) or with cash under one week of the new burn (`"insufficient-cash"`). Hiring ahead of revenue is the realistic way to die.

## Late payers

Some worlds contain a hidden late-payer window: `lateWindow` with probability 0.5, start week 15 to 70, length 8 to 16 weeks, 40 percent of revenue paid late, 6 weeks late. During the window that share of each week's revenue becomes a receivable due 6 weeks later instead of cash. `receivables: { week, amountCents }[]` is public (you know who owes you). Revenue (accrual) and the profit streak still count it; cash does not. Profitable on paper, short of cash.

## Predatory loan offer

When `pivotsRemaining <= 1`, `week >= 6`, the run is running and no offer was ever shown, an offer appears: $40,000 now, repaid at $2,800 a week for 20 weeks (a 40 percent premium). Public: `offer: { amountCents, weeklyRepaymentCents, weeks, expiresWeek } | null`, `loan: { weeklyRepaymentCents, weeksLeft } | null`. The offer expires 3 weeks after it appears. `respondOffer { accept: boolean }` is free; accepting adds the cash and starts repayment, declining clears the offer. Repayment comes out of cash each tick until the loan is paid. `"no-offer"` if there is none. Loan repayments are not a cost for the profit streak but they do drain cash.

## Fundraising

Equity given is 15 percent for the first raise and 20 percent for the second. A second raise needs a verified hypothesis (`"investors-want-proof"` otherwise): investors fund evidence, not stories.

## Money accounting per tick

1. acquisition, churn, ceiling (above). 2. `revenue = weeklyRevenue(customers, price)`. 3. Late share goes to receivables; receivables due this week are collected. 4. `cash += cashRevenue + collected - weeklyBurn - marketingSpend - loanRepayment`. 5. week advances. 6. `profitableStreakWeeks` grows when `revenue >= weeklyBurn + marketingSpend`, else resets. 7. Offer creation and expiry. 8. End checks as before (cash below zero crashes first, then landing, then the week cap). `weeklyRevenueCents` stays the accrual revenue.

## Public state additions and version

`marketing`, `hires`, `receivables`, `offer`, `loan`, `offersShown` (count), `weeklyBurnCents` now includes payroll. `Secret` gains `lateWindow`. `Action` gains `setMarketing`, `hire`, `respondOffer`; reserved list becomes only `doubleDown`. `IllegalReason` gains `"invalid-level"`, `"hire-limit"`, `"no-offer"`, `"investors-want-proof"`. `SIM_VERSION` becomes 3.

## Acceptance criteria

1. Acquisition: a hand-built scenario with exact multiples (`num` a multiple of `den`) acquires exactly the expected customers; with marketing off, nobody is acquired; randomized rounding is a pure function tested with explicit draws; a segment with higher channel fit acquires more across seeds.
2. Churn: a scenario with `customers * churnBp` an exact multiple of 10,000 loses exactly that many; unfinished products churn faster than finished ones.
3. Ceiling: customers never exceed the price-dependent ceiling above, including after weather turns on.
4. Marketing spend is a cost for cash and for the profit streak; the budget table, validation and errors match.
5. Hire: burn, build-time and lead effects as specified; limits and errors.
6. Late payer: during the window, cash lags accrual revenue by the late share and catches up 6 weeks later; accrual revenue and streak are unchanged; receivables are listed publicly.
7. Loan offer: appears exactly once under the stated trigger, expires after 3 weeks, accept and decline behave as specified, repayment drains cash and ends after 20 weeks, only one offer per run.
8. Fundraising: equity 15 then 20; the second raise without proof is `"investors-want-proof"`.
9. Pricing: across 400 seeds, a scripted founder who sets the lowest price ends with materially less cash at week 104 or crash more often than one at the default price (the "lowest price starves cash" check); a mid ladder price beats both on average revenue.
10. Invariants over random play (1,000 seeds): `pivotsRemaining >= 0` always; `cash < 0` implies status `crashed`; every number is a safe integer; no run exceeds week 104.
11. The scripted validator (with marketing) lands in a 25 to 75 percent band over 400 seeds (the exact tuning toward the 25 to 45 percent design target is M7; a wide band here keeps M4 honest without over-fitting).
12. Golden fixtures regenerated for `SIM_VERSION` 3; no-leak keys extended (`lateWindow`); saves round trip the new actions; `npm run verify` passes; nothing weakened; no new dependency.

## Out of scope

The event text and accident report (M5), UI (M6), strategy bots and final balance (M7), selling skill, hiring depth beyond cost and effect, co-founders.

## Results (2026-10-17)

Win rate of the scripted validator over 400 seeds: 259 landed (65 percent) at the default price; 106 at the lowest price ($9); 241 at $99; 165 at $199. Pricing matters as designed. The overall rate is above the 25 to 45 percent target; the tuning levers (fixed burn, acquisition conversion via `ACQUISITION_DIVISOR`, churn, the landing threshold, run length) are set aside for M7, where strategy bots drive it.
