import { describe, expect, it } from "vitest";
import { PROBLEMS, SEGMENT_NAMES, generateWorld, weatherPctAt } from "./world";
import type { Secret } from "./types";

describe("generateWorld", () => {
  it("is deterministic: equal seeds give deep-equal worlds (1,000 seeds)", () => {
    for (let seed = 0; seed < 1000; seed++) {
      expect(generateWorld(seed)).toEqual(generateWorld(seed));
    }
  });

  it("changes with the seed: at least 95 of 100 adjacent seed pairs differ", () => {
    let different = 0;
    for (let seed = 0; seed < 100; seed++) {
      if (JSON.stringify(generateWorld(seed)) !== JSON.stringify(generateWorld(seed + 1))) different += 1;
    }
    expect(different).toBeGreaterThanOrEqual(95);
  });

  it("keeps every field in its stated range over 1,000 seeds", () => {
    // protects: the hidden world matches the spec table; fails_when: a range, formula or key changes.
    for (let seed = 0; seed < 1000; seed++) {
      const w = generateWorld(seed);
      expect(w.seed).toBe(seed);
      expect(PROBLEMS).toContain(w.problemName);
      expect(w.segments.length).toBeGreaterThanOrEqual(3);
      expect(w.segments.length).toBeLessThanOrEqual(5);
      w.segments.forEach((s, i) => {
        expect(s.name).toBe(SEGMENT_NAMES[i]);
        expect(s.pain).toBeGreaterThanOrEqual(20);
        expect(s.pain).toBeLessThanOrEqual(100);
        expect(s.willingnessToPayCents % 100).toBe(0);
        expect(s.willingnessToPayCents).toBeGreaterThanOrEqual(1_000);
        expect(s.willingnessToPayCents).toBeLessThanOrEqual(19_900);
        expect(s.politeness).toBeGreaterThanOrEqual(0);
        expect(s.politeness).toBeLessThanOrEqual(100);
        expect(s.reachability).toBeGreaterThanOrEqual(10);
        expect(s.reachability).toBeLessThanOrEqual(100);
        expect(s.size).toBeGreaterThanOrEqual(200);
        expect(s.size).toBeLessThanOrEqual(4999);
        expect(s.incumbentSatisfactionPct).toBeGreaterThanOrEqual(0);
        expect(s.incumbentSatisfactionPct).toBeLessThanOrEqual(80);
        expect(s.trueDemand).toBe(
          Math.floor((s.size * s.pain * s.pain * (100 - s.incumbentSatisfactionPct)) / 3_000_000),
        );
        for (const n of Object.values(s)) {
          if (typeof n === "number") expect(Number.isSafeInteger(n)).toBe(true);
        }
      });
      expect(w.channels.map((c) => [c.name, c.costPerLeadCents])).toEqual([
        ["Cold outreach", 800],
        ["Communities", 300],
        ["Paid ads", 2500],
      ]);
      for (const c of w.channels) {
        expect(c.fit).toHaveLength(w.segments.length);
        for (const f of c.fit) {
          expect(f).toBeGreaterThanOrEqual(0);
          expect(f).toBeLessThanOrEqual(100);
        }
      }
      if (w.lateWindow) {
        expect(w.lateWindow.startWeek).toBeGreaterThanOrEqual(15);
        expect(w.lateWindow.startWeek).toBeLessThanOrEqual(70);
        expect(w.lateWindow.endWeek - w.lateWindow.startWeek).toBeGreaterThanOrEqual(8);
        expect(w.lateWindow.endWeek - w.lateWindow.startWeek).toBeLessThanOrEqual(16);
        expect(w.lateWindow.pct).toBe(40);
        expect(w.lateWindow.delayWeeks).toBe(6);
      }
      if (w.weather) {
        expect(w.weather.startWeek).toBeGreaterThanOrEqual(20);
        expect(w.weather.startWeek).toBeLessThanOrEqual(60);
        expect(w.weather.endWeek - w.weather.startWeek).toBeGreaterThanOrEqual(10);
        expect(w.weather.endWeek - w.weather.startWeek).toBeLessThanOrEqual(20);
        expect(w.weather.demandMultiplierPct).toBe(70);
      }
      expect(w.startFocus).toBeGreaterThanOrEqual(0);
      expect(w.startFocus).toBeLessThan(w.segments.length);
    }
  }, 30_000); // a long property loop: give it room on a busy machine

  it("produces both weather outcomes and every segment count across the seeds", () => {
    const counts = new Set<number>();
    let withWeather = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const w = generateWorld(seed);
      counts.add(w.segments.length);
      if (w.weather) withWeather += 1;
    }
    expect([...counts].sort()).toEqual([3, 4, 5]);
    expect(withWeather).toBeGreaterThan(400);
    expect(withWeather).toBeLessThan(600);
  });
});

describe("weatherPctAt", () => {
  const base: Secret = generateWorld(1);

  it("is 70 inside [startWeek, endWeek) and 100 outside", () => {
    const secret: Secret = { ...base, weather: { startWeek: 20, endWeek: 30, demandMultiplierPct: 70 } };
    expect(weatherPctAt(secret, 19)).toBe(100);
    expect(weatherPctAt(secret, 20)).toBe(70);
    expect(weatherPctAt(secret, 29)).toBe(70);
    expect(weatherPctAt(secret, 30)).toBe(100);
  });

  it("is always 100 when there is no weather event", () => {
    const secret: Secret = { ...base, weather: null };
    for (const week of [0, 25, 103]) expect(weatherPctAt(secret, week)).toBe(100);
  });
});
