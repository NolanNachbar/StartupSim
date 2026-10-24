// The rules that apply once the player has chosen a business: a team with roles, R&D, a limit on how many customers
// the business can serve, and marketing aimed at a chosen customer group. The original generic worlds do not use any of
// this, so their results never change. Integer math only, like the rest of the sim.
import { PROMOTION_COOLDOWN_WEEKS, promotionsFor } from "./promotions";
import { seasonAt } from "./seasons";
import { monthlyOf } from "./billing";

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
export const START_CASH_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 3_000_000, service: 2_000_000, location: 15_000_000, product: 5_000_000 };

/** Cost of goods as a percent of revenue: hosting, nothing for your own time, food and supplies, materials and shipping, plus about 3 percent for card payments. */
export const COGS_PCT_BY_MODEL: Readonly<Record<ModelId, number>> = { software: 13, service: 3, location: 33, product: 33 };

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

/**
 * What a person in each role costs a week, salary plus payroll tax and benefits (about 30 percent on top), by kind of
 * business. A developer costs several times a cleaner. Rough US figures (BLS medians, loaded): see realism-pass-3.md.
 */
export const WAGE_BY_MODEL: Readonly<Record<ModelId, Readonly<Record<Role, number>>>> = {
  software: { builder: 300_000, seller: 180_000, ops: 110_000 },
  service: { builder: 140_000, seller: 150_000, ops: 110_000 },
  location: { builder: 130_000, seller: 110_000, ops: 100_000 },
  product: { builder: 110_000, seller: 140_000, ops: 90_000 },
};
export const wageOf = (model: ModelId, role: Role): number => WAGE_BY_MODEL[model][role];

/** A new person is a quarter useful in their first week and fully useful in the fourth. */
export const RAMP_WEEKS = 4;
export interface Hire {
  readonly role: Role;
  /** The week they started. */
  readonly week: number;
}
/** How much of a role's team is working at full speed now, in percent of one person each (a new hire counts a quarter, then half...). */
export function workingPct(hires: readonly Hire[], role: Role, week: number): number {
  return hires.filter((h) => h.role === role).reduce((sum, h) => sum + Math.min(100, (100 / RAMP_WEEKS) * (week - h.week + 1)), 0);
}
/** Each week a person might quit: about one in a hundred, and only once they have settled in. */
export const QUIT_CHANCE_PCT = 1.2;
/** How often people in each role quit a week, in percent: developers stay, cleaners and front-desk staff turn over. */
export const QUIT_PCT_BY_ROLE: Readonly<Record<Role, number>> = { builder: 0.4, seller: 1.0, ops: 2.2 };

/** Weekly churn of a finished product, in basis points, by kind of business: a gym or shop loses people faster than an app or a client list. */
export const BASE_CHURN_BP: Readonly<Record<ModelId, number>> = { software: 90, service: 80, location: 130, product: 130 };
/** Letting someone go costs this many weeks of their pay. */
export const SEVERANCE_WEEKS = 2;

/** A loan for a business costs about half a year of interest over its term, not more than the loan itself. */
export const BUSINESS_LOAN_WEEKLY_REPAYMENT_CENTS = 240_000;

/** What each build is called in each kind of business, for the log. */
export const BUILD_LABEL_BY_MODEL: Readonly<Record<ModelId, Readonly<Record<string, string>>>> = {
  software: { "landing-page": "a landing page", concierge: "a hand-run version", prototype: "a prototype" },
  service: { "landing-page": "an offer page", concierge: "a first batch of clients served by hand", prototype: "a repeatable package" },
  location: { "landing-page": "a trial pass and sign-up page", concierge: "a small first run", prototype: "the fitted-out space" },
  product: { "landing-page": "a pre-order page", concierge: "a hand-made batch", prototype: "a small production run" },
};

/**
 * What each build costs, how long it takes and how much of the product it finishes, by kind of business. Opening a
 * place is the big one: a lease deposit, a fit-out and equipment run to tens of thousands of dollars and take months.
 */
export interface BuildSpec {
  readonly weeks: number;
  readonly cashCents: number;
  readonly progressPct: number;
}
export type BuildSpecs = Readonly<Record<"landing-page" | "concierge" | "prototype", BuildSpec>>;
export const BUILDS_BY_MODEL: Readonly<Record<ModelId, BuildSpecs>> = {
  software: { "landing-page": { weeks: 1, cashCents: 30_000, progressPct: 5 }, concierge: { weeks: 2, cashCents: 80_000, progressPct: 15 }, prototype: { weeks: 3, cashCents: 250_000, progressPct: 25 } },
  service: { "landing-page": { weeks: 1, cashCents: 30_000, progressPct: 5 }, concierge: { weeks: 2, cashCents: 50_000, progressPct: 25 }, prototype: { weeks: 3, cashCents: 150_000, progressPct: 30 } },
  location: { "landing-page": { weeks: 1, cashCents: 150_000, progressPct: 5 }, concierge: { weeks: 2, cashCents: 800_000, progressPct: 15 }, prototype: { weeks: 8, cashCents: 6_000_000, progressPct: 80 } },
  product: { "landing-page": { weeks: 1, cashCents: 30_000, progressPct: 5 }, concierge: { weeks: 2, cashCents: 200_000, progressPct: 25 }, prototype: { weeks: 4, cashCents: 1_000_000, progressPct: 50 } },
};

