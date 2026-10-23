// How a customer pays. An app bills a month; a cafe, a barber and an escape room bill a visit; a candle shop bills an
// order; a cleaner or a trainer bills a job; a hostel bills a night. The sim still compares prices with what a customer
// is willing to pay each month, so every business turns its price into a monthly figure: price x times a month a regular
// buys. Numbers are rough real-world orders of magnitude (see docs/specs/realism-pass-3.md).
import type { ModelId } from "./business";

export type BillingUnit = "month" | "visit" | "order" | "job" | "night";

export interface Billing {
  readonly unit: BillingUnit;
  /** Times a month a regular customer buys, times ten (10 is once a month, 80 is twice a week). */
  readonly perMonthX10: number;
}

export const UNIT_LABEL: Readonly<Record<BillingUnit, string>> = { month: "a month", visit: "a visit", order: "an order", job: "a job", night: "a night" };
export const UNIT_NOUN: Readonly<Record<BillingUnit, string>> = { month: "month", visit: "visit", order: "order", job: "job", night: "night" };

const M = (perMonth: number, unit: BillingUnit = "month"): Billing => ({ unit, perMonthX10: Math.round(perMonth * 10) });
const SUB = M(1);

// By industry (the order of INDUSTRIES in world.ts), then model (software, service, location, product).
const BILLING: readonly (readonly [Billing, Billing, Billing, Billing])[] = [
  /* 0 Local services */ [SUB, M(3, "job"), M(6, "visit"), M(5, "order")],
  /* 1 Consumer apps */ [SUB, M(2, "job"), M(5, "visit"), M(7, "order")],
  /* 2 Business software */ [SUB, SUB, SUB, M(3, "order")],
  /* 3 Health and wellness */ [SUB, M(4, "job"), SUB, M(7, "order")],
  /* 4 Money and fintech */ [SUB, M(2, "job"), M(2, "job"), M(5, "order")],
  /* 5 Creators and education */ [SUB, M(4, "job"), M(4, "visit"), M(5, "order")],
  /* 6 Food and drink */ [SUB, M(4, "job"), M(8, "visit"), M(7, "order")],
  /* 7 Retail and e-commerce */ [SUB, SUB, M(2, "order"), M(7, "order")],
  /* 8 Travel and hospitality */ [SUB, M(1, "job"), M(3, "night"), M(5, "order")],
  /* 9 Real estate and home */ [SUB, SUB, SUB, M(5, "order")],
  /* 10 Pets and animals */ [SUB, M(4, "job"), M(3, "visit"), M(10, "order")],
  /* 11 Entertainment and events */ [SUB, M(1, "job"), M(4, "visit"), M(5, "order")],
  /* 12 Transport and logistics */ [SUB, M(5, "job"), M(2, "visit"), M(5, "order")],
  /* 13 Beauty and personal care */ [SUB, M(3, "job"), M(3, "visit"), M(7, "order")],
];
const MODEL_INDEX: Readonly<Record<ModelId, 0 | 1 | 2 | 3>> = { software: 0, service: 1, location: 2, product: 3 };

export const billingFor = (industry: number | null, model: ModelId): Billing => BILLING[industry ?? 0]?.[MODEL_INDEX[model]] ?? SUB;

/** What a customer's price comes to in a month, for comparing with what they will pay a month. */
export const monthlyOf = (priceCents: number, b: Billing | null): number => (b ? Math.floor((priceCents * b.perMonthX10) / 10) : priceCents);

/** The nearest price a person would put on a menu: whole dollars, then fives, tens and so on as it grows. */
export function nicePrice(cents: number): number {
  const dollars = cents / 100;
  const step = dollars < 5 ? 0.5 : dollars < 20 ? 1 : dollars < 100 ? 5 : dollars < 500 ? 10 : dollars < 2000 ? 50 : 100;
  return Math.max(50, Math.round(Math.round(dollars / step) * step * 100));
}

/** Prices to try around a starting price: from well under to about three times it, each a sensible menu price. */
export function ladderAround(base: number): readonly number[] {
  const start = nicePrice(base);
  const out = new Set<number>([start]);
  for (const f of [0.4, 0.6, 0.8, 1.3, 1.7, 2.3, 3.2]) out.add(nicePrice(base * f));
  return Array.from(out).sort((a, b) => a - b);
}
