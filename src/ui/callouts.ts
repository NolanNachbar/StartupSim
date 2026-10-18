// First-run teaching (DESIGN.md decision D5): at most five one-time notes, shown at the moment each first
// matters, one at a time, never blocking.

export type CalloutId = "dotted" | "pivots" | "interview" | "verified" | "crash";

export interface Callout {
  readonly id: CalloutId;
  readonly text: string;
}

export const CALLOUTS: readonly Callout[] = [
  { id: "dotted", text: "A dotted line is something you believe but have not tested. Your goal is to turn the dotted route into a solid one." },
  { id: "pivots", text: "Pivots remaining is how many times you can change course before the money ends. It counts changes of direction, not months." },
  { id: "interview", text: "Different questions get different answers. Asking about what a customer did last time is worth more than asking what they might do." },
  { id: "verified", text: "A solid blue line means real people paid or did something costly. Compliments and promises never turn a line solid." },
  { id: "crash", text: "The report names the probable cause of this crash. Read it, then run again: every run teaches a different failure." },
];

export type CalloutScreen = "board" | "setup" | "week" | "interview" | "result" | "report" | "other";

export interface CalloutContext {
  readonly enabled: boolean;
  readonly shown: readonly string[];
  readonly screen: CalloutScreen;
  readonly startPivots: number;
  readonly pivotsRemaining: number;
  readonly hasUntested: boolean;
  readonly hasVerified: boolean;
  readonly crashed: boolean;
}

const byId = (id: CalloutId): Callout => CALLOUTS.find((c) => c.id === id) as Callout;

/** The one callout to show now, or null. */
export function nextCallout(ctx: CalloutContext): Callout | null {
  if (!ctx.enabled) return null;
  const fresh = (id: CalloutId) => !ctx.shown.includes(id);
  if (ctx.screen === "report") return ctx.crashed && fresh("crash") ? byId("crash") : null;
  if (ctx.screen === "interview") return fresh("interview") ? byId("interview") : null;
  if (ctx.screen !== "week") return null;
  if (fresh("pivots") && ctx.pivotsRemaining !== ctx.startPivots) return byId("pivots");
  if (fresh("verified") && ctx.hasVerified) return byId("verified");
  if (fresh("dotted") && ctx.hasUntested) return byId("dotted");
  return null;
}
