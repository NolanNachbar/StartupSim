// Save format: { simVersion, seed, actions }. Loading replays every action through the reducer.
// Bump SIM_VERSION whenever outcomes for a fixed (seed, actions) change: constants, formulas,
// draw keys, the hash. Old saves then load as "version-mismatch" instead of silently diverging.
import { isActionShape } from "./actions";
import { step } from "./reducer";
import { initialRun, type InternalRun } from "./state";
import { COMBOS, DIFFICULTIES, DIFFICULTY_DEFAULT, MAX_IDEA, MODELS, cleanCustom, cleanIdea, cleanStartCash, type BusinessChoice, type Custom } from "./business";
import { INDUSTRIES } from "./world";
import type { Action, LoadError, Save } from "./types";

export const SIM_VERSION = 6;

const MAX_SEED = 0xffffffff;

/** A run cannot legitimately need more actions than this; it bounds how long a load can take. */
export const MAX_SAVE_ACTIONS = 5000;

export function toSave(run: InternalRun): Save {
  const base = { simVersion: SIM_VERSION, seed: run.seed, actions: run.actions.map((a) => ({ ...a })) };
  if (run.industry === null) return base;
  if (run.business === null) return { ...base, industry: run.industry };
  return { ...base, industry: run.industry, model: run.business.model, idea: run.business.idea, ...(run.business.custom ? { custom: run.business.custom } : {}), ...(run.business.difficulty !== undefined && run.business.difficulty !== DIFFICULTY_DEFAULT ? { difficulty: run.business.difficulty } : {}), ...(run.business.startCashCents !== undefined ? { startCash: run.business.startCashCents } : {}) };
}

export type LoadResult =
  | { readonly ok: true; readonly run: InternalRun }
  | { readonly ok: false; readonly reason: LoadError; readonly atAction?: number };

type Checked =
  | { readonly ok: true; readonly seed: number; readonly industry: number | null; readonly business: BusinessChoice | null; readonly actions: readonly Action[] }
  | { readonly ok: false; readonly reason: LoadError };

/** Read and validate the untrusted input. Hostile objects (throwing getters, Proxy) count as invalid. */
function check(input: unknown): Checked {
  try {
    if (typeof input !== "object" || input === null) return { ok: false, reason: "invalid" };
    const { simVersion, seed, actions, industry, model, idea, custom, difficulty, startCash } = input as { simVersion?: unknown; seed?: unknown; actions?: unknown; industry?: unknown; model?: unknown; idea?: unknown; custom?: unknown; difficulty?: unknown; startCash?: unknown };
    if (!Number.isSafeInteger(simVersion)) return { ok: false, reason: "invalid" };
    if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
      return { ok: false, reason: "invalid" };
    }
    if (!Array.isArray(actions) || actions.length > MAX_SAVE_ACTIONS || !actions.every(isActionShape)) {
      return { ok: false, reason: "invalid" };
    }
    if (industry !== undefined && (typeof industry !== "number" || !Number.isInteger(industry) || industry < 0 || industry >= INDUSTRIES.length)) {
      return { ok: false, reason: "invalid" };
    }
    let business: BusinessChoice | null = null;
    if (model !== undefined || idea !== undefined) {
      const cleaned = typeof idea === "string" && idea.length <= MAX_IDEA ? cleanIdea(idea) : null;
      if (typeof industry !== "number" || typeof model !== "number" || !Number.isInteger(model) || model < 0 || model >= MODELS.length || !COMBOS[industry]?.[model] || cleaned === null) {
        return { ok: false, reason: "invalid" };
      }
      const own = custom === undefined ? undefined : typeof custom === "object" && custom !== null ? cleanCustom(custom as Custom) : null;
      if (own === null) return { ok: false, reason: "invalid" };
      if (difficulty !== undefined && (typeof difficulty !== "number" || !Number.isInteger(difficulty) || difficulty < 0 || difficulty >= DIFFICULTIES.length)) return { ok: false, reason: "invalid" };
      const cash = startCash === undefined ? undefined : cleanStartCash(startCash);
      if (startCash !== undefined && cash === undefined) return { ok: false, reason: "invalid" };
      business = { model, idea: cleaned, ...(own ? { custom: own } : {}), ...(difficulty !== undefined ? { difficulty: difficulty as number } : {}), ...(cash !== undefined ? { startCashCents: cash } : {}) };
    }
    if (simVersion !== SIM_VERSION) return { ok: false, reason: "version-mismatch" };
    // Copy so later changes to the caller's objects cannot affect the replay.
    return { ok: true, seed, industry: typeof industry === "number" ? industry : null, business, actions: actions.map((a: Action) => ({ ...a })) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Validate and replay a save. Never throws. */
export function fromSave(input: unknown): LoadResult {
  const checked = check(input);
  if (!checked.ok) return checked;

  let run = initialRun(checked.seed, checked.industry, checked.business);
  let index = 0;
  for (const action of checked.actions) {
    const result = step(run, action);
    if (!result.ok) return { ok: false, reason: "replay-failed", atAction: index };
    run = result.run;
    index += 1;
  }
  return { ok: true, run };
}
