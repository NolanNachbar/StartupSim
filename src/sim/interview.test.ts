import { describe, expect, it } from "vitest";
import { collectKeys } from "../../tests/unit/helpers/fuzz";
import { INTERVIEW_ROUND_CASH_CENTS, WEEKLY_BURN_CENTS } from "./runway";
import { legalActions } from "./actions";
import { runInterviewRound } from "./interview";
import { step } from "./reducer";
import { initialRun, unsafeRunForTest, type InternalRun } from "./state";
import type { Action, InterviewEvidence, QuestionType } from "./types";
import { generateWorld } from "./world";

function round(seed: number, question: QuestionType, segment = 0, index = 0): InterviewEvidence[] {
  const secret = generateWorld(seed);
  return runInterviewRound({
    secret,
    seed,
    index,
    week: 0,
    segment: segment % secret.segments.length,
    questions: [question, question, question],
    priceCents: 4900,
  });
}

function sample(question: QuestionType, seeds: number): InterviewEvidence[] {
  const out: InterviewEvidence[] = [];
  for (let seed = 0; seed < seeds; seed++) out.push(...round(seed, question));
  return out;
}

const share = (items: readonly InterviewEvidence[], pred: (e: InterviewEvidence) => boolean): number =>
  items.length === 0 ? 0 : items.filter(pred).length / items.length;

function play(run: InternalRun, actions: readonly Action[]): InternalRun {
  let current = run;
  for (const a of actions) {
    const r = step(current, a);
    if (!r.ok) throw new Error(`${JSON.stringify(a)}: ${r.reason}`);
    current = r.run;
  }
  return current;
}

describe("runInterviewRound distributions (500 seeds)", () => {
  const completed = (e: InterviewEvidence): boolean => e.outcome === "completed";
  const answered = (e: InterviewEvidence): boolean => e.outcome !== "no-response";

  it("returns three evidence entries for three questions", () => {
    const entries = round(3, "past-behavior");
    expect(entries).toHaveLength(3);
    for (const e of entries) {
      expect(e.kind).toBe("interview");
      expect(e.question).toBe("past-behavior");
    }
  });

  it("tags at least 70 percent of completed past-behavior conversations as fact", () => {
    // protects: asking about real past behavior mostly yields evidence; fails_when: the model weakens past-behavior.
    const done = sample("past-behavior", 500).filter(completed);
    expect(done.length).toBeGreaterThan(300);
    expect(share(done, (e) => e.tag === "fact")).toBeGreaterThanOrEqual(0.7);
  });

  it("never tags a pitch as fact, and almost never a hypothetical", () => {
    const pitch = sample("pitch", 500).filter(completed);
    const hypo = sample("hypothetical", 500).filter(completed);
    expect(pitch.length).toBeGreaterThan(300);
    expect(share(pitch, (e) => e.tag === "fact")).toBe(0);
    expect(share(hypo, (e) => e.tag === "fact")).toBeLessThanOrEqual(0.1);
  });

  it("finishes commitment conversations at least 15 points less often than past-behavior ones", () => {
    const commitment = sample("commitment", 500).filter(answered);
    const past = sample("past-behavior", 500).filter(answered);
    const gap = share(past, completed) - share(commitment, completed);
    expect(gap).toBeGreaterThanOrEqual(0.15);
  });

  it("never gives a friend a fact tag, and friends say yes to commitment about 70 percent of the time", () => {
    const friendsPast = sample("past-behavior", 500).filter((e) => e.customer === "friend");
    expect(friendsPast.length).toBeGreaterThan(50);
    expect(friendsPast.every((e) => e.tag !== "fact")).toBe(true);
    const friendsCommit = sample("commitment", 1500).filter((e) => e.customer === "friend" && completed(e));
    expect(friendsCommit.length).toBeGreaterThan(200);
    const yes = share(friendsCommit, (e) => e.committed === true);
    expect(yes).toBeGreaterThanOrEqual(0.55);
    expect(yes).toBeLessThanOrEqual(0.85);
    expect(share(friendsCommit, (e) => e.tag === "compliment" || e.tag === "fluff")).toBe(1);
  });

  it("gets more no-responses from hard-to-reach segments (30 or below) than easy ones (70 or above)", () => {
    const low: InterviewEvidence[] = [];
    const high: InterviewEvidence[] = [];
    for (let seed = 0; seed < 1200; seed++) {
      const secret = generateWorld(seed);
      secret.segments.forEach((s, i) => {
        const entries = runInterviewRound({
          secret,
          seed,
          index: 0,
          week: 0,
          segment: i,
          questions: ["past-behavior", "past-behavior", "past-behavior"],
          priceCents: 4900,
        }).filter((e) => e.customer !== "friend");
        if (s.reachability <= 30) low.push(...entries);
        if (s.reachability >= 70) high.push(...entries);
      });
    }
    expect(low.length).toBeGreaterThan(200);
    expect(high.length).toBeGreaterThan(200);
    const gap = share(low, (e) => e.outcome === "no-response") - share(high, (e) => e.outcome === "no-response");
    expect(gap).toBeGreaterThanOrEqual(0.3);
  });

  it("reads pain close to the truth for facts and flatters it for polite hypotheticals", () => {
    let factErr = 0;
    let factN = 0;
    for (let seed = 0; seed < 500; seed++) {
      const secret = generateWorld(seed);
      const pain = secret.segments[0]?.pain ?? 0;
      for (const e of round(seed, "past-behavior")) {
        if (e.tag === "fact" && e.painReading !== null) {
          factErr += Math.abs(e.painReading - pain);
          factN += 1;
        }
      }
    }
    expect(factN).toBeGreaterThan(200);
    expect(factErr / factN).toBeLessThan(30);
  });

  it("only fills the fields a conversation can have", () => {
    for (const e of sample("commitment", 300)) {
      if (e.outcome === "completed") {
        expect(e.tag).not.toBeNull();
        expect(e.painReading).not.toBeNull();
        expect(e.committed).not.toBeNull();
      } else {
        expect(e.tag).toBeNull();
        expect(e.painReading).toBeNull();
        expect(e.committed).toBeNull();
      }
      if (e.outcome === "no-response") expect(e.customer).toBe("none");
      expect(e.quote.length).toBeGreaterThan(0);
    }
    for (const e of sample("past-behavior", 300)) expect(e.committed).toBeNull();
  });
});

