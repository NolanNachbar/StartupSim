// Public API of the simulation. src/ui may import only from here (enforced by ESLint).
import { COMBOS, DIFFICULTIES, MAX_IDEA, MAX_START_CASH_CENTS, MIN_START_CASH_CENTS, MODELS, cleanCustom, cleanDifficulty, cleanIdea, cleanStartCash, describeModel, matchPack, type Business, type BusinessChoice, type Combo, type Custom, type Difficulty, type ModelInfo } from "./business";
// `Run` is opaque: it carries the hidden world, but the type gives the UI no way to read it.
import { legalActions as legalActionsInternal } from "./actions";
import { step as stepInternal } from "./reducer";
import { fromSave as fromSaveInternal, SIM_VERSION, toSave as toSaveInternal } from "./save";
import { initialRun, type InternalRun } from "./state";
import { PRICE_LADDER_CENTS, QUESTION_BANK, QUESTION_TYPES } from "./actions";
import { PROMOTION_COOLDOWN_WEEKS, PROMOTIONS_BY_MODEL } from "./promotions";
import { BUILDER_PROGRESS_PCT, MAX_TEAM, NETWORK_KINDS, NETWORK_OPTIONS, RND_GAIN, RND_LEVELS_CENTS, ROLES, ROLE_CAP, SELLER_OUTREACH_LEADS } from "./realism";
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
import { statementsOf, type Line, type Statements } from "./statements";
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
export type { Line, Statements };
export type StepResult = { ok: true; run: Run } | { ok: false; reason: IllegalReason };
export type LoadResult = { ok: true; run: Run } | { ok: false; reason: LoadError; atAction?: number };

export { SIM_VERSION };

/** The public price list and limits: what things cost and how long they take. No hidden information. */
export const CATALOG = {
  priceLadderCents: PRICE_LADDER_CENTS,
  questionTypes: QUESTION_TYPES,
  /** The questions a founder can ask: a topic, and the kind of question it is. */
  questionBank: QUESTION_BANK,
  /** The team roles, how many of each, and how many in all. */
  roles: ROLES,
  roleCap: ROLE_CAP,
  promotions: PROMOTIONS_BY_MODEL,
  promotionCooldownWeeks: PROMOTION_COOLDOWN_WEEKS,
  networkKinds: NETWORK_KINDS,
  networkOptions: NETWORK_OPTIONS,
  maxTeam: MAX_TEAM,
  builderProgressPct: BUILDER_PROGRESS_PCT,
  sellerOutreachLeads: SELLER_OUTREACH_LEADS,
  rndLevelsCents: RND_LEVELS_CENTS,
  rndGain: RND_GAIN,
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

/** What is specific to each industry and business model (by industry index, then model index): customers and their words. */
export const BUSINESS_LIST: readonly (readonly Combo[])[] = COMBOS;
export const BUSINESS_MODELS: readonly ModelInfo[] = MODELS;
export const MAX_IDEA_LENGTH = MAX_IDEA;
export const DIFFICULTY_LIST: readonly Difficulty[] = DIFFICULTIES;
export const START_CASH_RANGE = { minCents: MIN_START_CASH_CENTS, maxCents: MAX_START_CASH_CENTS, stepCents: 50_000 } as const;
export { cleanCustom, cleanDifficulty, cleanIdea, cleanStartCash, describeModel, matchPack };
export type { Business, BusinessChoice, Combo, Custom, Difficulty, ModelInfo };

/** The markets a company can start in: public descriptions only. The numbers behind them stay hidden. */
export const INDUSTRY_LIST: readonly { readonly name: string; readonly blurb: string }[] = INDUSTRIES.map((i) => ({ name: i.name, blurb: i.blurb }));

/**
 * Start a run. The seed must be an integer in [0, 0xFFFFFFFF], otherwise RangeError. `industry` is an index into
 * INDUSTRY_LIST; leave it out for the original generic world.
 */
export function newRun(seed: number, industry?: number, business?: BusinessChoice): Run {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError(`seed must be an integer in [0, 0xFFFFFFFF], got ${String(seed)}`);
  }
  if (industry !== undefined && (!Number.isInteger(industry) || industry < 0 || industry >= INDUSTRIES.length)) {
    throw new RangeError(`industry must be an integer in [0, ${INDUSTRIES.length - 1}], got ${String(industry)}`);
  }
  if (business !== undefined && (industry === undefined || !Number.isInteger(business.model) || !COMBOS[industry]?.[business.model] || cleanIdea(business.idea) === null)) {
    throw new RangeError("business needs an industry, a model index and an idea of at least three characters");
  }
  const custom = business ? cleanCustom(business.custom) : undefined;
  const difficulty = business?.difficulty === undefined ? undefined : cleanDifficulty(business.difficulty);
  const startCash = business?.startCashCents === undefined ? undefined : cleanStartCash(business.startCashCents);
  return outside(initialRun(seed, industry ?? null, business ? { model: business.model, idea: cleanIdea(business.idea) as string, ...(custom ? { custom } : {}), ...(difficulty !== undefined ? { difficulty } : {}), ...(startCash !== undefined ? { startCashCents: startCash } : {}) } : null));
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
  return buildReport(buildHistory(internal.seed, internal.actions, internal.industry, internal.business));
}

/** The income statement, cash flow statement and balance sheet for the run so far. */
export function statements(run: Run): Statements {
  return statementsOf(inside(run).pub);
}
