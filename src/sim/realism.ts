// The rules that apply once the player has chosen a business: a team with roles, R&D, a limit on how many customers
// the business can serve, and marketing aimed at a chosen customer group. The original generic worlds do not use any of
// this, so their results never change. Integer math only, like the rest of the sim.
import { ACQUISITION_DIVISOR, BUDGET_LEVELS_CENTS, CREDIBILITY_FLOOR_PCT, acquiredCustomers, churnedCustomers, conversionPct, marketCeiling, marketingLeads, priceRatioPct } from "./runway";
import { randInt } from "./rng";
import type { InternalRun } from "./state";
import type { ModelId } from "./business";
import { weatherPctAt } from "./world";

export type Role = "builder" | "seller" | "ops";
export const ROLES: readonly Role[] = ["builder", "seller", "ops"];
export const ROLE_CAP = 2;
export const MAX_TEAM = 5;

/** A builder works on the product every week, on their own: this many percentage points a week. */
export const BUILDER_PROGRESS_PCT = 4;
/** A seller reaches this many warm leads a week by hand, once there is something to sell (a landing page). */
export const SELLER_OUTREACH_LEADS = 12;

/** Weekly R&D budgets by level (cents). */
export const RND_LEVELS_CENTS: readonly number[] = [0, 30_000, 100_000, 250_000];
/** Quality points gained each week at each level. */
export const RND_GAIN: readonly number[] = [0, 1, 3, 6];

/** What the business costs to run each week before anyone is hired, by kind of business (cents). */
export const BURN_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 150_000, service: 80_000, location: 220_000, product: 150_000 };

/** What customers will pay, as a percent of the industry's usual: a coaching client pays far more than an app user. */
export const WTP_PCT_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 100, service: 400, location: 100, product: 100 };

/** How many customers the business can serve with no team, and how many more each operations hire adds. */
export const CAPACITY_BY_MODEL: Readonly<Record<ModelId, { readonly base: number; readonly perOps: number }>> = {
  software: { base: 100_000, perOps: 100_000 },
  service: { base: 15, perOps: 15 },
  location: { base: 120, perOps: 120 },
  product: { base: 300, perOps: 300 },
};

export const capacityOf = (model: ModelId, ops: number): number => CAPACITY_BY_MODEL[model].base + CAPACITY_BY_MODEL[model].perOps * ops;

export interface WeekResult {
  readonly progress: number;
  readonly quality: number;
  readonly marketingSpend: number;
  readonly rndSpend: number;
  readonly customers: readonly number[];
  readonly notes: readonly string[];
}

/** One week of the business for a run with a chosen business: the team works, R&D pays off, marketing wins customers. */
export function realisticWeek(run: InternalRun): WeekResult {
  const { secret, pub } = run;
  const model = secret.business?.model.id ?? "software";
  const notes: string[] = [];

  let progress = pub.productProgressPct;
  if (pub.team.builder > 0 && progress < 100) {
    progress = Math.min(100, progress + BUILDER_PROGRESS_PCT * pub.team.builder);
    if (progress >= 100) notes.push("Your builders finished the product.");
  }

  const rndSpend = RND_LEVELS_CENTS[pub.rndLevel] ?? 0;
  const quality = Math.min(100, pub.qualityPct + (rndSpend > 0 ? (RND_GAIN[pub.rndLevel] ?? 0) : 0));
  const wtpBoost = (wtp: number): number => Math.floor((wtp * (100 + Math.floor(quality / 3))) / 100);
  const credibility = Math.min(100, Math.max(CREDIBILITY_FLOOR_PCT, progress) + Math.floor(quality / 4));

  const customers = pub.segmentNames.map((_, i) => pub.customersBySegment[i] ?? 0);

  // Marketing and outreach win customers in the group they are aimed at.
  const target = pub.marketing.target ?? pub.focusSegment;
  const targetSeg = secret.segments[target];
  const channel = pub.marketing.channel === null ? undefined : secret.channels[pub.marketing.channel];
  const marketingSpend = channel ? (BUDGET_LEVELS_CENTS[pub.marketing.level] ?? 0) : 0;
  if (targetSeg) {
    const buyPct = Math.floor((conversionPct(priceRatioPct(pub.priceCents, wtpBoost(targetSeg.willingnessToPayCents))) * credibility) / 100);
    const paidLeads = channel && marketingSpend > 0 ? marketingLeads(marketingSpend, channel.costPerLeadCents, pub.team.seller) : 0;
    const handLeads = pub.landingPageBuilt ? SELLER_OUTREACH_LEADS * pub.team.seller : 0;
    const leads = paidLeads + handLeads;
    if (leads > 0) {
      const acquired = acquiredCustomers({
        leads,
        fit: channel ? (channel.fit[target] ?? 0) : 50,
        need: targetSeg.pain * (100 - targetSeg.incumbentSatisfactionPct),
        buyPct,
        draw: randInt(run.seed, 1, 100_000_000 * ACQUISITION_DIVISOR, "acq", pub.week),
      });
      customers[target] = (customers[target] ?? 0) + acquired;
    }
  }

  // Each group: some customers leave, and the group has a ceiling on how many it can hold at this price.
  const effective = Math.min(100, progress + Math.floor(quality / 2));
  secret.segments.forEach((seg, i) => {
    const here = customers[i] ?? 0;
    if (here === 0) return;
    const churned = churnedCustomers(here, effective, randInt(run.seed, 1, 10_000, "churn", pub.week, i));
    const ceiling = marketCeiling(seg.trueDemand, weatherPctAt(secret, pub.week), conversionPct(priceRatioPct(pub.priceCents, wtpBoost(seg.willingnessToPayCents))));
    customers[i] = Math.max(0, Math.min(ceiling, here - churned));
  });

  // The business can only serve so many people. Beyond that some walk away.
  const total = customers.reduce((a, b) => a + b, 0);
  const capacity = capacityOf(model, pub.team.ops);
  if (total > capacity) {
    let lose = Math.ceil((total - capacity) / 3);
    notes.push(model === "location" ? "The place is full: people are being turned away." : "You are at capacity: some customers are leaving because you cannot serve them all.");
    while (lose > 0) {
      let biggest = 0;
      customers.forEach((c, i) => {
        if (c > (customers[biggest] ?? 0)) biggest = i;
      });
      if ((customers[biggest] ?? 0) === 0) break;
      customers[biggest] = (customers[biggest] ?? 0) - 1;
      lose -= 1;
    }
  }

  return { progress, quality, marketingSpend, rndSpend, customers, notes };
}
