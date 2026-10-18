// The single reducer. `step` is a pure function of (run, action): same run and action, same result.
//
//   action ──> validate ──> advance weeks (tick x n) ──> apply the action's effect ──> record the action
//                 │
//                 └─ illegal: { ok: false, reason }, run unchanged
//
// A tick: demand target, customers ramp, revenue, cash, week, profit streak, then end checks.
import { hasKnownType, isQuestionTriple, PRICE_LADDER_CENTS, RESERVED_ACTION_TYPES } from "./actions";
import { runInterviewRound } from "./interview";
import {
  INTERVIEW_ROUND_CASH_CENTS,
  LANDING_STREAK_WEEKS,
  MAX_RAISES,
  MAX_WEEKS,
  RAISE_AMOUNT_CENTS,
  RAISE_EQUITY_PCT,
  WEEKLY_BURN_CENTS,
  conversionPct,
  moveToward,
  pivotsRemaining,
  priceRatioPct,
  targetCustomers,
  weeklyRevenue,
} from "./runway";
import { randInt } from "./rng";
import type { InternalRun } from "./state";
import type { Action, EndReason, IllegalReason, LogEntry, PublicState, RunStatus } from "./types";
import { weatherPctAt } from "./world";

export type InternalStepResult =
  | { readonly ok: true; readonly run: InternalRun }
  | { readonly ok: false; readonly reason: IllegalReason };

const fail = (reason: IllegalReason): InternalStepResult => ({ ok: false, reason });
const ok = (run: InternalRun): InternalStepResult => ({ ok: true, run });

function withPub(run: InternalRun, changes: Partial<PublicState>): InternalRun {
  return { ...run, pub: { ...run.pub, ...changes } };
}

function withLog(pub: PublicState, text: string): readonly LogEntry[] {
  return [...pub.log, { week: pub.week, text }];
}

/** A frozen copy holding only the fields the action defines, so callers cannot rewrite history. */
function canonical(action: Action): Action {
  switch (action.type) {
    case "setPrice":
      return Object.freeze({ type: "setPrice", priceCents: action.priceCents });
    case "pivot":
      return Object.freeze({ type: "pivot", toSegment: action.toSegment });
    case "raiseMoney":
      return Object.freeze({ type: "raiseMoney" });
    case "interview":
      return Object.freeze({
        type: "interview",
        segment: action.segment,
        questions: Object.freeze([...action.questions]),
      });
    default:
      return Object.freeze({ type: "wait" });
  }
}

function recorded(run: InternalRun, action: Action): InternalRun {
  return { ...run, actions: [...run.actions, canonical(action)] };
}

/** Advance one week. A finished run does not move. */
function tick(run: InternalRun): InternalRun {
  const { secret, pub } = run;
  if (pub.status !== "running") return run;
  const segment = secret.segments[pub.focusSegment];
  if (!segment) throw new RangeError(`focus segment ${pub.focusSegment} does not exist`);

  const conversion = conversionPct(priceRatioPct(pub.priceCents, segment.willingnessToPayCents));
  const target = targetCustomers(
    segment.trueDemand,
    pub.productProgressPct,
    conversion,
    weatherPctAt(secret, pub.week),
  );
  const payingCustomers = moveToward(pub.payingCustomers, target);
  const weeklyRevenueCents = weeklyRevenue(payingCustomers, pub.priceCents);
  const cashCents = pub.cashCents + weeklyRevenueCents - WEEKLY_BURN_CENTS;
  const week = pub.week + 1;
  const profitableStreakWeeks =
    weeklyRevenueCents >= WEEKLY_BURN_CENTS ? pub.profitableStreakWeeks + 1 : 0;

  let status: RunStatus = "running";
  let endReason: EndReason | null = null;
  let endText: string | null = null;
  if (cashCents < 0) {
    status = "crashed";
    endReason = "cash";
    endText = `Cash ran out in week ${week}.`;
  } else if (profitableStreakWeeks >= LANDING_STREAK_WEEKS) {
    status = "landed";
    endReason = "default-alive";
    endText = `Revenue covered costs for ${LANDING_STREAK_WEEKS} weeks in a row. You landed in week ${week}.`;
  } else if (week >= MAX_WEEKS) {
    status = "crashed";
    endReason = "stalled";
    endText = `Week ${MAX_WEEKS} passed without a viable business.`;
  }

  const next: PublicState = {
    ...pub,
    week,
    status,
    endReason,
    cashCents,
    payingCustomers,
    weeklyRevenueCents,
    profitableStreakWeeks,
    pivotsRemaining: pivotsRemaining(cashCents, pub.pivotCostCents),
  };
  return { ...run, pub: endText ? { ...next, log: withLog(next, endText) } : next };
}

