import { INTERVIEW_ROUND_CASH_CENTS, MAX_RAISES } from "./runway";
import type { InternalRun } from "./state";
import type { Action, QuestionType, ReservedActionType } from "./types";

/** Monthly prices the player can choose, in cents. */
export const PRICE_LADDER_CENTS: readonly number[] = [900, 1900, 4900, 9900, 19900, 49900, 99900];

export const QUESTION_TYPES: readonly QuestionType[] = ["past-behavior", "commitment", "hypothetical", "pitch"];

/** Exactly three known question types. */
export function isQuestionTriple(x: unknown): x is readonly QuestionType[] {
  return Array.isArray(x) && x.length === 3 && x.every((q) => (QUESTION_TYPES as readonly unknown[]).includes(q));
}

export const RESERVED_ACTION_TYPES: readonly ReservedActionType[] = [
  "buildTest",
  "chargeTest",
  "pickChannel",
  "hire",
  "doubleDown",
];

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  "wait",
  "setPrice",
  "raiseMoney",
  "pivot",
  "interview",
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
  if (pub.raisesUsed < MAX_RAISES) actions.push({ type: "raiseMoney" });
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
  return actions;
}
