import { describe, expect, it } from "vitest";
import * as sim from "./index";

describe("public API (src/sim/index.ts)", () => {
  it("exports exactly the documented functions and constants", () => {
    expect(Object.keys(sim).sort()).toEqual(
      ["SIM_VERSION", "fromSave", "legalActions", "newRun", "report", "step", "toSave", "view"].sort(),
    );
    expect(sim.SIM_VERSION).toBe(4);
  });

  it("newRun rejects seeds that are not integers in [0, 0xFFFFFFFF]", () => {
    for (const seed of [-1, 1.5, 0x100000000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => sim.newRun(seed), String(seed)).toThrow(RangeError);
    }
    for (const seed of [0, 1, 0xffffffff]) expect(() => sim.newRun(seed)).not.toThrow();
  });

  it("plays a short run through the public API only", () => {
    let run = sim.newRun(42);
    expect(sim.view(run).week).toBe(0);
    const first = sim.legalActions(run).find((a) => a.type === "wait");
    expect(first).toBeDefined();
    const r = sim.step(run, { type: "wait" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    run = r.run;
    expect(sim.view(run).week).toBe(1);
    expect(sim.toSave(run)).toEqual({ simVersion: 4, seed: 42, actions: [{ type: "wait" }] });
  });

  it("gives no report while a run is going and a report once it has ended", () => {
    const run = sim.newRun(1);
    expect(sim.report(run)).toBeNull();
    let current = run;
    for (let i = 0; i < 120 && sim.view(current).status === "running"; i++) {
      const r = sim.step(current, { type: "wait" });
      if (!r.ok) break;
      current = r.run;
    }
    const rep = sim.report(current);
    expect(rep).not.toBeNull();
    expect(rep?.outcome).toBe("crashed");
  });

  it("returns the same result object semantics for illegal actions", () => {
    const run = sim.newRun(1);
    const r = sim.step(run, { type: "setPrice", priceCents: 1 });
    expect(r).toEqual({ ok: false, reason: "invalid-price" });
    expect(sim.view(run).week).toBe(0);
  });
});
