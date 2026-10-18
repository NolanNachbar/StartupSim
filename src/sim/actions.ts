import {
  BUDGET_LEVELS_CENTS,
  BUILD_TABLE,
  CHANNEL_TEST_BUDGET_CENTS,
  HIRE_WEEKLY_CENTS,
  INTERVIEW_ROUND_CASH_CENTS,
  MAX_HIRES,
  MAX_RAISES,
} from "./runway";
import type { InternalRun } from "./state";
import type { Action, BuildKind, QuestionType, ReservedActionType } from "./types";

/** Monthly prices the player can choose, in cents. */
export const PRICE_LADDER_CENTS: readonly number[] = [900, 1900, 4900, 9900, 19900, 49900, 99900];

export const QUESTION_TYPES: readonly QuestionType[] = ["past-behavior", "commitment", "hypothetical", "pitch"];

/** Exactly three known question types. */
export function isQuestionTriple(x: unknown): x is readonly QuestionType[] {
  return Array.isArray(x) && x.length === 3 && x.every((q) => (QUESTION_TYPES as readonly unknown[]).includes(q));
}

export const BUILD_KINDS = Object.keys(BUILD_TABLE) as BuildKind[];

export const isBuildKind = (x: unknown): x is BuildKind => typeof x === "string" && (BUILD_KINDS as string[]).includes(x);

export const RESERVED_ACTION_TYPES: readonly ReservedActionType[] = ["doubleDown"];

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  "wait",
  "setPrice",
  "raiseMoney",
  "pivot",
  "interview",
  "buildTest",
  "pickChannel",
  "chargeTest",
  "setMarketing",
  "hire",
  "respondOffer",
  ...RESERVED_ACTION_TYPES,
]);

/** True for any object whose `type` is a known action type (parameters are not checked here). */
export function hasKnownType(x: unknown): x is Action {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as { type?: unknown }).type === "string" &&
    KNOWN_TYPES.has((x as { type: string }).type)
  );
}

/** Strict shape check used when loading saves: known type, and integer parameters where required. */
export function isActionShape(x: unknown): x is Action {
  if (!hasKnownType(x)) return false;
  if (x.type === "setPrice") return Number.isInteger((x as { priceCents?: unknown }).priceCents);
  if (x.type === "pivot") return Number.isInteger((x as { toSegment?: unknown }).toSegment);
  if (x.type === "buildTest") return isBuildKind((x as { kind?: unknown }).kind);
  if (x.type === "pickChannel" || x.type === "chargeTest") {
    const { segment, channel } = x as { segment?: unknown; channel?: unknown };
    return Number.isInteger(segment) && Number.isInteger(channel);
  }
  if (x.type === "setMarketing") {
    const { channel, level } = x as { channel?: unknown; level?: unknown };
    return (channel === null || Number.isInteger(channel)) && Number.isInteger(level);
  }
  if (x.type === "respondOffer") return typeof (x as { accept?: unknown }).accept === "boolean";
  if (x.type === "interview") {
    const { segment, questions } = x as { segment?: unknown; questions?: unknown };
    return Number.isInteger(segment) && isQuestionTriple(questions);
  }
  return true;
}

/** Every action that would be accepted right now. Reserved actions are never listed. */
export function legalActions(run: InternalRun): readonly Action[] {
  const pub = run.pub;
  if (pub.status !== "running") return [];
  const actions: Action[] = [{ type: "wait" }];
  for (const priceCents of PRICE_LADDER_CENTS) {
    if (priceCents !== pub.priceCents) actions.push({ type: "setPrice", priceCents });
  }
  const hasProof = pub.hypotheses.some((h) => h.state === "verified");
  if (pub.raisesUsed < MAX_RAISES && (pub.raisesUsed === 0 || hasProof)) actions.push({ type: "raiseMoney" });
  if (pub.pivotsRemaining >= 1) {
    for (let toSegment = 0; toSegment < pub.segmentNames.length; toSegment++) {
      if (toSegment !== pub.focusSegment) actions.push({ type: "pivot", toSegment });
    }
  }
  if (pub.cashCents >= INTERVIEW_ROUND_CASH_CENTS) {
    for (let segment = 0; segment < pub.segmentNames.length; segment++) {
      for (const q of QUESTION_TYPES) actions.push({ type: "interview", segment, questions: [q, q, q] });
    }
  }
  for (const kind of BUILD_KINDS) {
    const cost = BUILD_TABLE[kind].cashCents;
    const alreadyThere = kind === "landing-page" ? pub.landingPageBuilt : pub.productProgressPct >= 100;
    if (!alreadyThere && pub.cashCents >= cost) actions.push({ type: "buildTest", kind });
  }
  if (pub.cashCents >= CHANNEL_TEST_BUDGET_CENTS) {
    for (let segment = 0; segment < pub.segmentNames.length; segment++) {
      for (let channel = 0; channel < pub.channels.length; channel++) {
        actions.push({ type: "pickChannel", segment, channel });
        if (pub.landingPageBuilt) actions.push({ type: "chargeTest", segment, channel });
      }
    }
  }
  for (let channel = 0; channel < pub.channels.length; channel++) {
    for (let level = 1; level < BUDGET_LEVELS_CENTS.length; level++) {
      if (pub.marketing.channel !== channel || pub.marketing.level !== level) actions.push({ type: "setMarketing", channel, level });
    }
  }
  if (pub.marketing.level !== 0) actions.push({ type: "setMarketing", channel: null, level: 0 });
  if (pub.hires < MAX_HIRES && pub.cashCents >= pub.weeklyBurnCents + HIRE_WEEKLY_CENTS) actions.push({ type: "hire" });
  if (pub.offer) {
    actions.push({ type: "respondOffer", accept: true });
    actions.push({ type: "respondOffer", accept: false });
  }
  return actions;
}
