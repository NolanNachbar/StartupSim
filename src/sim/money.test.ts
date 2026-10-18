import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { playFuzz } from "../../tests/unit/helpers/fuzz";
import { playValidator } from "../../tests/unit/helpers/validator";
import { legalActions } from "./actions";
import { step } from "./reducer";
import {
  BUDGET_LEVELS_CENTS,
  acquiredCustomers,
  churnBp,
  churnedCustomers,
  marketCeiling,
  marketingLeads,
  randomizedRound,
} from "./runway";
import { initialRun, unsafeRunForTest, type InternalRun } from "./state";
import type { Action, PublicState, Secret, Segment } from "./types";

const SEG: Segment = {
  name: "A", pain: 100, willingnessToPayCents: 4900, politeness: 50, reachability: 50,
  size: 1000, incumbentSatisfactionPct: 0, trueDemand: 2000,
};
const secretFor = (extra: Partial<Secret> = {}): Partial<Secret> => ({
  segments: [SEG, { ...SEG, name: "B" }],
  weather: null,
  lateWindow: null,
  channels: [
    { name: "X", costPerLeadCents: 300, fit: [100, 100] },
    { name: "Y", costPerLeadCents: 800, fit: [100, 100] },
    { name: "Z", costPerLeadCents: 2500, fit: [100, 100] },
  ],
  startFocus: 0,
  ...extra,
});
const world = (pub: Partial<PublicState> = {}, extra: Partial<Secret> = {}): InternalRun =>
  unsafeRunForTest(0, { focusSegment: 0, segmentNames: ["A", "B"], priceCents: 4900, cashCents: 1_000_000, pivotsRemaining: 1, productProgressPct: 100, ...pub }, secretFor(extra));
const ok = (run: InternalRun, a: Action): InternalRun => {
  const r = step(run, a);
  if (!r.ok) throw new Error(`${JSON.stringify(a)}: ${r.reason}`);
  return r.run;
};
const reason = (run: InternalRun, a: unknown): string => {
  const r = step(run, a as Action);
  return r.ok ? "ok" : r.reason;
};
const wait = (run: InternalRun): InternalRun => ok(run, { type: "wait" });

describe("randomized rounding and the pure money formulas", () => {
  it("randomizedRound floors and adds one with probability remainder / den", () => {
    expect(randomizedRound(200_00000000, 100_000_000, 1)).toBe(200);
    expect(randomizedRound(250, 100, 50)).toBe(3); // remainder 50: draw 50 <= 50 rounds up
    expect(randomizedRound(250, 100, 51)).toBe(2);
    expect(randomizedRound(99, 100, 99)).toBe(1);
    expect(randomizedRound(99, 100, 100)).toBe(0);
    expect(randomizedRound(0, 100, 1)).toBe(0);
  });

  it("randomizedRound averages to num / den", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5000 }), fc.integer({ min: 1, max: 200 }), (num, den) => {
        let sum = 0;
        for (let draw = 1; draw <= den; draw++) sum += randomizedRound(num, den, draw);
        expect(sum).toBe(num); // over every possible draw the expected value is exact
      }),
      { numRuns: 200 },
    );
  });

  it("computes churn in basis points from product completeness", () => {
    expect(churnBp(100)).toBe(150);
    expect(churnBp(50)).toBe(350);
    expect(churnBp(0)).toBe(550);
    expect(churnedCustomers(1000, 100, 1)).toBe(15);
    expect(churnedCustomers(1000, 0, 1)).toBe(55);
    expect(churnedCustomers(0, 0, 1)).toBe(0);
    expect(churnedCustomers(1, 100, 1)).toBe(1); // 150 / 10000 chance, draw 1 rounds up
    expect(churnedCustomers(1, 100, 9999)).toBe(0);
  });

  it("computes the market ceiling and marketing leads", () => {
    expect(marketCeiling(1000, 100, 100)).toBe(1000);
    expect(marketCeiling(1000, 70, 100)).toBe(700);
    expect(marketCeiling(7, 70, 100)).toBe(4);
    expect(marketCeiling(2000, 100, 50)).toBe(1000); // only the share willing to pay at this price
    expect(marketCeiling(2000, 70, 50)).toBe(700);
    expect(marketCeiling(2000, 100, 0)).toBe(0);
    expect(marketingLeads(120_000, 300, 0)).toBe(400);
    expect(marketingLeads(120_000, 300, 1)).toBe(500);
    expect(marketingLeads(120_000, 300, 2)).toBe(600);
    expect(marketingLeads(40_000, 2500, 0)).toBe(16);
    expect(marketingLeads(0, 300, 2)).toBe(0);
  });

  it("acquires the exact expectation when it divides evenly, and 0 with no leads", () => {
    expect(acquiredCustomers({ leads: 400, fit: 100, need: 10_000, buyPct: 50, draw: 1 })).toBe(200);
    expect(acquiredCustomers({ leads: 0, fit: 100, need: 10_000, buyPct: 50, draw: 1 })).toBe(0);
    expect(acquiredCustomers({ leads: 400, fit: 0, need: 10_000, buyPct: 50, draw: 1 })).toBe(0);
  });
});

