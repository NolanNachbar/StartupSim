import { describe, expect, it } from "vitest";
import { collectKeys, playFuzz } from "../../tests/unit/helpers/fuzz";
import { playValidator } from "../../tests/unit/helpers/validator";
import { legalActions } from "./actions";
import { hypothesesFrom } from "./hypotheses";
import { runChannelTest, runPaidTest } from "./experiments";
import { step } from "./reducer";
import { initialRun, unsafeRunForTest, type InternalRun } from "./state";
import type { Action, ChannelTestEvidence, PaidTestEvidence } from "./types";
import { generateWorld } from "./world";

const ok = (run: InternalRun, a: Action): InternalRun => {
  const r = step(run, a);
  if (!r.ok) throw new Error(`${JSON.stringify(a)}: ${r.reason}`);
  return r.run;
};
const reason = (run: InternalRun, a: unknown): string => {
  const r = step(run, a as Action);
  return r.ok ? "ok" : r.reason;
};
const last = (run: InternalRun) => run.pub.evidence[run.pub.evidence.length - 1];

describe("buildTest", () => {
  it("costs cash plus weeks of burn, adds progress, and logs the build", () => {
    const cases: Array<[Action, number, number, number]> = [
      [{ type: "buildTest", kind: "landing-page" }, 30_000, 1, 5],
      [{ type: "buildTest", kind: "concierge" }, 80_000, 2, 20],
      [{ type: "buildTest", kind: "prototype" }, 250_000, 3, 40],
    ];
    for (const [action, cash, weeks, progress] of cases) {
      const r = ok(initialRun(2), action);
      expect(r.pub.week, JSON.stringify(action)).toBe(weeks);
      expect(r.pub.cashCents).toBe(3_000_000 - cash - 150_000 * weeks);
      expect(r.pub.productProgressPct).toBe(progress);
      expect(r.pub.landingPageBuilt).toBe(action.type === "buildTest" && action.kind === "landing-page");
      expect(r.pub.log.at(-1)?.text).toMatch(/^Built a /);
    }
  });

  it("caps progress at 100 and refuses a second landing page or builds at full progress", () => {
    let run = ok(initialRun(2), { type: "buildTest", kind: "landing-page" });
    expect(reason(run, { type: "buildTest", kind: "landing-page" })).toBe("already-built");
    run = unsafeRunForTest(2, { productProgressPct: 80, landingPageBuilt: true });
    const built = ok(run, { type: "buildTest", kind: "prototype" });
    expect(built.pub.productProgressPct).toBe(100);
    expect(reason(built, { type: "buildTest", kind: "concierge" })).toBe("already-built");
    expect(reason(built, { type: "buildTest", kind: "prototype" })).toBe("already-built");
  });

  it("rejects bad kinds and low cash, and is not applied if the run ends during the build", () => {
    const run = initialRun(2);
    expect(reason(run, { type: "buildTest", kind: "castle" })).toBe("invalid-build");
    expect(reason(run, { type: "buildTest" })).toBe("invalid-build");
    expect(reason(unsafeRunForTest(2, { cashCents: 29_999 }), { type: "buildTest", kind: "landing-page" })).toBe("insufficient-cash");
    const dying = unsafeRunForTest(2, { cashCents: 260_000, pivotsRemaining: 0 });
    const r = ok(dying, { type: "buildTest", kind: "prototype" });
    expect(r.pub.status).toBe("crashed");
    expect(r.pub.productProgressPct).toBe(0);
  });
});

