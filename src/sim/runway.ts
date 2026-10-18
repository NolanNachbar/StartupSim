// Money and runway rules. Integer cents and integer percentages only; no transcendental math.
// Tuning constants are starting values: changing one changes outcomes, so it needs a SIM_VERSION bump.

export const START_CASH_CENTS = 3_000_000;
export const WEEKLY_BURN_CENTS = 150_000;
export const INTERVIEW_ROUND_CASH_CENTS = 30_000;
export const TEST_CASH_CENTS = 200_000;
export const ROUND_WEEKS = 3;
/** One pivot is one interview round plus one paid test, including the burn while it runs. */
export const PIVOT_COST_CENTS =
  INTERVIEW_ROUND_CASH_CENTS + TEST_CASH_CENTS + ROUND_WEEKS * WEEKLY_BURN_CENTS;

export const CHANNEL_TEST_BUDGET_CENTS = 20_000;
/** Pre-selling a bare landing page is hard: payment odds scale with the product, but never below this. */
export const CREDIBILITY_FLOOR_PCT = 40;

export const BUILD_TABLE = {
  "landing-page": { weeks: 1, cashCents: 30_000, progressPct: 5 },
  concierge: { weeks: 2, cashCents: 80_000, progressPct: 20 },
  prototype: { weeks: 3, cashCents: 250_000, progressPct: 40 },
} as const;

export const LANDING_STREAK_WEEKS = 8;
export const MAX_WEEKS = 104;

export const RAISE_AMOUNT_CENTS = 10_000_000;
/** Equity given for the first and second raise. */
export const RAISE_EQUITY_PCTS: readonly number[] = [15, 20];
export const MAX_RAISES = 2;

/** Weekly marketing budgets by level. */
export const BUDGET_LEVELS_CENTS: readonly number[] = [0, 40_000, 120_000, 300_000];

export const HIRE_WEEKLY_CENTS = 100_000;
export const MAX_HIRES = 2;
export const HIRE_LEAD_BONUS_PCT = 25;

export const LOAN_OFFER_MIN_WEEK = 6;
export const LOAN_OFFER_LIFETIME_WEEKS = 3;
export const LOAN_AMOUNT_CENTS = 4_000_000;
export const LOAN_WEEKLY_REPAYMENT_CENTS = 280_000;
export const LOAN_WEEKS = 20;

/** Paid leads convert far below the buy rate of a warm test: 1 / ACQUISITION_DIVISOR of the raw odds. */
export const ACQUISITION_DIVISOR = 1;

export const LATE_PAYER_PCT = 40;
export const LATE_PAYER_DELAY_WEEKS = 6;

/** [price as a percent of willingness to pay, percent of the demand pool who buy]. */
const CONVERSION_TABLE: ReadonlyArray<readonly [number, number]> = [
  [0, 100],
  [50, 90],
  [100, 50],
  [150, 15],
  [200, 0],
];

/** floor(cash / pivotCost), never below 0, so the gauge never overstates the runway. */
export function pivotsRemaining(cashCents: number, pivotCostCents: number): number {
  if (cashCents <= 0) return 0;
  return Math.floor(cashCents / Math.max(1, pivotCostCents));
}

/** Price as a whole percent of willingness to pay (floor). */
export function priceRatioPct(priceCents: number, willingnessToPayCents: number): number {
  return Math.floor((priceCents * 100) / Math.max(1, willingnessToPayCents));
}

/** Percent who buy at a given price ratio: linear between table points, truncating toward zero. */
export function conversionPct(ratioPct: number): number {
  const last = CONVERSION_TABLE[CONVERSION_TABLE.length - 1];
  if (!last || ratioPct >= last[0]) return last ? last[1] : 0;
  for (let i = 1; i < CONVERSION_TABLE.length; i++) {
    const hi = CONVERSION_TABLE[i];
    const lo = CONVERSION_TABLE[i - 1];
    if (hi && lo && ratioPct <= hi[0]) {
      return lo[1] + Math.trunc(((hi[1] - lo[1]) * (ratioPct - lo[0])) / (hi[0] - lo[0]));
    }
  }
  return 0;
}

/** Customers the market would support this week for the focus segment. */
export function targetCustomers(
  trueDemand: number,
  productProgressPct: number,
  conversion: number,
  weatherPct: number,
): number {
  return Math.floor((trueDemand * productProgressPct * conversion * weatherPct) / 1_000_000);
}

/**
 * Round num / den down, plus 1 with probability (num mod den) / den. `draw` is a roll in 1..den.
 * Over every possible draw the average is exactly num / den, so small numbers stay fair.
 */
export function randomizedRound(num: number, den: number, draw: number): number {
  return Math.floor(num / den) + (draw <= num % den ? 1 : 0);
}

/** Weekly churn in basis points: 1.5 percent for a finished product, 5.5 percent for none. */
export function churnBp(productProgressPct: number): number {
  return 150 + 4 * (100 - productProgressPct);
}

/** Customers lost this week. `draw` is a roll in 1..10000. */
export function churnedCustomers(customers: number, productProgressPct: number, draw: number): number {
  return randomizedRound(customers * churnBp(productProgressPct), 10_000, draw);
}

/**
 * The most customers the focus segment can hold at this price: the part of the demand pool willing to
 * pay (the conversion at this price), shrunk when the weather is bad.
 */
export function marketCeiling(trueDemand: number, weatherPct: number, conversion: number): number {
  return Math.floor((trueDemand * weatherPct * conversion) / 10_000);
}

/** Leads a weekly marketing budget reaches; each hire adds 25 percent. */
export function marketingLeads(budgetCents: number, costPerLeadCents: number, hires: number): number {
  return Math.floor((budgetCents * (100 + HIRE_LEAD_BONUS_PCT * hires)) / (costPerLeadCents * 100));
}

export interface AcquisitionInput {
  readonly leads: number;
  /** The channel's hidden fit with the segment, 0 to 100. */
  readonly fit: number;
  /** pain x (100 - incumbent satisfaction): how likely a reached lead really has the problem, out of 10,000. */
  readonly need: number;
  readonly buyPct: number;
  /** A roll in 1..(100,000,000 x ACQUISITION_DIVISOR). */
  readonly draw: number;
}

/** Customers won this week from paid leads. */
export function acquiredCustomers(input: AcquisitionInput): number {
  return randomizedRound(input.leads * input.fit * input.need * input.buyPct, 100_000_000 * ACQUISITION_DIVISOR, input.draw);
}

/** Weekly revenue from a monthly price: customers x price x 12 / 52, floored. */
export function weeklyRevenue(customers: number, monthlyPriceCents: number): number {
  return Math.floor((customers * monthlyPriceCents * 12) / 52);
}
