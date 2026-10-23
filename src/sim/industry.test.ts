import { describe, expect, it } from "vitest";
import { playValidator } from "../../tests/unit/helpers/validator";
import { fromSave, newRun, toSave, view, INDUSTRY_LIST } from "./index";
import { initialRun } from "./state";
import { INDUSTRIES } from "./world";

describe("industries", () => {
  it("lists a public name and description for every market, with no numbers", () => {
    expect(INDUSTRY_LIST.length).toBe(INDUSTRIES.length);
    expect(INDUSTRY_LIST.length).toBeGreaterThanOrEqual(5);
    for (const i of INDUSTRY_LIST) {
      expect(Object.keys(i).sort()).toEqual(["blurb", "name", "rules"]);
      expect(i.name.length).toBeGreaterThan(3);
      expect(i.blurb).not.toMatch(/\d/);
    }
  });

  it("leaves the original world untouched when no industry is chosen", () => {
    expect(initialRun(42, null).secret).toEqual(initialRun(42).secret);
    expect(view(newRun(42)).segmentNames).toEqual(view(newRun(42, undefined)).segmentNames);
  });

  it("is a pure function of seed and industry", () => {
    for (let i = 0; i < INDUSTRIES.length; i++) expect(initialRun(9, i).secret).toEqual(initialRun(9, i).secret);
  });

  it("names the customer groups and the problem from the chosen market", () => {
    for (let i = 0; i < INDUSTRIES.length; i++) {
      const industry = INDUSTRIES[i]!;
      for (const seed of [1, 2, 3, 4]) {
        const v = view(newRun(seed, i));
        for (const n of v.segmentNames) expect(industry.segmentNames).toContain(n);
        expect(industry.problems).toContain(v.problemName);
      }
    }
  });

  it("changes the economics: consumers pay little and are easy to reach, business buyers pay a lot and are hard to reach", () => {
    const mean = (industry: number, pick: (s: { willingnessToPayCents: number; reachability: number }) => number) => {
      let total = 0;
      let n = 0;
      for (let seed = 0; seed < 150; seed++) for (const s of initialRun(seed, industry).secret.segments) { total += pick(s); n += 1; }
      return total / n;
    };
    const consumer = INDUSTRIES.findIndex((i) => i.name === "Consumer apps");
    const business = INDUSTRIES.findIndex((i) => i.name === "Business software");
    expect(mean(consumer, (s) => s.willingnessToPayCents)).toBeLessThan(mean(business, (s) => s.willingnessToPayCents) / 3);
    expect(mean(consumer, (s) => s.reachability)).toBeGreaterThan(mean(business, (s) => s.reachability) + 20);
  });

  it("keeps every generated value in range", () => {
    for (let i = 0; i < INDUSTRIES.length; i++) {
      for (let seed = 0; seed < 100; seed++) {
        for (const s of initialRun(seed, i).secret.segments) {
          expect(s.pain).toBeGreaterThanOrEqual(20);
          expect(s.pain).toBeLessThanOrEqual(100);
          expect(s.reachability).toBeGreaterThanOrEqual(10);
          expect(s.reachability).toBeLessThanOrEqual(100);
          expect(s.politeness).toBeGreaterThanOrEqual(0);
          expect(s.politeness).toBeLessThanOrEqual(100);
          expect(s.willingnessToPayCents).toBeGreaterThanOrEqual(500);
          expect(Number.isSafeInteger(s.trueDemand)).toBe(true);
        }
      }
    }
  });

  it("rejects an industry that does not exist", () => {
    expect(() => newRun(1, -1)).toThrow(RangeError);
    expect(() => newRun(1, INDUSTRIES.length)).toThrow(RangeError);
    expect(() => newRun(1, 1.5)).toThrow(RangeError);
  });

  it("saves and restores the market with the run, and rejects a bad one", () => {
    const run = newRun(7, 2);
    const save = toSave(run);
    expect(save.industry).toBe(2);
    const loaded = fromSave(save);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(view(loaded.run).segmentNames).toEqual(view(run).segmentNames);
    expect(toSave(newRun(7)).industry).toBeUndefined();
    expect(fromSave({ ...save, industry: 99 }).ok).toBe(false);
    expect(fromSave({ ...save, industry: "2" }).ok).toBe(false);
  });

  it("is winnable in every market by a founder who tests the price, and never a certain win", () => {
    for (let i = 0; i < INDUSTRIES.length; i++) {
      let wins = 0;
      const seeds = 40;
      for (let seed = 0; seed < seeds; seed++) {
        const landed = [900, 4900, 19900, 49900].some((price) => playValidator(seed, { price, industry: i }).run.pub.status === "landed");
        if (landed) wins += 1;
      }
      const rate = wins / seeds;
      expect(rate, `${INDUSTRIES[i]?.name}`).toBeGreaterThanOrEqual(0.12);
      expect(rate, `${INDUSTRIES[i]?.name}`).toBeLessThanOrEqual(0.92);
    }
  });
});
