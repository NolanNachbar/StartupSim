// A scripted "good founder" used by tests to show the game can be won and to produce a golden run.
// It follows the lean-startup loop: raise runway, interview every segment about past behavior,
// pivot to the segment with the best evidence, test a channel, charge, build, then wait.
import { step } from "../../../src/sim/reducer";
import { initialRun, type InternalRun } from "../../../src/sim/state";
import type { Action, Evidence } from "../../../src/sim/types";

/** The segment whose completed past-behavior facts show the highest mean pain reading; null without any. */
export function bestSegmentByEvidence(evidence: readonly Evidence[], segments: number): number | null {
  const sums = new Array<number>(segments).fill(0);
  const counts = new Array<number>(segments).fill(0);
  for (const e of evidence) {
    if (e.kind === "interview" && e.outcome === "completed" && e.tag === "fact" && e.painReading !== null) {
      sums[e.segment] = (sums[e.segment] ?? 0) + e.painReading;
      counts[e.segment] = (counts[e.segment] ?? 0) + 1;
    }
  }
  let best: number | null = null;
  let bestMean = -1;
  for (let s = 0; s < segments; s++) {
    const c = counts[s] ?? 0;
    if (c === 0) continue;
    const mean = (sums[s] ?? 0) / c;
    if (mean > bestMean) {
      bestMean = mean;
      best = s;
    }
  }
  return best;
}

export interface ValidatorOptions {
  readonly price?: number;
  readonly marketingLevel?: number;
  readonly maxWeeks?: number;
}

export function playValidator(seed: number, options: ValidatorOptions = {}): { run: InternalRun; actions: Action[] } {
  const maxWeeks = options.maxWeeks ?? 110;
  let run = initialRun(seed);
  const actions: Action[] = [];
  const act = (a: Action): boolean => {
    if (run.pub.status !== "running") return false;
    const r = step(run, a);
    if (!r.ok) return false;
    run = r.run;
    actions.push(a);
    return true;
  };

  if (options.price !== undefined) act({ type: "setPrice", priceCents: options.price });
  act({ type: "raiseMoney" });
  const n = run.pub.segmentNames.length;
  for (let s = 0; s < n; s++) {
    act({ type: "interview", segment: s, questions: ["past-behavior", "past-behavior", "past-behavior"] });
  }
  const best = bestSegmentByEvidence(run.pub.evidence, n) ?? run.pub.focusSegment;
  if (best !== run.pub.focusSegment) act({ type: "pivot", toSegment: best });

  act({ type: "buildTest", kind: "landing-page" });
  let bestChannel = 0;
  let bestInterested = -1;
  for (let c = 0; c < run.pub.channels.length; c++) {
    if (!act({ type: "pickChannel", segment: best, channel: c })) continue;
    const e = run.pub.evidence[run.pub.evidence.length - 1];
    if (e && e.kind === "channel-test" && e.interested > bestInterested) {
      bestInterested = e.interested;
      bestChannel = c;
    }
  }
  act({ type: "chargeTest", segment: best, channel: bestChannel });
  act({ type: "setMarketing", channel: bestChannel, level: options.marketingLevel ?? 2 });

  while (run.pub.status === "running" && run.pub.productProgressPct < 100) {
    const kind = run.pub.productProgressPct <= 60 ? "prototype" : "concierge";
    if (!act({ type: "buildTest", kind })) break;
  }
  while (run.pub.status === "running" && run.pub.week < maxWeeks) {
    if (!act({ type: "wait" })) break;
  }
  return { run, actions };
}
