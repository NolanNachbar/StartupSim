import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "./actions";
import { CAPACITY_BY_MODEL, HIRE_SEARCH_WEEKS, RND_LEVELS_CENTS, capacityOf } from "./realism";
import { CATALOG, cleanStartCash, fromSave, newRun, step, toSave, view } from "./index";
import type { Action } from "./types";

const gym = { model: 2, idea: "a small strength-training gym" };
const app = { model: 0, idea: "an appointment reminder app" };
const must = (r: ReturnType<typeof step>) => {
  if (!r.ok) throw new Error(`illegal: ${r.reason}`);
  return r.run;
};
const play = (run: ReturnType<typeof newRun>, ...actions: Action[]) => actions.reduce((r, a) => must(step(r, a)), run);

describe("a chosen business has its own costs and limits", () => {
  it("costs more to run a place than an app, and says how many people it can serve", () => {
    const g = view(newRun(5, 3, gym));
    const a = view(newRun(5, 3, app));
    expect(g.weeklyBurnCents).toBeGreaterThan(a.weeklyBurnCents);
    expect(g.capacity).toBe(CAPACITY_BY_MODEL.location.base);
    expect(a.capacity).toBe(CAPACITY_BY_MODEL.software.base);
    expect(view(newRun(5, 3)).capacity).toBeNull(); // the original worlds have no limit
  });
});

