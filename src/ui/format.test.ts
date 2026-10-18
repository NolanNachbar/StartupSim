import { describe, expect, it } from "vitest";
import { newRun, step, view, type IllegalReason } from "../sim";
import { describeStep, hypothesisLabel, money, questionLabel, reasonText, tagLabel } from "./format";

describe("money", () => {
  it("shows whole dollars with separators and keeps cents only when present", () => {
    expect(money(3_000_000)).toBe("$30,000");
    expect(money(0)).toBe("$0");
    expect(money(1250)).toBe("$12.50");
    expect(money(-45_000)).toBe("-$450");
    expect(money(99_900)).toBe("$999");
  });
});

describe("labels", () => {
  it("names every state and question type in plain words", () => {
    expect(hypothesisLabel("untested")).toBe("Untested");
    expect(hypothesisLabel("weak")).toBe("Weak evidence");
    expect(hypothesisLabel("verified")).toBe("Verified");
    expect(questionLabel("past-behavior")).toMatch(/last time/i);
    expect(tagLabel("fact")).toBe("Fact");
    expect(tagLabel("fluff")).toBe("Fluff");
    expect(tagLabel("compliment")).toBe("Compliment");
  });

  it("has readable text for every illegal reason", () => {
    const reasons: IllegalReason[] = [
      "unknown-action", "run-finished", "not-implemented", "invalid-price", "invalid-segment",
      "invalid-questions", "invalid-build", "invalid-channel", "already-built", "nothing-to-sell",
      "invalid-level", "hire-limit", "no-offer", "investors-want-proof", "insufficient-cash",
      "no-pivots-left", "raise-limit",
    ];
    for (const r of reasons) {
      expect(reasonText(r).length).toBeGreaterThan(8);
      expect(reasonText(r)).not.toContain("-");
    }
  });
});

describe("describeStep", () => {
  it("returns only what the step added", () => {
    const run = newRun(1);
    const before = view(run);
    const res = step(run, { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"] });
    if (!res.ok) throw new Error("step failed");
    const after = view(res.run);
    const d = describeStep(before, after);
    expect(d.evidence.length).toBe(3);
    expect(d.evidence).toEqual(after.evidence.slice(before.evidence.length));
    expect(d.weeksPassed).toBe(after.week - before.week);
    expect(d.cashDeltaCents).toBe(after.cashCents - before.cashCents);
    expect(d.newLog).toEqual(after.log.slice(before.log.length));
  });

  it("reports nothing for an identical state", () => {
    const s = view(newRun(1));
    const d = describeStep(s, s);
    expect(d.evidence).toEqual([]);
    expect(d.newLog).toEqual([]);
    expect(d.weeksPassed).toBe(0);
  });
});