describe("marketing", () => {
  it("has the documented budgets and validates its inputs", () => {
    expect(BUDGET_LEVELS_CENTS).toEqual([0, 40_000, 120_000, 300_000]);
    const run = world();
    const after = ok(run, { type: "setMarketing", channel: 1, level: 2 });
    expect(after.pub.marketing).toEqual({ channel: 1, level: 2 });
    expect(after.pub.week).toBe(0);
    expect(reason(run, { type: "setMarketing", channel: 3, level: 1 })).toBe("invalid-channel");
    expect(reason(run, { type: "setMarketing", channel: null, level: 1 })).toBe("invalid-channel");
    expect(reason(run, { type: "setMarketing", channel: 0, level: 4 })).toBe("invalid-level");
    expect(reason(run, { type: "setMarketing", channel: 0, level: 0 })).toBe("invalid-level");
    expect(reason(run, { type: "setMarketing", channel: 0, level: 1.5 })).toBe("invalid-level");
    expect(ok(after, { type: "setMarketing", channel: null, level: 0 }).pub.marketing).toEqual({ channel: null, level: 0 });
  });

  it("spends the budget as a cost every tick", () => {
    const a = wait(world({ marketing: { channel: 0, level: 1 } }));
    const b = wait(world({ marketing: { channel: 0, level: 0 } }));
    expect(b.pub.cashCents - a.pub.cashCents).toBe(40_000 - (a.pub.weeklyRevenueCents - b.pub.weeklyRevenueCents));
  });

  it("wins more customers where the channel fits the segment better (200 seeds)", () => {
    let high = 0;
    let low = 0;
    for (let seed = 0; seed < 200; seed++) {
      const mk = (fit: number): number => {
        const run = unsafeRunForTest(seed, { focusSegment: 0, segmentNames: ["A", "B"], productProgressPct: 100, marketing: { channel: 0, level: 2 } }, secretFor({ channels: [{ name: "X", costPerLeadCents: 300, fit: [fit, fit] }, { name: "Y", costPerLeadCents: 800, fit: [0, 0] }, { name: "Z", costPerLeadCents: 2500, fit: [0, 0] }] }));
        return wait(run).pub.payingCustomers;
      };
      high += mk(90);
      low += mk(20);
    }
    expect(high).toBeGreaterThan(low * 2);
  });

  it("is deterministic and keyed by the week", () => {
    const run = world({ marketing: { channel: 0, level: 2 }, week: 7 }, { segments: [{ ...SEG, pain: 61, size: 777 }, SEG] });
    expect(wait(run).pub.payingCustomers).toBe(wait(run).pub.payingCustomers);
  });
});

describe("hiring", () => {
  it("adds payroll, shortens builds and widens marketing reach", () => {
    const run = world({ landingPageBuilt: true, productProgressPct: 0 });
    const hired = ok(run, { type: "hire" });
    expect(hired.pub.weeklyBurnCents).toBe(250_000);
    expect(hired.pub.hires).toBe(1);
    const build = ok(hired, { type: "buildTest", kind: "prototype" });
    expect(build.pub.week).toBe(2); // 3 weeks minus 1
    const twice = ok(hired, { type: "hire" });
    expect(twice.pub.weeklyBurnCents).toBe(350_000);
    expect(ok(twice, { type: "buildTest", kind: "prototype" }).pub.week).toBe(1);
    expect(ok(twice, { type: "buildTest", kind: "concierge" }).pub.week).toBe(1);
    // 25 percent more leads per hire: 400 -> 500 -> 600
    expect(marketingLeads(120_000, 300, twice.pub.hires)).toBe(600);
  });

  it("limits hires to two, needs a week of new payroll in cash, and costs burn every week", () => {
    const run = world();
    expect(reason(ok(ok(run, { type: "hire" }), { type: "hire" }), { type: "hire" })).toBe("hire-limit");
    expect(reason(world({ cashCents: 249_999 }), { type: "hire" })).toBe("insufficient-cash");
    const hired = ok(run, { type: "hire" });
    expect(wait(hired).pub.cashCents).toBe(1_000_000 - 250_000);
  });
});

