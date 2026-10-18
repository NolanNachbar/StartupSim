// Deterministic "random" play for tests. Choices come from rand(), so a run is reproducible.
import { legalActions } from "../../../src/sim/actions";
import { step } from "../../../src/sim/reducer";
import { rand } from "../../../src/sim/rng";
import { initialRun, type InternalRun } from "../../../src/sim/state";
import type { Action } from "../../../src/sim/types";

/** Pick a legal action. Never two setPrice in a row, so time always advances. */
export function chooseAction(
  run: InternalRun,
  seed: number,
  stepIndex: number,
  previous: Action | null,
): Action {
  let legal = legalActions(run);
  if (previous?.type === "setPrice") {
    const timed = legal.filter((a) => a.type !== "setPrice");
    if (timed.length > 0) legal = timed;
  }
  const pick = legal[Math.floor(rand(seed, "fuzz", stepIndex) * legal.length)];
  if (!pick) throw new Error("chooseAction called on a run with no legal action");
  return pick;
}

/** Play from a fresh run until it ends or maxSteps actions were taken. */
export function playFuzz(seed: number, maxSteps = 300): { run: InternalRun; steps: number } {
  let run = initialRun(seed);
  let previous: Action | null = null;
  let steps = 0;
  while (run.pub.status === "running" && steps < maxSteps) {
    const action = chooseAction(run, seed, steps, previous);
    const result = step(run, action);
    if (!result.ok) throw new Error(`legal action rejected: ${JSON.stringify(action)} (${result.reason})`);
    run = result.run;
    previous = action;
    steps += 1;
  }
  return { run, steps };
}

/** Collect every object key in a JSON-like value. */
export function collectKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      collectKeys(v, out);
    }
  }
  return out;
}
