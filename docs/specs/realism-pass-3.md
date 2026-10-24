# Realism pass 3: from sixteen audits

Sixteen Haiku auditors (gym, restaurant, software, service, product, marketing and promotions, hiring, pricing and demand,
money, market environment, customer discovery, founder time, failure reports, industries 0 to 6, industries 7 to 13,
balance, and a newcomer playthrough) each played the sim and compared it with real numbers. Their full reports are in the
session scratchpad (`audit3/*.md`). Figures marked as estimates there are directional only: verify against a primary
source before treating one as fact. This file is the synthesis and the order of work.

## What every audit agreed on

1. Revenue is a monthly subscription for every kind of business. Real businesses bill per visit, per order, per job or per
   night. This is the biggest gap: a restaurant, a hostel and a candle shop are not memberships.
2. Marketing is three generic channels with fixed cost, static hidden fit and no learning. Real founders choose among
   channels that depend on the kind of business, that saturate, that compound (reviews, referrals) and that have promotions.
3. Nothing in the world changes: no seasonality, competitors, platform cost drift, supplier prices, macro cycles.
4. Opening a place has no capex, lease, licences or insurance. Start cash is only by model, not by format or industry.
5. People: one wage for every role, no ramp, no firing, no candidates, no founder time cost.
6. Churn is flat; real gym and consumer churn is far higher in the first months.
7. Interviews are too clean and too generic (63 distinct lines in 900 gym talks).
8. Money: loan is about 180 percent APR; seed rounds close in 3 to 9 weeks; paid-test money is booked as revenue.

## Order of work (each step is its own commit, with tests and a balance run)

A. Billing units: each combo declares its unit (month, visit, order, job, night) and visits per customer per week; price
   ladders and copy follow. Gym stays a monthly membership; cafe, bakery, escape room become per visit; candles per order.
B. Channels per kind of business, with realistic cost per lead, saturation, launch ramp, and fit that sharpens with use.
C. Promotions: grand opening, free trial, intro rate, referral reward, happy hour, loyalty. Each has a cost, a demand lift,
   a duration and a side effect (discount cohorts churn more).
D. Reputation: a 1 to 5 rating that moves with quality, crowding and price against value; feeds conversion and retention.
E. Environment: monthly seasonality per industry, one competitor per run, platform cost drift, supplier price changes,
   regulation notices. Each shows in the log ahead of time and has a response the player can choose.
F. Place capex: lease deposit, build-out and equipment as a choice with tiers; start cash by format.
G. People: wage by role and kind, loaded cost, 4 to 6 week search, ramp, candidates, firing, founder hours per hire.
H. Churn by tenure; interviews with many more lines per business; reply rate by recruiting channel.
I. Money: price the loan as what it is (a merchant cash advance), rounds by traction, deposits for paid tests.
J. Content fixes from the industry audits (wrong customer groups, per-visit pricing, regulated industries).

## Status (2026-10-23)

All ten steps (A to J) are built. In order: billing units per visit, order, job, night or month (A); per-kind channels,
promotions, reputation, seasonality and a rival (B to E); fit-out costs, start cash and what kind of place it is by industry
and by the words of the idea (F); wages by role and kind, ramp-up, firing, quitting (G); newcomer churn and many more
interview lines (H); money: raising takes months, lenders want revenue, deposits are liabilities, card fees (I); content
fixes and rules to know before opening (J).

A second round of Haiku re-audits (gym, cafe, software and service, balance and bugs, a newcomer playthrough) found and
fixed: small cohorts never churning, fit-outs expensed instead of kept as an asset, a hire gate that disagreed with the
list of legal moves, ledger payroll at a flat wage, an overdrawn balance shown as an asset, contacts that never faded,
referrals without a product, no capacity enforcement after quits, cost of goods the same for a gym and a cafe, and
service prices that ignored the industry.

Still open (not built): personal training and join fees for gyms, attendance as a driver of retention, trial and freemium
funnels, founder hours as a hard ceiling, a gym's peak hours, a pricing-tier system, a cash-scaling path for big starts.
