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
import { promotionsFor } from "./promotions";
import { MAX_TEAM, NETWORK_KINDS, NETWORK_OPTIONS, RND_LEVELS_CENTS, ROLES, ROLE_CAP } from "./realism";
import type { Action, BuildKind, QuestionType, ReservedActionType } from "./types";

/** Monthly prices the player can choose, in cents. */
export const PRICE_LADDER_CENTS: readonly number[] = [900, 1900, 4900, 9900, 19900, 49900, 99900];

export const QUESTION_TYPES: readonly QuestionType[] = ["past-behavior", "commitment", "hypothetical", "pitch"];

/** The questions a founder can ask: each is about a different thing and carries the signal of its type. */
export const QUESTION_BANK: readonly { readonly topic: string; readonly type: QuestionType }[] = [
  { topic: "last-time", type: "past-behavior" },
  { topic: "cost", type: "past-behavior" },
  { topic: "tried", type: "past-behavior" },
  { topic: "who", type: "past-behavior" },
  { topic: "pay-today", type: "commitment" },
  { topic: "pre-order", type: "commitment" },
  { topic: "deposit", type: "commitment" },
  { topic: "would-use", type: "hypothetical" },
  { topic: "useful", type: "hypothetical" },
  { topic: "switch", type: "hypothetical" },
  { topic: "pitch", type: "pitch" },
  { topic: "feedback", type: "pitch" },
];

/** Topics are optional; when given there must be three, each a known topic of the question type at that position. */
export function topicsMatch(questions: readonly QuestionType[], topics: unknown): boolean {
  if (topics === undefined) return true;
  if (!Array.isArray(topics) || topics.length !== 3) return false;
  return topics.every((t, i) => QUESTION_BANK.some((b) => b.topic === t && b.type === questions[i]));
}

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
  "setRnd",
  "fire",
  "network",
  "setPromotion",
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
    const { channel, level, target } = x as { channel?: unknown; level?: unknown; target?: unknown };
    return (channel === null || Number.isInteger(channel)) && Number.isInteger(level) && (target === undefined || target === null || Number.isInteger(target));
  }
  if (x.type === "hire") {
    const { role } = x as { role?: unknown };
    return role === undefined || (typeof role === "string" && (ROLES as readonly string[]).includes(role));
  }
  if (x.type === "setRnd") return Number.isInteger((x as { level?: unknown }).level);
  if (x.type === "fire") return (ROLES as readonly unknown[]).includes((x as { role?: unknown }).role);
  if (x.type === "setPromotion") {
    const { promo } = x as { promo?: unknown };
    return promo === null || typeof promo === "string";
  }
  if (x.type === "network") return (NETWORK_KINDS as readonly unknown[]).includes((x as { kind?: unknown }).kind);
  if (x.type === "respondOffer") return typeof (x as { accept?: unknown }).accept === "boolean";
  if (x.type === "interview") {
    const { segment, questions, topics } = x as { segment?: unknown; questions?: unknown; topics?: unknown };
    return Number.isInteger(segment) && isQuestionTriple(questions) && topicsMatch(questions, topics);
  }
  return true;
}

/** Every action that would be accepted right now. Reserved actions are never listed. */
export function legalActions(run: InternalRun): readonly Action[] {
  const pub = run.pub;
  if (pub.status !== "running") return [];
  const actions: Action[] = [{ type: "wait" }];
  for (const priceCents of pub.priceLadderCents) {
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
    const cost = pub.builds[kind].cashCents;
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
  if (run.secret.business) {
    if (pub.hires < MAX_TEAM && pub.cashCents >= pub.weeklyBurnCents + HIRE_WEEKLY_CENTS) {
      for (const role of ROLES) if (pub.team[role] < ROLE_CAP) actions.push({ type: "hire", role });
    }
    for (let level = 0; level < RND_LEVELS_CENTS.length; level++) if (level !== pub.rndLevel) actions.push({ type: "setRnd", level });
    if (!pub.promo && pub.promoCooldown === 0 && run.secret.business) {
      for (const spec of promotionsFor(run.secret.business.model.id)) if (pub.cashCents >= spec.cashCents && pub.payingCustomers >= spec.needsCustomers) actions.push({ type: "setPromotion", promo: spec.id });
    }
    for (const kind of NETWORK_KINDS) if (pub.cashCents >= NETWORK_OPTIONS[kind].cashCents) actions.push({ type: "network", kind });
  } else if (pub.hires < MAX_HIRES && pub.cashCents >= pub.weeklyBurnCents + HIRE_WEEKLY_CENTS) actions.push({ type: "hire" });
  if (pub.offer) {
    actions.push({ type: "respondOffer", accept: true });
    actions.push({ type: "respondOffer", accept: false });
  }
  return actions;
}
