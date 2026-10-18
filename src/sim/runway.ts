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
export const RAISE_EQUITY_PCT = 15;
export const MAX_RAISES = 2;

export const RAMP_PCT = 20;

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

/** Customers move toward the target by up to RAMP_PCT of it (or of themselves), at least 1. */
export function moveToward(current: number, target: number): number {
  if (current < target) {
    return Math.min(target, current + Math.max(1, Math.floor((target * RAMP_PCT) / 100)));
  }
  if (current > target) {
    return Math.max(target, current - Math.max(1, Math.floor((current * RAMP_PCT) / 100)));
  }
  return current;
}

/** Weekly revenue from a monthly price: customers x price x 12 / 52, floored. */
export function weeklyRevenue(customers: number, monthlyPriceCents: number): number {
  return Math.floor((customers * monthlyPriceCents * 12) / 52);
}
