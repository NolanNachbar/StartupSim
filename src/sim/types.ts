// Shared types for the simulation. `Secret` and its parts are internal: src/ui must not import them
// (ESLint), and the public API in index.ts never exposes them.

export type Cents = number;

export interface Segment {
  readonly name: string;
  readonly pain: number;
  readonly willingnessToPayCents: Cents;
  readonly politeness: number;
  readonly reachability: number;
  readonly size: number;
  readonly incumbentSatisfactionPct: number;
  readonly trueDemand: number;
}

export interface Channel {
  readonly name: string;
  /** What the channel is, in a sentence (chosen businesses only). */
  readonly blurb?: string;
  readonly costPerLeadCents: Cents;
  /** Fit with each segment, 0 to 100, indexed like Secret.segments. */
  readonly fit: readonly number[];
}

export interface Weather {
  readonly startWeek: number;
  readonly endWeek: number;
  readonly demandMultiplierPct: number;
}

/** A stretch of weeks when some customers pay late. Hidden: the player only sees the receivables. */
export interface LateWindow {
  readonly startWeek: number;
  readonly endWeek: number;
  readonly pct: number;
  readonly delayWeeks: number;
}

/** The hidden world. Generated from the seed, never shown to the player directly. */
export interface Secret {
  readonly seed: number;
  readonly problemName: string;
  readonly segments: readonly Segment[];
  readonly channels: readonly Channel[];
  readonly weather: Weather | null;
  readonly lateWindow: LateWindow | null;
  readonly startFocus: number;
  /** The business the player chose (public words used to write what customers say), or null for the generic world. */
  readonly business: import("./business").Business | null;
}

export interface Receivable {
  /** The week the money arrives. */
  readonly week: number;
  readonly amountCents: Cents;
}

export interface LoanOffer {
  readonly amountCents: Cents;
  readonly weeklyRepaymentCents: Cents;
  readonly weeks: number;
  /** The offer disappears once the week reaches this. */
  readonly expiresWeek: number;
}

export interface Loan {
  readonly weeklyRepaymentCents: Cents;
  /** The part of each repayment that pays the loan down (the rest is interest). */
  readonly weeklyPrincipalCents: Cents;
  readonly weeksLeft: number;
}

/** Cumulative books for the whole run. Revenue is accrual revenue. */
export interface Ledger {
  readonly revenueCents: Cents;
  readonly marketingCents: Cents;
  readonly buildCents: Cents;
  readonly payrollCents: Cents;
}

/** Every cash movement, added up since week 0. The three statements are written from these. */
export interface Books {
  readonly startCashCents: Cents;
  readonly equityRaisedCents: Cents;
  readonly loanReceivedCents: Cents;
  readonly principalRepaidCents: Cents;
  readonly interestCents: Cents;
  /** Cash that arrived from customers (revenue earned, less what is still owed, plus what came in late). */
  readonly salesCashCents: Cents;
  /** Payments taken in paid tests. */
  readonly testSalesCents: Cents;
  readonly cogsCents: Cents;
  /** Rent, tools, pay and the team: the weekly cost of running the company. */
  readonly operatingCents: Cents;
  readonly marketingCents: Cents;
  readonly rndCents: Cents;
  /** Interviews, channel tests, paid tests and builds. */
  readonly learningCents: Cents;
  /** Money spent on things that last (a fit-out, equipment): kept as an asset and written off over five years. */
  readonly capexCents: Cents;
  /** How much of the capex has been written off so far. */
  readonly depreciationCents: Cents;
}

export interface Marketing {
  readonly channel: number | null;
  readonly level: number;
  /** The customer group the marketing is aimed at (null: the group the company is focused on). Only with a chosen business. */
  readonly target?: number | null;
}

/** The people you have met who will take your call: warm introductions and the odd referral. Only with a chosen business. */
export interface Network {
  readonly contacts: number;
  /** Networking events attended. */
  readonly events: number;
}

/** The calendar: the month, how busy it is for this industry (100 is an average month), and the next weeks. */
export interface Season {
  /** 0 is January. */
  readonly month: number;
  readonly index: number;
  readonly forecast: readonly number[];
}

/** A promotion that is running (chosen businesses only). */
export interface Promo {
  readonly id: string;
  readonly weeksLeft: number;
  /** Customers won while it runs: they get the discount and they leave faster. */
  readonly signups: number;
}

export interface Team {
  readonly builder: number;
  readonly seller: number;
  readonly ops: number;
}

export type RunStatus = "running" | "crashed" | "landed";
export type EndReason = "cash" | "stalled" | "default-alive";

export interface LogEntry {
  readonly week: number;
  readonly text: string;
}

