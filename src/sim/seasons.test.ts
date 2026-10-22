import { describe, expect, it } from "vitest";
import { FORECAST_WEEKS, SEASONALITY, seasonAt, startMonthOf } from "./seasons";
import { INDUSTRY_LIST, newRun, view } from "./index";

describe("the calendar", () => {
  it("has a believable curve for every industry: twelve months, an average near 100, a visible peak", () => {
    expect(SEASONALITY.length).toBe(INDUSTRY_LIST.length);
    for (const [i, curve] of SEASONALITY.entries()) {
      expect(curve.length, INDUSTRY_LIST[i]?.name).toBe(12);
      const mean = curve.reduce((a, b) => a + b, 0) / 12;
      expect(mean, INDUSTRY_LIST[i]?.name).toBeGreaterThan(80);
      expect(mean, INDUSTRY_LIST[i]?.name).toBeLessThan(115);
      expect(Math.max(...curve), INDUSTRY_LIST[i]?.name).toBeGreaterThanOrEqual(110);
    }
  });

  it("puts gyms at their busiest in January and shops in November, whatever month the run starts in", () => {
    expect(SEASONALITY[3]?.indexOf(Math.max(...(SEASONALITY[3] as number[])))).toBe(0);
    expect(SEASONALITY[7]?.indexOf(Math.max(...(SEASONALITY[7] as number[])))).toBe(10);
    for (const seed of [1, 2, 3, 4, 5]) {
      const start = startMonthOf(seed);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(start).toBeLessThan(12);
      expect(seasonAt(3, seed, 0).month).toBe(start);
      expect(seasonAt(3, seed, 52).month).toBe(start); // a year later it is the same month
    }
  });

  it("looks ahead eight weeks", () => {
    const s = seasonAt(3, 7, 10);
    expect(s.forecast.length).toBe(FORECAST_WEEKS);
    expect(s.index).toBe(SEASONALITY[3]?.[s.month]);
  });

  it("shows only in a chosen business", () => {
    expect(view(newRun(5, 3)).season).toBeNull();
    expect(view(newRun(5, 3, { model: 2, idea: "a small strength-training gym" })).season).not.toBeNull();
  });
});