describe("pickChannel", () => {
  it("costs $200 plus burn and records channel evidence with the right number of leads", () => {
    const leadsByChannel = [25, 66, 8];
    for (let c = 0; c < 3; c++) {
      const r = ok(initialRun(4), { type: "pickChannel", segment: 0, channel: c });
      const e = last(r) as ChannelTestEvidence;
      expect(e.kind).toBe("channel-test");
      expect(e.leads).toBe(leadsByChannel[c]);
      expect(e.interested).toBeGreaterThanOrEqual(0);
      expect(e.interested).toBeLessThanOrEqual(e.leads);
      expect(r.pub.cashCents).toBe(3_000_000 - 20_000 - 150_000);
      expect(r.pub.week).toBe(1);
      expect(r.pub.log.at(-1)?.text).toBe(`Channel test: ${e.interested} of ${e.leads} interested.`);
    }
  });

  it("finds more interest where the channel fits the segment (200+ segments)", () => {
    const high: number[] = [];
    const low: number[] = [];
    for (let seed = 0; seed < 800; seed++) {
      const secret = generateWorld(seed);
      secret.segments.forEach((_seg, i) => {
        secret.channels.forEach((ch, c) => {
          const e = runChannelTest({ secret, seed, index: 0, week: 0, segment: i, channel: c });
          const rate = e.interested / e.leads;
          const fit = ch.fit[i] ?? 0;
          if (fit >= 70) high.push(rate);
          if (fit <= 30) low.push(rate);
        });
      });
    }
    expect(high.length).toBeGreaterThan(200);
    expect(low.length).toBeGreaterThan(200);
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(high) - mean(low)).toBeGreaterThanOrEqual(0.2);
  });

  it("is deterministic and keyed by the channel-test count, not the week", () => {
    const strip = (r: InternalRun) => JSON.stringify(r.pub.evidence.map((e) => ({ ...e, week: 0 })));
    for (let seed = 0; seed < 60; seed++) {
      const plain = ok(initialRun(seed), { type: "pickChannel", segment: 0, channel: 1 });
      const later = ok(ok(initialRun(seed), { type: "wait" }), { type: "pickChannel", segment: 0, channel: 1 });
      expect(strip(later)).toBe(strip(plain));
    }
  });

  it("rejects bad segments and channels and low cash", () => {
    const run = initialRun(4);
    expect(reason(run, { type: "pickChannel", segment: 9, channel: 0 })).toBe("invalid-segment");
    expect(reason(run, { type: "pickChannel", segment: 0, channel: 3 })).toBe("invalid-channel");
    expect(reason(run, { type: "pickChannel", segment: 0, channel: -1 })).toBe("invalid-channel");
    expect(reason(run, { type: "pickChannel", segment: 0, channel: 0.5 })).toBe("invalid-channel");
    expect(reason(unsafeRunForTest(4, { cashCents: 19_999 }), { type: "pickChannel", segment: 0, channel: 0 })).toBe("insufficient-cash");
  });
});

describe("chargeTest", () => {
  const withPage = (seed: number, progress = 5): InternalRun =>
    unsafeRunForTest(seed, { landingPageBuilt: true, productProgressPct: progress });

  it("needs a landing page", () => {
    expect(reason(initialRun(4), { type: "chargeTest", segment: 0, channel: 0 })).toBe("nothing-to-sell");
  });

  it("books payments as cash, and only the focus segment's payers become customers", () => {
    let focusPaid = 0;
    let otherPaid = 0;
    for (let seed = 0; seed < 300 && (focusPaid === 0 || otherPaid === 0); seed++) {
      const base = withPage(seed, 100);
      const focus = base.pub.focusSegment;
      const other = (focus + 1) % base.pub.segmentNames.length;
      // A plain waiting week is the baseline: the existing market pull adds its own customers and revenue.
      const idle = ok(base, { type: "wait" });
      const f = ok(base, { type: "chargeTest", segment: focus, channel: 1 });
      const fe = last(f) as PaidTestEvidence;
      expect(fe.payments).toBeLessThanOrEqual(fe.leads);
      expect(f.pub.payingCustomers).toBeGreaterThanOrEqual(idle.pub.payingCustomers);
      if (fe.payments > 0) focusPaid += 1;
      const o = ok(base, { type: "chargeTest", segment: other, channel: 1 });
      const oe = last(o) as PaidTestEvidence;
      expect(o.pub.payingCustomers).toBe(idle.pub.payingCustomers);
      expect(o.pub.cashCents).toBe(idle.pub.cashCents - 20_000 + oe.payments * 4900);
      if (oe.payments > 0) otherPaid += 1;
    }
    expect(focusPaid).toBeGreaterThan(0);
    expect(otherPaid).toBeGreaterThan(0);
  });

  it("sells more to a finished product than to a bare landing page (credibility, 400 seeds)", () => {
    let bare = 0;
    let finished = 0;
    for (let seed = 0; seed < 400; seed++) {
      const secret = generateWorld(seed);
      const input = { secret, seed, index: 0, week: 0, segment: 0, channel: 1, priceCents: 4900 };
      bare += runPaidTest({ ...input, productProgressPct: 5 }).payments;
      finished += runPaidTest({ ...input, productProgressPct: 100 }).payments;
    }
    expect(finished).toBeGreaterThan(bare * 1.5);
  });

  it("rejects bad indices and low cash", () => {
    const run = withPage(4);
    expect(reason(run, { type: "chargeTest", segment: 9, channel: 0 })).toBe("invalid-segment");
    expect(reason(run, { type: "chargeTest", segment: 0, channel: 5 })).toBe("invalid-channel");
    expect(reason({ ...run, pub: { ...run.pub, cashCents: 10_000 } }, { type: "chargeTest", segment: 0, channel: 0 })).toBe("insufficient-cash");
  });
});

