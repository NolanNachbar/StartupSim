// The single reducer. `step` is a pure function of (run, action): same run and action, same result.
//
//   action ──> validate ──> advance weeks (tick x n) ──> apply the action's effect ──> record the action
//                 │
//                 └─ illegal: { ok: false, reason }, run unchanged
//
// A tick: marketing wins customers, churn takes some, the market ceiling caps them, revenue accrues,
// late payers delay some cash, costs and loan repayments go out, the week advances, then end checks.
import { hasKnownType, isBuildKind, isQuestionTriple, PRICE_LADDER_CENTS, RESERVED_ACTION_TYPES } from "./actions";
import { runChannelTest, runPaidTest } from "./experiments";
import { hypothesesFrom } from "./hypotheses";
import { runInterviewRound } from "./interview";
import {
  ACQUISITION_DIVISOR,
  BUDGET_LEVELS_CENTS,
  BUILD_TABLE,
  CHANNEL_TEST_BUDGET_CENTS,
  CREDIBILITY_FLOOR_PCT,
  HIRE_WEEKLY_CENTS,
  INTERVIEW_ROUND_CASH_CENTS,
  LANDING_STREAK_WEEKS,
  LOAN_AMOUNT_CENTS,
  LOAN_OFFER_LIFETIME_WEEKS,
  LOAN_OFFER_MIN_WEEK,
  LOAN_WEEKLY_REPAYMENT_CENTS,
  LOAN_WEEKS,
  MAX_HIRES,
  MAX_RAISES,
  MAX_WEEKS,
  RAISE_AMOUNT_CENTS,
  RAISE_EQUITY_PCTS,
  acquiredCustomers,
  churnedCustomers,
  conversionPct,
  marketCeiling,
  marketingLeads,
  pivotsRemaining,
  priceRatioPct,
  weeklyRevenue,
} from "./runway";
import { randInt } from "./rng";
import type { InternalRun } from "./state";
import type { Action, EndReason, Evidence, IllegalReason, LoanOffer, LogEntry, PublicState, Receivable, RunStatus } from "./types";
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

/** Append evidence and keep the hypotheses in step with it. */
function withEvidence(pub: PublicState, entries: readonly Evidence[]): Partial<PublicState> {
  const evidence = [...pub.evidence, ...entries];
  return { evidence, hypotheses: hypothesesFrom(evidence, pub.segmentNames.length) };
}

