// Balance report. `npm run balance` runs every bot on 200 fixed seeds and prints the table against the
// GAME-DESIGN.md targets. The normal unit run only does a 20-seed smoke so the gates stay fast.
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUSINESS_LIST, BUSINESS_MODELS, INDUSTRY_LIST } from "../../src/sim";
import { playValidator } from "./helpers/validator";
import { BOTS, SEEDS_20, SEEDS_200, tally } from "./helpers/bots";

const FULL = process.env.BALANCE === "1";

describe("balance bots", () => {
  it.runIf(FULL)("prints the full 200-seed table", () => {
    const lines = BOTS.map((b) => {
      const s = tally(b, SEEDS_200);
      const causes = Object.entries(s.causes).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" ");
      return `${b.padEnd(12)} landed ${String(s.landed).padStart(3)}  crashed ${String(s.crashed).padStart(3)}  stalled ${String(s.stalled).padStart(3)}  | ${causes}`;
    });
    mkdirSync(".verify", { recursive: true });
    writeFileSync(".verify/balance.txt", `${lines.join("\n")}\n`);
    process.stdout.write(`\n${lines.join("\n")}\n`);

    // GAME-DESIGN.md, Balance targets. Tune the world, not these numbers, unless Nolan changes them.
    const pct = (n: number) => (n * 100) / SEEDS_200.length;
    const stat = Object.fromEntries(BOTS.map((b) => [b, tally(b, SEEDS_200)]));
    expect(pct(stat.builder?.causes.V1 ?? 0)).toBeGreaterThanOrEqual(80);
    expect(pct((stat.pitcher?.crashed ?? 0))).toBeGreaterThanOrEqual(70);
    expect(pct(stat.validator?.landed ?? 0)).toBeGreaterThanOrEqual(25);
    expect(pct(stat.validator?.landed ?? 0)).toBeLessThanOrEqual(45);
    expect(pct(stat.underpricer?.causes.M1 ?? 0)).toBeGreaterThanOrEqual(60);
    expect(pct(stat.random?.landed ?? 0)).toBeLessThan(10);
  });

  // Every market must be winnable by good play and ruinous for bad play, or the choice at setup means nothing.
  it("prints a table per industry and keeps every market in the winnable band", () => {
    const lines: string[] = [];
    INDUSTRY_LIST.forEach((ind, i) => {
      const validator = tally("validator", SEEDS_200, i);
      const underpricer = tally("underpricer", SEEDS_200, i);
      lines.push(`${ind.name.padEnd(24)} validator landed ${String(validator.landed).padStart(3)}  underpricer landed ${String(underpricer.landed).padStart(3)} crashed ${String(underpricer.crashed).padStart(3)}`);
      expect((validator.landed * 100) / SEEDS_200.length, `${ind.name}: good play should win about a quarter to a half of the time`).toBeGreaterThanOrEqual(15);
      expect((validator.landed * 100) / SEEDS_200.length, `${ind.name}: but not most of the time`).toBeLessThanOrEqual(55);
      expect((underpricer.landed * 100) / SEEDS_200.length, `${ind.name}: underpricing should not be a winning plan`).toBeLessThan(15);
    });
    process.stdout.write(`\n${lines.join("\n")}\n`);
  }, 60_000);

  // Every kind of business must be winnable by good play, or choosing one at setup would be a trap. A gym needs far
  // more customers than an app, a service needs a higher price, and a place has a limit on how many it can serve.
  const landedWith = (industry: number, model: number, seeds: number): number => {
    let landed = 0;
    for (let seed = 1000; seed < 1000 + seeds; seed++) {
      const r = playValidator(seed, { industry, business: { model, idea: BUSINESS_LIST[industry]![model]!.examples[0]! }, hireOps: true });
      if (r.run.pub.status === "landed") landed += 1;
    }
    return landed;
  };

  it("every business model is winnable in a spread of industries (a quick check)", () => {
    for (let model = 0; model < BUSINESS_MODELS.length; model++) {
      let landed = 0;
      for (const industry of [0, 3, 6, 7]) landed += landedWith(industry, model, 40);
      const pct = (landed * 100) / 160;
      expect(pct, `${BUSINESS_MODELS[model]!.name}: good play should land often enough to be worth trying`).toBeGreaterThanOrEqual(12);
      expect(pct, `${BUSINESS_MODELS[model]!.name}: and not almost always`).toBeLessThanOrEqual(60);
    }
  }, 120_000);

  it.runIf(FULL)("every industry and business model keeps a winnable band (the full table)", () => {
    const lines: string[] = [];
    INDUSTRY_LIST.forEach((ind, i) => {
      const cells = BUSINESS_MODELS.map((m, mi) => {
        const landed = landedWith(i, mi, 100);
        expect(landed, `${ind.name} / ${m.name}`).toBeGreaterThanOrEqual(2);
        expect(landed, `${ind.name} / ${m.name}`).toBeLessThanOrEqual(70);
        return `${m.id}:${landed}`;
      });
      lines.push(`${ind.name.padEnd(26)} ${cells.join("  ")}`);
    });
    process.stdout.write(`\n${lines.join("\n")}\n`);
  }, 600_000);

  it("smoke: every industry finishes 20 seeds with the good-play bot", () => {
    INDUSTRY_LIST.forEach((_, i) => {
      const s = tally("validator", SEEDS_20, i);
      expect(s.landed + s.crashed + s.stalled).toBe(20);
    });
  });

  it("smoke: every bot finishes 20 seeds with a well-formed report", () => {
    for (const b of BOTS) {
      const s = tally(b, SEEDS_20);
      expect(s.landed + s.crashed + s.stalled).toBe(20);
    }
    // Wide bands on 20 seeds: they catch a broken tuning, the 200-seed run checks the real targets.
    expect(tally("validator", SEEDS_20).landed).toBeGreaterThanOrEqual(2);
    expect(tally("validator", SEEDS_20).landed).toBeLessThanOrEqual(14);
    expect(tally("random", SEEDS_20).landed).toBeLessThanOrEqual(3);
    expect(tally("underpricer", SEEDS_20).crashed).toBeGreaterThanOrEqual(10);
  });
});
