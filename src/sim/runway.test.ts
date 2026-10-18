import { describe, expect, it } from "vitest";
import {
  PIVOT_COST_CENTS,
  conversionPct,
  moveToward,
  pivotsRemaining,
  priceRatioPct,
  targetCustomers,
  weeklyRevenue,
} from "./runway";

describe("runway constants and helpers", () => {
  it("derives the pivot cost as one interview round, one test and three weeks of burn", () => {
    expect(PIVOT_COST_CENTS).toBe(680_000);
  });

  it("counts pivots remaining as floor(cash / pivotCost), never below 0", () => {
    // protects: the main gauge never overstates or goes negative; fails_when: floor or clamp is removed.
    const cases: Array<[number, number]> = [
      [-1, 0],
      [0, 0],
      [679_999, 0],
      [680_000, 1],
      [3_000_000, 4],
    ];
    for (const [cash, expected] of cases) expect(pivotsRemaining(cash, PIVOT_COST_CENTS)).toBe(expected);
  });

  it("looks up conversion by price as a share of willingness to pay, truncating toward zero", () => {
    const cases: Array<[number, number]> = [
      [0, 100],
      [50, 90],
      [75, 70],
      [100, 50],
      [150, 15],
      [175, 8],
      [200, 0],
      [250, 0],
    ];
    for (const [ratio, expected] of cases) expect(conversionPct(ratio)).toBe(expected);
  });

  it("computes the price ratio with floor division", () => {
    expect(priceRatioPct(4900, 4900)).toBe(100);
    expect(priceRatioPct(9900, 4900)).toBe(202);
    expect(priceRatioPct(1000, 3000)).toBe(33);
  });

  it("computes target customers with integer math", () => {
    expect(targetCustomers(1000, 100, 50, 100)).toBe(500);
    expect(targetCustomers(1000, 100, 50, 70)).toBe(350);
    expect(targetCustomers(1000, 0, 50, 100)).toBe(0);
    expect(targetCustomers(4999, 100, 100, 100)).toBe(4999);
  });

  it("moves customers toward the target by up to 20 percent, at least 1", () => {
    expect(moveToward(0, 500)).toBe(100);
    expect(moveToward(450, 500)).toBe(500);
    expect(moveToward(0, 3)).toBe(1);
    expect(moveToward(500, 0)).toBe(400);
    expect(moveToward(1, 0)).toBe(0);
    expect(moveToward(7, 7)).toBe(7);
  });

  it("computes weekly revenue as customers x monthly price x 12 / 52, floored", () => {
    expect(weeklyRevenue(100, 4900)).toBe(113_076);
    expect(weeklyRevenue(0, 4900)).toBe(0);
  });
});
