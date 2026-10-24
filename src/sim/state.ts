// Internal run state. Nothing outside src/sim imports this: the public API wraps it as an opaque Run.
import { DIFFICULTIES, DIFFICULTY_DEFAULT, type BusinessChoice } from "./business";
import { BUILD_TABLE, INTERVIEW_ROUND_CASH_CENTS, PIVOT_COST_CENTS, ROUND_WEEKS, START_CASH_CENTS, TEST_CASH_CENTS, WEEKLY_BURN_CENTS, pivotsRemaining } from "./runway";
import { BURN_BY_MODEL, START_CASH_BY_MODEL, START_PRICE_BY_MODEL, BUILDS_BY_MODEL, CAPACITY_BY_MODEL, WAGE_BY_MODEL, ROLES, type Role } from "./realism";
import { NO_SCALE, pct, scaleFor } from "./scale";
import { billingFor, cogsFor, ladderAround, nicePrice } from "./billing";
import { PRICE_LADDER_CENTS } from "./actions";
import { hypothesesFrom } from "./hypotheses";
import { seasonAt } from "./seasons";
import type { Action, PublicState, Secret } from "./types";
import { generateWorld } from "./world";

export interface InternalRun {
  readonly seed: number;
  /** The market, or null for the original generic world. */
  readonly industry: number | null;
  /** The business model and idea the player chose, or null. */
  readonly business: BusinessChoice | null;
  /** Accepted actions, in order. Together with the seed they reproduce the run. */
  readonly actions: readonly Action[];
  readonly secret: Secret;
  readonly pub: PublicState;
}

export const START_PRICE_CENTS = 4_900;

export function initialRun(seed: number, industry: number | null = null, business: BusinessChoice | null = null): InternalRun {
  const secret = generateWorld(seed, industry, business);
  const level = DIFFICULTIES[secret.business?.difficulty ?? DIFFICULTY_DEFAULT] ?? (DIFFICULTIES[DIFFICULTY_DEFAULT] as (typeof DIFFICULTIES)[number]);
  const startCash = secret.business
    ? (secret.business.startCashCents ?? Math.round((START_CASH_BY_MODEL[secret.business.model.id] * level.cashPct) / 100 / 50_000) * 50_000)
    : START_CASH_CENTS;
  const billing = secret.business ? billingFor(industry, secret.business.model.id) : null;
  // What kind of place it is (an industry's base, then the words of the idea) scales a place's price, size, staff and costs.
  const scale = secret.business ? scaleFor(industry, secret.business.model.id, secret.business.idea) : NO_SCALE;
  const startPrice = secret.business && billing ? nicePrice(Math.round((((START_PRICE_BY_MODEL[secret.business.model.id] * 10) / billing.perMonthX10) * scale.price) / 100)) : START_PRICE_CENTS;
  const burn = secret.business ? Math.round((((BURN_BY_MODEL[secret.business.model.id] * level.burnPct) / 100) * scale.burn) / 100 / 100) * 100 : WEEKLY_BURN_CENTS;
  const capacitySpec = secret.business ? { base: pct(CAPACITY_BY_MODEL[secret.business.model.id].base, scale.capacity), perOps: pct(CAPACITY_BY_MODEL[secret.business.model.id].perOps, scale.capacity) } : null;
  const wages = secret.business ? (Object.fromEntries(ROLES.map((r) => [r, Math.round(pct(WAGE_BY_MODEL[secret.business!.model.id][r], scale.wage) / 1000) * 1000])) as Record<Role, number>) : { builder: 0, seller: 0, ops: 0 };
  const builds = secret.business ? (Object.fromEntries(Object.entries(BUILDS_BY_MODEL[secret.business.model.id]).map(([k, v]) => [k, { ...v, cashCents: Math.round(pct(v.cashCents, scale.fitout) / 100) * 100 }])) as typeof BUILD_TABLE) : BUILD_TABLE;
  const pivotCost = secret.business ? INTERVIEW_ROUND_CASH_CENTS + TEST_CASH_CENTS + ROUND_WEEKS * burn : PIVOT_COST_CENTS;
  const pub: PublicState = {
    week: 0,
    status: "running",
    endReason: null,
    cashCents: startCash,
    weeklyBurnCents: burn,
    priceCents: startPrice,
    pivotCostCents: pivotCost,
    pivotsRemaining: pivotsRemaining(startCash, pivotCost),
    pivotsUsed: 0,
    raisesUsed: 0,
    equityGivenPct: 0,
    productProgressPct: 0,
    books: { startCashCents: startCash, equityRaisedCents: 0, loanReceivedCents: 0, principalRepaidCents: 0, interestCents: 0, salesCashCents: 0, testSalesCents: 0, cogsCents: 0, operatingCents: 0, marketingCents: 0, rndCents: 0, learningCents: 0, capexCents: 0, depreciationCents: 0 },
    cohorts: [],
    hiredAt: [],
    wages,
    capacitySpec,
    network: { contacts: 0, events: 0 },
    promo: null,
    reputation: 50,
    rivalSince: null,
    season: secret.business && industry !== null ? seasonAt(industry, seed, 0) : null,
    promoCooldown: 0,
    cogsPct: secret.business ? cogsFor(industry, secret.business.model.id) : 0,
    priceLadderCents: secret.business ? ladderAround(startPrice) : PRICE_LADDER_CENTS,
    billing,
    builds,
    payingCustomers: 0,
    weeklyRevenueCents: 0,
    profitableStreakWeeks: 0,
    problemName: secret.problemName,
    segmentNames: secret.segments.map((s) => s.name),
    focusSegment: secret.startFocus,
    landingPageBuilt: false,
    ledger: { revenueCents: 0, marketingCents: 0, buildCents: 0, payrollCents: 0 },
    firstPaymentWeek: null,
    raiseWeeks: 0,
    marketing: secret.business ? { channel: null, level: 0, target: null } : { channel: null, level: 0 },
    hires: 0,
    team: { builder: 0, seller: 0, ops: 0 },
    rndLevel: 0,
    qualityPct: 0,
    customersBySegment: secret.segments.map(() => 0),
    capacity: capacitySpec ? capacitySpec.base : null,
    receivables: [],
    offer: null,
    loan: null,
    offersShown: 0,
    channels: secret.channels.map((c) => ({ name: c.name, ...(c.blurb ? { blurb: c.blurb } : {}), costPerLeadCents: c.costPerLeadCents })),
    log: [],
    evidence: [],
    hypotheses: hypothesesFrom([], secret.segments.length),
  };
  return { seed, industry, business, actions: [], secret, pub };
}

/**
 * Test-only: a run with overridden public or secret fields. Overrides are applied as given, with no
 * consistency checks, so tests can build exact scenarios. Not exported from index.ts.
 */
export function unsafeRunForTest(
  seed: number,
  pub: Partial<PublicState> = {},
  secret: Partial<Secret> = {},
): InternalRun {
  const base = initialRun(seed);
  return { ...base, pub: { ...base.pub, ...pub }, secret: { ...base.secret, ...secret } };
}
