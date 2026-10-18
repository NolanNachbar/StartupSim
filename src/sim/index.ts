// Public API of the simulation. src/ui may import only from here (enforced by ESLint).
// `Run` is opaque: it carries the hidden world, but the type gives the UI no way to read it.
import { legalActions as legalActionsInternal } from "./actions";
import { step as stepInternal } from "./reducer";
import { fromSave as fromSaveInternal, SIM_VERSION, toSave as toSaveInternal } from "./save";
import { initialRun, type InternalRun } from "./state";
import { PRICE_LADDER_CENTS, QUESTION_TYPES } from "./actions";
import {
  BUDGET_LEVELS_CENTS,
  BUILD_TABLE,
  CHANNEL_TEST_BUDGET_CENTS,
  HIRE_WEEKLY_CENTS,
  INTERVIEW_ROUND_CASH_CENTS,
  LANDING_STREAK_WEEKS,
  MAX_HIRES,
  MAX_RAISES,
  MAX_WEEKS,
  RAISE_AMOUNT_CENTS,
  RAISE_EQUITY_PCTS,
  ROUND_WEEKS,
} from "./runway";
import type { Action, IllegalReason, LoadError, PublicState, Report, Save } from "./types";
import { buildHistory, buildReport } from "./report";
import { view as viewInternal } from "./view";
import { INDUSTRIES } from "./world";

declare const runBrand: unique symbol;
export type Run = { readonly [runBrand]: true };

export type {
  Action,
  BuildKind,
  Cause,
  ChannelInfo,
  DebriefTag,
  Evidence,
  Hypothesis,
  HypothesisState,
  IllegalReason,
  InterviewEvidence,
  LoadError,
  Loan,
  LoanOffer,
  LogEntry,
  PaidTestEvidence,
  PublicState,
  QuestionType,
  Receivable,
  Report,
  Save,
  ChannelTestEvidence,
} from "./types";
export type StepResult = { ok: true; run: Run } | { ok: false; reason: IllegalReason };
export type LoadResult = { ok: true; run: Run } | { ok: false; reason: LoadError; atAction?: number };

export { SIM_VERSION };

/** The public price list and limits: what things cost and how long they take. No hidden information. */
export const CATALOG = {
  priceLadderCents: PRICE_LADDER_CENTS,
  questionTypes: QUESTION_TYPES,
  builds: BUILD_TABLE,
  interviewCashCents: INTERVIEW_ROUND_CASH_CENTS,
  channelTestBudgetCents: CHANNEL_TEST_BUDGET_CENTS,
  budgetLevelsCents: BUDGET_LEVELS_CENTS,
  hireWeeklyCents: HIRE_WEEKLY_CENTS,
  maxHires: MAX_HIRES,
  maxRaises: MAX_RAISES,
  raiseAmountCents: RAISE_AMOUNT_CENTS,
  landingStreakWeeks: LANDING_STREAK_WEEKS,
  maxWeeks: MAX_WEEKS,
  roundWeeks: ROUND_WEEKS,
  raiseEquityPcts: RAISE_EQUITY_PCTS,
} as const;

const inside = (run: Run): InternalRun => run as unknown as InternalRun;
const outside = (run: InternalRun): Run => run as unknown as Run;

/** The markets a company can start in: public descriptions only. The numbers behind them stay hidden. */
export const INDUSTRY_LIST: readonly { readonly name: string; readonly blurb: string }[] = INDUSTRIES.map((i) => ({ name: i.name, blurb: i.blurb }));

/**
 * Start a run. The seed must be an integer in [0, 0xFFFFFFFF], otherwise RangeError. `industry` is an index into
 * INDUSTRY_LIST; leave it out for the original generic world.
 */
export function newRun(seed: number, industry?: number): Run {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError(`seed must be an integer in [0, 0xFFFFFFFF], got ${String(seed)}`);
  }
  if (industry !== undefined && (!Number.isInteger(industry) || industry < 0 || industry >= INDUSTRIES.length)) {
    throw new RangeError(`industry must be an integer in [0, ${INDUSTRIES.length - 1}], got ${String(industry)}`);
  }
  return outside(initialRun(seed, industry ?? null));
}

export function legalActions(run: Run): readonly Action[] {
  return legalActionsInternal(inside(run));
}

export function step(run: Run, action: Action): StepResult {
  const result = stepInternal(inside(run), action);
  return result.ok ? { ok: true, run: outside(result.run) } : { ok: false, reason: result.reason };
}

export function view(run: Run): PublicState {
  return viewInternal(inside(run));
}

export function toSave(run: Run): Save {
  return toSaveInternal(inside(run));
}

export function fromSave(input: unknown): LoadResult {
  const result = fromSaveInternal(input);
  if (!result.ok) {
    return result.atAction === undefined
      ? { ok: false, reason: result.reason }
      : { ok: false, reason: result.reason, atAction: result.atAction };
  }
  return { ok: true, run: outside(result.run) };
}

/** The accident report for a finished run, or null while the run is still going. */
export function report(run: Run): Report | null {
  const internal = inside(run);
  if (internal.pub.status === "running") return null;
  return buildReport(buildHistory(internal.seed, internal.actions, internal.industry));
}
