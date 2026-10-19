// Strategy bots for balance testing. Each plays a whole run with a fixed policy.
// They use the internal reducer directly; the UI never sees them.
import { step } from "../../../src/sim/reducer";
import { buildHistory, buildReport } from "../../../src/sim/report";
import { initialRun, type InternalRun } from "../../../src/sim/state";
import type { Action, QuestionType, Report } from "../../../src/sim/types";
import { playFuzz } from "./fuzz";
import { playValidator } from "./validator";

export type BotName = "builder" | "pitcher" | "validator" | "underpricer" | "random";
export const BOTS: readonly BotName[] = ["builder", "pitcher", "validator", "underpricer", "random"];

export interface BotRun {
  readonly run: InternalRun;
}

function play(seed: number, script: (act: (a: Action) => boolean, run: () => InternalRun) => void, industry: number | null = null): BotRun {
  let run = initialRun(seed, industry);
  const actions: Action[] = [];
  const act = (a: Action): boolean => {
    if (run.pub.status !== "running") return false;
    const r = step(run, a);
    if (!r.ok) return false;
    run = r.run;
    actions.push(a);
    return true;
  };
  script(act, () => run);
  while (run.pub.status === "running" && run.pub.week < 110) if (!act({ type: "wait" })) break;
  return { run };
}

/** Builds for weeks before talking to anyone, then waits for customers who never come. */
function builder(seed: number, industry: number | null): BotRun {
  return play(seed, (act, run) => {
    while (run().pub.status === "running" && run().pub.productProgressPct < 100) {
      const kind = run().pub.productProgressPct <= 60 ? "prototype" : "concierge";
      if (!act({ type: "buildTest", kind })) break;
    }
    act({ type: "setMarketing", channel: 0, level: 2 });
  }, industry);
}

/** Asks only pitch and hypothetical questions, takes the compliments as proof, then builds. */
function pitcher(seed: number, industry: number | null): BotRun {
  const qs: QuestionType[] = ["pitch", "hypothetical", "pitch"];
  return play(seed, (act, run) => {
    for (let s = 0; s < run().pub.segmentNames.length; s++) act({ type: "interview", segment: s, questions: qs });
    while (run().pub.status === "running" && run().pub.productProgressPct < 100) {
      if (!act({ type: "buildTest", kind: "prototype" }) && !act({ type: "buildTest", kind: "concierge" })) break;
    }
    act({ type: "setMarketing", channel: 0, level: 2 });
  }, industry);
}

export function playBot(bot: BotName, seed: number, industry: number | null = null): BotRun {
  switch (bot) {
    case "builder": return builder(seed, industry);
    case "pitcher": return pitcher(seed, industry);
    case "validator": return playValidator(seed, industry === null ? {} : { industry });
    case "underpricer": return playValidator(seed, industry === null ? { price: 900 } : { price: 900, industry });
    case "random": return playFuzz(seed, 300);
  }
}

export interface BotStats {
  readonly bot: BotName;
  readonly runs: number;
  readonly landed: number;
  readonly crashed: number;
  readonly stalled: number;
  readonly causes: Readonly<Record<string, number>>;
}

export function tally(bot: BotName, seeds: readonly number[], industry: number | null = null): BotStats {
  let landed = 0, crashed = 0, stalled = 0;
  const causes: Record<string, number> = {};
  for (const seed of seeds) {
    const { run } = playBot(bot, seed, industry);
    const rep: Report = buildReport(buildHistory(seed, run.actions, industry));
    if (run.pub.status === "landed") landed++;
    else if (run.pub.endReason === "stalled") stalled++;
    else crashed++;
    const id = rep.probableCause?.id ?? (rep.outcome === "landed" ? "landed" : "none");
    causes[id] = (causes[id] ?? 0) + 1;
  }
  return { bot, runs: seeds.length, landed, crashed, stalled, causes };
}

export const SEEDS_200: readonly number[] = Array.from({ length: 200 }, (_, i) => 1000 + i);
export const SEEDS_20: readonly number[] = SEEDS_200.slice(0, 20);
