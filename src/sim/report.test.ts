import { describe, expect, it } from "vitest";
import reportSource from "./report.ts?raw";
import { chooseAction, playFuzz } from "../../tests/unit/helpers/fuzz";
import { playValidator } from "../../tests/unit/helpers/validator";
import { buildHistory, buildReport, findPatterns, usd, type History } from "./report";
import { step } from "./reducer";
import { initialRun, unsafeRunForTest, type InternalRun } from "./state";
import type { Action, Evidence, InterviewEvidence, PatternId, PublicState } from "./types";

// ---------- helpers ----------

const BASE = initialRun(0).pub;
interface S {
  readonly action: Action;
  readonly before?: Partial<PublicState>;
  readonly after?: Partial<PublicState>;
}
/** Build a history by hand. Each step's `before` defaults to the previous `after`. */
function history(steps: readonly S[], final: Partial<PublicState> = {}): History {
  let prev: PublicState = BASE;
  const out = steps.map((s) => {
    const before = { ...prev, ...(s.before ?? {}) };
    const after = { ...before, ...(s.after ?? {}) };
    prev = after;
    return { action: s.action, before, after };
  });
  return { steps: out, final: { ...prev, ...final } };
}
const crashed = (week = 40): Partial<PublicState> => ({ status: "crashed", endReason: "cash", week });
const ids = (h: History): PatternId[] => findPatterns(h).map((f) => f.id);

const interview = (over: Partial<InterviewEvidence> = {}): InterviewEvidence => ({
  kind: "interview", week: 0, segment: 0, customer: "stranger", question: "past-behavior",
  outcome: "completed", tag: "fact", painReading: 50, committed: null, quote: "q", ...over,
});
const iv = (segment: number, question = "past-behavior" as InterviewEvidence["question"]): Action => ({ type: "interview", segment, questions: [question, question, question] });
const build = (kind: "landing-page" | "concierge" | "prototype"): Action => ({ type: "buildTest", kind });
const prototype = (week: number, progress: number, spent = 250_000): S => ({
  action: build("prototype"),
  before: { week },
  after: { week: week + 3, productProgressPct: progress, ledger: { ...BASE.ledger, buildCents: spent } },
});

// ---------- the books ----------