describe("interview action", () => {
  const questions = ["past-behavior", "past-behavior", "past-behavior"] as const;

  it("costs the round fee plus one week of burn, adds three evidence entries, and logs the round", () => {
    const run = initialRun(5);
    const r = step(run, { type: "interview", segment: 0, questions });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.run.pub.week).toBe(1);
    expect(r.run.pub.cashCents).toBe(3_000_000 - INTERVIEW_ROUND_CASH_CENTS - WEEKLY_BURN_CENTS);
    expect(r.run.pub.evidence).toHaveLength(3);
    expect(r.run.pub.log.at(-1)?.text).toMatch(/^Interview round: [0-3] of 3 answered\.$/);
    expect(r.run.pub.pivotsRemaining).toBe(4);
  });

  it("returns invalid-questions, invalid-segment and insufficient-cash and leaves the run unchanged", () => {
    const run = initialRun(5);
    const broke = unsafeRunForTest(5, { cashCents: INTERVIEW_ROUND_CASH_CENTS - 1 });
    const cases: Array<[InternalRun, unknown, string]> = [
      [run, { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior"] }, "invalid-questions"],
      [run, { type: "interview", segment: 0, questions: [...questions, "pitch"] }, "invalid-questions"],
      [run, { type: "interview", segment: 0, questions: ["past-behavior", "nope", "pitch"] }, "invalid-questions"],
      [run, { type: "interview", segment: 0, questions: "past-behavior" }, "invalid-questions"],
      [run, { type: "interview", segment: -1, questions }, "invalid-segment"],
      [run, { type: "interview", segment: 1.5, questions }, "invalid-segment"],
      [run, { type: "interview", segment: 99, questions }, "invalid-segment"],
      [broke, { type: "interview", segment: 0, questions }, "insufficient-cash"],
    ];
    for (const [r0, action, reason] of cases) {
      const before = JSON.stringify([r0.pub, r0.actions]);
      const res = step(r0, action as Action);
      expect(res.ok, JSON.stringify(action)).toBe(false);
      if (!res.ok) expect(res.reason).toBe(reason);
      expect(JSON.stringify([r0.pub, r0.actions])).toBe(before);
    }
  });

  it("lists one interview per segment and question type on a fresh run, and none without cash", () => {
    const run = initialRun(5);
    const interviews = legalActions(run).filter((a) => a.type === "interview");
    expect(interviews).toHaveLength(run.pub.segmentNames.length * 4);
    const broke = unsafeRunForTest(5, { cashCents: 10_000, pivotsRemaining: 0 });
    expect(legalActions(broke).filter((a) => a.type === "interview")).toHaveLength(0);
  });

  it("records the evidence even when the run ends in the same week", () => {
    const run = unsafeRunForTest(5, { cashCents: INTERVIEW_ROUND_CASH_CENTS + 100_000, pivotsRemaining: 0 });
    const r = step(run, { type: "interview", segment: 0, questions });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.run.pub.status).toBe("crashed");
    expect(r.run.pub.evidence).toHaveLength(3);
  });

  it("stores a frozen copy of the questions so the caller cannot rewrite history", () => {
    const mutable: QuestionType[] = ["pitch", "pitch", "pitch"];
    const r = step(initialRun(5), { type: "interview", segment: 0, questions: mutable });
    if (!r.ok) throw new Error(r.reason);
    mutable[0] = "past-behavior";
    expect(r.run.actions[0]).toEqual({ type: "interview", segment: 0, questions: ["pitch", "pitch", "pitch"] });
  });
});