describe("hypotheses in the run", () => {
  it("are always the function of the stored evidence (after random play, 200 seeds)", () => {
    for (let seed = 0; seed < 200; seed++) {
      const { run } = playFuzz(seed, 60);
      expect(run.pub.hypotheses).toEqual(hypothesesFrom(run.pub.evidence, run.pub.segmentNames.length));
    }
  });

  it("turn verified after a payment and stay verified after compliments", () => {
    const { run } = playValidator(3);
    const verified = run.pub.hypotheses.filter((h) => h.state === "verified");
    expect(run.pub.evidence.some((e) => e.kind === "paid-test" && e.payments > 0)).toBe(verified.length > 0);
  });
});

describe("legal actions and reserved actions", () => {
  it("lists builds, channel tests and (with a page) charges when affordable", () => {
    const fresh = initialRun(6);
    const types = (r: InternalRun, t: string) => legalActions(r).filter((a) => a.type === t).length;
    const n = fresh.pub.segmentNames.length;
    expect(types(fresh, "buildTest")).toBe(3);
    expect(types(fresh, "pickChannel")).toBe(n * 3);
    expect(types(fresh, "chargeTest")).toBe(0);
    const page = ok(fresh, { type: "buildTest", kind: "landing-page" });
    expect(types(page, "buildTest")).toBe(2);
    expect(types(page, "chargeTest")).toBe(n * 3);
  });

  it("only doubleDown remains reserved", () => {
    for (const type of ["doubleDown"] as const) expect(reason(initialRun(1), { type })).toBe("not-implemented");
    for (const type of ["buildTest", "pickChannel", "chargeTest"]) expect(reason(initialRun(1), { type })).not.toBe("not-implemented");
  });
});

describe("evidence leaks nothing hidden", () => {
  it("has only documented keys on the new evidence kinds", () => {
    const { run } = playValidator(3);
    const channelKeys = new Set(["kind", "week", "segment", "channel", "leads", "interested"]);
    const paidKeys = new Set(["kind", "week", "segment", "channel", "leads", "payments", "priceCents"]);
    for (const e of run.pub.evidence) {
      if (e.kind === "channel-test") for (const k of Object.keys(e)) expect(channelKeys.has(k), k).toBe(true);
      if (e.kind === "paid-test") for (const k of Object.keys(e)) expect(paidKeys.has(k), k).toBe(true);
    }
    const keys = collectKeys(JSON.parse(JSON.stringify(run.pub)));
    for (const hidden of ["fit", "needsIt", "reached", "trueDemand", "incumbentSatisfactionPct"]) {
      expect(keys.has(hidden), hidden).toBe(false);
    }
    expect(run.pub.channels.every((c) => Object.keys(c).sort().join() === "costPerLeadCents,name")).toBe(true);
  });
});

describe("the game can be won", () => {
  it("lands (default alive) for at least 10 percent of 200 seeds with a validator policy", () => {
    // protects: the game is winnable by following the lean-startup loop; fails_when: a mechanic or
    // constant makes landing impossible. no_claim: the exact win rate (that is the balance work in M7).
    let landed = 0;
    for (let seed = 0; seed < 200; seed++) {
      if (playValidator(seed).run.pub.status === "landed") landed += 1;
    }
    expect(landed).toBeGreaterThanOrEqual(20);
  });
});