const countOf = (run: InternalRun, type: Action["type"]): number => run.actions.filter((a) => a.type === type).length;

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
    case "buildTest":
      return Object.freeze({ type: "buildTest", kind: action.kind });
    case "pickChannel":
      return Object.freeze({ type: "pickChannel", segment: action.segment, channel: action.channel });
    case "chargeTest":
      return Object.freeze({ type: "chargeTest", segment: action.segment, channel: action.channel });
    case "setMarketing":
      return Object.freeze({ type: "setMarketing", channel: action.channel, level: action.level });
    case "hire":
      return Object.freeze({ type: "hire" });
    case "respondOffer":
      return Object.freeze({ type: "respondOffer", accept: action.accept });
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

  // Marketing: the budget is spent, and paid leads turn into customers.
  const channel = pub.marketing.channel === null ? undefined : secret.channels[pub.marketing.channel];
  const marketingSpend = channel ? (BUDGET_LEVELS_CENTS[pub.marketing.level] ?? 0) : 0;
  let acquired = 0;
  if (channel && marketingSpend > 0) {
    const credibility = Math.max(CREDIBILITY_FLOOR_PCT, pub.productProgressPct);
    const buyPct = Math.floor((conversionPct(priceRatioPct(pub.priceCents, segment.willingnessToPayCents)) * credibility) / 100);
    acquired = acquiredCustomers({
      leads: marketingLeads(marketingSpend, channel.costPerLeadCents, pub.hires),
      fit: channel.fit[pub.focusSegment] ?? 0,
      need: segment.pain * (100 - segment.incumbentSatisfactionPct),
      buyPct,
      draw: randInt(run.seed, 1, 100_000_000 * ACQUISITION_DIVISOR, "acq", pub.week),
    });
  }

  // Churn, then the market ceiling (weather shrinks the market).
  const withNew = pub.payingCustomers + acquired;
  const churned = churnedCustomers(withNew, pub.productProgressPct, randInt(run.seed, 1, 10_000, "churn", pub.week));
  const ceiling = marketCeiling(
    segment.trueDemand,
    weatherPctAt(secret, pub.week),
    conversionPct(priceRatioPct(pub.priceCents, segment.willingnessToPayCents)),
  );
  const payingCustomers = Math.min(ceiling, withNew - churned);

  // Revenue accrues; during a late-payer window part of it arrives weeks later.
  const weeklyRevenueCents = weeklyRevenue(payingCustomers, pub.priceCents);
  const week = pub.week + 1;
  const window = secret.lateWindow;
  const late = window && pub.week >= window.startWeek && pub.week < window.endWeek ? Math.floor((weeklyRevenueCents * window.pct) / 100) : 0;
  const owed: Receivable[] = late > 0 ? [...pub.receivables, { week: week + (window?.delayWeeks ?? 0), amountCents: late }] : [...pub.receivables];
  const collected = owed.filter((r) => r.week <= week).reduce((sum, r) => sum + r.amountCents, 0);
  const receivables = owed.filter((r) => r.week > week);

  // Loan repayment drains cash but is not an operating cost.
  const repayment = pub.loan ? pub.loan.weeklyRepaymentCents : 0;
  const loan = pub.loan && pub.loan.weeksLeft > 1 ? { ...pub.loan, weeksLeft: pub.loan.weeksLeft - 1 } : null;

  const cashCents = pub.cashCents + (weeklyRevenueCents - late) + collected - pub.weeklyBurnCents - marketingSpend - repayment;
  const profitableStreakWeeks =
    weeklyRevenueCents >= pub.weeklyBurnCents + marketingSpend ? pub.profitableStreakWeeks + 1 : 0;

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

  const runway = pivotsRemaining(cashCents, pub.pivotCostCents);
  let log = pub.log;
  const note = (text: string): void => {
    log = [...log, { week, text }];
  };
  if (pub.loan && !loan) note("The loan is paid off.");

  // A cash offer appears once, when the runway is nearly gone, and lapses after a few weeks.
  let offer: LoanOffer | null = pub.offer;
  let offersShown = pub.offersShown;
  if (offer && week >= offer.expiresWeek) {
    offer = null;
    note("The cash offer expired.");
  }
  if (status === "running" && !offer && offersShown === 0 && week >= LOAN_OFFER_MIN_WEEK && runway <= 1) {
    offer = {
      amountCents: LOAN_AMOUNT_CENTS,
      weeklyRepaymentCents: LOAN_WEEKLY_REPAYMENT_CENTS,
      weeks: LOAN_WEEKS,
      expiresWeek: week + LOAN_OFFER_LIFETIME_WEEKS,
    };
    offersShown = 1;
    note("A lender offers $40,000 today.");
  }
  if (endText) note(endText);

  return {
    ...run,
    pub: {
      ...pub,
      week,
      status,
      endReason,
      cashCents,
      payingCustomers,
      weeklyRevenueCents,
      profitableStreakWeeks,
      pivotsRemaining: runway,
      receivables,
      loan,
      offer,
      offersShown,
      log,
    },
  };
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
      // Investors fund evidence: a second raise needs a verified hypothesis.
      if (run.pub.raisesUsed >= 1 && !run.pub.hypotheses.some((h) => h.state === "verified")) {
        return fail("investors-want-proof");
      }
      const weeks = randInt(run.seed, 3, 9, "raise", run.pub.raisesUsed);
      const after = advance(run, weeks);
      if (after.pub.status !== "running") return ok(recorded(after, action));
      const cashCents = after.pub.cashCents + RAISE_AMOUNT_CENTS;
      return ok(
        recorded(
          withPub(after, {
            cashCents,
            pivotsRemaining: pivotsRemaining(cashCents, after.pub.pivotCostCents),
            equityGivenPct: after.pub.equityGivenPct + (RAISE_EQUITY_PCTS[after.pub.raisesUsed] ?? 20),
            raisesUsed: after.pub.raisesUsed + 1,
            log: withLog(after.pub, `Raised $100,000 for ${RAISE_EQUITY_PCTS[after.pub.raisesUsed] ?? 20}% equity.`),
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
        index: countOf(run, "interview"),
        week: run.pub.week,
        segment,
        questions: action.questions,
        priceCents: run.pub.priceCents,
      });
      const answered = round.filter((e) => e.outcome === "completed").length;
      const paid = withPub(run, {
        cashCents: run.pub.cashCents - INTERVIEW_ROUND_CASH_CENTS,
        ...withEvidence(run.pub, round),
        log: withLog(run.pub, `Interview round: ${answered} of ${round.length} answered.`),
      });
      // The conversations happened, so the evidence stays even if the week then ends the run.
      return ok(recorded(advance(paid, 1), action));
    }

    case "buildTest": {
      if (!isBuildKind(action.kind)) return fail("invalid-build");
      const spec = BUILD_TABLE[action.kind];
      const alreadyThere = action.kind === "landing-page" ? run.pub.landingPageBuilt : run.pub.productProgressPct >= 100;
      if (alreadyThere) return fail("already-built");
      if (run.pub.cashCents < spec.cashCents) return fail("insufficient-cash");
      const weeks = Math.max(1, spec.weeks - run.pub.hires);
      const after = advance(withPub(run, { cashCents: run.pub.cashCents - spec.cashCents }), weeks);
      // If the run ended before the build finished, nothing was built.
      if (after.pub.status !== "running") return ok(recorded(after, action));
      return ok(
        recorded(
          withPub(after, {
            productProgressPct: Math.min(100, after.pub.productProgressPct + spec.progressPct),
            landingPageBuilt: after.pub.landingPageBuilt || action.kind === "landing-page",
            log: withLog(after.pub, `Built a ${action.kind.replace("-", " ")}.`),
          }),
          action,
        ),
      );
    }

    case "pickChannel":
    case "chargeTest": {
      const { segment, channel } = action;
      if (!Number.isInteger(segment) || segment < 0 || segment >= run.pub.segmentNames.length) return fail("invalid-segment");
      if (!Number.isInteger(channel) || channel < 0 || channel >= run.pub.channels.length) return fail("invalid-channel");
      const charging = action.type === "chargeTest";
      if (charging && !run.pub.landingPageBuilt) return fail("nothing-to-sell");
      if (run.pub.cashCents < CHANNEL_TEST_BUDGET_CENTS) return fail("insufficient-cash");
      const base = { secret: run.secret, seed: run.seed, week: run.pub.week, segment, channel };
      let changes: Partial<PublicState>;
      if (charging) {
        const test = runPaidTest({
          ...base,
          index: countOf(run, "chargeTest"),
          priceCents: run.pub.priceCents,
          productProgressPct: run.pub.productProgressPct,
        });
        changes = {
          // Payments are real money; only payers in the focus segment become ongoing customers.
          cashCents: run.pub.cashCents - CHANNEL_TEST_BUDGET_CENTS + test.payments * run.pub.priceCents,
          payingCustomers: segment === run.pub.focusSegment ? run.pub.payingCustomers + test.payments : run.pub.payingCustomers,
          ...withEvidence(run.pub, [test]),
          log: withLog(run.pub, `Paid test: ${test.payments} of ${test.leads} paid.`),
        };
      } else {
        const test = runChannelTest({ ...base, index: countOf(run, "pickChannel") });
        changes = {
          cashCents: run.pub.cashCents - CHANNEL_TEST_BUDGET_CENTS,
          ...withEvidence(run.pub, [test]),
          log: withLog(run.pub, `Channel test: ${test.interested} of ${test.leads} interested.`),
        };
      }
      return ok(recorded(advance(withPub(run, changes), 1), action));
    }

    case "setMarketing": {
      const { channel, level } = action;
      if (!Number.isInteger(level) || level < 0 || level >= BUDGET_LEVELS_CENTS.length || (level === 0) !== (channel === null)) {
        // Level 0 means "off" and goes with no channel; levels above 0 need a channel.
        if (Number.isInteger(level) && level >= 1 && level < BUDGET_LEVELS_CENTS.length && channel === null) return fail("invalid-channel");
        return fail("invalid-level");
      }
      if (channel !== null && (!Number.isInteger(channel) || channel < 0 || channel >= run.pub.channels.length)) {
        return fail("invalid-channel");
      }
      return ok(recorded(withPub(run, { marketing: { channel, level } }), action));
    }

    case "hire": {
      if (run.pub.hires >= MAX_HIRES) return fail("hire-limit");
      const burn = run.pub.weeklyBurnCents + HIRE_WEEKLY_CENTS;
      if (run.pub.cashCents < burn) return fail("insufficient-cash");
      return ok(
        recorded(
          withPub(run, { hires: run.pub.hires + 1, weeklyBurnCents: burn, log: withLog(run.pub, "Hired a contractor.") }),
          action,
        ),
      );
    }

    case "respondOffer": {
      const offer = run.pub.offer;
      if (!offer) return fail("no-offer");
      if (!action.accept) {
        return ok(recorded(withPub(run, { offer: null, log: withLog(run.pub, "Declined the cash offer.") }), action));
      }
      const cashCents = run.pub.cashCents + offer.amountCents;
      return ok(
        recorded(
          withPub(run, {
            offer: null,
            cashCents,
            pivotsRemaining: pivotsRemaining(cashCents, run.pub.pivotCostCents),
            loan: { weeklyRepaymentCents: offer.weeklyRepaymentCents, weeksLeft: offer.weeks },
            log: withLog(run.pub, "Took the cash offer. Repayments start this week."),
          }),
          action,
        ),
      );
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
