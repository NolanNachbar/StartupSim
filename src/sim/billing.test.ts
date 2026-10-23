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

  it("starts a cafe near ten dollars a visit and a gym near a hundred a month, with sensible menu prices to try", () => {
    const cafe = view(newRun(5, 6, { model: 2, idea: "a neighbourhood cafe" }));
    expect(cafe.priceCents).toBeGreaterThanOrEqual(800);
    expect(cafe.priceCents).toBeLessThanOrEqual(1800);
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
    expect(monthlyOf(1_000, b)).toBe(8_000); // ten dollars, eight visits a month
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
