import { describe, expect, it } from "vitest";
import { playFuzz } from "../../tests/unit/helpers/fuzz";
import { PRICE_LADDER_CENTS, legalActions } from "./actions";
import { step } from "./reducer";
import { PIVOT_COST_CENTS, START_CASH_CENTS, WEEKLY_BURN_CENTS } from "./runway";
import { initialRun, unsafeRunForTest, type InternalRun } from "./state";
import type { Action, IllegalReason, PublicState, Segment } from "./types";
import { PROBLEMS } from "./world";

const SEG: Segment = {
  name: "A",
  pain: 100,
  willingnessToPayCents: 4900,
  politeness: 50,
  reachability: 50,
  size: 1000,
  incumbentSatisfactionPct: 0,
  trueDemand: 1000,
};

/** A hand-built world: two segments, no weather, focus 0, demand 1000 at 4900 per month. */
function scenario(pub: Partial<PublicState>, weather = null as null | { startWeek: number; endWeek: number; demandMultiplierPct: number }): InternalRun {
  return unsafeRunForTest(
    0,
    {
      focusSegment: 0,
      segmentNames: ["A", "B"],
      priceCents: 4900,
      cashCents: 1_000_000,
      pivotsRemaining: 1,
      productProgressPct: 100,
      ...pub,
    },
    { segments: [SEG, { ...SEG, name: "B" }], weather, startFocus: 0 },
  );
}

function wait(run: InternalRun): PublicState {
  const result = step(run, { type: "wait" });
  if (!result.ok) throw new Error(result.reason);
  return result.run.pub;
}

function numericFields(pub: PublicState): Array<[string, number]> {
  return Object.entries(pub).filter((e): e is [string, number] => typeof e[1] === "number");
}

describe("initial state", () => {
  it("starts week 0 with the documented numbers", () => {
    const pub = initialRun(0).pub;
    expect(pub).toMatchObject({
      week: 0,
      status: "running",
      endReason: null,
      cashCents: START_CASH_CENTS,
      weeklyBurnCents: WEEKLY_BURN_CENTS,
      priceCents: 4900,
      pivotCostCents: PIVOT_COST_CENTS,
      pivotsRemaining: 4,
      pivotsUsed: 0,
      raisesUsed: 0,
      equityGivenPct: 0,
      productProgressPct: 0,
      payingCustomers: 0,
      weeklyRevenueCents: 0,
      profitableStreakWeeks: 0,
      log: [],
      evidence: [],
    });
    expect(PROBLEMS).toContain(pub.problemName);
    expect(pub.segmentNames.length).toBeGreaterThanOrEqual(3);
    expect(pub.focusSegment).toBeGreaterThanOrEqual(0);
    expect(pub.focusSegment).toBeLessThan(pub.segmentNames.length);
  });
});

describe("tick order (hand-computed scenarios)", () => {
  it("ramps customers up toward the target and books revenue", () => {
    const pub = wait(scenario({ productProgressPct: 100 }));
    expect(pub).toMatchObject({
      week: 1,
      status: "running",
      payingCustomers: 100,
      weeklyRevenueCents: 113_076,
      cashCents: 963_076,
      profitableStreakWeeks: 0,
      pivotsRemaining: 1,
    });
  });

  it("ramps customers down when the price is above willingness to pay", () => {
    const pub = wait(scenario({ priceCents: 9900, payingCustomers: 500, week: 3 }));
    expect(pub).toMatchObject({
      week: 4,
      payingCustomers: 400,
      weeklyRevenueCents: 913_846,
      cashCents: 1_763_846,
      profitableStreakWeeks: 1,
      pivotsRemaining: 2,
    });
  });

  it("lands after the eighth profitable week", () => {
    const pub = wait(scenario({ payingCustomers: 500, week: 10, profitableStreakWeeks: 7 }));
    expect(pub).toMatchObject({
      week: 11,
      status: "landed",
      endReason: "default-alive",
      payingCustomers: 500,
      weeklyRevenueCents: 565_384,
      cashCents: 1_415_384,
      profitableStreakWeeks: 8,
    });
  });

  it("crashes when cash goes below zero", () => {
    const pub = wait(scenario({ productProgressPct: 0, cashCents: 100_000, pivotsRemaining: 0 }));
    expect(pub).toMatchObject({
      status: "crashed",
      endReason: "cash",
      cashCents: -50_000,
      pivotsRemaining: 0,
      profitableStreakWeeks: 0,
    });
  });

  it("does not crash at exactly zero cash, only below zero", () => {
    // protects: the crash boundary; fails_when: the check becomes <= 0 (a run with exactly $0 survives).
    const pub = wait(scenario({ productProgressPct: 0, cashCents: 150_000, pivotsRemaining: 0 }));
    expect(pub).toMatchObject({ status: "running", endReason: null, cashCents: 0, pivotsRemaining: 0 });
    const next = wait({ ...scenario({}), pub });
    expect(next).toMatchObject({ status: "crashed", endReason: "cash", cashCents: -150_000 });
  });

  it("stalls at week 104", () => {
    const pub = wait(scenario({ productProgressPct: 0, cashCents: 5_000_000, week: 103 }));
    expect(pub).toMatchObject({ week: 104, status: "crashed", endReason: "stalled", cashCents: 4_850_000 });
  });

  it("applies the weather multiplier to demand", () => {
    const pub = wait(scenario({ week: 5 }, { startWeek: 5, endWeek: 15, demandMultiplierPct: 70 }));
    expect(pub).toMatchObject({ payingCustomers: 70, weeklyRevenueCents: 79_153, cashCents: 929_153 });
  });

  it("checks a cash crash before a landing", () => {
    const pub = wait(
      scenario({ payingCustomers: 500, profitableStreakWeeks: 7, cashCents: -1_000_000, pivotsRemaining: 0 }),
    );
    expect(pub).toMatchObject({ status: "crashed", endReason: "cash" });
  });
});

