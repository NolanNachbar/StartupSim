// The single reducer. `step` is a pure function of (run, action): same run and action, same result.
//
//   action ──> validate ──> advance weeks (tick x n) ──> apply the action's effect ──> record the action
//                 │
//                 └─ illegal: { ok: false, reason }, run unchanged
//
// A tick: marketing wins customers, churn takes some, the market ceiling caps them, revenue accrues,
// late payers delay some cash, costs and loan repayments go out, the week advances, then end checks.
import { hasKnownType, isBuildKind, isQuestionTriple, RESERVED_ACTION_TYPES, topicsMatch } from "./actions";
import { PROMOTION_COOLDOWN_WEEKS, promotionsFor } from "./promotions";
import { MONTH_NAMES, seasonAt } from "./seasons";
import { monthlyOf } from "./billing";
import { NETWORK_KINDS, NETWORK_OPTIONS, WARM_PER_ROUND, BUILD_LABEL_BY_MODEL, BUSINESS_LOAN_WEEKLY_REPAYMENT_CENTS, HIRE_SEARCH_WEEKS, QUIT_PCT_BY_ROLE, SEVERANCE_WEEKS, MAX_TEAM, RND_LEVELS_CENTS, ROLES, ROLE_CAP, capacityWith, realisticWeek } from "./realism";
import { runChannelTest, runPaidTest } from "./experiments";
import { hypothesesFrom } from "./hypotheses";
import { runInterviewRound } from "./interview";
import {
  ACQUISITION_DIVISOR,
  BUDGET_LEVELS_CENTS,
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
import { randChance, randInt } from "./rng";
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
        ...(action.topics ? { topics: Object.freeze([...action.topics]) } : {}),
      });
    case "buildTest":
      return Object.freeze({ type: "buildTest", kind: action.kind });
    case "pickChannel":
      return Object.freeze({ type: "pickChannel", segment: action.segment, channel: action.channel });
    case "chargeTest":
      return Object.freeze({ type: "chargeTest", segment: action.segment, channel: action.channel });
    case "setMarketing":
      return Object.freeze({ type: "setMarketing", channel: action.channel, level: action.level, ...(action.target !== undefined ? { target: action.target } : {}) });
    case "hire":
      return Object.freeze({ type: "hire", ...(action.role ? { role: action.role } : {}) });
    case "setRnd":
      return Object.freeze({ type: "setRnd", level: action.level });
    case "network":
      return Object.freeze({ type: "network", kind: action.kind });
    case "fire":
      return Object.freeze({ type: "fire", role: action.role });
    case "setPromotion":
      return Object.freeze({ type: "setPromotion", promo: action.promo });
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

  // A chosen business plays by the fuller rules: a team, R&D, capacity and a marketing target (see realism.ts).
  const fuller = secret.business ? realisticWeek(run) : null;
  const channel = pub.marketing.channel === null ? undefined : secret.channels[pub.marketing.channel];
  const marketingSpend = fuller ? fuller.marketingSpend : channel ? (BUDGET_LEVELS_CENTS[pub.marketing.level] ?? 0) : 0;
  const rndSpend = fuller ? fuller.rndSpend : 0;
  // Marketing: the budget is spent, and paid leads turn into customers.
  let acquired = 0;
  if (!fuller && channel && marketingSpend > 0) {
    const credibility = Math.max(CREDIBILITY_FLOOR_PCT, pub.productProgressPct);
    const buyPct = Math.floor((conversionPct(priceRatioPct(monthlyOf(pub.priceCents, pub.billing), segment.willingnessToPayCents)) * credibility) / 100);
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
    conversionPct(priceRatioPct(monthlyOf(pub.priceCents, pub.billing), segment.willingnessToPayCents)),
  );
  const payingCustomers = fuller ? fuller.customers.reduce((a, b) => a + b, 0) : Math.min(ceiling, withNew - churned);

  // Revenue accrues; during a late-payer window part of it arrives weeks later.
  const weeklyRevenueCents = Math.max(0, weeklyRevenue(payingCustomers, monthlyOf(pub.priceCents, pub.billing)) - (fuller?.discountCents ?? 0));
  const week = pub.week + 1;
  const window = secret.lateWindow;
  const late = window && pub.week >= window.startWeek && pub.week < window.endWeek ? Math.floor((weeklyRevenueCents * window.pct) / 100) : 0;
  const owed: Receivable[] = late > 0 ? [...pub.receivables, { week: week + (window?.delayWeeks ?? 0), amountCents: late }] : [...pub.receivables];
  const collected = owed.filter((r) => r.week <= week).reduce((sum, r) => sum + r.amountCents, 0);
  const receivables = owed.filter((r) => r.week > week);

  // Loan repayment drains cash but is not an operating cost.
  const repayment = pub.loan ? pub.loan.weeklyRepaymentCents : 0;
  const outstanding = pub.books.loanReceivedCents - pub.books.principalRepaidCents;
  const principal = pub.loan ? (pub.loan.weeksLeft <= 1 ? outstanding : Math.min(outstanding, pub.loan.weeklyPrincipalCents)) : 0;
  const loan = pub.loan && pub.loan.weeksLeft > 1 ? { ...pub.loan, weeksLeft: pub.loan.weeksLeft - 1 } : null;

  // Cost of goods comes out of every sale (food, materials, hosting).
  const cogs = Math.floor((weeklyRevenueCents * pub.cogsPct) / 100);
  const cashCents = pub.cashCents + (weeklyRevenueCents - late) + collected - cogs - pub.weeklyBurnCents - marketingSpend - rndSpend - repayment;
  const profitableStreakWeeks =
    weeklyRevenueCents >= cogs + pub.weeklyBurnCents + marketingSpend + rndSpend ? pub.profitableStreakWeeks + 1 : 0;

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
  for (const n of fuller?.notes ?? []) note(n);
  // The calendar moves on; a month that is very different from the last is worth a line in the log.
  const season = fuller ? seasonAt(run.industry ?? 1, run.seed, week) : null;
  if (season && pub.season && season.month !== pub.season.month && Math.abs(season.index - pub.season.index) >= 15) {
    note(`It is ${MONTH_NAMES[season.month]}: ${season.index > pub.season.index ? "a busier" : "a quieter"} time for this market (${season.index} percent of an average month).`);
  }

  // People quit now and then, once they have settled in (a month at least). It costs you the person and the search again.
  let team = pub.team;
  let hiredAt = pub.hiredAt;
  let burnNow = pub.weeklyBurnCents;
  let hiresNow = pub.hires;
  if (fuller && run.secret.business) {
    for (const role of ROLES) {
      const settled = hiredAt.findIndex((h) => h.role === role && week - h.week >= 12);
      if (settled >= 0 && randChance(run.seed, QUIT_PCT_BY_ROLE[role] / 100, "quit", week, role)) {
        team = { ...team, [role]: team[role] - 1 };
        hiredAt = hiredAt.filter((_, i) => i !== settled);
        burnNow -= pub.wages[role];
        hiresNow -= 1;
        note(`Someone on your team quit (${role === "builder" ? "the one who builds" : role === "seller" ? "the one who sells" : "the one who serves customers"}). You have to find and train a replacement.`);
      }
    }
  }

  // A cash offer appears once, when the runway is nearly gone, and lapses after a few weeks.
  let offer: LoanOffer | null = pub.offer;
  let offersShown = pub.offersShown;
  if (offer && week >= offer.expiresWeek) {
    offer = null;
    note("The cash offer expired.");
  }
  // A lender wants to see money coming in: a business with no revenue is not offered one.
  const lendable = !secret.business || weeklyRevenueCents >= 100_000;
  if (status === "running" && !offer && offersShown === 0 && week >= LOAN_OFFER_MIN_WEEK && runway <= 1 && lendable) {
    offer = {
      amountCents: LOAN_AMOUNT_CENTS,
      weeklyRepaymentCents: secret.business ? BUSINESS_LOAN_WEEKLY_REPAYMENT_CENTS : LOAN_WEEKLY_REPAYMENT_CENTS,
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
      team,
      hiredAt,
      hires: hiresNow,
      weeklyBurnCents: burnNow,
      cashCents,
      payingCustomers,
      ...(fuller ? { customersBySegment: fuller.customers, productProgressPct: fuller.progress, qualityPct: fuller.quality, promo: fuller.promo, promoCooldown: fuller.promoCooldown, reputation: fuller.reputation, capacity: fuller.capacity, cohorts: fuller.cohorts, ...(fuller.rivalOpened ? { rivalSince: week } : {}), season } : {}),
      weeklyRevenueCents,
      profitableStreakWeeks,
      pivotsRemaining: runway,
      books: {
        ...pub.books,
        salesCashCents: pub.books.salesCashCents + (weeklyRevenueCents - late) + collected,
        cogsCents: pub.books.cogsCents + cogs,
        operatingCents: pub.books.operatingCents + pub.weeklyBurnCents,
        marketingCents: pub.books.marketingCents + marketingSpend,
        rndCents: pub.books.rndCents + rndSpend,
        depreciationCents: pub.books.depreciationCents + Math.min(pub.books.capexCents - pub.books.depreciationCents, Math.floor(pub.books.capexCents / 260)),
        principalRepaidCents: pub.books.principalRepaidCents + principal,
        interestCents: pub.books.interestCents + (repayment - principal),
      },
      ledger: {
        ...pub.ledger,
        revenueCents: pub.ledger.revenueCents + weeklyRevenueCents,
        marketingCents: pub.ledger.marketingCents + marketingSpend + rndSpend,
        payrollCents: pub.ledger.payrollCents + (secret.business ? ROLES.reduce((sum, role) => sum + pub.team[role] * pub.wages[role], 0) : pub.hires * HIRE_WEEKLY_CENTS),
      },
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
      if (!run.pub.priceLadderCents.includes(price) || price === run.pub.priceCents) {
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
      // Raising takes months of your attention (twelve to twenty-six weeks for a real business, with the costs still running); knowing people shortens the search.
      const weeks = run.secret.business ? Math.max(8, randInt(run.seed, 12, 26, "raise", run.pub.raisesUsed) - (run.pub.network.contacts >= 5 ? 4 : 0)) : Math.max(2, randInt(run.seed, 3, 9, "raise", run.pub.raisesUsed));
      const advanced = advance(run, weeks);
      const after = withPub(advanced, { raiseWeeks: run.pub.raiseWeeks + (advanced.pub.week - run.pub.week) });
      if (after.pub.status !== "running") return ok(recorded(after, action));
      const cashCents = after.pub.cashCents + RAISE_AMOUNT_CENTS;
      return ok(
        recorded(
          withPub(after, {
            cashCents,
            books: { ...after.pub.books, equityRaisedCents: after.pub.books.equityRaisedCents + RAISE_AMOUNT_CENTS },
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
      if (!isQuestionTriple(action.questions) || !topicsMatch(action.questions, action.topics)) return fail("invalid-questions");
      if (run.pub.cashCents < INTERVIEW_ROUND_CASH_CENTS) return fail("insufficient-cash");
      // People you have met pick up the phone: each one makes a call certain to be answered, and is then spent.
      const warm = run.secret.business ? Math.min(WARM_PER_ROUND, run.pub.network.contacts) : 0;
      const round = runInterviewRound({
        secret: run.secret,
        seed: run.seed,
        index: countOf(run, "interview"),
        week: run.pub.week,
        segment,
        questions: action.questions,
        ...(action.topics ? { topics: action.topics } : {}),
        priceCents: monthlyOf(run.pub.priceCents, run.pub.billing),
        ...(warm > 0 ? { warm } : {}),
      });
      const answered = round.filter((e) => e.outcome === "completed").length;
      const paid = withPub(run, {
        cashCents: run.pub.cashCents - INTERVIEW_ROUND_CASH_CENTS,
        ...(warm > 0 ? { network: { ...run.pub.network, contacts: run.pub.network.contacts - warm } } : {}),
        books: { ...run.pub.books, learningCents: run.pub.books.learningCents + INTERVIEW_ROUND_CASH_CENTS },
        ...withEvidence(run.pub, round),
        log: withLog(run.pub, `Interview round: ${answered} of ${round.length} answered.`),
      });
      // The conversations happened, so the evidence stays even if the week then ends the run.
      return ok(recorded(advance(paid, 1), action));
    }

    case "buildTest": {
      if (!isBuildKind(action.kind)) return fail("invalid-build");
      const spec = run.pub.builds[action.kind];
      const alreadyThere = action.kind === "landing-page" ? run.pub.landingPageBuilt : run.pub.productProgressPct >= 100;
      if (alreadyThere) return fail("already-built");
      if (run.pub.cashCents < spec.cashCents) return fail("insufficient-cash");
      // a team shortens the original worlds' builds; in a chosen business the work takes what it takes (builders add to it each week)
      const weeks = run.secret.business ? spec.weeks : Math.max(1, spec.weeks - run.pub.hires);
      const after = advance(
        withPub(run, {
          cashCents: run.pub.cashCents - spec.cashCents,
          // A fit-out lasts: it is an asset written off over five years, not an expense in the week it is paid.
          books: run.secret.business?.model.id === "location" && action.kind === "prototype" ? { ...run.pub.books, capexCents: run.pub.books.capexCents + spec.cashCents } : { ...run.pub.books, learningCents: run.pub.books.learningCents + spec.cashCents },
          ledger: { ...run.pub.ledger, buildCents: run.pub.ledger.buildCents + spec.cashCents },
        }),
        weeks,
      );
      // If the run ended before the build finished, nothing was built.
      if (after.pub.status !== "running") return ok(recorded(after, action));
      return ok(
        recorded(
          withPub(after, {
            productProgressPct: Math.min(100, after.pub.productProgressPct + spec.progressPct),
            landingPageBuilt: after.pub.landingPageBuilt || action.kind === "landing-page",
            log: withLog(after.pub, `Built ${after.secret.business ? (BUILD_LABEL_BY_MODEL[after.secret.business.model.id][action.kind] ?? action.kind) : `a ${action.kind.replace("-", " ")}`}.`),
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
          monthlyCents: monthlyOf(run.pub.priceCents, run.pub.billing),
          productProgressPct: run.pub.productProgressPct,
        });
        changes = {
          // Payments are real money; only payers in the focus segment become ongoing customers.
          cashCents: run.pub.cashCents - CHANNEL_TEST_BUDGET_CENTS + test.payments * run.pub.priceCents,
          books: { ...run.pub.books, learningCents: run.pub.books.learningCents + CHANNEL_TEST_BUDGET_CENTS, testSalesCents: run.pub.books.testSalesCents + test.payments * run.pub.priceCents },
          // In a chosen business, whoever pays in any group becomes a customer of that group (not only the focus group).
          ...(run.secret.business
            ? {
                payingCustomers: run.pub.payingCustomers + test.payments,
                customersBySegment: run.pub.customersBySegment.map((n, i) => (i === segment ? n + test.payments : n)),
              }
            : { payingCustomers: segment === run.pub.focusSegment ? run.pub.payingCustomers + test.payments : run.pub.payingCustomers }),
          firstPaymentWeek: run.pub.firstPaymentWeek ?? (test.payments > 0 ? run.pub.week : null),
          ...withEvidence(run.pub, [test]),
          log: withLog(run.pub, `Paid test: ${test.payments} of ${test.leads} paid.`),
        };
      } else {
        const test = runChannelTest({ ...base, index: countOf(run, "pickChannel") });
        changes = {
          cashCents: run.pub.cashCents - CHANNEL_TEST_BUDGET_CENTS,
          books: { ...run.pub.books, learningCents: run.pub.books.learningCents + CHANNEL_TEST_BUDGET_CENTS },
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
      if (run.secret.business) {
        const target = action.target ?? null;
        if (target !== null && (!Number.isInteger(target) || target < 0 || target >= run.pub.segmentNames.length)) return fail("invalid-target");
        return ok(recorded(withPub(run, { marketing: { channel, level, target } }), action));
      }
      return ok(recorded(withPub(run, { marketing: { channel, level } }), action));
    }

    case "fire": {
      if (!run.secret.business) return fail("not-implemented");
      const role = action.role;
      if (!(ROLES as readonly string[]).includes(role)) return fail("invalid-role");
      if (run.pub.team[role] < 1) return fail("nobody-to-let-go");
      const wage = run.pub.wages[role];
      const severance = SEVERANCE_WEEKS * wage;
      if (run.pub.cashCents < severance) return fail("insufficient-cash");
      // The newest person in the role goes (the least settled in).
      const at = [...run.pub.hiredAt].map((h, i) => ({ h, i })).filter((x) => x.h.role === role).pop();
      const hiredAt = run.pub.hiredAt.filter((_, i) => i !== at?.i);
      const team = { ...run.pub.team, [role]: run.pub.team[role] - 1 };
      return ok(
        recorded(
          withPub(run, {
            cashCents: run.pub.cashCents - severance,
            books: { ...run.pub.books, operatingCents: run.pub.books.operatingCents + severance },
            hires: run.pub.hires - 1,
            team,
            hiredAt,
            weeklyBurnCents: run.pub.weeklyBurnCents - wage,
            capacity: run.pub.capacitySpec ? capacityWith(run.pub.capacitySpec, team.ops) : null,
            log: withLog(run.pub, `You let someone go (${SEVERANCE_WEEKS} weeks of pay).`),
          }),
          action,
        ),
      );
    }

    case "hire": {
      if (run.secret.business) {
        const role = action.role;
        if (!role || !(ROLES as readonly string[]).includes(role)) return fail("invalid-role");
        if (run.pub.hires >= MAX_TEAM) return fail("hire-limit");
        if (run.pub.team[role] >= ROLE_CAP) return fail("role-limit");
        const wage = run.pub.wages[role];
        // A founder who hires without a month of the new payroll in the bank is gambling: the sim will not let it.
        if (run.pub.cashCents < (run.pub.weeklyBurnCents + wage) * 4) return fail("insufficient-cash");
        // Finding the right person takes weeks of the founder's time.
        const hired = advance(run, Math.max(2, HIRE_SEARCH_WEEKS - (run.pub.network.contacts >= 3 ? 1 : 0)));
        if (hired.pub.status !== "running") return ok(recorded(hired, action));
        const team = { ...hired.pub.team, [role]: hired.pub.team[role] + 1 };
        return ok(
          recorded(
            withPub(hired, {
              hires: hired.pub.hires + 1,
              team,
              hiredAt: [...hired.pub.hiredAt, { role, week: hired.pub.week }],
              weeklyBurnCents: hired.pub.weeklyBurnCents + wage,
              capacity: hired.pub.capacitySpec ? capacityWith(hired.pub.capacitySpec, team.ops) : null,
              log: withLog(hired.pub, `Hired ${role === "builder" ? "a builder" : role === "seller" ? "a salesperson" : "an operations person"}.`),
            }),
            action,
          ),
        );
      }
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

    case "setPromotion": {
      const business = run.secret.business;
      if (!business) return fail("not-implemented");
      if (action.promo === null) {
        // Stop one early: the money is gone, and the cooldown still applies.
        if (!run.pub.promo) return fail("invalid-promotion");
        return ok(recorded(withPub(run, { promo: null, promoCooldown: PROMOTION_COOLDOWN_WEEKS, log: withLog(run.pub, "You ended the promotion early.") }), action));
      }
      const spec = promotionsFor(business.model.id).find((q) => q.id === action.promo);
      if (!spec) return fail("invalid-promotion");
      if (run.pub.promo || run.pub.promoCooldown > 0) return fail("promotion-active");
      if (run.pub.payingCustomers < spec.needsCustomers) return fail("promotion-needs-customers");
      if (run.pub.cashCents < spec.cashCents) return fail("insufficient-cash");
      return ok(
        recorded(
          withPub(run, {
            cashCents: run.pub.cashCents - spec.cashCents,
            books: { ...run.pub.books, marketingCents: run.pub.books.marketingCents + spec.cashCents },
            promo: { id: spec.id, weeksLeft: spec.weeks, signups: 0 },
            log: withLog(run.pub, `Started a promotion: ${spec.name}.`),
          }),
          action,
        ),
      );
    }

    case "network": {
      if (!run.secret.business) return fail("not-implemented");
      if (!(NETWORK_KINDS as readonly string[]).includes(action.kind)) return fail("invalid-network");
      const spec = NETWORK_OPTIONS[action.kind];
      if (run.pub.cashCents < spec.cashCents) return fail("insufficient-cash");
      // Meeting people takes your weeks; who you meet is down to the day.
      const met = randInt(run.seed, spec.min, spec.max, "net", run.pub.network.events);
      const paid = withPub(run, {
        cashCents: run.pub.cashCents - spec.cashCents,
        books: { ...run.pub.books, learningCents: run.pub.books.learningCents + spec.cashCents },
        network: { contacts: run.pub.network.contacts + met, events: run.pub.network.events + 1 },
        log: withLog(run.pub, `Networking: you met ${met} ${met === 1 ? "person" : "people"} who will take your call.`),
      });
      return ok(recorded(advance(paid, spec.weeks), action));
    }

    case "setRnd": {
      if (!run.secret.business) return fail("not-implemented");
      if (!Number.isInteger(action.level) || action.level < 0 || action.level >= RND_LEVELS_CENTS.length) return fail("invalid-level");
      return ok(recorded(withPub(run, { rndLevel: action.level }), action));
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
            books: { ...run.pub.books, loanReceivedCents: run.pub.books.loanReceivedCents + offer.amountCents },
            loan: { weeklyRepaymentCents: offer.weeklyRepaymentCents, weeklyPrincipalCents: Math.floor(offer.amountCents / offer.weeks), weeksLeft: offer.weeks },
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
            customersBySegment: after.pub.customersBySegment.map(() => 0),
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
