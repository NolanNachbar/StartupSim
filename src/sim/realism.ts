// The rules that apply once the player has chosen a business: a team with roles, R&D, a limit on how many customers
// the business can serve, and marketing aimed at a chosen customer group. The original generic worlds do not use any of
// this, so their results never change. Integer math only, like the rest of the sim.
import { PROMOTION_COOLDOWN_WEEKS, promotionsFor } from "./promotions";
import { seasonAt } from "./seasons";

/** The week a rival opens in a chosen business: somewhere in the first year or so. */
export const rivalWeekOf = (seed: number): number => randInt(seed, 18, 60, "rival", "week");
import { ACQUISITION_DIVISOR, BUDGET_LEVELS_CENTS, CREDIBILITY_FLOOR_PCT, acquiredCustomers, churnedCustomers, conversionPct, marketCeiling, marketingLeads, priceRatioPct, weeklyRevenue } from "./runway";
import { randInt } from "./rng";
import { DIFFICULTIES, DIFFICULTY_DEFAULT } from "./business";
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

/** The price a business of each kind starts at (cents a month): a coaching client pays far more than an app user. */
export const START_PRICE_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 4_900, service: 49_900, location: 9_900, product: 4_900 };

/** What customers will pay, as a percent of the industry's usual: a coaching client pays far more than an app user. */
export const WTP_PCT_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 100, service: 400, location: 100, product: 100 };

/** How many customers the business can serve with no team, and how many more each operations hire adds. */
export const CAPACITY_BY_MODEL: Readonly<Record<ModelId, { readonly base: number; readonly perOps: number }>> = {
  software: { base: 100_000, perOps: 100_000 },
  service: { base: 15, perOps: 15 },
  location: { base: 200, perOps: 150 },
  product: { base: 300, perOps: 300 },
};

/** What a founder starts with: a place needs a lease deposit and a build-out, an app needs little. */
export const START_CASH_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 3_000_000, service: 2_000_000, location: 10_000_000, product: 5_000_000 };

/** Cost of goods as a percent of revenue: hosting, nothing for your own time, food and supplies, materials and shipping. */
export const COGS_PCT_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 10, service: 0, location: 30, product: 30 };

/** The prices a founder can try, centred where each kind of business really sells (cents a month). */
export const PRICE_LADDER_BY_MODEL: Readonly<Record<ModelId, readonly number[]>> = {
  software: [900, 1900, 4900, 9900, 19900, 49900, 99900],
  service: [9900, 14900, 19900, 29900, 49900, 99900],
  location: [2900, 4900, 7900, 9900, 14900, 19900, 29900],
  product: [900, 1900, 2900, 4900, 7900, 9900, 14900],
};

/** Hiring a person takes a few weeks of searching, and costs salary plus payroll tax and benefits. */
export const HIRE_SEARCH_WEEKS = 3;
export const HIRE_LOADED_WEEKLY_CENTS = 120_000;

/** A loan for a business costs about half a year of interest over its term, not more than the loan itself. */
export const BUSINESS_LOAN_WEEKLY_REPAYMENT_CENTS = 240_000;

/** What each build is called in each kind of business, for the log. */
export const BUILD_LABEL_BY_MODEL: Readonly<Record<ModelId, Readonly<Record<string, string>>>> = {
  software: { "landing-page": "a landing page", concierge: "a hand-run version", prototype: "a prototype" },
  service: { "landing-page": "an offer page", concierge: "a first batch of clients served by hand", prototype: "a repeatable package" },
  location: { "landing-page": "a trial pass and sign-up page", concierge: "a small first run", prototype: "the fitted-out space" },
  product: { "landing-page": "a pre-order page", concierge: "a hand-made batch", prototype: "a small production run" },
};

export type NetworkKind = "coffee" | "meetup" | "conference";

/** Ways to meet people: what it costs, how long it takes, and how many people you can hope to meet. */
export const NETWORK_OPTIONS: Readonly<Record<NetworkKind, { readonly cashCents: number; readonly weeks: number; readonly min: number; readonly max: number }>> = {
  coffee: { cashCents: 5_000, weeks: 1, min: 1, max: 2 },
  meetup: { cashCents: 15_000, weeks: 1, min: 2, max: 4 },
  conference: { cashCents: 150_000, weeks: 2, min: 4, max: 8 },
};
export const NETWORK_KINDS: readonly NetworkKind[] = ["coffee", "meetup", "conference"];
/** The most warm introductions that help one round of interviews. */
export const WARM_PER_ROUND = 3;

