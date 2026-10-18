import { describe, expect, it } from "vitest";
import fc from "fast-check";
import golden from "../../tests/unit/fixtures/rand-golden.json";
import { rand, randChance, randInt, randPick } from "./rng";

const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const keyArb = fc.oneof(fc.string({ maxLength: 8 }), fc.integer({ min: -1_000_000, max: 1_000_000 }));
const keysArb = fc.array(keyArb, { maxLength: 4 });

describe("rand", () => {
  it("matches the committed golden vectors for 12 fixed inputs", () => {
    // protects: outputs of rand never change silently; fails_when: hash constant, key encoding or
    // number handling changes; no_claim: statistical quality (see the uniformity test).
    expect(golden.cases).toHaveLength(12);
    for (const c of golden.cases) {
      expect(rand(c.seed, ...(c.keys as (string | number)[]))).toBe(c.value);
    }
  });

  it("is deterministic for the same seed and keys", () => {
    fc.assert(
      fc.property(seedArb, keysArb, (seed, keys) => {
        expect(rand(seed, ...keys)).toBe(rand(seed, ...keys));
      }),
      { numRuns: 1000 },
    );
  });

  it("stays inside [0, 1), including the extreme seeds", () => {
    const extremes = [0, 1, 0xffffffff, 0x80000000];
    for (const seed of extremes) {
      for (let i = 0; i < 200; i++) {
        const v = rand(seed, "range", i);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
    fc.assert(
      fc.property(seedArb, keysArb, (seed, keys) => {
        const v = rand(seed, ...keys);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }),
      { numRuns: 1000 },
    );
  });

  it("separates number keys from string keys and joined strings from split strings", () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(rand(seed, 1)).not.toBe(rand(seed, "1"));
      expect(rand(seed, "a", "b")).not.toBe(rand(seed, "ab"));
    }
  });

  it("depends on key order", () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(rand(seed, "a", 1)).not.toBe(rand(seed, 1, "a"));
    }
  });

  it("is uniform: 100,000 draws in 16 bins stay within 5 percent of the expected count", () => {
    const bins = new Array<number>(16).fill(0);
    for (let i = 0; i < 100_000; i++) {
      const bin = Math.floor(rand(7, "u", i) * 16);
      bins[bin] = (bins[bin] ?? 0) + 1;
    }
    for (const count of bins) {
      expect(Math.abs(count - 6250)).toBeLessThan(6250 * 0.05);
    }
  });

  it("throws RangeError for non-integer or out-of-range keys and seeds", () => {
    expect(() => rand(1, 1.5)).toThrow(RangeError);
    expect(() => rand(1, 2147483648)).toThrow(RangeError);
    expect(() => rand(1, -2147483648)).toThrow(RangeError);
    expect(() => rand(1, Number.NaN)).toThrow(RangeError);
    expect(() => rand(1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => rand(1.5, "x")).toThrow(RangeError);
    expect(() => rand(Number.NaN, "x")).toThrow(RangeError);
    // protects: distinct seeds never collide silently; fails_when: seed range is not enforced (2^32 wraps to 0).
    expect(() => rand(-1, "x")).toThrow(RangeError);
    expect(() => rand(0x100000000, "x")).toThrow(RangeError);
    expect(() => rand(0xffffffff, "x")).not.toThrow();
    expect(() => rand(0, "x")).not.toThrow();
  });
});

describe("randInt, randChance, randPick", () => {
  it("randInt stays within inclusive bounds", () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: -50, max: 50 }), fc.nat(40), keysArb, (seed, min, span, keys) => {
        const v = randInt(seed, min, min + span, ...keys);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(min);
        expect(v).toBeLessThanOrEqual(min + span);
      }),
      { numRuns: 1000 },
    );
  });

  it("randInt reaches both ends of a small range", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(randInt(3, 0, 3, "ends", i));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it("randChance is never true at 0 and always true at 1", () => {
    for (let i = 0; i < 200; i++) {
      expect(randChance(5, 0, "c", i)).toBe(false);
      expect(randChance(5, 1, "c", i)).toBe(true);
    }
  });

  it("randPick returns a member and rejects an empty list", () => {
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(randPick(9, items, "p", i));
    expect(() => randPick(9, [], "p")).toThrow(RangeError);
  });
});
