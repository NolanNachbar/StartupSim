// The action forms. Each form is data: its fields and how to turn the chosen values into a sim action.
// Rules live in the sim; a form never decides whether an action is legal, it only builds the action.
import { CATALOG, type Action, type BuildKind, type PublicState } from "../sim";
import { buildCopy, channelCopy, costsOf, hireRole, ideaOf, questionOptions, questionType } from "./business";
import { money } from "./format";
import { currentBusiness } from "./store";

const biz = currentBusiness;

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
  options: s.channels.map((c, i) => {
    const copy = channelCopy(biz(), c.name);
    return { value: String(i), label: copy.label, hint: `${copy.hint} ${money(c.costPerLeadCents)} a lead.` };
  }),
  initial: "0",
});

const LEVEL_NAMES = ["Off", "Light", "Steady", "Heavy"];

const num = (v: Readonly<Record<string, string>>, k: string): number => Number.parseInt(v[k] ?? "0", 10);

export const FORMS: readonly FormDef[] = [
  {
    id: "interview",
    title: "Interview a customer",
    blurb: "Talk to people in one group and hear what they say.",
    intro: (s) =>
      `Three calls with people in one customer group, for ${s.problemName.toLowerCase()}. A round costs ${money(CATALOG.interviewCashCents)} and takes ${CATALOG.roundWeeks} weeks. Each call gets one question, and what you ask changes what you learn.`,
    fields: (s) => [
      segmentField(s),
      ...[1, 2, 3].map(
        (n): Field => ({
          id: `q${n}`,
          label: `Question ${n}`,
          kind: "select",
          options: questionOptions(biz()).map((o) => ({ value: o.value, label: o.text })),
          initial: "past-behavior#0",
        }),
      ),
    ],
    submit: "Hold the interviews",
    build: (v, s) => ({
      type: "interview",
      segment: Number.isNaN(num(v, "segment")) ? s.focusSegment : num(v, "segment"),
      questions: [v.q1, v.q2, v.q3].map((q) => questionType(q ?? "past-behavior#0")),
    }),
    listed: () => true,
  },
  {
    id: "build",
    title: "Build a test",
    blurb: "Make something customers can react to.",
    intro: (s) =>
      `Make something customers can react to. A landing page is what lets you ask people to pay in a test. Prototypes and concierge versions add to the product itself, which is ${s.productProgressPct} percent built now; at 100 percent it is launched and customers can really use it.`,
    fields: () => [
      {
        id: "kind",
        label: "What to build",
        kind: "radio",
        options: (Object.keys(CATALOG.builds) as BuildKind[]).map((k) => ({
          value: k,
          label: buildCopy(biz())[k].label,
          hint: `${buildCopy(biz())[k].hint} ${money(CATALOG.builds[k].cashCents)} and ${CATALOG.builds[k].weeks} ${CATALOG.builds[k].weeks === 1 ? "week" : "weeks"}; adds ${CATALOG.builds[k].progressPct} percent to the product.`,
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
    intro: () => `Spend ${money(CATALOG.channelTestBudgetCents)} to put ${ideaOf(biz())} in front of one customer group through one channel and count who is interested. Interest is weak evidence: people say yes more easily than they pay.`,
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
      `Ask real leads from one group to pay ${money(s.priceCents)} a month for ${ideaOf(biz())}. It needs a landing page. Anyone who pays counts as real evidence; the money is not kept as revenue.`,
    fields: (s) => [segmentField(s), channelField(s)],
    submit: "Charge for a test",
    build: (v) => ({ type: "chargeTest", segment: num(v, "segment"), channel: num(v, "channel") }),
    listed: () => true,
  },
  {
    id: "price",
    title: "Set price",
    blurb: "Change what customers are charged.",
    intro: (s) => `This is how you make money: every paying customer pays your price each month, so weekly revenue is customers times price. You charge ${money(s.priceCents)} a month now and have ${s.payingCustomers} paying ${s.payingCustomers === 1 ? "customer" : "customers"}. A price that is too low starves your cash; one that is too high means fewer people buy.`,
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
    intro: (s) =>
      `Marketing is how customers find you after the tests. It buys leads on one channel, every week, for ${s.segmentNames[s.focusSegment] ?? "your current group"}, the group you are focused on. People buy more often the more finished the product is (${s.productProgressPct} percent built now) and when the price suits them, and customers leave faster while the product is unfinished. The spend comes out of cash every week until you turn it off.`,
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
    intro: (s) =>
      `You hire ${hireRole(biz())} who helps build and sell ${ideaOf(biz())}. They cost ${money(CATALOG.hireWeeklyCents)} every week, shorten every build by a week, and add 25 percent to the leads your marketing reaches. Your weekly costs (${costsOf(biz())}) would go from ${money(s.weeklyBurnCents)} to ${money(s.weeklyBurnCents + CATALOG.hireWeeklyCents)} before marketing. You have hired ${s.hires} of ${CATALOG.maxHires} you can.`,
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