export const capacityOf = (model: ModelId, ops: number): number => CAPACITY_BY_MODEL[model].base + CAPACITY_BY_MODEL[model].perOps * ops;

export interface WeekResult {
  readonly progress: number;
  readonly quality: number;
  readonly marketingSpend: number;
  readonly rndSpend: number;
  readonly customers: readonly number[];
  /** The promotion after this week (null when it ended or none ran), and the weeks until the next may start. */
  readonly promo: import("./types").Promo | null;
  readonly promoCooldown: number;
  /** Revenue given up this week to a promotion's discount. */
  readonly discountCents: number;
  readonly reputation: number;
  readonly rivalOpened: boolean;
  readonly notes: readonly string[];
}

/** One week of the business for a run with a chosen business: the team works, R&D pays off, marketing wins customers. */
export function realisticWeek(run: InternalRun): WeekResult {
  const { secret, pub } = run;
  const model = secret.business?.model.id ?? "software";
  const level = DIFFICULTIES[secret.business?.difficulty ?? DIFFICULTY_DEFAULT] ?? (DIFFICULTIES[DIFFICULTY_DEFAULT] as (typeof DIFFICULTIES)[number]);
  const notes: string[] = [];

  let progress = pub.productProgressPct;
  if (pub.team.builder > 0 && progress < 100) {
    progress = Math.min(100, progress + BUILDER_PROGRESS_PCT * pub.team.builder);
    if (progress >= 100) notes.push("Your builders finished the product.");
  }

  const rndSpend = RND_LEVELS_CENTS[pub.rndLevel] ?? 0;
  const quality = Math.min(100, pub.qualityPct + (rndSpend > 0 ? (RND_GAIN[pub.rndLevel] ?? 0) : 0));
  const wtpBoost = (wtp: number): number => Math.floor((wtp * (100 + Math.floor(quality / 3))) / 100);
  // Reviews and word of mouth: what customers think of you makes the next person more or less ready to trust you.
  const credibility = Math.min(100, Math.max(CREDIBILITY_FLOOR_PCT, progress) + Math.floor(quality / 4) + Math.floor((pub.reputation - 50) / 5));

  const customers = pub.segmentNames.map((_, i) => pub.customersBySegment[i] ?? 0);
  const season = seasonAt(run.industry ?? 1, run.seed, pub.week);
  // A rival nearby takes some of the people you would have reached and tempts some of the ones you have. A better product
  // blunts it: at full quality it hurts half as much.
  const rivalPct = pub.rivalSince !== null ? Math.max(0, 100 - Math.floor(quality / 2)) : 0;
  const promoSpec = pub.promo ? promotionsFor(model).find((q) => q.id === pub.promo?.id) : undefined;
  let promoSignups = pub.promo?.signups ?? 0;

  // Marketing and outreach win customers in the group they are aimed at.
  const target = pub.marketing.target ?? pub.focusSegment;
  const targetSeg = secret.segments[target];
  const channel = pub.marketing.channel === null ? undefined : secret.channels[pub.marketing.channel];
  const marketingSpend = channel ? (BUDGET_LEVELS_CENTS[pub.marketing.level] ?? 0) : 0;
  if (targetSeg) {
    const baseBuy = Math.floor((conversionPct(priceRatioPct(pub.priceCents, wtpBoost(targetSeg.willingnessToPayCents))) * credibility) / 100);
    const buyPct = promoSpec ? Math.max(0, Math.floor((baseBuy * (100 + promoSpec.convLiftPct)) / 100)) : baseBuy;
    const paidLeads = channel && marketingSpend > 0 ? marketingLeads(marketingSpend, channel.costPerLeadCents, pub.team.seller) : 0;
    const handLeads = pub.landingPageBuilt ? SELLER_OUTREACH_LEADS * pub.team.seller : 0;
    // contacts you have made send people your way: one lead a week for every three
    const referralLeads = Math.floor(pub.network.contacts / 3);
    const standing = customers.reduce((a, b) => a + b, 0);
    const lifted = Math.floor((Math.floor((Math.floor(((paidLeads + handLeads) * level.leadsPct) / 100) * season.index) / 100) * (100 - Math.floor((15 * rivalPct) / 100))) / 100);
    const leads = (promoSpec ? Math.floor((lifted * (100 + promoSpec.leadLiftPct)) / 100) + Math.floor((standing * promoSpec.referralPct) / 100) : lifted) + referralLeads;
    if (leads > 0) {
      const acquired = acquiredCustomers({
        leads,
        fit: channel ? (channel.fit[target] ?? 0) : 50,
        need: targetSeg.pain * (100 - targetSeg.incumbentSatisfactionPct),
        buyPct,
        draw: randInt(run.seed, 1, 100_000_000 * ACQUISITION_DIVISOR, "acq", pub.week),
      });
      // A full business stops selling; it never sends away the customers it already has.
      const room = Math.max(0, capacityOf(model, pub.team.ops) - customers.reduce((a, b) => a + b, 0));
      const taken = Math.min(acquired, room);
      if (taken < acquired) notes.push(model === "location" ? "The place is full: new people are being turned away." : "You are at capacity: new customers go on a waiting list.");
      customers[target] = (customers[target] ?? 0) + taken;
      if (promoSpec) promoSignups += taken;
    }
  }

  // Each group: some customers leave, and the group has a ceiling on how many it can hold at this price.
  const effective = Math.min(100, progress + Math.floor(quality / 2));
  secret.segments.forEach((seg, i) => {
    const here = customers[i] ?? 0;
    if (here === 0) return;
    // A better product keeps people even when it is already finished: quality cuts churn by up to a third.
    const raw = churnedCustomers(here, effective, randInt(run.seed, 1, 10_000, "churn", pub.week, i));
    // happy customers stay: a good name cuts churn by up to 30 percent, a bad one raises it by as much
    const churned = Math.floor((((raw - Math.floor((raw * quality) / 300)) * level.churnPct) / 100 * (130 - Math.floor((pub.reputation * 6) / 10)) * (100 + Math.floor((20 * rivalPct) / 100))) / 10_000);
    // a busy month holds more people; a quiet one does not send anyone away
    const ceiling = Math.floor((marketCeiling(seg.trueDemand, weatherPctAt(secret, pub.week), conversionPct(priceRatioPct(pub.priceCents, wtpBoost(seg.willingnessToPayCents)))) * (100 + Math.floor(Math.max(0, season.index - 100) / 2))) / 100);
    customers[i] = Math.max(0, Math.min(ceiling, here - churned));
  });

  // People won by a promotion leave faster, and pay less while it runs.
  let discountCents = 0;
  let promo: import("./types").Promo | null = null;
  let promoCooldown = Math.max(0, pub.promoCooldown - 1);
  if (pub.promo && promoSpec) {
    const lost = Math.min(promoSignups, Math.floor((promoSignups * promoSpec.dealChurnPct) / 100));
    if (lost > 0) {
      customers[target] = Math.max(0, (customers[target] ?? 0) - lost);
      promoSignups -= lost;
    }
    discountCents = Math.floor((weeklyRevenue(Math.min(promoSignups, customers.reduce((a, b) => a + b, 0)), pub.priceCents) * promoSpec.discountPct) / 100);
    if (pub.promo.weeksLeft > 1) promo = { id: pub.promo.id, weeksLeft: pub.promo.weeksLeft - 1, signups: promoSignups };
    else {
      promoCooldown = PROMOTION_COOLDOWN_WEEKS;
      notes.push(`${promoSpec.name} is over. People it brought in now pay the full price.`);
    }
  }
  // Reputation drifts toward what you deserve: a better product and a place that is not crowded earn it, a rushed discount crowd
  // and a full house lose it. It moves a sixth of the way each week, so it is slow to build and slow to repair.
  const served = customers.reduce((a, b) => a + b, 0);
  const crowded = capacityOf(model, pub.team.ops) > 0 && served * 100 > capacityOf(model, pub.team.ops) * 90;
  const deserved = Math.max(0, Math.min(100, 45 + Math.floor(quality / 4) + (progress >= 100 ? 15 : Math.floor(progress / 8)) + 4 * pub.team.ops + (crowded ? -20 : 0) + (promoSpec && promoSpec.dealChurnPct >= 4 ? -5 : 0)));
  const reputation = pub.reputation + Math.trunc((deserved - pub.reputation) / 6);
  const rivalOpened = pub.rivalSince === null && pub.week + 1 >= rivalWeekOf(run.seed) && secret.business !== null;
  if (rivalOpened) notes.push(`${cap(secret.business.kinds[0] ?? "a competitor")} has opened nearby, aimed at your customers. Expect fewer people to find you and some to be tempted away. A better product and a good name soften it.`);
  return { progress, quality, marketingSpend, rndSpend, customers, promo, promoCooldown, discountCents, reputation, rivalOpened, notes };
}

const cap = (s: string): string => {
  const t = s.replace(/^an? /, "a new ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
