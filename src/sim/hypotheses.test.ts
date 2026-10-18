import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { hypothesesFrom } from "./hypotheses";
import type { ChannelTestEvidence, Evidence, HypothesisState, InterviewEvidence, PaidTestEvidence } from "./types";

const SEGMENTS = 3;
const RANK: Record<HypothesisState, number> = { untested: 0, weak: 1, verified: 2 };

const interview = (segment: number, over: Partial<InterviewEvidence> = {}): InterviewEvidence => ({
  kind: "interview",
  week: 0,
  segment,
  customer: "stranger",
  question: "past-behavior",
  outcome: "completed",
  tag: "fact",
  painReading: 50,
  committed: null,
  quote: "q",
  ...over,
});
const channel = (segment: number, interested: number, leads = 25): ChannelTestEvidence => ({
  kind: "channel-test", week: 0, segment, channel: 0, leads, interested,
});
const paid = (segment: number, payments: number, leads = 25): PaidTestEvidence => ({
  kind: "paid-test", week: 0, segment, channel: 0, leads, payments, priceCents: 4900,
});

const state = (evidence: readonly Evidence[], segment: number): HypothesisState =>
  hypothesesFrom(evidence, SEGMENTS)[segment]?.state ?? "untested";

const evidenceArb: fc.Arbitrary<Evidence> = fc.oneof(
  fc.record({
    kind: fc.constant("interview" as const),
    week: fc.constant(0),
    segment: fc.integer({ min: 0, max: SEGMENTS - 1 }),
    customer: fc.constantFrom("stranger", "friend", "none") as fc.Arbitrary<InterviewEvidence["customer"]>,
    question: fc.constantFrom("past-behavior", "commitment", "hypothetical", "pitch") as fc.Arbitrary<InterviewEvidence["question"]>,
    outcome: fc.constantFrom("no-response", "ended-early", "completed") as fc.Arbitrary<InterviewEvidence["outcome"]>,
    tag: fc.constantFrom("fact", "fluff", "compliment", null) as fc.Arbitrary<InterviewEvidence["tag"]>,
    painReading: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    committed: fc.option(fc.boolean(), { nil: null }),
    quote: fc.constant("q"),
  }),
  fc.record({
    kind: fc.constant("channel-test" as const),
    week: fc.constant(0),
    segment: fc.integer({ min: 0, max: SEGMENTS - 1 }),
    channel: fc.integer({ min: 0, max: 2 }),
    leads: fc.integer({ min: 1, max: 66 }),
    interested: fc.integer({ min: 0, max: 8 }),
  }),
  fc.record({
    kind: fc.constant("paid-test" as const),
    week: fc.constant(0),
    segment: fc.integer({ min: 0, max: SEGMENTS - 1 }),
    channel: fc.integer({ min: 0, max: 2 }),
    leads: fc.integer({ min: 1, max: 66 }),
    payments: fc.integer({ min: 0, max: 5 }),
    priceCents: fc.constant(4900),
  }),
);

describe("hypothesesFrom", () => {
  it("starts every segment untested with zero counts", () => {
    expect(hypothesesFrom([], SEGMENTS)).toEqual(
      [0, 1, 2].map((segment) => ({ segment, state: "untested", interviews: 0, interested: 0, payments: 0, failedPaidTests: 0 })),
    );
  });

  it("makes a segment weak after a completed interview or an interested lead, and nothing else does", () => {
    expect(state([interview(1)], 1)).toBe("weak");
    expect(state([channel(2, 1)], 2)).toBe("weak");
    expect(state([channel(2, 0)], 2)).toBe("untested");
    expect(state([interview(0, { outcome: "no-response", tag: null, customer: "none" })], 0)).toBe("untested");
    expect(state([interview(0, { outcome: "ended-early", tag: null })], 0)).toBe("untested");
    expect(state([interview(1)], 0)).toBe("untested");
  });

  it("verifies a segment only with a payment", () => {
    expect(state([paid(0, 1)], 0)).toBe("verified");
    expect(state([paid(0, 0)], 0)).toBe("untested");
    expect(state([paid(0, 0), interview(0)], 0)).toBe("weak");
  });

  it("never verifies from compliments, fluff or committed answers, however many", () => {
    // protects: V2 and V3, flattery and promises are not demand; fails_when: any non-payment evidence verifies.
    const noise: Evidence[] = [];
    for (const tag of ["compliment", "fluff", "fact"] as const) {
      for (const committed of [true, false, null]) {
        noise.push(interview(0, { tag, committed, question: "commitment", customer: "friend" }));
      }
    }
    noise.push(channel(0, 8, 8));
    expect(state(Array.from({ length: 20 }, () => noise).flat(), 0)).toBe("weak");
  });

  it("counts failed paid tests only when 10 or more leads produced no payment", () => {
    const h = hypothesesFrom([paid(0, 0, 25), paid(0, 0, 8), paid(0, 0, 10), paid(0, 1, 25)], SEGMENTS)[0];
    expect(h).toMatchObject({ failedPaidTests: 2, payments: 1, state: "verified" });
  });

  it("does not depend on the order of the evidence (property)", () => {
    fc.assert(
      fc.property(fc.array(evidenceArb, { maxLength: 12 }), fc.nat(), (list, shift) => {
        const k = list.length === 0 ? 0 : shift % list.length;
        const rotated = [...list.slice(k), ...list.slice(0, k)];
        expect(hypothesesFrom(rotated, SEGMENTS)).toEqual(hypothesesFrom(list, SEGMENTS));
        expect(hypothesesFrom([...list].reverse(), SEGMENTS)).toEqual(hypothesesFrom(list, SEGMENTS));
      }),
      { numRuns: 300 },
    );
  });

  it("never lowers a state when evidence is added, and a payment always yields verified (property)", () => {
    // protects: payment evidence outranks everything in every transition; fails_when: later evidence downgrades or masks a payment.
    fc.assert(
      fc.property(fc.array(evidenceArb, { maxLength: 10 }), evidenceArb, fc.integer({ min: 0, max: SEGMENTS - 1 }), (list, extra, seg) => {
        const before = hypothesesFrom(list, SEGMENTS);
        const after = hypothesesFrom([...list, extra], SEGMENTS);
        for (let i = 0; i < SEGMENTS; i++) {
          expect(RANK[after[i]?.state ?? "untested"]).toBeGreaterThanOrEqual(RANK[before[i]?.state ?? "untested"]);
        }
        expect(state([...list, paid(seg, 1)], seg)).toBe("verified");
        expect(state([paid(seg, 1), ...list, extra], seg)).toBe("verified");
      }),
      { numRuns: 300 },
    );
  });

  it("ignores evidence for segments that do not exist", () => {
    expect(hypothesesFrom([paid(9, 3), interview(-1)], SEGMENTS).map((h) => h.state)).toEqual(["untested", "untested", "untested"]);
  });
});