describe("the ledger", () => {
  const ok = (run: InternalRun, a: Action): InternalRun => {
    const r = step(run, a);
    if (!r.ok) throw new Error(`${JSON.stringify(a)}: ${r.reason}`);
    return r.run;
  };

  it("books revenue, marketing and payroll each week", () => {
    const run = unsafeRunForTest(0, { productProgressPct: 100, cashCents: 1_000_000, hires: 1, weeklyBurnCents: 250_000, marketing: { channel: 0, level: 2 }, payingCustomers: 1000 }, {
      channels: [{ name: "X", costPerLeadCents: 300, fit: [0, 0, 0, 0, 0] }, { name: "Y", costPerLeadCents: 800, fit: [0, 0, 0, 0, 0] }, { name: "Z", costPerLeadCents: 2500, fit: [0, 0, 0, 0, 0] }],
      lateWindow: null,
      weather: null,
    });
    const after = ok(run, { type: "wait" }).pub;
    expect(after.ledger.marketingCents).toBe(120_000);
    expect(after.ledger.payrollCents).toBe(100_000);
    expect(after.ledger.revenueCents).toBe(after.weeklyRevenueCents);
    expect(after.ledger.buildCents).toBe(0);
  });

  it("books build spend and raise weeks", () => {
    const built = ok(initialRun(2), build("concierge"));
    expect(built.pub.ledger.buildCents).toBe(80_000);
    const raised = ok(initialRun(2), { type: "raiseMoney" });
    expect(raised.pub.raiseWeeks).toBe(raised.pub.week);
    expect(raised.pub.raiseWeeks).toBeGreaterThanOrEqual(3);
    expect(raised.pub.raiseWeeks).toBeLessThanOrEqual(9);
  });

  it("records the week of the first payment and never changes it", () => {
    let found = 0;
    for (let seed = 0; seed < 200 && found < 3; seed++) {
      let run = ok(initialRun(seed), build("landing-page"));
      expect(run.pub.firstPaymentWeek).toBeNull();
      for (let c = 0; c < 3; c++) {
        const before = run.pub.week;
        run = ok(run, { type: "chargeTest", segment: run.pub.focusSegment, channel: c });
        const e = run.pub.evidence[run.pub.evidence.length - 1];
        if (e && e.kind === "paid-test" && e.payments > 0 && run.pub.firstPaymentWeek !== null) {
          expect(run.pub.firstPaymentWeek).toBe(before);
          found += 1;
          const again = ok(run, { type: "wait" });
          expect(again.pub.firstPaymentWeek).toBe(before);
          break;
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("keeps the first payment week when later tests also pay", () => {
    // protects: the first payment week is the first; fails_when: a later payment overwrites it.
    let checked = 0;
    for (let seed = 0; seed < 300 && checked < 3; seed++) {
      const base = unsafeRunForTest(seed, { landingPageBuilt: true, productProgressPct: 100, week: 20, firstPaymentWeek: 5, cashCents: 3_000_000 });
      for (let c = 0; c < 3; c++) {
        const after = ok(base, { type: "chargeTest", segment: base.pub.focusSegment, channel: c });
        const e = after.pub.evidence[after.pub.evidence.length - 1];
        if (e && e.kind === "paid-test" && e.payments > 0) {
          expect(after.pub.firstPaymentWeek).toBe(5);
          checked += 1;
          break;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("never decreases at any step of random play (200 seeds)", () => {
    for (let seed = 0; seed < 200; seed++) {
      let run = initialRun(seed);
      let previous: Action | null = null;
      for (let i = 0; i < 200 && run.pub.status === "running"; i++) {
        const action = chooseAction(run, seed, i, previous);
        const next = ok(run, action);
        for (const key of ["revenueCents", "marketingCents", "buildCents", "payrollCents"] as const) {
          expect(next.pub.ledger[key], `${key} seed ${seed} step ${i}`).toBeGreaterThanOrEqual(run.pub.ledger[key]);
        }
        expect(next.pub.raiseWeeks).toBeGreaterThanOrEqual(run.pub.raiseWeeks);
        run = next;
        previous = action;
      }
    }
  });
});

describe("usd", () => {
  it("formats cents as dollars with grouping, using integer math", () => {
    expect(usd(0)).toBe("$0");
    expect(usd(30_000)).toBe("$300");
    expect(usd(1_234_500)).toBe("$12,345");
    expect(usd(5_000_000)).toBe("$50,000");
    expect(usd(-150_000)).toBe("-$1,500");
  });
});

// ---------- history ----------

describe("buildHistory", () => {
  it("has one step per action and rebuilds the same final state", () => {
    const { run, actions } = playValidator(1);
    const h = buildHistory(1, actions);
    expect(h.steps).toHaveLength(actions.length);
    expect(h.final).toEqual(run.pub);
    expect(h.steps[0]?.before.week).toBe(0);
    for (let i = 1; i < h.steps.length; i++) expect(h.steps[i]?.before).toEqual(h.steps[i - 1]?.after);
  });

  it("returns the initial state for no actions and throws on an illegal replay", () => {
    expect(buildHistory(5, []).final).toEqual(initialRun(5).pub);
    expect(() => buildHistory(5, [{ type: "setPrice", priceCents: 1 }])).toThrow();
  });
});

// ---------- one fixture and one control per pattern ----------

interface Fixture { readonly fires: History; readonly control: History }
const FIXTURES: Record<PatternId, Fixture> = {
  V1: {
    // first customer conversation in week 8, after a prototype was already built
    fires: history([prototype(0, 40), { action: iv(0), before: { week: 8 }, after: { week: 9 } }], crashed(30)),
    control: history([{ action: iv(0), before: { week: 0 }, after: { week: 1 } }, prototype(1, 40)], crashed(30)),
  },
  V2: {
    fires: history([], { ...crashed(), evidence: [
      interview({ question: "pitch", tag: "compliment" }), interview({ question: "hypothetical", tag: "compliment" }),
      interview({ customer: "friend", tag: "fluff" }), interview({ question: "pitch", tag: "fluff" }), interview(),
    ] }),
    control: history([], { ...crashed(), evidence: [
      interview(), interview(), interview(), interview({ question: "pitch", tag: "compliment" }), interview({ question: "hypothetical", tag: "fluff" }),
    ] }),
  },
  V3: {
    fires: history([prototype(0, 40)], crashed()),
    control: history([prototype(0, 40), { action: { type: "chargeTest", segment: 0, channel: 0 }, before: { week: 3 }, after: { week: 4 } }], crashed()),
  },
  V4: {
    // product at 60 progress in week 10; the run runs to week 30 with marketing off
    fires: history([{ action: build("prototype"), before: { week: 7 }, after: { week: 10, productProgressPct: 60 } }], crashed(30)),
    control: history([
      { action: build("prototype"), before: { week: 7 }, after: { week: 10, productProgressPct: 60 } },
      { action: { type: "setMarketing", channel: 0, level: 2 }, before: { week: 12 }, after: { week: 12, marketing: { channel: 0, level: 2 } } },
    ], crashed(30)),
  },
  V5: {
    fires: history([prototype(0, 40)], { ...crashed(), focusSegment: 1, evidence: [interview({ segment: 0 })] }),
    control: history([prototype(0, 40)], { ...crashed(), focusSegment: 1, evidence: [interview({ segment: 1 })] }),
  },
  V6: {
    fires: history([prototype(0, 40, 600_000)], crashed()),
    control: history([prototype(0, 40, 599_999)], crashed()),
  },
  V8: {
    fires: history([], { ...crashed(), pivotsUsed: 3 }),
    control: history([], { ...crashed(), pivotsUsed: 2 }),
  },
  M1: {
    fires: history([{ action: { type: "setPrice", priceCents: 900 }, before: { week: 2 }, after: { week: 2, priceCents: 900 } }], { ...crashed(40), priceCents: 900 }),
    control: history([{ action: { type: "setPrice", priceCents: 4900 }, before: { week: 2 }, after: { week: 2, priceCents: 4900 } }], { ...crashed(40), priceCents: 4900 }),
  },
  M2: {
    fires: history([], { ...crashed(), firstPaymentWeek: 31 }),
    control: history([], { ...crashed(), firstPaymentWeek: 30 }),
  },
  M3: {
    fires: history([], { ...crashed(), ledger: { ...BASE.ledger, marketingCents: 600_000, revenueCents: 400_000 } }),
    control: history([], { ...crashed(), ledger: { ...BASE.ledger, marketingCents: 600_000, revenueCents: 401_000 } }),
  },
  M4: {
    fires: history([], { status: "crashed", endReason: "stalled", week: 104, raisesUsed: 1, cashCents: 5_000_000 }),
    control: history([], { status: "crashed", endReason: "stalled", week: 104, raisesUsed: 0, cashCents: 5_000_000 }),
  },
  M5: {
    fires: history([{ action: { type: "respondOffer", accept: true }, before: { week: 10 }, after: { week: 10, loan: { weeklyRepaymentCents: 280_000, weeklyPrincipalCents: 0, weeksLeft: 20 } } }], crashed()),
    control: history([{ action: { type: "respondOffer", accept: false }, before: { week: 10 }, after: { week: 10 } }], crashed()),
  },
  M6: {
    fires: history([], { ...crashed(), raiseWeeks: 10 }),
    control: history([], { ...crashed(), raiseWeeks: 9 }),
  },
  M7: {
    fires: history([{ action: { type: "hire" }, before: { week: 5 }, after: { week: 5, hires: 1, weeklyBurnCents: 250_000 } }], { ...crashed(), ledger: { ...BASE.ledger, payrollCents: 300_000 }, firstPaymentWeek: 20 }),
    control: history([{ action: { type: "hire" }, before: { week: 5 }, after: { week: 5, hires: 1, weeklyBurnCents: 250_000 } }], { ...crashed(), ledger: { ...BASE.ledger, payrollCents: 300_000 }, firstPaymentWeek: 3 }),
  },
};

describe("pattern rules", () => {
  for (const id of Object.keys(FIXTURES) as PatternId[]) {
    it(`${id} fires on its fixture and not on its control`, () => {
      // protects: each rule names its pattern from the run's own history; fails_when: the rule's trigger changes.
      const f = FIXTURES[id];
      expect(ids(f.fires), `${id} fixture`).toContain(id);
      expect(ids(f.control), `${id} control`).not.toContain(id);
    });
  }

  it("fires each pattern's evidence with numbers from the history", () => {
    for (const id of Object.keys(FIXTURES) as PatternId[]) {
      const found = findPatterns(FIXTURES[id].fires).find((f) => f.id === id);
      expect(found, id).toBeDefined();
      expect(found?.evidence.length, id).toBeGreaterThan(0);
      expect(found?.evidence.some((e) => /\d/.test(e)), `${id} cites a number`).toBe(true);
      expect(found?.fix.length).toBeGreaterThan(20);
      expect(found?.lesson.length).toBeGreaterThan(5);
    }
  });

  it("applies the boundaries exactly: V1 at week 6, V2 at 60 percent, V4 at 8 idle weeks, M3 at $4,000", () => {
    const v1 = (w: number) => ids(history([prototype(0, 40), { action: iv(0), before: { week: w }, after: { week: w + 1 } }], crashed(30)));
    expect(v1(5)).not.toContain("V1");
    expect(v1(6)).toContain("V1");
    const mk = (n: number): Evidence[] => Array.from({ length: 5 }, (_, i) => (i < n ? interview({ question: "pitch", tag: "compliment" }) : interview()));
    expect(ids(history([], { ...crashed(), evidence: mk(3) }))).toContain("V2");
    expect(ids(history([], { ...crashed(), evidence: mk(2) }))).not.toContain("V2");
    const ten = (n: number): Evidence[] => Array.from({ length: 10 }, (_, i) => (i < n ? interview({ question: "pitch", tag: "compliment" }) : interview()));
    expect(ids(history([], { ...crashed(), evidence: ten(5) }))).not.toContain("V2"); // exactly 50 percent
    expect(ids(history([], { ...crashed(), evidence: ten(6) }))).toContain("V2"); // exactly 60 percent
    const v4 = (end: number) => ids(history([{ action: build("prototype"), before: { week: 7 }, after: { week: 10, productProgressPct: 60 } }], crashed(end)));
    expect(v4(17)).not.toContain("V4");
    expect(v4(18)).toContain("V4");
    const m3 = (marketing: number) => ids(history([], { ...crashed(), ledger: { ...BASE.ledger, marketingCents: marketing, revenueCents: 0 } }));
    expect(m3(399_999)).not.toContain("M3");
    expect(m3(400_000)).toContain("M3");
  });

  it("also fires M5 when profitable on paper just before a cash crash", () => {
    const h = history([{ action: { type: "wait" }, before: { week: 30 }, after: { week: 31, profitableStreakWeeks: 3 } }], crashed(34));
    expect(ids(h)).toContain("M5");
    expect(ids(history([{ action: { type: "wait" }, before: { week: 30 }, after: { week: 31, profitableStreakWeeks: 2 } }], crashed(34)))).not.toContain("M5");
  });

  it("finds nothing in a run that landed", () => {
    for (const id of Object.keys(FIXTURES) as PatternId[]) {
      const landed = { ...FIXTURES[id].fires, final: { ...FIXTURES[id].fires.final, status: "landed" as const, endReason: "default-alive" as const } };
      expect(findPatterns(landed), id).toEqual([]);
    }
  });

  it("returns findings sorted by weight, heaviest first", () => {
    const h = history([prototype(0, 40, 700_000)], { ...crashed(), pivotsUsed: 3, raiseWeeks: 12 });
    const weights = findPatterns(h).map((f) => f.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
    expect(weights.length).toBeGreaterThan(2);
  });
});

// ---------- the report ----------

describe("buildReport", () => {
  it("names the heaviest pattern as the probable cause and lists up to three more", () => {
    const h = history([prototype(0, 40, 700_000)], { ...crashed(), pivotsUsed: 3, raiseWeeks: 12 });
    const found = findPatterns(h);
    const r = buildReport(h);
    expect(r.outcome).toBe("crashed");
    expect(r.probableCause?.id).toBe(found[0]?.id);
    expect(r.contributing.length).toBeLessThanOrEqual(3);
    expect(r.contributing.map((c) => c.id)).toEqual(found.slice(1, 4).map((f) => f.id));
    expect(r.contributing.map((c) => c.id)).not.toContain(r.probableCause?.id);
    expect(r.wouldHaveChanged).toBe(found[0]?.fix);
    expect(r.noDominantCause).toBe(false);
  });

  it("says there is no single dominant cause when nothing fires, and still quotes numbers", () => {
    const h = history([], { status: "crashed", endReason: "cash", week: 12, cashCents: -50_000, payingCustomers: 3, firstPaymentWeek: 10 });
    const r = buildReport(h);
    expect(findPatterns(h)).toEqual([]);
    expect(r.noDominantCause).toBe(true);
    expect(r.probableCause).toBeNull();
    expect(r.contributing).toEqual([]);
    expect(r.summary).toMatch(/12/);
    expect(r.numbers.length).toBeGreaterThan(0);
  });

  it("writes a landing report without causes", () => {
    const h = history([], { status: "landed", endReason: "default-alive", week: 30, payingCustomers: 250, firstPaymentWeek: 14 });
    const r = buildReport(h);
    expect(r.outcome).toBe("landed");
    expect(r.probableCause).toBeNull();
    expect(r.contributing).toEqual([]);
    expect(r.noDominantCause).toBe(false);
    expect(r.summary).toMatch(/30/);
    expect(r.numbers.length).toBeGreaterThan(0);
  });

  it("quotes at least one number from its own run, and lists every number it quotes", () => {
    for (const id of Object.keys(FIXTURES) as PatternId[]) {
      const h = FIXTURES[id].fires;
      const r = buildReport(h);
      const text = [r.headline, r.summary, ...(r.probableCause?.evidence ?? []), ...r.contributing.flatMap((c) => c.evidence)].join(" ");
      expect(r.numbers.length, id).toBeGreaterThan(0);
      expect(text, id).toContain(String(h.final.week));
      for (const n of r.numbers) expect(text + (r.wouldHaveChanged ?? ""), `${id}: ${n}`).toContain(n);
    }
  });

  it("never shares a sentence between two different causes", () => {
    const strip = (s: string): string => s.replace(/[$\d,.]+/g, "#").trim();
    const sentencesOf = (id: PatternId): Set<string> => {
      const f = findPatterns(FIXTURES[id].fires).find((x) => x.id === id);
      if (!f) throw new Error(`no finding for ${id}`);
      return new Set([f.title, ...f.evidence, f.fix, f.lesson].map(strip));
    };
    const all = (Object.keys(FIXTURES) as PatternId[]).map((id) => [id, sentencesOf(id)] as const);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        for (const s of all[i]![1]) expect(all[j]![1].has(s), `${all[i]![0]} and ${all[j]![0]} share "${s}"`).toBe(false);
      }
    }
    const headlines = new Map<string, PatternId>();
    for (const id of Object.keys(FIXTURES) as PatternId[]) {
      const r = buildReport({ ...FIXTURES[id].fires });
      if (r.probableCause?.id !== id) continue;
      const h = strip(r.headline);
      expect(headlines.has(h), `${id} headline repeats ${headlines.get(h)}`).toBe(false);
      headlines.set(h, id);
    }
  });
});

describe("reports for real runs", () => {
  it("are well formed for 400 validator runs and 200 random runs", () => {
    const check = (run: InternalRun, actions: readonly Action[], seed: number): void => {
      if (run.pub.status === "running") return;
      const r = buildReport(buildHistory(seed, actions));
      expect(r.outcome).toBe(run.pub.status === "landed" ? "landed" : run.pub.endReason === "stalled" ? "stalled" : "crashed");
      expect(r.headline.length).toBeGreaterThan(10);
      expect(r.summary).toContain(String(run.pub.week));
      expect(r.contributing.length).toBeLessThanOrEqual(3);
      const causeIds = [r.probableCause?.id, ...r.contributing.map((c) => c.id)].filter(Boolean);
      expect(new Set(causeIds).size).toBe(causeIds.length);
      expect(r.numbers.length).toBeGreaterThan(0);
      if (run.pub.status === "landed") expect(r.probableCause).toBeNull();
    };
    for (let seed = 0; seed < 400; seed++) {
      const { run, actions } = playValidator(seed);
      check(run, actions, seed);
    }
    for (let seed = 0; seed < 200; seed++) {
      const { run } = playFuzz(seed, 300);
      check(run, run.actions as Action[], seed);
    }
  });

  it("is a pure function of the run: the same seed and actions give the same report", () => {
    const { actions } = playValidator(9);
    expect(buildReport(buildHistory(9, actions))).toEqual(buildReport(buildHistory(9, actions)));
  });
});

describe("the report never reads the hidden world", () => {
  it("does not import the world, the secret type or the random draws", () => {
    // protects: the report explains the run from what the player could see; fails_when: a hidden-world import appears.
    expect(reportSource).not.toMatch(/from "\.\/world"/);
    expect(reportSource).not.toMatch(/\bSecret\b/);
    expect(reportSource).not.toMatch(/from "\.\/rng"/);
  });
});
