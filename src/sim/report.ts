// The accident report. It rebuilds a run's history by replaying its seed and actions, applies explicit
// rules over that history, and writes text from numbers in the history alone. It explains a run from
// what the player could see: it never reads the hidden parts of the world.
import { INTERVIEW_ROUND_CASH_CENTS, MAX_WEEKS } from "./runway";
import { step } from "./reducer";
import { initialRun } from "./state";
import type { Action, Cause, PublicState, Report } from "./types";

export interface HistoryStep {
  readonly action: Action;
  readonly before: PublicState;
  readonly after: PublicState;
}

export interface History {
  readonly steps: readonly HistoryStep[];
  readonly final: PublicState;
}

export interface PatternFinding extends Cause {
  /** Bigger means closer to the cause of death. */
  readonly weight: number;
  readonly headline: string;
  /** One concrete action that would have changed the outcome. */
  readonly fix: string;
}

/** Cents as dollars with thousands separators, using integer math only. */
export function usd(cents: number): string {
  const negative = cents < 0;
  const dollars = Math.trunc(Math.abs(cents) / 100);
  const digits = String(dollars);
  let grouped = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += ",";
    grouped += digits.charAt(i);
  }
  return `${negative ? "-" : ""}$${grouped}`;
}

/** Replay a run and keep the public state before and after every action. */
export function buildHistory(seed: number, actions: readonly Action[], industry: number | null = null): History {
  let run = initialRun(seed, industry);
  const steps: HistoryStep[] = [];
  for (const action of actions) {
    const result = step(run, action);
    if (!result.ok) throw new Error(`replay failed at step ${steps.length}: ${result.reason}`);
    steps.push({ action, before: run.pub, after: result.run.pub });
    run = result.run;
  }
  return { steps, final: run.pub };
}

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

const CUSTOMER_STEPS: ReadonlySet<string> = new Set(["interview", "pickChannel", "chargeTest"]);