describe("legal-action fuzz", () => {
  it("never throws, keeps every number a safe integer, and ends every run within 300 steps (1,000 seeds)", () => {
    // protects: the reducer is total over legal actions and keeps integer money; fails_when: any
    // legal action throws, yields NaN or a fraction, or a run cannot finish.
    for (let seed = 0; seed < 1000; seed++) {
      const { run, steps } = playFuzz(seed, 300);
      expect(run.pub.status).not.toBe("running");
      expect(steps).toBeLessThan(300);
      expect(run.pub.week).toBeLessThanOrEqual(104);
      for (const [name, value] of numericFields(run.pub)) {
        expect(Number.isSafeInteger(value), `${name} of seed ${seed}`).toBe(true);
      }
    }
  });

  it("keeps week monotonic and every intermediate state an integer state", () => {
    for (let seed = 0; seed < 100; seed++) {
      let run = initialRun(seed);
      let lastWeek = 0;
      for (let i = 0; i < 300 && run.pub.status === "running"; i++) {
        const actions = legalActions(run);
        const action = actions[(seed + i) % actions.length] as Action;
        const result = step(run, action);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        run = result.run;
        expect(run.pub.week).toBeGreaterThanOrEqual(lastWeek);
        lastWeek = run.pub.week;
        for (const [name, value] of numericFields(run.pub)) {
          expect(Number.isSafeInteger(value), `${name} seed ${seed} step ${i}`).toBe(true);
        }
      }
    }
  });
});

