import { describe, expect, it } from "vitest";
import { billingFor, ladderAround, monthlyOf, nicePrice } from "./billing";
import { INDUSTRY_LIST, newRun, view } from "./index";

describe("how customers pay", () => {
  it("bills a gym by the month, a cafe by the visit, a candle shop by the order and a cleaner by the job", () => {
    const at = (industry: number, model: number, idea: string) => view(newRun(5, industry, { model, idea }));
    expect(at(3, 2, "a small strength-training gym").billing?.unit).toBe("month");
    expect(at(6, 2, "a neighbourhood cafe").billing?.unit).toBe("visit");
    expect(at(7, 3, "hand-poured soy candles").billing?.unit).toBe("order");
    expect(at(0, 1, "a house cleaning service").billing?.unit).toBe("job");
    expect(at(8, 2, "a small hostel").billing?.unit).toBe("night");
    expect(view(newRun(5, 3)).billing).toBeNull(); // the original worlds bill a month
  });

  it("starts a cafe near eight dollars a visit and a gym near a hundred a month, with sensible menu prices to try", () => {
    const cafe = view(newRun(5, 6, { model: 2, idea: "a neighbourhood cafe" }));
    expect(cafe.priceCents).toBeGreaterThanOrEqual(600);
    expect(cafe.priceCents).toBeLessThanOrEqual(1200);
    const gym = view(newRun(5, 3, { model: 2, idea: "a small strength-training gym" }));
    expect(gym.priceCents).toBeGreaterThanOrEqual(8_000);
    expect(gym.priceCents).toBeLessThanOrEqual(12_000);
    for (const v of [cafe, gym]) {
      expect(v.priceLadderCents).toContain(v.priceCents);
      expect([...v.priceLadderCents].sort((a, b) => a - b)).toEqual(v.priceLadderCents);
      expect(new Set(v.priceLadderCents).size).toBe(v.priceLadderCents.length);
    }
  });

  it("compares a visit price with what a customer will pay a month by how often they come", () => {
    const b = billingFor(6, "location");
    expect(monthlyOf(1_000, b)).toBe(13_000); // ten dollars, a visit about three times a week
    expect(monthlyOf(1_000, null)).toBe(1_000);
  });

  it("rounds to prices a person would print on a menu", () => {
    expect(nicePrice(1_237)).toBe(1_200);
    expect(nicePrice(9_900)).toBe(10_000);
    expect(nicePrice(49_900)).toBe(50_000);
    expect(ladderAround(1_200)[0]).toBeLessThan(1_200);
    expect(ladderAround(1_200).at(-1)).toBeGreaterThan(2_500);
  });

  it("has a billing for every industry and kind of business", () => {
    for (let i = 0; i < INDUSTRY_LIST.length; i++) for (const m of ["software", "service", "location", "product"] as const) expect(billingFor(i, m).perMonthX10).toBeGreaterThan(0);
  });
});

describe("what kind of place it is", () => {
  const at = (industry: number, idea: string) => view(newRun(5, industry, { model: 2, idea }));
  it("makes a pizza restaurant dearer and costlier to open than a coffee cart, and a gym different from a yoga studio", () => {
    const restaurant = at(6, "a family pizza restaurant");
    const cart = at(6, "a coffee cart");
    expect(restaurant.priceCents).toBeGreaterThan(cart.priceCents);
    expect(restaurant.builds.prototype.cashCents).toBeGreaterThan(cart.builds.prototype.cashCents * 3);
    expect(restaurant.weeklyBurnCents).toBeGreaterThan(cart.weeklyBurnCents);
    expect(cart.capacity as number).toBeLessThan(restaurant.capacity as number * 2);
    const gym = at(3, "a small strength-training gym");
    const yoga = at(3, "a boutique yoga studio");
    expect(yoga.priceCents).toBeGreaterThan(gym.priceCents);
    expect(yoga.capacity as number).toBeLessThan(gym.capacity as number);
  });

  it("serves far more people in a cafe than in a gym, and pays barista wages below trainer wages", () => {
    const cafe = at(6, "a neighbourhood cafe");
    const gym = at(3, "a small strength-training gym");
    expect(cafe.capacity as number).toBeGreaterThan((gym.capacity as number) * 2);
    expect(cafe.wages.ops).toBeLessThan(gym.wages.ops);
  });
});