/**
 * Newcomers leave faster than regulars. Of the people a gym signs up, most who quit do so in the first months
 * (a large study found 63 percent gone before month three), while app users and clients stay a little more. This is the
 * extra weekly churn, in percent, for each person in their first twelve weeks.
 */
export const NEWCOMER_CHURN_PCT: Readonly<Record<ModelId, number>> = { software: 2, service: 1, location: 4, product: 1 };
export const NEWCOMER_WEEKS = 12;
/** A week's new customers, kept until they have been customers for NEWCOMER_WEEKS. */
export interface Cohort {
  readonly week: number;
  readonly n: number;
  /** The customer group they joined. */
  readonly segment: number;
}

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
export const capacityWith = (spec: { readonly base: number; readonly perOps: number }, ops: number): number => spec.base + spec.perOps * ops;
/** The same, counting people still settling in as part of a person (opsPct is 100 per fully working person). */
export const capacityOfPct = (spec: { readonly base: number; readonly perOps: number }, opsPct: number): number => spec.base + Math.floor((spec.perOps * opsPct) / 100);

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
  readonly cohorts: readonly Cohort[];
  /** How many customers the business can serve now, counting people who are still settling in. */
  readonly capacity: number;
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
    progress = Math.min(100, progress + Math.floor((BUILDER_PROGRESS_PCT * workingPct(pub.hiredAt, "builder", pub.week)) / 100));
    if (progress >= 100) notes.push("Your builders finished the product.");
  }

  const rndSpend = RND_LEVELS_CENTS[pub.rndLevel] ?? 0;
  const quality = Math.min(100, pub.qualityPct + (rndSpend > 0 ? (RND_GAIN[pub.rndLevel] ?? 0) : 0));
  const wtpBoost = (wtp: number): number => Math.floor((wtp * (100 + Math.floor(quality / 3))) / 100);
  // Reviews and word of mouth: what customers think of you makes the next person more or less ready to trust you.
  const credibility = Math.min(100, Math.max(CREDIBILITY_FLOOR_PCT, progress) + Math.floor(quality / 4) + Math.floor((pub.reputation - 50) / 5));

  const customers = pub.segmentNames.map((_, i) => pub.customersBySegment[i] ?? 0);
  const capacity = capacityOfPct(pub.capacitySpec ?? CAPACITY_BY_MODEL[model], workingPct(pub.hiredAt, "ops", pub.week));
  const season = seasonAt(run.industry ?? 1, run.seed, pub.week);
  // A rival nearby takes some of the people you would have reached and tempts some of the ones you have. A better product
  // blunts it: at full quality it hurts half as much.
  const rivalPct = pub.rivalSince !== null ? Math.max(0, 100 - Math.floor(quality / 2)) : 0;
  const promoSpec = pub.promo ? promotionsFor(model).find((q) => q.id === pub.promo?.id) : undefined;
  let promoSignups = pub.promo?.signups ?? 0;
  let newcomers = 0;

  // Marketing and outreach win customers in the group they are aimed at.
  const target = pub.marketing.target ?? pub.focusSegment;
  const targetSeg = secret.segments[target];
  const channel = pub.marketing.channel === null ? undefined : secret.channels[pub.marketing.channel];
  const marketingSpend = channel ? (BUDGET_LEVELS_CENTS[pub.marketing.level] ?? 0) : 0;
  if (targetSeg) {
    const baseBuy = Math.floor((conversionPct(priceRatioPct(monthlyOf(pub.priceCents, pub.billing), wtpBoost(targetSeg.willingnessToPayCents))) * credibility) / 100);
    const buyPct = promoSpec ? Math.max(0, Math.floor((baseBuy * (100 + promoSpec.convLiftPct)) / 100)) : baseBuy;
    const paidLeads = channel && marketingSpend > 0 ? marketingLeads(marketingSpend, channel.costPerLeadCents, pub.team.seller) : 0;
    const handLeads = pub.landingPageBuilt ? Math.floor((SELLER_OUTREACH_LEADS * workingPct(pub.hiredAt, "seller", pub.week)) / 100) : 0;
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
      const room = Math.max(0, capacity - customers.reduce((a, b) => a + b, 0));
      const taken = Math.min(acquired, room);
      if (taken < acquired) notes.push(model === "location" ? "The place is full: new people are being turned away." : "You are at capacity: new customers go on a waiting list.");
      customers[target] = (customers[target] ?? 0) + taken;
      if (promoSpec) promoSignups += taken;
      newcomers += taken;
    }
  }

  // Each group: some customers leave, and the group has a ceiling on how many it can hold at this price.
  const effective = Math.min(100, progress + Math.floor(quality / 2));
  secret.segments.forEach((seg, i) => {
    const here = customers[i] ?? 0;
    if (here === 0) return;
    // A better product keeps people even when it is already finished: quality cuts churn by up to a third.
    const raw = churnedCustomers(here, effective, randInt(run.seed, 1, 10_000, "churn", pub.week, i), BASE_CHURN_BP[model]);
    // happy customers stay: a good name cuts churn by up to 30 percent, a bad one raises it by as much
    const churned = Math.floor((((raw - Math.floor((raw * quality) / 300)) * level.churnPct) / 100 * (130 - Math.floor((pub.reputation * 6) / 10)) * (100 + Math.floor((20 * rivalPct) / 100))) / 10_000);
    // a busy month holds more people; a quiet one does not send anyone away
    const ceiling = Math.floor((marketCeiling(seg.trueDemand, weatherPctAt(secret, pub.week), conversionPct(priceRatioPct(monthlyOf(pub.priceCents, pub.billing), wtpBoost(seg.willingnessToPayCents)))) * (100 + Math.floor(Math.max(0, season.index - 100) / 2))) / 100);
    // Customers do not all vanish the week you raise the price: the market's ceiling pulls them down by at most a fifth a week
    // (people who already buy from you put up with some of a rise, then leave as it sinks in).
    const stay = here - churned;
    const pulled = Math.max(Math.min(ceiling, stay), stay - Math.max(1, Math.ceil(stay / 5)));
    customers[i] = Math.max(0, pulled);
  });

  // Newcomers leave faster than regulars: a share of everyone who joined in the last twelve weeks goes each week.
  const aged = pub.cohorts.filter((c) => pub.week - c.week < NEWCOMER_WEEKS);
  // (A small group still loses people: the odd one is rounded up or down by a keyed roll, not always down to nothing.)
  let cohorts: Cohort[] = aged.map((c, i) => {
    const x = c.n * NEWCOMER_CHURN_PCT[model];
    const lose = Math.floor(x / 100) + (randInt(run.seed, 1, 100, "newcomer", pub.week, i) <= x % 100 ? 1 : 0);
    return { week: c.week, n: Math.max(0, c.n - lose), segment: c.segment };
  });
  aged.forEach((c, i) => {
    const gone = c.n - (cohorts[i]?.n ?? 0);
    if (gone > 0) customers[c.segment] = Math.max(0, (customers[c.segment] ?? 0) - gone);
  });
  if (newcomers > 0) cohorts = [...cohorts, { week: pub.week, n: newcomers, segment: target }];
  cohorts = cohorts.filter((c) => c.n > 0);

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
    discountCents = Math.floor((weeklyRevenue(Math.min(promoSignups, customers.reduce((a, b) => a + b, 0)), monthlyOf(pub.priceCents, pub.billing)) * promoSpec.discountPct) / 100);
    if (pub.promo.weeksLeft > 1) promo = { id: pub.promo.id, weeksLeft: pub.promo.weeksLeft - 1, signups: promoSignups };
    else {
      promoCooldown = PROMOTION_COOLDOWN_WEEKS;
      notes.push(`${promoSpec.name} is over. People it brought in now pay the full price.`);
    }
  }
  // Newcomers are a part of the customers you have: if some left some other way, the count follows (oldest first).
  let still = customers.reduce((a, b) => a + b, 0);
  cohorts = cohorts
    .slice()
    .reverse()
    .map((c) => {
      const keep = Math.min(c.n, still);
      still -= keep;
      return { week: c.week, n: keep, segment: c.segment };
    })
    .reverse()
    .filter((c) => c.n > 0);

  // Reputation drifts toward what you deserve: a better product and a place that is not crowded earn it, a rushed discount crowd
  // and a full house lose it. It moves a sixth of the way each week, so it is slow to build and slow to repair.
  const served = customers.reduce((a, b) => a + b, 0);
  const crowded = capacity > 0 && served * 100 > capacity * 90;
  const deserved = Math.max(0, Math.min(100, 45 + Math.floor(quality / 4) + (progress >= 100 ? 15 : Math.floor(progress / 8)) + Math.floor((4 * workingPct(pub.hiredAt, "ops", pub.week)) / 100) + (crowded ? -20 : 0) + (promoSpec && promoSpec.dealChurnPct >= 4 ? -5 : 0)));
  const reputation = pub.reputation + Math.trunc((deserved - pub.reputation) / 6);
  const rivalOpened = pub.rivalSince === null && pub.week + 1 >= rivalWeekOf(run.seed) && secret.business !== null;
  if (rivalOpened) notes.push(`${cap(secret.business.kinds[0] ?? "a competitor")} has opened nearby, aimed at your customers. Expect fewer people to find you and some to be tempted away. A better product and a good name soften it.`);
  return { progress, quality, marketingSpend, rndSpend, customers, promo, promoCooldown, discountCents, reputation, rivalOpened, capacity, cohorts, notes };
}

const cap = (s: string): string => {
  const t = s.replace(/^an? /, "a new ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
