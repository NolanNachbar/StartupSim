// What the evidence supports, per segment. Derived from the evidence list alone: no hidden world, no
// order dependence. Payment is the only thing that verifies a hypothesis; compliments, fluff,
// promises and interest can make it weak but never verified.
import type { Evidence, Hypothesis } from "./types";

const MIN_LEADS_FOR_A_FAILED_TEST = 10;

export function hypothesesFrom(evidence: readonly Evidence[], segmentCount: number): Hypothesis[] {
  const interviews = new Array<number>(segmentCount).fill(0);
  const interested = new Array<number>(segmentCount).fill(0);
  const payments = new Array<number>(segmentCount).fill(0);
  const failed = new Array<number>(segmentCount).fill(0);

  for (const e of evidence) {
    if (e.segment < 0 || e.segment >= segmentCount) continue;
    if (e.kind === "interview") {
      if (e.outcome === "completed") interviews[e.segment] = (interviews[e.segment] ?? 0) + 1;
    } else if (e.kind === "channel-test") {
      interested[e.segment] = (interested[e.segment] ?? 0) + e.interested;
    } else {
      payments[e.segment] = (payments[e.segment] ?? 0) + e.payments;
      if (e.payments === 0 && e.leads >= MIN_LEADS_FOR_A_FAILED_TEST) failed[e.segment] = (failed[e.segment] ?? 0) + 1;
    }
  }

  return Array.from({ length: segmentCount }, (_, segment) => {
    const paid = payments[segment] ?? 0;
    const talked = interviews[segment] ?? 0;
    const keen = interested[segment] ?? 0;
    return {
      segment,
      state: paid >= 1 ? "verified" : talked >= 1 || keen >= 1 ? "weak" : "untested",
      interviews: talked,
      interested: keen,
      payments: paid,
      failedPaidTests: failed[segment] ?? 0,
    } as const;
  });
}