describe("late payers", () => {
  const late = { startWeek: 5, endWeek: 15, pct: 40, delayWeeks: 6 };

  it("keeps accrual revenue but delays 40 percent of the cash for six weeks", () => {
    // protects: profitable on paper, short of cash (M5); fails_when: late revenue is booked as cash at once.
    const pub = wait(world({ payingCustomers: 1000, week: 5 }, { lateWindow: late })).pub;
    expect(pub.weeklyRevenueCents).toBe(1_113_807);
    expect(pub.cashCents).toBe(1_000_000 + 668_285 - 150_000);
    expect(pub.receivables).toEqual([{ week: 12, amountCents: 445_522 }]);
    expect(pub.profitableStreakWeeks).toBe(1);
  });

  it("collects a receivable in the week it is due", () => {
    const run = world({ payingCustomers: 0, productProgressPct: 0, week: 6, receivables: [{ week: 7, amountCents: 100_000 }] });
    const pub = wait(run).pub;
    expect(pub.receivables).toEqual([]);
    expect(pub.cashCents).toBe(1_000_000 + 100_000 - 150_000);
  });

  it("does not delay anything outside the window or without one", () => {
    expect(wait(world({ payingCustomers: 1000, week: 4 }, { lateWindow: late })).pub.receivables).toEqual([]);
    expect(wait(world({ payingCustomers: 1000, week: 15 }, { lateWindow: late })).pub.receivables).toEqual([]);
    expect(wait(world({ payingCustomers: 1000, week: 5 })).pub.receivables).toEqual([]);
  });
});

describe("predatory loan offer", () => {
  const poor = (week: number, extra: Partial<PublicState> = {}): InternalRun =>
    world({ week, cashCents: 1_000_000, productProgressPct: 0, ...extra });

  it("appears once, when runway is one pivot or less and week 6 has passed", () => {
    const early = wait(poor(4)); // week becomes 5
    expect(early.pub.offer).toBeNull();
    const shown = wait(poor(5)); // week becomes 6, cash 850,000 -> 1 pivot
    expect(shown.pub.offer).toEqual({ amountCents: 4_000_000, weeklyRepaymentCents: 280_000, weeks: 20, expiresWeek: 9 });
    expect(shown.pub.offersShown).toBe(1);
    expect(wait(shown).pub.offersShown).toBe(1);
    const rich = wait(poor(5, { cashCents: 5_000_000 }));
    expect(rich.pub.offer).toBeNull();
  });

  it("expires after three weeks and is never offered twice", () => {
    let run = wait(poor(5));
    expect(run.pub.offer).not.toBeNull();
    run = wait(wait(run)); // week 8
    expect(run.pub.offer).not.toBeNull();
    run = wait(run); // week 9
    expect(run.pub.offer).toBeNull();
    expect(wait(run).pub.offersShown).toBe(1);
  });

  it("gives cash on accept and drains repayment every week for 20 weeks", () => {
    const shown = wait(poor(5));
    const taken = ok(shown, { type: "respondOffer", accept: true });
    expect(taken.pub.cashCents).toBe(shown.pub.cashCents + 4_000_000);
    expect(taken.pub.offer).toBeNull();
    expect(taken.pub.loan).toEqual({ weeklyRepaymentCents: 280_000, weeksLeft: 20 });
    // No product and no customers, so revenue is zero and only burn and repayment move cash.
    let run: InternalRun = unsafeRunForTest(0, { ...taken.pub, cashCents: 100_000_000, pivotsRemaining: 100, week: 10 }, taken.secret);
    for (let i = 0; i < 20; i++) {
      const before = run.pub.cashCents;
      run = wait(run);
      expect(before - run.pub.cashCents, `repayment week ${i + 1}`).toBe(150_000 + 280_000);
    }
    expect(run.pub.loan).toBeNull();
    const before = run.pub.cashCents;
    expect(before - wait(run).pub.cashCents).toBe(150_000);
  });

  it("is declined cleanly and returns no-offer when there is nothing to answer", () => {
    const shown = wait(poor(5));
    const declined = ok(shown, { type: "respondOffer", accept: false });
    expect(declined.pub.offer).toBeNull();
    expect(declined.pub.loan).toBeNull();
    expect(declined.pub.cashCents).toBe(shown.pub.cashCents);
    expect(reason(poor(5), { type: "respondOffer", accept: true })).toBe("no-offer");
    expect(reason(declined, { type: "respondOffer", accept: true })).toBe("no-offer");
  });

  it("does not count loan repayment as an operating cost for the profit streak", () => {
    const run = unsafeRunForTest(0, { ...world({ payingCustomers: 1000 }).pub, loan: { weeklyRepaymentCents: 280_000, weeksLeft: 5 }, cashCents: 5_000_000 }, secretFor());
    const pub = wait(run).pub;
    expect(pub.profitableStreakWeeks).toBe(1);
    expect(pub.cashCents).toBe(5_000_000 + 1_113_807 - 150_000 - 280_000);
    expect(pub.loan?.weeksLeft).toBe(4);
  });
});

