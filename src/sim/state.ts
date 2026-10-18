// Internal run state. Nothing outside src/sim imports this: the public API wraps it as an opaque Run.
import { PIVOT_COST_CENTS, START_CASH_CENTS, WEEKLY_BURN_CENTS, pivotsRemaining } from "./runway";
import { hypothesesFrom } from "./hypotheses";
import type { Action, PublicState, Secret } from "./types";
import { generateWorld } from "./world";

export interface InternalRun {
  readonly seed: number;
  /** The market, or null for the original generic world. */
  readonly industry: number | null;
  /** Accepted actions, in order. Together with the seed they reproduce the run. */
  readonly actions: readonly Action[];
  readonly secret: Secret;
  readonly pub: PublicState;
}

export const START_PRICE_CENTS = 4_900;

export function initialRun(seed: number, industry: number | null = null): InternalRun {
  const secret = generateWorld(seed, industry);
  const pub: PublicState = {
    week: 0,
    status: "running",
    endReason: null,
    cashCents: START_CASH_CENTS,
    weeklyBurnCents: WEEKLY_BURN_CENTS,
    priceCents: START_PRICE_CENTS,
    pivotCostCents: PIVOT_COST_CENTS,
    pivotsRemaining: pivotsRemaining(START_CASH_CENTS, PIVOT_COST_CENTS),
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
    marketing: { channel: null, level: 0 },
    hires: 0,
    receivables: [],
    offer: null,
    loan: null,
    offersShown: 0,
    channels: secret.channels.map((c) => ({ name: c.name, costPerLeadCents: c.costPerLeadCents })),
    log: [],
    evidence: [],
    hypotheses: hypothesesFrom([], secret.segments.length),
  };
  return { seed, industry, actions: [], secret, pub };
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
