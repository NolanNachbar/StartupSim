// Internal run state. Nothing outside src/sim imports this: the public API wraps it as an opaque Run.
import type { BusinessChoice } from "./business";
import { INTERVIEW_ROUND_CASH_CENTS, PIVOT_COST_CENTS, ROUND_WEEKS, START_CASH_CENTS, TEST_CASH_CENTS, WEEKLY_BURN_CENTS, pivotsRemaining } from "./runway";
import { BURN_BY_MODEL, START_PRICE_BY_MODEL, capacityOf } from "./realism";
import { hypothesesFrom } from "./hypotheses";
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
  const burn = secret.business ? BURN_BY_MODEL[secret.business.model.id] : WEEKLY_BURN_CENTS;
  const pivotCost = secret.business ? INTERVIEW_ROUND_CASH_CENTS + TEST_CASH_CENTS + ROUND_WEEKS * burn : PIVOT_COST_CENTS;
  const pub: PublicState = {
    week: 0,
    status: "running",
    endReason: null,
    cashCents: START_CASH_CENTS,
    weeklyBurnCents: secret.business ? BURN_BY_MODEL[secret.business.model.id] : WEEKLY_BURN_CENTS,
    priceCents: secret.business ? START_PRICE_BY_MODEL[secret.business.model.id] : START_PRICE_CENTS,
    pivotCostCents: pivotCost,
    pivotsRemaining: pivotsRemaining(START_CASH_CENTS, pivotCost),
    pivotsUsed: 0,
    raisesUsed: 0,
    equityGivenPct: 0,
    productProgressPct: 0,
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
    capacity: secret.business ? capacityOf(secret.business.model.id, 0) : null,
    receivables: [],
    offer: null,
    loan: null,
    offersShown: 0,
    channels: secret.channels.map((c) => ({ name: c.name, costPerLeadCents: c.costPerLeadCents })),
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