/** Everything the player may know. Evidence only, no hidden parameters. */
export interface PublicState {
  readonly week: number;
  readonly status: RunStatus;
  readonly endReason: EndReason | null;
  readonly cashCents: Cents;
  readonly weeklyBurnCents: Cents;
  readonly priceCents: Cents;
  readonly pivotCostCents: Cents;
  readonly pivotsRemaining: number;
  readonly pivotsUsed: number;
  readonly raisesUsed: number;
  readonly equityGivenPct: number;
  readonly productProgressPct: number;
  /** Cost of goods as a percent of revenue (0 for the original worlds and for services). */
  readonly cogsPct: number;
  /** The prices the founder can set. */
  readonly priceLadderCents: readonly number[];
  /** What each build costs, how long it takes and how much of the product it adds. */
  readonly builds: Readonly<Record<"landing-page" | "concierge" | "prototype", { readonly weeks: number; readonly cashCents: number; readonly progressPct: number }>>;
  /** How a customer pays (a visit, an order, a job, a night, a month); null in the original worlds, which bill a month. */
  readonly billing: import("./billing").Billing | null;
  readonly payingCustomers: number;
  readonly weeklyRevenueCents: Cents;
  readonly profitableStreakWeeks: number;
  readonly problemName: string;
  readonly segmentNames: readonly string[];
  readonly focusSegment: number;
  readonly log: readonly LogEntry[];
  readonly landingPageBuilt: boolean;
  readonly ledger: Ledger;
  readonly books: Books;
  readonly network: Network;
  /** The promotion running now, or null. */
  readonly promo: Promo | null;
  /** The week a competitor opened nearby (null until then). Only with a chosen business. */
  readonly rivalSince: number | null;
  /** What customers think of you, 0 to 100 (50 is ordinary). Only with a chosen business. */
  readonly reputation: number;
  /** The season, for a chosen business (null in the original worlds). */
  readonly season: Season | null;
  /** Weeks until another promotion can start. */
  readonly promoCooldown: number;
  /** The week of the first paid test that produced a payment. */
  readonly firstPaymentWeek: number | null;
  /** Weeks spent raising money. */
  readonly raiseWeeks: number;
  readonly marketing: Marketing;
  readonly hires: number;
  /** The team by role (the roles of a chosen business: someone who builds, someone who sells, someone who serves customers). */
  readonly team: Team;
  /** Recent weeks' new customers, kept to model how newcomers leave faster than regulars. */
  readonly cohorts: readonly { readonly week: number; readonly n: number; readonly segment: number }[];
  /** When each person on the team started (a chosen business): new people take weeks to get up to speed. */
  readonly hiredAt: readonly { readonly role: "builder" | "seller" | "ops"; readonly week: number }[];
  /** What each role costs a week in this business (cents, salary plus payroll tax and benefits). */
  readonly wages: Readonly<Record<"builder" | "seller" | "ops", number>>;
  /** How many customers the business can serve with nobody extra, and how many more each operations hire adds (null: no limit). */
  readonly capacitySpec: { readonly base: number; readonly perOps: number } | null;
  /** Weekly R&D budget level, 0 for none. */
  readonly rndLevel: number;
  /** What R&D has built up, 0 to 100: a better product that converts and keeps more customers. */
  readonly qualityPct: number;
  /** Paying customers in each group. Their sum is `payingCustomers`. */
  readonly customersBySegment: readonly number[];
  /** The most customers the business can serve now, or null with no limit (the original worlds). */
  readonly capacity: number | null;
  /** Revenue earned but not yet paid. */
  readonly receivables: readonly Receivable[];
  readonly offer: LoanOffer | null;
  readonly loan: Loan | null;
  /** How many loan offers have ever appeared (at most one per run). */
  readonly offersShown: number;
  /** The public price list. How well each channel fits each segment stays hidden. */
  readonly channels: readonly ChannelInfo[];
  /** What the player has learned: interviews and tests. */
  readonly evidence: readonly Evidence[];
  /** What the evidence supports for each segment, derived only from `evidence`. */
  readonly hypotheses: readonly Hypothesis[];
}

export type QuestionType = "past-behavior" | "commitment" | "hypothetical" | "pitch";
export type DebriefTag = "fact" | "fluff" | "compliment";

/** One conversation (or attempted conversation). Never reveals the archetype, the true pain or the quality. */
export interface InterviewEvidence {
  readonly kind: "interview";
  /** What the question was about (see QUESTION_BANK); absent for older runs. */
  readonly topic?: string;
  /** The week the round started. */
  readonly week: number;
  readonly segment: number;
  readonly customer: "stranger" | "friend" | "none";
  readonly question: QuestionType;
  readonly outcome: "no-response" | "ended-early" | "completed";
  /** The post-call debrief; null unless the conversation completed. */
  readonly tag: DebriefTag | null;
  /** How severe they said the problem is, 0 to 100, noisy; null unless completed. */
  readonly painReading: number | null;
  /** Only a completed commitment question. */
  readonly committed: boolean | null;
  readonly quote: string;
}

