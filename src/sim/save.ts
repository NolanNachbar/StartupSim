// Save format: { simVersion, seed, actions }. Loading replays every action through the reducer.
// Bump SIM_VERSION whenever outcomes for a fixed (seed, actions) change: constants, formulas,
// draw keys, the hash. Old saves then load as "version-mismatch" instead of silently diverging.
import { isActionShape } from "./actions";
import { step } from "./reducer";
import { initialRun, type InternalRun } from "./state";
import type { Action, LoadError, Save } from "./types";

export const SIM_VERSION = 5;

const MAX_SEED = 0xffffffff;

/** A run cannot legitimately need more actions than this; it bounds how long a load can take. */
export const MAX_SAVE_ACTIONS = 5000;

export function toSave(run: InternalRun): Save {
  return { simVersion: SIM_VERSION, seed: run.seed, actions: run.actions.map((a) => ({ ...a })) };
}

export type LoadResult =
  | { readonly ok: true; readonly run: InternalRun }
  | { readonly ok: false; readonly reason: LoadError; readonly atAction?: number };

type Checked =
  | { readonly ok: true; readonly seed: number; readonly actions: readonly Action[] }
  | { readonly ok: false; readonly reason: LoadError };

/** Read and validate the untrusted input. Hostile objects (throwing getters, Proxy) count as invalid. */
function check(input: unknown): Checked {
  try {
    if (typeof input !== "object" || input === null) return { ok: false, reason: "invalid" };
    const { simVersion, seed, actions } = input as { simVersion?: unknown; seed?: unknown; actions?: unknown };
    if (!Number.isSafeInteger(simVersion)) return { ok: false, reason: "invalid" };
    if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
      return { ok: false, reason: "invalid" };
    }
    if (!Array.isArray(actions) || actions.length > MAX_SAVE_ACTIONS || !actions.every(isActionShape)) {
      return { ok: false, reason: "invalid" };
    }
    if (simVersion !== SIM_VERSION) return { ok: false, reason: "version-mismatch" };
    // Copy so later changes to the caller's objects cannot affect the replay.
    return { ok: true, seed, actions: actions.map((a: Action) => ({ ...a })) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Validate and replay a save. Never throws. */
export function fromSave(input: unknown): LoadResult {
  const checked = check(input);
  if (!checked.ok) return checked;

  let run = initialRun(checked.seed);
  let index = 0;
  for (const action of checked.actions) {
    const result = step(run, action);
    if (!result.ok) return { ok: false, reason: "replay-failed", atAction: index };
    run = result.run;
    index += 1;
  }
  return { ok: true, run };
}
