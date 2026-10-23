// Words and numbers for the screen. Pure functions; no game rules here.
import { UNIT_LABEL, type DebriefTag, type Evidence, type HypothesisState, type IllegalReason, type PublicState, type QuestionType } from "../sim";

/** Whole dollars with separators; cents appear only when there are some. Integer math only. */
export function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rest = abs % 100;
  const text = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${text}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

export const hypothesisLabel = (s: HypothesisState): string =>
  s === "untested" ? "Untested" : s === "weak" ? "Weak evidence" : "Verified";

export const questionLabel = (q: QuestionType): string =>
  ({
    "past-behavior": "Tell me about the last time you dealt with this",
    commitment: "Would you pay for this today?",
    hypothetical: "Would you use something like this?",
    pitch: "Here is my idea. What do you think?",
  })[q];

export const questionShort = (q: QuestionType): string =>
  ({ "past-behavior": "Last time", commitment: "Pay today", hypothetical: "Would you use it", pitch: "Pitch the idea" })[q];

export const tagLabel = (t: DebriefTag): string => (t === "fact" ? "Fact" : t === "fluff" ? "Fluff" : "Compliment");

export const tagExplain = (t: DebriefTag): string =>
  t === "fact"
    ? "They described something that really happened."
    : t === "fluff"
      ? "A general or hypothetical answer. It tells you little."
      : "They were being nice. It does not count as demand.";

const REASONS: Record<IllegalReason, string> = {
  "unknown-action": "That action is not available.",
  "run-finished": "This run is over.",
  "not-implemented": "That action is not available yet.",
  "invalid-price": "That price is not on the list.",
  "invalid-segment": "Pick a customer group first.",
  "invalid-questions": "Pick three questions.",
  "invalid-build": "Pick something to build.",
  "invalid-channel": "Pick a channel first.",
  "already-built": "You already built that.",
  "nobody-to-let-go": "You have nobody in that role to let go.",
  "invalid-network": "That is not a way to meet people.",
  "invalid-promotion": "That promotion does not exist.",
  "promotion-active": "A promotion is already running, or has only just ended. Wait for it to finish.",
  "promotion-needs-customers": "You need more customers before that one can work.",
  "nothing-to-sell": "There is nothing built to sell yet.",
  "invalid-level": "That budget level is not on the list.",
  "hire-limit": "You cannot hire anyone else.",
  "invalid-role": "Pick who to hire.",
  "role-limit": "You already have as many in that role as you can manage.",
  "invalid-target": "Pick a customer group to aim at.",
  "no-offer": "There is no offer to answer.",
  "investors-want-proof": "Investors want proof first.",
  "insufficient-cash": "You do not have the cash for that.",
  "no-pivots-left": "You have no pivots left.",
  "raise-limit": "You cannot raise any more money.",
};
export const reasonText = (r: IllegalReason): string => REASONS[r];

export interface StepDescription {
  readonly newLog: PublicState["log"];
  readonly evidence: readonly Evidence[];
  readonly weeksPassed: number;
  readonly cashDeltaCents: number;
}

/** What one step added, found by comparing the states before and after. */
export function describeStep(before: PublicState, after: PublicState): StepDescription {
  return {
    newLog: after.log.slice(before.log.length),
    evidence: after.evidence.slice(before.evidence.length),
    weeksPassed: after.week - before.week,
    cashDeltaCents: after.cashCents - before.cashCents,
  };
}

export function countStates(hyps: PublicState["hypotheses"]): string {
  const n = (s: HypothesisState) => hyps.filter((h) => h.state === s).length;
  return `${n("verified")} verified, ${n("weak")} weak, ${n("untested")} untested`;
}

/** A price in the unit this business bills: "$12 a visit", "$99 a month". */
export const priceWords = (s: { billing: { unit: "month" | "visit" | "order" | "job" | "night" } | null }, cents: number): string => `${money(cents)} ${s.billing ? UNIT_LABEL[s.billing.unit] : "a month"}`;
