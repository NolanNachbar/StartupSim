// Promotions: a time-limited push that costs something up front and trades margin or customer quality for demand.
// Each kind of business has its own. Numbers are rough real-world orders of magnitude (see docs/specs/realism-pass-3.md):
// a grand opening roughly doubles early leads, a free trial lifts sign-ups a lot but those customers leave sooner, a
// discount buys customers who stay a shorter time and pay less. All integer percentages.
import type { ModelId } from "./business";

export interface PromotionSpec {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  /** Paid when it starts. */
  readonly cashCents: number;
  /** How long it runs, in weeks. */
  readonly weeks: number;
  /** Extra leads while it runs, as a percent. */
  readonly leadLiftPct: number;
  /** Extra chance that a lead buys, as a percent. */
  readonly convLiftPct: number;
  /** Percent off the price for customers won during it, while it runs. */
  readonly discountPct: number;
  /** Customers won during it leave faster: this percent of them each week. */
  readonly dealChurnPct: number;
  /** Extra leads each week as a percent of the customers you already have (word of mouth you pay for). */
  readonly referralPct: number;
  /** The fewest customers you must have to run it. */
  readonly needsCustomers: number;
}

const p = (id: string, name: string, blurb: string, o: Partial<PromotionSpec>): PromotionSpec => ({
  id,
  name,
  blurb,
  cashCents: 0,
  weeks: 4,
  leadLiftPct: 0,
  convLiftPct: 0,
  discountPct: 0,
  dealChurnPct: 0,
  referralPct: 0,
  needsCustomers: 0,
  ...o,
});

export const PROMOTIONS_BY_MODEL: Readonly<Record<ModelId, readonly PromotionSpec[]>> = {
  software: [
    p("free-trial", "Free trial", "People try it free for 14 days. Far more sign up, and many of them were never going to pay.", { convLiftPct: 40, dealChurnPct: 4 }),
    p("launch-discount", "Launch discount", "A third off for people who sign up in the first month. They buy sooner and stay a little less.", { convLiftPct: 30, discountPct: 30, dealChurnPct: 2 }),
    p("launch-day", "Launch day", "A day on a product directory and in newsletters. A rush of curious visitors, few of them buyers.", { cashCents: 50_000, weeks: 1, leadLiftPct: 120, convLiftPct: -10 }),
    p("referral-credit", "Referral credit", "A free month for every customer who brings a friend. Cheap leads of good quality, but only once you have customers.", { weeks: 6, referralPct: 8, discountPct: 15, needsCustomers: 10 }),
  ],
  service: [
    p("free-consult", "Free first consultation", "A free first meeting. It costs you the time, and it turns many more enquiries into clients.", { convLiftPct: 45, dealChurnPct: 3 }),
    p("intro-package", "Intro package", "Twenty percent off the first booking, to get people over the line.", { convLiftPct: 25, discountPct: 20 }),
    p("open-day", "Open day", "Show your work to the neighbourhood: a small bill and a bump of enquiries.", { cashCents: 30_000, weeks: 1, leadLiftPct: 60 }),
    p("referral-thanks", "Referral thank-you", "A credit for every client who sends a friend. Clients you already have are your best source.", { weeks: 6, referralPct: 12, discountPct: 10, needsCustomers: 3 }),
  ],
  location: [
    p("grand-opening", "Grand opening week", "Signs, balloons, extra staff and a discount for the first visitors. A rush of people, and some stay.", { cashCents: 150_000, weeks: 2, leadLiftPct: 80, convLiftPct: 20, discountPct: 20, dealChurnPct: 3 }),
    p("free-trial", "Free trial week", "A free week or a free pass. Many try it, fewer stay.", { cashCents: 40_000, convLiftPct: 50, dealChurnPct: 5 }),
    p("intro-rate", "Intro rate", "Half price for the first two months. People sign up, then half of them leave when the price goes up.", { convLiftPct: 35, discountPct: 50, dealChurnPct: 2 }),
    p("bring-a-friend", "Bring a friend", "Members get a reward for bringing someone. Strong once you have members.", { weeks: 4, referralPct: 10, discountPct: 10, needsCustomers: 10 }),
    p("off-peak", "Off-peak deal", "A lower price in the quiet hours, for people who would not have come at all.", { weeks: 8, convLiftPct: 15, discountPct: 10 }),
    p("loyalty-card", "Loyalty card", "Every tenth visit is free. Regulars come more often and newcomers stay a little longer; it costs a slice of every sale.", { weeks: 12, convLiftPct: 10, discountPct: 8 }),
  ],
  product: [
    p("launch-sale", "Launch sale", "Twenty percent off for two weeks to get the first orders and the first reviews.", { weeks: 2, convLiftPct: 30, discountPct: 20 }),
    p("free-shipping", "Free shipping weekend", "You pay the shipping for a short window. It lifts orders and eats margin.", { weeks: 1, convLiftPct: 25, discountPct: 8 }),
    p("creator-giveaway", "Creator giveaway", "Send free product to people with an audience and ask them to show it.", { cashCents: 80_000, weeks: 2, leadLiftPct: 100 }),
    p("referral-code", "Referral code", "Ten percent off for the friend and for the buyer. Works once you have buyers.", { weeks: 6, referralPct: 8, discountPct: 10, needsCustomers: 10 }),
  ],
};

export const promotionsFor = (model: ModelId): readonly PromotionSpec[] => PROMOTIONS_BY_MODEL[model];
/** Weeks you must wait after one ends before starting the next: a promotion every week stops working. */
export const PROMOTION_COOLDOWN_WEEKS = 2;
