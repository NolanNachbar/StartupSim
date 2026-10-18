import { describe, expect, it } from "vitest";
import { CATALOG, newRun, step, view, type Action, type PublicState, type Run } from "../sim";
import { pathProgress } from "./guide";

const play = (run: Run, ...actions: Action[]): Run => {
  let r = run;
  for (const a of actions) {
    const res = step(r, a);
    if (!res.ok) throw new Error(`${a.type}: ${res.reason}`);
    r = res.run;
  }
  return r;
};
const interviewAll = (run: Run): Run => {
  let r = run;
  const s = view(r);
  for (let seg = 0; seg < s.segmentNames.length; seg++) r = play(r, { type: "interview", segment: seg, questions: ["past-behavior", "past-behavior", "past-behavior"] });
  return r;
};
const fresh = (): PublicState => view(newRun(3));

describe("the path", () => {
  it("has five steps with the first one current at the start", () => {
    const p = pathProgress(fresh());
    expect(p.steps.map((s) => s.id)).toEqual(["talk", "build", "sell", "earn", "land"]);
    expect(p.steps.filter((s) => s.current).length).toBe(1);
    expect(p.steps[0]?.current).toBe(true);
    expect(p.fraction).toBe(0);
  });

  it("moves forward as milestones are hit, never backward", () => {
    let run = newRun(3);
    let last = pathProgress(view(run)).fraction;
    run = interviewAll(run);
    const afterTalk = pathProgress(view(run));
    expect(afterTalk.steps[0]?.done).toBe(true);
    expect(afterTalk.fraction).toBeGreaterThan(last);
    last = afterTalk.fraction;
    run = play(run, { type: "buildTest", kind: "landing-page" });
    const afterBuild = pathProgress(view(run));
    expect(afterBuild.steps[1]?.done).toBe(true);
    expect(afterBuild.fraction).toBeGreaterThan(last);
  });

  it("is complete when the run has landed", () => {
    const landed = { ...fresh(), status: "landed" as const };
    const p = pathProgress(landed);
    expect(p.fraction).toBe(1);
    expect(p.steps.every((s) => s.done)).toBe(true);
  });

  it("counts the profit streak toward the last step", () => {
    const base = { ...fresh(), firstPaymentWeek: 5, landingPageBuilt: true };
    const half = pathProgress({ ...base, profitableStreakWeeks: CATALOG.landingStreakWeeks / 2 });
    const none = pathProgress({ ...base, profitableStreakWeeks: 0 });
    expect(half.fraction).toBeGreaterThan(none.fraction);
  });
});