describe("fundraising with strings", () => {
  const proof = [{ segment: 0, state: "verified" as const, interviews: 0, interested: 0, payments: 2, failedPaidTests: 0 }];

  it("gives 15 percent first and 20 percent second, and the second needs proof", () => {
    const first = ok(world(), { type: "raiseMoney" });
    expect(first.pub.equityGivenPct).toBe(15);
    expect(reason(first, { type: "raiseMoney" })).toBe("investors-want-proof");
    const withProof = unsafeRunForTest(0, { ...first.pub, hypotheses: proof }, first.secret);
    const second = ok(withProof, { type: "raiseMoney" });
    expect(second.pub.equityGivenPct).toBe(35);
    expect(reason(second, { type: "raiseMoney" })).toBe("raise-limit");
  });

  it("lists the second raise only when there is proof", () => {
    const first = ok(world(), { type: "raiseMoney" });
    expect(legalActions(first).some((a) => a.type === "raiseMoney")).toBe(false);
    const withProof = unsafeRunForTest(0, { ...first.pub, hypotheses: proof }, first.secret);
    expect(legalActions(withProof).some((a) => a.type === "raiseMoney")).toBe(true);
  });
});

describe("invariants over random play (500 seeds)", () => {
  it("keeps runway non-negative, crashes on negative cash, and finishes by week 104", () => {
    for (let seed = 0; seed < 500; seed++) {
      let run = initialRun(seed);
      for (let i = 0; i < 400 && run.pub.status === "running"; i++) {
        const legal = legalActions(run);
        const pick = legal[(seed * 31 + i * 7) % legal.length] as Action;
        const r = step(run, pick);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        run = r.run;
        expect(run.pub.pivotsRemaining).toBeGreaterThanOrEqual(0);
        if (run.pub.cashCents < 0) expect(run.pub.status).toBe("crashed");
        expect(run.pub.week).toBeLessThanOrEqual(104);
        for (const v of Object.values(run.pub)) if (typeof v === "number") expect(Number.isSafeInteger(v)).toBe(true);
      }
    }
    for (let seed = 0; seed < 100; seed++) expect(playFuzz(seed, 400).run.pub.status).not.toBe("running");
  });
});

describe("pricing (400 seeds)", () => {
  it("the lowest price starves cash compared with a mid price", () => {
    // protects: underpricing is punished (failure catalog M1); fails_when: price stops mattering to results.
    let lowest = 0;
    let mid = 0;
    let n = 0;
    for (let seed = 0; seed < 400; seed++) {
      const a = playValidator(seed, { price: 900 }).run.pub;
      const b = playValidator(seed, { price: 9900 }).run.pub;
      lowest += a.status === "landed" ? 1 : 0;
      mid += b.status === "landed" ? 1 : 0;
      n += 1;
    }
    expect(mid).toBeGreaterThan(lowest);
    expect(n).toBe(400);
  });

  it("a scripted good founder lands in a 25 to 75 percent band", () => {
    // protects: the game is neither trivial nor impossible; no_claim: exact balance (M7 tunes toward the 25 to 45 percent target).
    let landed = 0;
    for (let seed = 0; seed < 400; seed++) if (playValidator(seed).run.pub.status === "landed") landed += 1;
    expect(landed / 400).toBeGreaterThanOrEqual(0.25);
    expect(landed / 400).toBeLessThanOrEqual(0.75);
  });
});
