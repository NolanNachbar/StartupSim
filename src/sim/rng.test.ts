import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createRng } from "./rng";

describe("createRng", () => {
  it("replays the same sequence for the same seed", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const a = createRng(seed);
        const b = createRng(seed);
        for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
      }),
    );
  });

  it("stays inside [0, 1)", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const r = createRng(seed);
        for (let i = 0; i < 50; i++) {
          const v = r.next();
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
        }
      }),
    );
  });

  it("returns ints within inclusive bounds", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: -50, max: 50 }), fc.nat(40), (seed, min, span) => {
        const r = createRng(seed);
        const v = r.int(min, min + span);
        expect(v).toBeGreaterThanOrEqual(min);
        expect(v).toBeLessThanOrEqual(min + span);
      }),
    );
  });
});
