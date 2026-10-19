// The action forms. Each form is data: its fields and how to turn the chosen values into a sim action.
// Rules live in the sim; a form never decides whether an action is legal, it only builds the action.
import { CATALOG, type Action, type BuildKind, type PublicState, type QuestionType } from "../sim";
import { money, questionLabel } from "./format";

export type FormId =
  | "interview" | "build" | "test-channel" | "charge" | "price" | "marketing" | "hire" | "raise" | "pivot" | "offer";

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

export interface Field {
  readonly id: string;
  readonly label: string;
  readonly kind: "radio" | "select";
  readonly options: readonly Option[];
  readonly initial: string;
}

export interface FormDef {
  readonly id: FormId;
  /** The name on the action list and the form heading. */
  readonly title: string;
  /** One plain line on what the action is. It says what it does, never when to use it. */
  readonly blurb: string;
  readonly intro: (s: PublicState) => string;
  readonly fields: (s: PublicState) => readonly Field[];
  readonly submit: string;
  readonly build: (v: Readonly<Record<string, string>>, s: PublicState) => Action;
  /** Hide the form from the list when it cannot apply at all (for example, no loan offer). */
  readonly listed: (s: PublicState) => boolean;
}

const segmentField = (s: PublicState, label = "Customer group"): Field => ({
  id: "segment",
  label,
  kind: "radio",
  options: s.segmentNames.map((name, i) => ({ value: String(i), label: name })),
  initial: String(s.focusSegment),
});

const channelField = (s: PublicState): Field => ({
  id: "channel",
  label: "Channel",
  kind: "radio",
  options: s.channels.map((c, i) => ({ value: String(i), label: c.name, hint: `${money(c.costPerLeadCents)} a lead` })),
  initial: "0",
});

const BUILD_NAMES: Record<BuildKind, string> = {
  "landing-page": "Landing page",
  concierge: "Concierge version",
  prototype: "Prototype",
};

const LEVEL_NAMES = ["Off", "Light", "Steady", "Heavy"];

const num = (v: Readonly<Record<string, string>>, k: string): number => Number.parseInt(v[k] ?? "0", 10);