export type BuildKind = "landing-page" | "concierge" | "prototype";

export interface ChannelInfo {
  readonly name: string;
  readonly blurb?: string;
  readonly costPerLeadCents: Cents;
}

/** Trying a channel on a segment: how many leads $200 reached and how many were interested. */
export interface ChannelTestEvidence {
  readonly kind: "channel-test";
  readonly week: number;
  readonly segment: number;
  readonly channel: number;
  readonly leads: number;
  readonly interested: number;
}

/** Asking real leads for money. Payments are the strongest evidence there is. */
export interface PaidTestEvidence {
  readonly kind: "paid-test";
  readonly week: number;
  readonly segment: number;
  readonly channel: number;
  readonly leads: number;
  readonly payments: number;
  readonly priceCents: Cents;
}

export type Evidence = InterviewEvidence | ChannelTestEvidence | PaidTestEvidence;

export type HypothesisState = "untested" | "weak" | "verified";

export interface Hypothesis {
  readonly segment: number;
  readonly state: HypothesisState;
  /** Completed interviews. */
  readonly interviews: number;
  /** Total interested leads from channel tests. */
  readonly interested: number;
  /** Total payments from paid tests. */
  readonly payments: number;
  /** Paid tests with 10 or more leads and no payment. */
  readonly failedPaidTests: number;
}

export type ReservedActionType = "doubleDown";

export type Action =
  | { readonly type: "wait" }
  | { readonly type: "setPrice"; readonly priceCents: Cents }
  | { readonly type: "raiseMoney" }
  | { readonly type: "pivot"; readonly toSegment: number }
  | { readonly type: "interview"; readonly segment: number; readonly questions: readonly QuestionType[]; readonly topics?: readonly string[] }
  | { readonly type: "buildTest"; readonly kind: BuildKind }
  | { readonly type: "pickChannel"; readonly segment: number; readonly channel: number }
  | { readonly type: "chargeTest"; readonly segment: number; readonly channel: number }
  | { readonly type: "setMarketing"; readonly channel: number | null; readonly level: number; readonly target?: number | null }
  | { readonly type: "hire"; readonly role?: import("./realism").Role }
  | { readonly type: "setRnd"; readonly level: number }
  | { readonly type: "fire"; readonly role: import("./realism").Role }
  | { readonly type: "setPromotion"; readonly promo: string | null }
  | { readonly type: "network"; readonly kind: "coffee" | "meetup" | "conference" }
  | { readonly type: "respondOffer"; readonly accept: boolean }
  | { readonly type: ReservedActionType };

export type IllegalReason =
  | "unknown-action"
  | "run-finished"
  | "not-implemented"
  | "invalid-price"
  | "invalid-segment"
  | "invalid-questions"
  | "invalid-build"
  | "invalid-channel"
  | "already-built"
  | "nothing-to-sell"
  | "invalid-level"
  | "hire-limit"
  | "invalid-role"
  | "role-limit"
  | "invalid-target"
  | "invalid-network"
  | "nobody-to-let-go"
  | "invalid-promotion"
  | "promotion-active"
  | "promotion-needs-customers"
  | "no-offer"
  | "investors-want-proof"
  | "insufficient-cash"
  | "no-pivots-left"
  | "raise-limit";

export type LoadError = "invalid" | "version-mismatch" | "replay-failed";

export interface Save {
  simVersion: number;
  seed: number;
  /** The market (an index into CATALOG.industries). Absent for the original generic world. */
  industry?: number;
  /** The business model (an index into MODELS). Absent when none was chosen. */
  model?: number;
  /** The player's idea in their own words. Present with a model. */
  idea?: string;
  /** The player's own customer groups and wording, when they changed the defaults. */
  custom?: import("./business").Custom;
  /** An index into DIFFICULTIES. Absent for Normal. */
  difficulty?: number;
  /** The starting money in cents, when the player set it. */
  startCash?: number;
  actions: Action[];
}

export type PatternId = "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V8" | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";

export interface Cause {
  readonly id: PatternId;
  readonly title: string;
  readonly evidence: readonly string[];
  readonly lesson: string;
}

/** The accident report for a finished run. */
export interface Report {
  readonly outcome: "landed" | "crashed" | "stalled";
  readonly headline: string;
  readonly summary: string;
  readonly probableCause: Cause | null;
  readonly contributing: readonly Cause[];
  /** The probable cause's fix: one concrete action that would have changed the outcome. */
  readonly wouldHaveChanged: string | null;
  readonly noDominantCause: boolean;
  /** Every number the text quotes, as written. */
  readonly numbers: readonly string[];
}