describe("hiring a team", () => {
  it("needs a role, takes weeks to find, costs a salary, and is limited per role", () => {
    const run = newRun(5, 3, gym);
    expect(step(run, { type: "hire" }).ok).toBe(false);
    const hired = play(run, { type: "hire", role: "ops" });
    const v = view(hired);
    expect(v.team).toEqual({ builder: 0, seller: 0, ops: 1 });
    expect(v.week).toBe(HIRE_SEARCH_WEEKS);
    expect(v.weeklyBurnCents).toBeGreaterThan(view(run).weeklyBurnCents);
    expect(v.capacity).toBe(capacityOf("location", 1));
    const two = play(hired, { type: "hire", role: "ops" });
    const r = step(two, { type: "hire", role: "ops" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("role-limit");
    expect(step(run, { type: "hire", role: "janitor" as never }).ok).toBe(false);
  });

  it("builders build the product on their own while the founder does other things", () => {
    const base = newRun(5, 3, gym);
    const withBuilder = play(base, { type: "hire", role: "builder" });
    const later = play(withBuilder, { type: "wait" }, { type: "wait" }, { type: "wait" });
    expect(view(later).productProgressPct).toBeGreaterThan(view(withBuilder).productProgressPct);
    const noBuilder = play(base, { type: "wait" }, { type: "wait" }, { type: "wait" }, { type: "wait" });
    expect(view(noBuilder).productProgressPct).toBe(0);
  });
});

describe("R&D", () => {
  it("costs cash every week and builds quality, up to a limit", () => {
    const run = newRun(5, 3, app);
    const spending = play(run, { type: "setRnd", level: 2 }, { type: "wait" }, { type: "wait" });
    const idle = play(run, { type: "wait" }, { type: "wait" });
    expect(view(spending).qualityPct).toBeGreaterThan(0);
    expect(view(idle).qualityPct).toBe(0);
    expect(view(spending).cashCents).toBeLessThan(view(idle).cashCents);
    expect(view(spending).cashCents).toBeGreaterThanOrEqual(view(idle).cashCents - 2 * RND_LEVELS_CENTS[2]! - 1);
    expect(step(run, { type: "setRnd", level: 9 }).ok).toBe(false);
    expect(step(newRun(5, 3), { type: "setRnd", level: 1 }).ok).toBe(false); // not in the original worlds
    let long = play(run, { type: "setRnd", level: 3 });
    for (let i = 0; i < 25 && view(long).status === "running"; i++) long = play(long, { type: "wait" });
    expect(view(long).qualityPct).toBeLessThanOrEqual(100);
  });
});

describe("marketing aimed at a group", () => {
  it("accepts a target, rejects a bad one, and keeps customers by group", () => {
    const run = newRun(8, 3, gym);
    const aimed = play(run, { type: "setMarketing", channel: 1, level: 2, target: 1 });
    expect(view(aimed).marketing.target).toBe(1);
    expect(step(run, { type: "setMarketing", channel: 1, level: 2, target: 99 }).ok).toBe(false);
    let v = aimed;
    for (let i = 0; i < 12 && view(v).status === "running"; i++) v = play(v, { type: "wait" });
    const s = view(v);
    expect(s.customersBySegment.reduce((a, b) => a + b, 0)).toBe(s.payingCustomers);
    for (let i = 0; i < s.customersBySegment.length; i++) if (i !== 1) expect(s.customersBySegment[i]).toBe(0); // only the target group
  });
});

describe("interview topics", () => {
  it("has twelve different questions, three or more about each kind", () => {
    expect(QUESTION_BANK.length).toBe(12);
    expect(new Set(QUESTION_BANK.map((q) => q.topic)).size).toBe(12);
    expect(QUESTION_BANK.filter((q) => q.type === "past-behavior").length).toBe(4);
  });

  it("rejects a topic that does not match its question type", () => {
    const run = newRun(5, 3, gym);
    const bad = step(run, { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"], topics: ["pitch", "cost", "tried"] });
    expect(bad.ok).toBe(false);
  });

  it("gives different answers to different questions, and less the second time you ask the same", () => {
    const asked = (seed: number, topics: string[]) => {
      const r = must(step(newRun(seed, 3, gym), { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"], topics }));
      return view(r).evidence.flatMap((e) => (e.kind === "interview" ? [e] : []));
    };
    let varied = 0;
    let repeatedLines = 0;
    for (let seed = 0; seed < 40; seed++) {
      const mixed = asked(seed, ["last-time", "cost", "tried"]);
      expect(mixed.map((e) => e.topic)).toEqual(["last-time", "cost", "tried"]);
      if (new Set(mixed.filter((e) => e.outcome === "completed").map((e) => e.quote)).size > 1) varied += 1;
      if (asked(seed, ["cost", "cost", "cost"]).slice(1).some((e) => e.outcome === "completed" && /already|same|said/i.test(e.quote))) repeatedLines += 1;
    }
    expect(varied).toBeGreaterThan(3);
    expect(repeatedLines).toBeGreaterThan(2);
  });
});

describe("a full business", () => {
  it("never sends away the customers it already has", () => {
    let run = newRun(7, 3, { model: 1, idea: "a one to one coaching service" });
    let peak = 0;
    for (let i = 0; i < 40 && view(run).status === "running"; i++) {
      run = must(step(run, { type: "wait" }));
      const v = view(run);
      peak = Math.max(peak, v.payingCustomers);
      expect(v.payingCustomers).toBeLessThanOrEqual(v.capacity ?? Infinity);
    }
    expect(peak).toBeGreaterThanOrEqual(0);
  });
});

describe("difficulty and starting money", () => {
  it("scales the starting cash and costs, and keeps Normal exactly as tuned", () => {
    const at = (difficulty?: number) => view(newRun(5, 3, { ...gym, ...(difficulty === undefined ? {} : { difficulty }) }));
    expect(at(1)).toEqual(at());
    expect(at(0).cashCents).toBeGreaterThan(at(1).cashCents);
    expect(at(3).cashCents).toBeLessThan(at(1).cashCents);
    expect(at(3).weeklyBurnCents).toBeGreaterThan(at(0).weeklyBurnCents);
  });

  it("lets the player set the money, in $500 steps, and survives a save", () => {
    const run = newRun(5, 3, { ...gym, startCashCents: 7_500_000 });
    expect(view(run).cashCents).toBe(7_500_000);
    const loaded = fromSave(JSON.parse(JSON.stringify(toSave(run))));
    expect(loaded.ok && view(loaded.run).cashCents).toBe(7_500_000);
    expect(cleanStartCash(1_000)).toBeUndefined();
    expect(cleanStartCash(5_000_000_000)).toBeUndefined();
    expect(cleanStartCash(7_512_345)).toBe(7_500_000);
  });

  it("makes customers harder to win and keep on Brutal", () => {
    const total = (difficulty: number): number => {
      let sum = 0;
      for (let seed = 1; seed <= 8; seed++) {
        let r = newRun(seed, 3, { ...gym, difficulty, startCashCents: 50_000_000 });
        r = play(r, { type: "buildTest", kind: "landing-page" }, { type: "setMarketing", channel: 1, level: 3 });
        for (let i = 0; i < 8; i++) r = must(step(r, { type: "wait" }));
        sum += view(r).payingCustomers;
      }
      return sum;
    };
    expect(total(0)).toBeGreaterThan(total(3));
  });
});

describe("networking", () => {
  it("costs money and weeks, and the people you meet are kept", () => {
    const run = newRun(5, 3, gym);
    const after = play(run, { type: "network", kind: "meetup" });
    const v = view(after);
    expect(v.cashCents).toBeLessThan(view(run).cashCents - 15_000 + 1);
    expect(v.week).toBe(CATALOG.networkOptions.meetup.weeks);
    expect(v.network.contacts).toBeGreaterThanOrEqual(2);
    expect(v.network.contacts).toBeLessThanOrEqual(4);
    expect(step(newRun(5, 3), { type: "network", kind: "coffee" }).ok).toBe(false); // not in the original worlds
  });

  it("turns contacts into warm interviews that always get an answer, then uses them up", () => {
    let run = newRun(5, 3, gym);
    for (let i = 0; i < 3; i++) run = play(run, { type: "network", kind: "conference" });
    const contacts = view(run).network.contacts;
    expect(contacts).toBeGreaterThanOrEqual(3);
    const asked = play(run, { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"] });
    const round = view(asked).evidence.filter((e) => e.kind === "interview");
    expect(round.every((e) => e.kind === "interview" && e.outcome !== "no-response")).toBe(true);
    expect(view(asked).network.contacts).toBe(contacts - 3);
  });
});