describe("illegal actions", () => {
  const fresh = (): InternalRun => initialRun(0);
  const reasonOf = (run: InternalRun, action: unknown): IllegalReason | "ok" => {
    const result = step(run, action as Action);
    return result.ok ? "ok" : result.reason;
  };

  it("returns each reason and leaves the run untouched", () => {
    const crashed = scenario({ productProgressPct: 0, cashCents: 100_000, pivotsRemaining: 0 });
    const cases: Array<[string, InternalRun, unknown, IllegalReason]> = [
      ["unknown action", fresh(), { type: "bogus" }, "unknown-action"],
      ["missing type", fresh(), {}, "unknown-action"],
      ["not an object", fresh(), "wait", "unknown-action"],
      ["not implemented", fresh(), { type: "interview" }, "not-implemented"],
      ["price off the ladder", fresh(), { type: "setPrice", priceCents: 1234 }, "invalid-price"],
      ["price is the current price", fresh(), { type: "setPrice", priceCents: 4900 }, "invalid-price"],
      ["fractional price", fresh(), { type: "setPrice", priceCents: 9900.5 }, "invalid-price"],
      ["segment is the current focus", fresh(), { type: "pivot", toSegment: initialRun(0).pub.focusSegment }, "invalid-segment"],
      ["negative segment", fresh(), { type: "pivot", toSegment: -1 }, "invalid-segment"],
      ["fractional segment", fresh(), { type: "pivot", toSegment: 0.5 }, "invalid-segment"],
      ["segment out of range", fresh(), { type: "pivot", toSegment: 9 }, "invalid-segment"],
      ["no pivots left", scenario({ cashCents: 100_000, pivotsRemaining: 0 }), { type: "pivot", toSegment: 1 }, "no-pivots-left"],
    ];
    for (const [label, run, action, reason] of cases) {
      const before = JSON.stringify([run.pub, run.actions]);
      expect(reasonOf(run, action), label).toBe(reason);
      expect(JSON.stringify([run.pub, run.actions]), label).toBe(before);
    }
    // finished runs
    const finished = step(crashed, { type: "wait" });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(reasonOf(finished.run, { type: "wait" })).toBe("run-finished");
  });

  it("returns raise-limit on the third raise", () => {
    let run = fresh();
    for (let i = 0; i < 2; i++) {
      const r = step(run, { type: "raiseMoney" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      run = r.run;
    }
    expect(run.pub.raisesUsed).toBe(2);
    expect(reasonOf(run, { type: "raiseMoney" })).toBe("raise-limit");
  });
});

describe("terminal states and reserved actions", () => {
  it("rejects every action after the run ends and lists no legal actions", () => {
    const ended = step(scenario({ productProgressPct: 0, cashCents: 100_000, pivotsRemaining: 0 }), { type: "wait" });
    if (!ended.ok) throw new Error(ended.reason);
    const actions: Action[] = [
      { type: "wait" },
      { type: "setPrice", priceCents: 9900 },
      { type: "raiseMoney" },
      { type: "pivot", toSegment: 1 },
    ];
    for (const a of actions) {
      const r = step(ended.run, a);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("run-finished");
    }
    expect(legalActions(ended.run)).toEqual([]);
  });

  it("rejects the six reserved actions and never lists them", () => {
    const reserved = ["interview", "buildTest", "chargeTest", "pickChannel", "hire", "doubleDown"] as const;
    const run = initialRun(3);
    for (const type of reserved) {
      const r = step(run, { type });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("not-implemented");
      expect(legalActions(run).map((a) => a.type)).not.toContain(type);
    }
  });

  it("lists wait, every other price, raise, and one pivot per other segment on a fresh run", () => {
    const run = initialRun(5);
    const actions = legalActions(run);
    expect(actions.filter((a) => a.type === "wait")).toHaveLength(1);
    expect(actions.filter((a) => a.type === "setPrice")).toHaveLength(PRICE_LADDER_CENTS.length - 1);
    expect(actions.filter((a) => a.type === "raiseMoney")).toHaveLength(1);
    expect(actions.filter((a) => a.type === "pivot")).toHaveLength(run.pub.segmentNames.length - 1);
  });
});

describe("raiseMoney", () => {
  it("takes 3 to 9 weeks, delivers cash and equity only if the run survives (200 seeds)", () => {
    for (let seed = 0; seed < 200; seed++) {
      const run = initialRun(seed);
      const r = step(run, { type: "raiseMoney" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const w = r.run.pub.week;
      expect(w).toBeGreaterThanOrEqual(3);
      expect(w).toBeLessThanOrEqual(9);
      expect(r.run.pub.raisesUsed).toBe(1);
      expect(r.run.pub.equityGivenPct).toBe(15);
      expect(r.run.pub.cashCents).toBe(START_CASH_CENTS - WEEKLY_BURN_CENTS * w + 10_000_000);
      expect(r.run.pub.log.at(-1)?.text).toBe("Raised $100,000 for 15% equity.");
    }
  });

  it("does not deliver the money when the run ends during the raise", () => {
    const run = scenario({ productProgressPct: 0, cashCents: 200_000, pivotsRemaining: 0 });
    const r = step(run, { type: "raiseMoney" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.run.pub.status).toBe("crashed");
    expect(r.run.pub.raisesUsed).toBe(0);
    expect(r.run.pub.equityGivenPct).toBe(0);
  });
});

describe("pivot", () => {
  it("costs one week, halves progress (floor), and changes focus", () => {
    const run = scenario({ productProgressPct: 51 });
    const r = step(run, { type: "pivot", toSegment: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.run.pub).toMatchObject({ week: 1, pivotsUsed: 1, focusSegment: 1, productProgressPct: 25 });
    expect(r.run.pub.log.at(-1)?.text).toBe("Pivoted to B.");
  });

  it("starts the new segment with no customers, revenue or profit streak", () => {
    // protects: a pivot is a fresh start with a new customer group, not free revenue; fails_when: the
    // old segment's customers carry over into the new segment.
    const run = scenario({
      productProgressPct: 100,
      payingCustomers: 500,
      profitableStreakWeeks: 3,
      weeklyRevenueCents: 565_384,
    });
    const r = step(run, { type: "pivot", toSegment: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // the week still runs on the old segment: 500 customers book 565,384 and cash moves accordingly
    expect(r.run.pub).toMatchObject({
      week: 1,
      cashCents: 1_415_384,
      focusSegment: 1,
      productProgressPct: 50,
      payingCustomers: 0,
      weeklyRevenueCents: 0,
      profitableStreakWeeks: 0,
    });
  });

  it("is not applied if the run ends during the pivot week", () => {
    // No product, so no revenue: 100,000 cash minus one week of burn goes below zero. The legal-pivot
    // check reads pivotsRemaining as given, so this scenario sets it to 1 on purpose.
    const run = scenario({ productProgressPct: 0, cashCents: 100_000, pivotsRemaining: 1 });
    const r = step(run, { type: "pivot", toSegment: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.run.pub.status).toBe("crashed");
    expect(r.run.pub.pivotsUsed).toBe(0);
    expect(r.run.pub.focusSegment).toBe(0);
  });
});

describe("setPrice", () => {
  it("takes no time and applies from the next tick", () => {
    const r = step(initialRun(0), { type: "setPrice", priceCents: 19_900 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.run.pub.priceCents).toBe(19_900);
    expect(r.run.pub.week).toBe(0);
    expect(r.run.pub.cashCents).toBe(START_CASH_CENTS);
  });
});
