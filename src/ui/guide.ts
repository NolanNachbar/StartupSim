// The path: five milestones that show how far along the road to default alive a run is. It reports what has been
// achieved and never what to do next; working out how to win is the game. Reads only public state.
import { CATALOG, type Evidence, type PublicState } from "../sim";

export type StepId = "talk" | "build" | "sell" | "earn" | "land";

export interface PathStep {
  readonly id: StepId;
  readonly label: string;
  readonly done: boolean;
  readonly current: boolean;
}

export interface PathProgress {
  readonly steps: readonly PathStep[];
  /** 0 to 1: how far along the road to default alive. */
  readonly fraction: number;
}

const interviews = (s: PublicState) => s.evidence.filter((e): e is Extract<Evidence, { kind: "interview" }> => e.kind === "interview" && e.outcome === "completed");
const paidTests = (s: PublicState) => s.evidence.filter((e): e is Extract<Evidence, { kind: "paid-test" }> => e.kind === "paid-test");

export function pathProgress(s: PublicState): PathProgress {
  const landed = s.status === "landed";
  const done: Record<StepId, boolean> = {
    talk: landed || interviews(s).length >= 3,
    build: landed || s.landingPageBuilt || s.productProgressPct > 0,
    sell: landed || paidTests(s).length > 0,
    earn: landed || s.firstPaymentWeek !== null,
    land: landed,
  };
  const labels: Record<StepId, string> = { talk: "Talk to customers", build: "Build a test", sell: "Ask for money", earn: "Get paid", land: "Cover your costs" };
  const order: StepId[] = ["talk", "build", "sell", "earn", "land"];
  const firstOpen = order.find((id) => !done[id]);
  const steps = order.map((id) => ({ id, label: labels[id], done: done[id], current: id === firstOpen }));
  let fraction = steps.filter((x) => x.done).length / order.length;
  if (done.earn && !landed) fraction += Math.min(1, s.profitableStreakWeeks / CATALOG.landingStreakWeeks) / order.length;
  else if (!done.earn && !landed && done.sell) fraction += 0.5 / order.length;
  return { steps, fraction: Math.min(1, fraction) };
}