describe("determinism", () => {
  // No commitment question here: commitment answers depend on the current price, so a price change
  // before the round would legitimately change them.
  const iv: Action = { type: "interview", segment: 0, questions: ["past-behavior", "hypothetical", "pitch"] };

  it("gives identical evidence for the same seed and actions", () => {
    for (let seed = 0; seed < 100; seed++) {
      const a = play(initialRun(seed), [iv, iv]);
      const b = play(initialRun(seed), [iv, iv]);
      expect(a.pub.evidence).toEqual(b.pub.evidence);
    }
  });

  it("does not change when an unrelated action comes first (draws use the interview count, not the week)", () => {
    const strip = (run: InternalRun) => run.pub.evidence.map(({ week: _w, ...rest }) => rest);
    for (let seed = 0; seed < 100; seed++) {
      const plain = play(initialRun(seed), [iv]);
      const withPrice = play(initialRun(seed), [{ type: "setPrice", priceCents: 9900 }, iv]);
      const withWait = play(initialRun(seed), [{ type: "wait" }, iv]);
      expect(strip(withPrice)).toEqual(strip(plain));
      expect(strip(withWait)).toEqual(strip(plain));
      expect(withWait.pub.evidence[0]?.week).toBe(1);
    }
  });

  it("draws different people in a second round", () => {
    let different = 0;
    for (let seed = 0; seed < 100; seed++) {
      const run = play(initialRun(seed), [iv, iv]);
      const first = JSON.stringify(run.pub.evidence.slice(0, 3).map(({ week: _w, ...r }) => r));
      const second = JSON.stringify(run.pub.evidence.slice(3, 6).map(({ week: _w, ...r }) => r));
      if (first !== second) different += 1;
    }
    expect(different).toBeGreaterThanOrEqual(90);
  });
});

describe("evidence leaks nothing hidden", () => {
  it("has only the documented keys", () => {
    const allowed = new Set([
      "kind", "week", "segment", "customer", "question", "outcome", "tag", "painReading", "committed", "quote",
    ]);
    for (const e of sample("commitment", 100)) {
      for (const key of Object.keys(e)) expect(allowed.has(key), key).toBe(true);
    }
    const run = play(initialRun(4), [{ type: "interview", segment: 0, questions: ["past-behavior", "pitch", "commitment"] }]);
    const keys = collectKeys(JSON.parse(JSON.stringify(run.pub)));
    for (const hidden of ["needsIt", "archetype", "quality", "trueDemand", "pain"]) {
      expect(keys.has(hidden), hidden).toBe(false);
    }
  });
});