function advance(run: InternalRun, weeks: number): InternalRun {
  let current = run;
  for (let i = 0; i < weeks && current.pub.status === "running"; i++) current = tick(current);
  return current;
}

const isReserved = (type: string): boolean => (RESERVED_ACTION_TYPES as readonly string[]).includes(type);

export function step(run: InternalRun, action: Action): InternalStepResult {
  if (!hasKnownType(action)) return fail("unknown-action");
  if (run.pub.status !== "running") return fail("run-finished");
  if (isReserved(action.type)) return fail("not-implemented");

  switch (action.type) {
    case "wait":
      return ok(recorded(advance(run, 1), action));

    case "setPrice": {
      const price = action.priceCents;
      if (!PRICE_LADDER_CENTS.includes(price) || price === run.pub.priceCents) {
        return fail("invalid-price");
      }
      return ok(recorded(withPub(run, { priceCents: price }), action));
    }

    case "raiseMoney": {
      if (run.pub.raisesUsed >= MAX_RAISES) return fail("raise-limit");
      const weeks = randInt(run.seed, 3, 9, "raise", run.pub.raisesUsed);
      const after = advance(run, weeks);
      if (after.pub.status !== "running") return ok(recorded(after, action));
      const cashCents = after.pub.cashCents + RAISE_AMOUNT_CENTS;
      return ok(
        recorded(
          withPub(after, {
            cashCents,
            pivotsRemaining: pivotsRemaining(cashCents, after.pub.pivotCostCents),
            equityGivenPct: after.pub.equityGivenPct + RAISE_EQUITY_PCT,
            raisesUsed: after.pub.raisesUsed + 1,
            log: withLog(after.pub, "Raised $100,000 for 15% equity."),
          }),
          action,
        ),
      );
    }

    case "interview": {
      const segment = action.segment;
      if (!Number.isInteger(segment) || segment < 0 || segment >= run.pub.segmentNames.length) {
        return fail("invalid-segment");
      }
      if (!isQuestionTriple(action.questions)) return fail("invalid-questions");
      if (run.pub.cashCents < INTERVIEW_ROUND_CASH_CENTS) return fail("insufficient-cash");
      const round = runInterviewRound({
        secret: run.secret,
        seed: run.seed,
        index: run.actions.filter((a) => a.type === "interview").length,
        week: run.pub.week,
        segment,
        questions: action.questions,
        priceCents: run.pub.priceCents,
      });
      const answered = round.filter((e) => e.outcome === "completed").length;
      const paid = withPub(run, {
        cashCents: run.pub.cashCents - INTERVIEW_ROUND_CASH_CENTS,
        evidence: [...run.pub.evidence, ...round],
        log: withLog(run.pub, `Interview round: ${answered} of ${round.length} answered.`),
      });
      // The conversations happened, so the evidence stays even if the week then ends the run.
      return ok(recorded(advance(paid, 1), action));
    }

    case "pivot": {
      if (run.pub.pivotsRemaining < 1) return fail("no-pivots-left");
      const to = action.toSegment;
      if (!Number.isInteger(to) || to < 0 || to >= run.pub.segmentNames.length || to === run.pub.focusSegment) {
        return fail("invalid-segment");
      }
      const after = advance(run, 1);
      // If the run ended during the pivot week, the pivot is not applied.
      if (after.pub.status !== "running") return ok(recorded(after, action));
      return ok(
        recorded(
          withPub(after, {
            pivotsUsed: after.pub.pivotsUsed + 1,
            focusSegment: to,
            productProgressPct: Math.floor(after.pub.productProgressPct / 2),
            // A pivot is a fresh start with a new customer group: nothing carries over from the old one.
            payingCustomers: 0,
            weeklyRevenueCents: 0,
            profitableStreakWeeks: 0,
            log: withLog(after.pub, `Pivoted to ${after.pub.segmentNames[to] ?? "a new segment"}.`),
          }),
          action,
        ),
      );
    }

    default:
      return fail("unknown-action");
  }
}
