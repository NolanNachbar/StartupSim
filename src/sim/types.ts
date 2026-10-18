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
  readonly costPerLeadCents: Cents;
  /** Fit with each segment, 0 to 100, indexed like Secret.segments. */
  readonly fit: readonly number[];
}

export interface Weather {
  readonly startWeek: number;
  readonly endWeek: number;
  readonly demandMultiplierPct: number;
}

/** The hidden world. Generated from the seed, never shown to the player directly. */
export interface Secret {
  readonly seed: number;
  readonly problemName: string;
  readonly segments: readonly Segment[];
  readonly channels: readonly Channel[];
  readonly weather: Weather | null;
  readonly startFocus: number;
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
  readonly payingCustomers: number;
  readonly weeklyRevenueCents: Cents;
  readonly profitableStreakWeeks: number;
  readonly problemName: string;
  readonly segmentNames: readonly string[];
  readonly focusSegment: number;
  readonly log: readonly LogEntry[];
  /** Reserved for interviews and tests (M2, M3). */
  readonly evidence: readonly never[];
}

export type ReservedActionType =
  | "interview"
  | "buildTest"
  | "chargeTest"
  | "pickChannel"
  | "hire"
  | "doubleDown";

export type Action =
  | { readonly type: "wait" }
  | { readonly type: "setPrice"; readonly priceCents: Cents }
  | { readonly type: "raiseMoney" }
  | { readonly type: "pivot"; readonly toSegment: number }
  | { readonly type: ReservedActionType };

export type IllegalReason =
  | "unknown-action"
  | "run-finished"
  | "not-implemented"
  | "invalid-price"
  | "invalid-segment"
  | "no-pivots-left"
  | "raise-limit";

export type LoadError = "invalid" | "version-mismatch" | "replay-failed";

export interface Save {
  simVersion: number;
  seed: number;
  actions: Action[];
}