const count = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? "" : "s"}`;
const weeks = (n: number): string => count(n, "week");

type Rule = (h: History) => PatternFinding | null;

const maxProgress = (h: History): number => h.steps.reduce((m, s) => Math.max(m, s.after.productProgressPct), h.final.productProgressPct);
const crashedOnCash = (h: History): boolean => h.final.status === "crashed" && h.final.endReason === "cash";

const v1: Rule = (h) => {
  const first = h.steps.findIndex((s) => CUSTOMER_STEPS.has(s.action.type));
  let week: number;
  let evidence: string;
  if (first >= 0) {
    const s = h.steps[first];
    if (!s || s.before.week < 6 || s.before.productProgressPct < 20) return null;
    week = s.before.week;
    evidence = `The first customer conversation came in week ${week}, after ${usd(s.before.ledger.buildCents)} had gone into building.`;
  } else {
    if (h.final.ledger.buildCents <= 0 || maxProgress(h) < 20) return null;
    week = h.final.week;
    evidence = `${usd(h.final.ledger.buildCents)} went into building and no customer conversation happened in ${weeks(week)}.`;
  }
  return {
    id: "V1",
    title: "Built first, asked later",
    // The root cause of a build-first run: it outranks the symptoms (no paid test, bad growth spend) it produces.
    weight: 50 + Math.min(week, 20),
    headline: `The product took shape first. The first buyer conversation happened in week ${week}.`,
    evidence: [evidence],
    fix: `A ${usd(INTERVIEW_ROUND_CASH_CENTS)} interview round in week 1 takes one week and shows whether anyone has the problem before money goes into a build.`,
    lesson: "Lean Startup: Build-Measure-Learn",
  };
};

const v2: Rule = (h) => {
  const done = h.final.evidence.filter((e) => e.kind === "interview" && e.outcome === "completed");
  if (done.length < 3) return null;
  const flattering = done.filter((e) => e.kind === "interview" && (e.question === "pitch" || e.question === "hypothetical" || e.customer === "friend"));
  if (flattering.length * 10 < done.length * 6) return null;
  return {
    id: "V2",
    title: "Polite-lie validation",
    weight: 40 + done.length,
    headline: `${flattering.length} of ${done.length} conversations were pitches, hypotheticals or friends. Nobody had to be honest.`,
    evidence: [`${flattering.length} of ${done.length} completed interviews asked what people might do, or came from friends.`],
    fix: "Ask each stranger about the last time the problem happened and what they did about it. A story with a date is evidence; \"sounds great\" is not.",
    lesson: "Mom Test: Deflect Compliments, Anchor Fluff",
  };
};

const v3: Rule = (h) => {
  if (h.steps.some((s) => s.action.type === "chargeTest")) return null;
  const built = h.steps.find((s) => s.after.productProgressPct >= 20);
  if (!built) return null;
  return {
    id: "V3",
    title: "Interest mistaken for demand",
    weight: 50,
    headline: `The product reached ${built.after.productProgressPct} percent in week ${built.after.week} and nobody was ever asked to pay.`,
    evidence: [`Nobody was ever asked to pay in ${weeks(h.final.week)}, with the product at ${maxProgress(h)} percent.`],
    fix: "After the landing page, run one paid test. Money from a stranger settles in a week what compliments cannot settle in a year.",
    lesson: "Mom Test: Commitment and Advancement",
  };
};

const v4: Rule = (h) => {
  const built = h.steps.find((s) => s.after.productProgressPct >= 60);
  if (!built) return null;
  const marketing = h.steps.find((s) => s.action.type === "setMarketing" && s.after.marketing.level > 0);
  const idle = (marketing ? marketing.before.week : h.final.week) - built.after.week;
  if (idle < 8) return null;
  return {
    id: "V4",
    title: "Distribution as an afterthought",
    weight: idle + 30,
    headline: `The product was ready in week ${built.after.week} and no channel existed for ${weeks(idle)}.`,
    evidence: [`Marketing stayed off for ${weeks(idle)} after the product passed 60 percent.`],
    fix: "Test two channels while the product is still being built. The cheapest lead that fits your segment decides how fast any product can grow.",
    lesson: "Lean Startup: The Engines of Growth",
  };
};

const v5: Rule = (h) => {
  if (maxProgress(h) < 20) return null;
  const focus = h.final.focusSegment;
  const talked = h.final.evidence.some((e) => e.segment === focus && ((e.kind === "interview" && e.outcome === "completed") || e.kind === "paid-test"));
  if (talked) return null;
  const name = h.final.segmentNames[focus] ?? `segment ${focus + 1}`;
  return {
    id: "V5",
    title: "Sold to people never talked to",
    weight: 45,
    headline: `The company ended up serving ${name}, a group nobody had spoken to.`,
    evidence: [`The final focus, ${name}, had no completed interview and no paid test in ${weeks(h.final.week)}.`],
    fix: `Interview ${name} before pivoting to it. Five conversations show who actually has the problem and where to find them.`,
    lesson: "Mom Test: Segment Until You Know Where to Find Them",
  };
};

const v6: Rule = (h) => {
  const paid = h.steps.find((s) => s.after.firstPaymentWeek !== null && s.before.firstPaymentWeek === null);
  const spent = paid ? paid.after.ledger.buildCents : h.final.ledger.buildCents;
  if (spent < 600_000) return null;
  return {
    id: "V6",
    title: "Over-built before proof",
    weight: 30 + Math.floor(spent / 100_000),
    headline: `${usd(spent)} went into building before the first customer paid anything.`,
    evidence: [`Build spending reached ${usd(spent)} ${paid ? `by the first payment in week ${paid.before.week}` : "with no payment ever"}.`],
    fix: "Sell the smallest version first. A $300 landing page and a paid test show whether the prototype is worth $2,500.",
    lesson: "Lean Startup: Minimum Viable Product",
  };
};

const v8: Rule = (h) => {
  const away = h.steps.find((s) => s.action.type === "pivot" && (s.before.hypotheses[s.before.focusSegment]?.payments ?? 0) >= 1);
  if (h.final.pivotsUsed < 3 && !away) return null;
  const n = h.final.pivotsUsed;
  return {
    id: "V8",
    title: "Restarted instead of learning",
    weight: 35 + 5 * n,
    headline: away
      ? `The company pivoted in week ${away.before.week}, away from a segment that had already paid.`
      : `${n} pivots in ${weeks(h.final.week)}: each fresh start threw away what the last one taught.`,
    evidence: away
      ? [`A pivot in week ${away.before.week} left behind a segment with ${count(away.before.hypotheses[away.before.focusSegment]?.payments ?? 0, "payment")}.`]
      : [`${n} pivots used, each costing a week and half the product.`],
    fix: "Before a pivot, write down what the last attempt proved. Pivot away from a segment that paid only when a better-evidenced one exists.",
    lesson: "Lean Startup: The Pivot",
  };
};

const m1: Rule = (h) => {
  if (h.final.status === "landed" || h.final.week <= 0) return null;
  const LOW = 1900;
  let price = initialPrice(h);
  let at = 0;
  let low = 0;
  for (const s of h.steps) {
    if (s.action.type !== "setPrice") continue;
    if (price <= LOW) low += s.before.week - at;
    price = s.after.priceCents;
    at = s.before.week;
  }
  if (price <= LOW) low += h.final.week - at;
  if (low * 10 < h.final.week * 4) return null;
  return {
    id: "M1",
    title: "Underpricing",
    weight: 55,
    headline: `${weeks(low)} of ${weeks(h.final.week)} ran at ${usd(LOW)} a month or less.`,
    evidence: [`The price sat at ${usd(LOW)} or below for ${low} of ${h.final.week} weeks.`],
    fix: "Charge in a paid test at two prices. People who pay more are usually the ones who stay.",
    lesson: "Lean Startup: Innovation Accounting",
  };
};

/** The price in effect before any setPrice step. */
function initialPrice(h: History): number {
  const first = h.steps[0];
  return first ? first.before.priceCents : h.final.priceCents;
}

const m2: Rule = (h) => {
  if (!crashedOnCash(h)) return null;
  const fp = h.final.firstPaymentWeek;
  if (fp !== null && fp <= 30) return null;
  return {
    id: "M2",
    title: "Money ran out before proof",
    weight: 50,
    headline: `Cash lasted ${weeks(h.final.week)}. ${fp === null ? "The first payment never came" : `The first payment came in week ${fp}`}.`,
    evidence: [fp === null ? `No payment ever arrived in ${weeks(h.final.week)}.` : `The first payment arrived in week ${fp}, past week 30.`],
    fix: "Count runway in pivots, not months. Spend the first pivot on a paid test so that proof arrives before the money does.",
    lesson: "Lean Startup: Runway Is Pivots Remaining",
  };
};

const m3: Rule = (h) => {
  const { marketingCents: m, revenueCents: r } = h.final.ledger;
  if (m < 400_000 || m * 2 < r * 3) return null;
  return {
    id: "M3",
    title: "Growth on bad unit economics",
    weight: 55,
    headline: `Marketing cost ${usd(m)} and the customers it won paid back ${usd(r)}.`,
    evidence: [`${usd(m)} of marketing against ${usd(r)} of revenue over ${weeks(h.final.week)}.`],
    fix: "Watch what one customer costs to win against what they pay. Cut the budget a level when payback is not inside a few months.",
    lesson: "Lean Startup: Vanity vs Actionable Metrics",
  };
};

const m4: Rule = (h) => {
  if (!(h.final.status === "crashed" && h.final.endReason === "stalled" && h.final.raisesUsed >= 1)) return null;
  return {
    id: "M4",
    title: "The zombie",
    weight: 60,
    headline: `Funded, alive at week ${MAX_WEEKS}, and never close to default alive.`,
    evidence: [`${usd(h.final.cashCents)} in the bank at week ${h.final.week}, ${h.final.equityGivenPct} percent of the company sold, no landing.`],
    fix: "When growth stalls, change course while cash is still plentiful. A pivot at half the runway beats a slow fade at week 100.",
    lesson: "Lean Startup: The Land of the Living Dead",
  };
};

const m5: Rule = (h) => {
  if (!crashedOnCash(h)) return null;
  const loan = h.steps.find((s) => s.action.type === "respondOffer" && s.after.loan !== null && s.before.loan === null);
  if (loan) {
    return {
      id: "M5",
      title: "Cash-flow trap",
      weight: 70,
      headline: `The fast cash taken in week ${loan.before.week} was repaid out of the money it was meant to save.`,
      evidence: [`The loan taken in week ${loan.before.week} drained ${usd(loan.after.loan?.weeklyRepaymentCents ?? 0)} a week until cash ran out in week ${h.final.week}.`],
      fix: "Turn down fast money that is repaid weekly. Raise equity, cut a cost, or sell a paid test instead of renting cash at 40 percent.",
      lesson: "Money and Risk: debt that bleeds cash",
    };
  }
  const paper = h.steps.reduce((m, s) => Math.max(m, s.after.profitableStreakWeeks), h.final.profitableStreakWeeks);
  if (paper < 3) return null;
  return {
    id: "M5",
    title: "Cash-flow trap",
    weight: 60,
    headline: `Revenue covered costs for ${weeks(paper)} in a row and cash still ran out in week ${h.final.week}.`,
    evidence: [`Profitable on paper for ${paper} straight weeks, yet cash ended at ${usd(h.final.cashCents)}.`],
    fix: "Watch cash, not revenue. Late payers move money weeks away, so keep a cushion of at least six weeks of costs.",
    lesson: "Money and Risk: profit is not cash",
  };
};

const m6: Rule = (h) => {
  if (!crashedOnCash(h) || h.final.raiseWeeks < 10) return null;
  return {
    id: "M6",
    title: "Fundraising as a second job",
    weight: 5 * h.final.raiseWeeks,
    headline: `${weeks(h.final.raiseWeeks)} of ${weeks(h.final.week)} went into raising money.`,
    evidence: [`${h.final.raiseWeeks} of ${h.final.week} weeks were spent raising while the product waited.`],
    fix: "Raise once, early, with a clear plan to prove one thing. Every week spent raising is a week not testing.",
    lesson: "Bootstrapping and Small Bets: timebox the bet",
  };
};

const m7: Rule = (h) => {
  if (h.final.status === "landed" || h.final.ledger.payrollCents <= 0) return null;
  const hire = h.steps.find((s) => s.action.type === "hire");
  if (!hire) return null;
  const fp = h.final.firstPaymentWeek;
  if (fp !== null && fp < hire.before.week) return null;
  return {
    id: "M7",
    title: "Hired ahead of revenue",
    weight: 50,
    headline: `Payroll of ${usd(h.final.ledger.payrollCents)} was paid before any customer paid anything.`,
    evidence: [`The first hire came in week ${hire.before.week}; ${fp === null ? "no payment ever arrived" : `the first payment came in week ${fp}`}.`],
    fix: "Hire only after a customer has paid and the work is the bottleneck. A contractor costs $1,000 a week whether or not anyone buys.",
    lesson: "Bootstrapping and Small Bets: keep fixed costs near zero",
  };
};

const RULES: readonly Rule[] = [v1, v2, v3, v4, v5, v6, v8, m1, m2, m3, m4, m5, m6, m7];

/** Every pattern that fires, heaviest first (ties keep the table order). Nothing fires for a landing. */
export function findPatterns(history: History): PatternFinding[] {
  if (history.final.status === "landed") return [];
  const found: PatternFinding[] = [];
  for (const rule of RULES) {
    const f = rule(history);
    if (f) found.push(f);
  }
  return found
    .map((f, i) => ({ f, i }))
    .sort((a, b) => b.f.weight - a.f.weight || a.i - b.i)
    .map((x) => x.f);
}

// ---------------------------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------------------------

const NUMBER = /-?\$?\d+(?:,\d{3})*/g;

function cause(f: PatternFinding): Cause {
  return { id: f.id, title: f.title, evidence: f.evidence, lesson: f.lesson };
}

function numbersIn(...texts: readonly (string | null)[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) for (const m of t?.match(NUMBER) ?? []) seen.add(m);
  return [...seen];
}

export function buildReport(history: History): Report {
  const f = history.final;
  const findings = findPatterns(history);
  const top = findings[0];
  const outcome: Report["outcome"] = f.status === "landed" ? "landed" : f.endReason === "stalled" ? "stalled" : "crashed";

  if (outcome === "landed") {
    const proof = f.firstPaymentWeek === null ? "" : ` The first payment arrived in week ${f.firstPaymentWeek}.`;
    const headline = `You landed in week ${f.week}.`;
    const summary = `By week ${f.week}, revenue had covered costs for 8 weeks in a row with ${f.payingCustomers} paying customers.${proof}`;
    return { outcome, headline, summary, probableCause: null, contributing: [], wouldHaveChanged: null, noDominantCause: false, numbers: numbersIn(headline, summary) };
  }

  const summary =
    outcome === "stalled"
      ? `The flight ran the full ${weeks(f.week)} without becoming a viable business.`
      : `The flight lasted ${weeks(f.week)} and ended when cash ran out.`;
  if (!top) {
    const talks = f.evidence.filter((e) => e.kind === "interview" && e.outcome === "completed").length;
    const paidTests = f.evidence.filter((e) => e.kind === "paid-test").length;
    const headline = `No single mistake ended this flight in week ${f.week}.`;
    const facts = `Closest facts: ${talks} completed conversations, ${paidTests} paid tests, ${f.payingCustomers} paying customers, ${usd(f.cashCents)} left.`;
    return {
      outcome, headline, summary: `${summary} ${facts}`, probableCause: null, contributing: [],
      wouldHaveChanged: null, noDominantCause: true, numbers: numbersIn(headline, summary, facts),
    };
  }

  const contributing = findings.slice(1, 4).map(cause);
  const all = [top, ...findings.slice(1, 4)];
  return {
    outcome,
    headline: top.headline,
    summary,
    probableCause: cause(top),
    contributing,
    wouldHaveChanged: top.fix,
    noDominantCause: false,
    numbers: numbersIn(top.headline, summary, ...all.flatMap((x) => x.evidence), top.fix),
  };
}