export const FORMS: readonly FormDef[] = [
  {
    id: "interview",
    title: "Interview a customer",
    blurb: "Talk to people in one group and hear what they say.",
    intro: () =>
      `Three calls with people in one group. A round costs ${money(CATALOG.interviewCashCents)} and takes ${CATALOG.roundWeeks} weeks. What you ask changes what you learn.`,
    fields: (s) => [
      segmentField(s),
      ...[1, 2, 3].map(
        (n): Field => ({
          id: `q${n}`,
          label: `Question ${n}`,
          kind: "select",
          options: CATALOG.questionTypes.map((q) => ({ value: q, label: questionLabel(q) })),
          initial: "past-behavior",
        }),
      ),
    ],
    submit: "Hold the interviews",
    build: (v, s) => ({
      type: "interview",
      segment: Number.isNaN(num(v, "segment")) ? s.focusSegment : num(v, "segment"),
      questions: [v.q1, v.q2, v.q3].map((q) => (q ?? "past-behavior") as QuestionType),
    }),
    listed: () => true,
  },
  {
    id: "build",
    title: "Build a test",
    blurb: "Make something customers can react to.",
    intro: () => "Build something small enough to put in front of people. A landing page is the cheapest way to find out if anyone wants it.",
    fields: () => [
      {
        id: "kind",
        label: "What to build",
        kind: "radio",
        options: (Object.keys(CATALOG.builds) as BuildKind[]).map((k) => ({
          value: k,
          label: BUILD_NAMES[k],
          hint: `${money(CATALOG.builds[k].cashCents)}, ${CATALOG.builds[k].weeks} ${CATALOG.builds[k].weeks === 1 ? "week" : "weeks"}`,
        })),
        initial: "landing-page",
      },
    ],
    submit: "Build it",
    build: (v) => ({ type: "buildTest", kind: (v.kind ?? "landing-page") as BuildKind }),
    listed: () => true,
  },
  {
    id: "test-channel",
    title: "Test a channel",
    blurb: "Spend a little to see whether a way of reaching people works.",
    intro: () => `Spend ${money(CATALOG.channelTestBudgetCents)} to reach people through one channel and see how many are interested. Interest is weak evidence.`,
    fields: (s) => [segmentField(s), channelField(s)],
    submit: "Test the channel",
    build: (v) => ({ type: "pickChannel", segment: num(v, "segment"), channel: num(v, "channel") }),
    listed: () => true,
  },
  {
    id: "charge",
    title: "Charge for a test",
    blurb: "Ask for real money and see who pays.",
    intro: (s) =>
      `Ask real leads to pay ${money(s.priceCents)} a month. It needs a landing page. Payments are the strongest evidence there is.`,
    fields: (s) => [segmentField(s), channelField(s)],
    submit: "Charge for a test",
    build: (v) => ({ type: "chargeTest", segment: num(v, "segment"), channel: num(v, "channel") }),
    listed: () => true,
  },
  {
    id: "price",
    title: "Set price",
    blurb: "Change what customers are charged.",
    intro: (s) => `You charge ${money(s.priceCents)} a month now. A price that is too low starves your cash; one that is too high shrinks the market.`,
    fields: (s) => [
      {
        id: "price",
        label: "Monthly price",
        kind: "radio",
        options: CATALOG.priceLadderCents.map((c) => ({ value: String(c), label: `${money(c)} a month` })),
        initial: String(s.priceCents),
      },
    ],
    submit: "Set price",
    build: (v) => ({ type: "setPrice", priceCents: num(v, "price") }),
    listed: () => true,
  },
  {
    id: "marketing",
    title: "Set marketing",
    blurb: "Choose how hard to push a channel each week.",
    intro: () => "Pay for a steady flow of leads on one channel. The spend comes out of cash every week until you turn it off.",
    fields: (s) => [
      {
        id: "channel",
        label: "Channel",
        kind: "select",
        options: s.channels.map((c, i) => ({ value: String(i), label: c.name })),
        initial: String(s.marketing.channel ?? 0),
      },
      {
        id: "level",
        label: "Weekly budget",
        kind: "select",
        options: CATALOG.budgetLevelsCents.map((c, i) => ({ value: String(i), label: `${LEVEL_NAMES[i] ?? ""}, ${money(c)} a week` })),
        initial: String(s.marketing.level),
      },
    ],
    submit: "Set marketing",
    build: (v) => {
      const level = num(v, "level");
      return { type: "setMarketing", channel: level === 0 ? null : num(v, "channel"), level };
    },
    listed: () => true,
  },
  {
    id: "hire",
    title: "Hire someone",
    blurb: "Add a person to the team. They cost money every week.",
    intro: () =>
      `A contractor costs ${money(CATALOG.hireWeeklyCents)} a week, shortens every build by a week and adds 25 percent to the leads your marketing reaches. You can hire up to ${CATALOG.maxHires}.`,
    fields: () => [],
    submit: "Hire",
    build: () => ({ type: "hire" }),
    listed: () => true,
  },
  {
    id: "raise",
    title: "Raise money",
    blurb: "Take outside money in exchange for part of the company.",
    intro: (s) =>
      `Take ${money(CATALOG.raiseAmountCents)} for ${CATALOG.raiseEquityPcts[s.raisesUsed] ?? 20} percent of the company. Raising takes three to nine weeks of your time. A second raise needs a customer who has paid.`,
    fields: () => [],
    submit: "Raise money",
    build: () => ({ type: "raiseMoney" }),
    listed: () => true,
  },
  {
    id: "pivot",
    title: "Pivot",
    blurb: "Change which customers you serve. It uses up a pivot.",
    intro: () => "Change to another customer group. It costs a week, halves your product progress and starts you with no customers.",
    fields: (s) => [
      {
        id: "segment",
        label: "New customer group",
        kind: "radio",
        options: s.segmentNames.flatMap((name, i) => (i === s.focusSegment ? [] : [{ value: String(i), label: name }])),
        initial: String(s.segmentNames.findIndex((_, i) => i !== s.focusSegment)),
      },
    ],
    submit: "Pivot",
    build: (v) => ({ type: "pivot", toSegment: num(v, "segment") }),
    listed: () => true,
  },
  {
    id: "offer",
    title: "Answer the cash offer",
    blurb: "A lender has made an offer. Accept or decline.",
    intro: (s) =>
      s.offer
        ? `A lender offers ${money(s.offer.amountCents)} now. You repay ${money(s.offer.weeklyRepaymentCents)} a week for ${s.offer.weeks} weeks. The offer ends in week ${s.offer.expiresWeek}.`
        : "There is no offer right now.",
    fields: () => [
      {
        id: "accept",
        label: "Your answer",
        kind: "radio",
        options: [
          { value: "no", label: "Decline" },
          { value: "yes", label: "Accept" },
        ],
        initial: "no",
      },
    ],
    submit: "Answer the offer",
    build: (v) => ({ type: "respondOffer", accept: v.accept === "yes" }),
    listed: (s) => s.offer !== null,
  },
];

export const formById = (id: FormId): FormDef => FORMS.find((f) => f.id === id) as FormDef;
