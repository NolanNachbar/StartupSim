// The stage the company is in, what it means, and what you can do in it. Derived only from public state, and written in
// the words of the chosen business. It explains what each option is for; it never says which one to pick.
import { CATALOG, type Business, type PublicState } from "../sim";
import type { FormId } from "./forms";

export const STAGE_COUNT = 5;

export interface StageStep {
  readonly form: FormId;
  readonly label: string;
  /** What this does and why you might do it, in one sentence. */
  readonly why: string;
}

/** One thing the stage asks of you before the next stage, and whether it is done now. */
export interface StageGoal {
  readonly label: string;
  readonly done: boolean;
  /** The action that does it, when there is one. */
  readonly form?: FormId;
}

/** Whether an action cannot work yet, and what to do first. Rules live in the sim; this only explains them. */
export function lockedReason(form: FormId, s: PublicState): { reason: string; first: FormId } | null {
  if (form === "charge" && !s.landingPageBuilt) {
    return { reason: "Not yet: there is nothing built to sell. Build the first test (a page people can pay on), then return to this.", first: "build" };
  }
  return null;
}

export interface StageInfo {
  /** What you need to do to reach the next stage ("" on the last). */
  readonly exitTitle: string;
  readonly goals: readonly StageGoal[];
  readonly index: number;
  readonly name: string;
  readonly names: readonly string[];
  readonly what: string;
  /** The same in a few words, for the map screen. */
  readonly short: string;
  readonly steps: readonly StageStep[];
}

const NAMES: Record<string, readonly string[]> = {
  software: ["Idea", "Validating", "Building", "Launched", "Growing"],
  service: ["Idea", "Validating", "Preparing", "Running", "Growing"],
  location: ["Idea", "Validating", "Setting up", "Open for business", "Growing"],
  product: ["Idea", "Validating", "Making it", "On sale", "Growing"],
};

/** 0 Idea, 1 Validating, 2 Building (getting ready), 3 Launched (ready, no customers yet), 4 Growing (customers are paying). */
export function stageIndex(s: PublicState): number {
  if (s.productProgressPct >= 100) return s.payingCustomers > 0 ? 4 : 3;
  if (s.landingPageBuilt || s.productProgressPct > 0 || s.firstPaymentWeek !== null) return 2;
  if (s.evidence.length > 0) return 1;
  return 0;
}

export function stageInfo(s: PublicState, b: Business | null): StageInfo {
  const index = stageIndex(s);
  const names = NAMES[b?.model.id ?? "software"] ?? (NAMES.software as readonly string[]);
  const idea = b?.idea ?? "your idea";
  const place = b?.model.id === "location";
  const what = [
    `You have an idea, ${idea}, and no proof yet that anyone wants it. Right now everything you know is a guess.`,
    "You have started to learn. The next question is whether people will really pay, not only say they like it.",
    place ? "People want it. Now you have to set the place up: it takes your time and cash, and a team can work on it while you talk to customers." : "People want it. Now you have to get it ready: it takes your time and cash, and a team can work on it while you talk to customers.",
    place ? "The doors are open. Now you need people to come, and enough staff to serve them." : "It is ready. Now you need customers, and a way to reach them.",
    "People are paying. Now the question is whether you can cover your costs and grow before the money or your time runs out.",
  ][index] as string;
  const steps: readonly StageStep[][] = [
    [
      { form: "interview", label: "Interview people", why: "Hold three conversations with one customer group. The questions you ask decide what you learn." },
      { form: "test-channel", label: "Test a channel", why: `Spend a little to see which group responds when you put ${idea} in front of them.` },
      { form: "network", label: "Network", why: "Meet people who will take your call: warm interviews that always get answered, and introductions." },
    ],
    [
      { form: "charge", label: "Charge for a test", why: "Ask real people to pay. A payment counts for more than a compliment." },
      { form: "interview", label: "Interview more people", why: "Ask about a different group, or ask different questions." },
      { form: "build", label: "Build a first version", why: "The cheapest build is what lets you ask people to pay in a test." },
    ],
    [
      { form: "build", label: "Build", why: "Spend your time and cash to get closer to ready." },
      { form: "hire", label: "Hire someone", why: "A builder works on it every week without you, so you can keep talking to customers." },
      { form: "rnd", label: "Spend on R&D", why: "Every week of R&D makes what you offer better, which helps it sell and keeps customers." },
    ],
    [
      { form: "marketing", label: "Set marketing", why: "Pay to reach people in the group you aim at." },
      { form: "promotion", label: "Run a promotion", why: "A time-limited offer to win customers. It costs margin, and the people it wins leave sooner." },
      { form: "price", label: "Set your price", why: "What you charge decides how many people buy and how much you keep." },
      { form: "hire", label: "Hire someone", why: "A salesperson reaches people by hand; an operations person lets you serve more customers." },
    ],
    [
      { form: "hire", label: "Hire someone", why: "At your limit, customers leave. More operations people raise it, for a weekly cost." },
      { form: "rnd", label: "Spend on R&D", why: "A better offer keeps customers and lets you charge more." },
      { form: "raise", label: "Raise money", why: "Outside money buys time, for a share of the company and weeks of your attention." },
    ],
  ];
  const short = ["Nothing is proven yet.", "You are learning what people want.", place ? "Time to set the place up." : "Time to get it ready.", place ? "Open. Now people need to come." : "Ready. Now find customers.", "People are paying."][index] as string;
  const next = names[index + 1];
  const goals: readonly (readonly StageGoal[])[] = [
    [
      { label: "Hold a round of customer interviews with one group", done: s.evidence.some((e) => e.kind === "interview"), form: "interview" },
      { label: "Or test a channel to see who responds", done: s.evidence.some((e) => e.kind === "channel-test"), form: "test-channel" },
    ],
    [
      { label: "Build the first test, a page people can pay on", done: s.landingPageBuilt, form: "build" },
      { label: "Or get a first payment from a paid test", done: s.firstPaymentWeek !== null, form: "charge" },
    ],
    [
      { label: `Get ${place ? "the place" : "the product"} to 100 percent (now ${s.productProgressPct} percent)`, done: s.productProgressPct >= 100, form: "build" },
      { label: "A builder on your team adds to it every week without you", done: s.team.builder > 0, form: "hire" },
    ],
    [
      { label: "Win your first paying customer: aim marketing at a group, or charge a paid test", done: s.payingCustomers > 0, form: "marketing" },
    ],
    [
      { label: `Cover your costs ${CATALOG.landingStreakWeeks} weeks in a row (${s.profitableStreakWeeks} so far)`, done: s.profitableStreakWeeks >= CATALOG.landingStreakWeeks, form: "price" },
    ],
  ];
  const exitTitle = next ? (index === 1 ? `To reach ${next}, do either:` : index === 0 ? `To reach ${next}, do either:` : `To reach ${next}:`) : "";
  return { index, name: names[index] as string, names, what, short, steps: steps[index] as readonly StageStep[], exitTitle: index === 4 ? `To land the company (the win):` : exitTitle, goals: goals[index] as readonly StageGoal[] };
}
