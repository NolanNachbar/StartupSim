// The action forms. Each form is data: its fields and how to turn the chosen values into a sim action.
// Rules live in the sim; a form never decides whether an action is legal, it only builds the action.
import { CATALOG, UNIT_LABEL, type Action, type BuildKind, type PublicState } from "../sim";
import { buildCopy, channelCopy, costsOf, ideaOf, questionOptions, questionType, roleInfo, type Role } from "./business";
import { money, priceWords } from "./format";
import { currentBusiness, formSegment } from "./store";

const biz = currentBusiness;

/** What businesses like this usually charge, so the price you pick is judged against something real. */
const typicalPrice = (s: PublicState): string => {
  const ladder = s.priceLadderCents;
  const lo = ladder[1] ?? ladder[0] ?? s.priceCents;
  const hi = ladder[ladder.length - 2] ?? s.priceCents;
  const every = s.billing && s.billing.unit !== "month" ? ` A regular customer buys about ${(s.billing.perMonthX10 / 10).toFixed(s.billing.perMonthX10 % 10 === 0 ? 0 : 1)} ${s.billing.perMonthX10 === 10 ? "time" : "times"} a month.` : "";
  return `Businesses like this usually charge between ${money(lo)} and ${money(hi)} ${s.billing ? UNIT_LABEL[s.billing.unit] : "a month"}.${every}`;
};

export type FormId =
  | "rnd" | "interview" | "build" | "test-channel" | "charge" | "price" | "marketing" | "hire" | "raise" | "pivot" | "offer" | "network" | "promotion" | "fire";

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  /** Already done: shown with a Built tag and cannot be chosen again. */
  readonly done?: boolean;
  /** Why it cannot be chosen right now. */
  readonly locked?: string;
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
  initial: String(formSegment.value ?? s.focusSegment),
});

const channelField = (s: PublicState): Field => ({
  id: "channel",
  label: "Channel",
  kind: "radio",
  options: s.channels.map((c, i) => {
    const copy = c.blurb ? { label: c.name, hint: c.blurb } : channelCopy(biz(), c.name);
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
          initial: ["last-time", "pay-today", "would-use"][n - 1] ?? "last-time",
        }),
      ),
    ],
    submit: "Hold the interviews",
    build: (v, s) => ({
      type: "interview",
      segment: Number.isNaN(num(v, "segment")) ? s.focusSegment : num(v, "segment"),
      questions: [v.q1, v.q2, v.q3].map((q) => questionType(q ?? "last-time")),
      topics: [v.q1 ?? "last-time", v.q2 ?? "pay-today", v.q3 ?? "would-use"],
    }),
    listed: () => true,
  },
  {
    id: "build",
    title: "Build a test",
    blurb: "Make something customers can react to.",
    intro: (s) =>
      `Make something customers can react to. ${buildCopy(biz())["landing-page"].label} is what lets you ask people to pay in a test (do it once). ${buildCopy(biz()).concierge.label} and ${buildCopy(biz()).prototype.label.toLowerCase()} add to getting ${ideaOf(biz())} ready, which is ${s.productProgressPct} percent done now; at 100 percent it is open and customers can really use it.`,
    fields: (s) => {
      const kinds = Object.keys(s.builds) as BuildKind[];
      const doneKind = (k: BuildKind): boolean => (k === "landing-page" ? s.landingPageBuilt : s.productProgressPct >= 100);
      return [
        {
          id: "kind",
          label: "What to build",
          kind: "radio",
          options: kinds.map((k) => ({
            value: k,
            label: buildCopy(biz())[k].label,
            done: doneKind(k),
            hint: `${buildCopy(biz())[k].hint} ${money(s.builds[k].cashCents)} and ${s.builds[k].weeks} ${s.builds[k].weeks === 1 ? "week" : "weeks"}. ${
              k === "landing-page"
                ? `${s.landingPageBuilt ? "Already built: you can run paid tests." : "Built once. It is what lets you ask people to pay in a paid test."} Adds ${s.builds[k].progressPct} percent to the product.`
                : `Adds ${s.builds[k].progressPct} percent to the product (${s.productProgressPct} percent now). You can build it again until the product is 100 percent.`
            }`,
          })),
          initial: kinds.find((k) => !doneKind(k)) ?? "landing-page",
        },
      ];
    },
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
      `Ask real leads from one group to pay ${priceWords(s, s.priceCents)} for ${ideaOf(biz())}. Anyone who pays counts as real evidence, and the cash lands in your books as paid-test sales. ${s.landingPageBuilt ? "" : `You cannot run this yet: build the first test (${buildCopy(biz())["landing-page"].label.toLowerCase()}) from Build a test, then return to this.`}`.trim(),
    fields: (s) => [segmentField(s), channelField(s)],
    submit: "Charge for a test",
    build: (v) => ({ type: "chargeTest", segment: num(v, "segment"), channel: num(v, "channel") }),
    listed: () => true,
  },
  {
    id: "promotion",
    title: "Run a promotion",
    blurb: "A time-limited offer that costs something and trades price or customer quality for demand.",
    intro: (s) => {
      const b = biz();
      const spec = b ? CATALOG.promotions[b.model.id].find((q) => q.id === s.promo?.id) : undefined;
      if (s.promo && spec) return `${spec.name} is running: ${s.promo.weeksLeft} ${s.promo.weeksLeft === 1 ? "week" : "weeks"} left, ${s.promo.signups} ${s.promo.signups === 1 ? "customer" : "customers"} won so far. You can end it early, but the money is spent.`;
      return `A promotion buys demand with margin. It costs money to start, runs for a few weeks, and customers won this way tend to leave sooner than ones who came for the full price. After one ends you must wait ${CATALOG.promotionCooldownWeeks} weeks before the next, or people stop noticing.${s.promoCooldown > 0 ? ` You can start another in ${s.promoCooldown} ${s.promoCooldown === 1 ? "week" : "weeks"}.` : ""}`;
    },
    fields: (s) => {
      const b = biz();
      if (s.promo) return [{ id: "promo", label: "A promotion is running", kind: "radio", options: [{ value: "stop", label: "End it now", hint: "The money you paid is not returned." }], initial: "stop" }];
      const list = b ? CATALOG.promotions[b.model.id] : [];
      return [
        {
          id: "promo",
          label: "Which promotion",
          kind: "radio",
          options: list.map((q) => {
            const effects = [
              q.leadLiftPct > 0 ? `${q.leadLiftPct} percent more people reached` : "",
              q.convLiftPct > 0 ? `${q.convLiftPct} percent more of them buy` : q.convLiftPct < 0 ? `${-q.convLiftPct} percent fewer of them buy` : "",
              q.referralPct > 0 ? `new leads from your customers (${q.referralPct} for every 100 of them, each week)` : "",
              q.discountPct > 0 ? `${q.discountPct} percent off for the people it wins` : "",
              q.dealChurnPct > 0 ? `${q.dealChurnPct} percent of those people leave each week` : "",
            ].filter(Boolean);
            const lock = s.promoCooldown > 0 ? `Not for ${s.promoCooldown} more ${s.promoCooldown === 1 ? "week" : "weeks"}.` : s.payingCustomers < q.needsCustomers ? `Needs ${q.needsCustomers} customers first.` : s.cashCents < q.cashCents ? "Not enough cash." : undefined;
            return {
              value: q.id,
              label: q.name,
              ...(lock ? { locked: lock } : {}),
              hint: `${q.blurb} ${q.cashCents > 0 ? `Costs ${money(q.cashCents)}. ` : "No cost up front. "}Runs ${q.weeks} ${q.weeks === 1 ? "week" : "weeks"}: ${effects.join(", ")}.${lock ? ` ${lock}` : ""}`,
            };
          }),
          initial: list.find((q) => q.cashCents <= s.cashCents && s.payingCustomers >= q.needsCustomers)?.id ?? list[0]?.id ?? "",
        },
      ];
    },
    submit: "Start it",
    build: (v) => ({ type: "setPromotion", promo: v.promo === "stop" ? null : (v.promo ?? null) }),
    listed: (s) => s.capacity !== null,
  },
  {
    id: "network",
    title: "Network",
    blurb: "Meet people who will take your call, introduce you and send you customers.",
    intro: (s) =>
      `Meeting people costs cash and your weeks. Each person you meet will take your call: every one makes an interview call certain to be answered (up to three a round), every three bring you a lead each week, three speed up a hire and five help you find an investor. You know ${s.network.contacts} ${s.network.contacts === 1 ? "person" : "people"} now.`,
    fields: () => [
      {
        id: "kind",
        label: "How to meet people",
        kind: "radio",
        options: CATALOG.networkKinds.map((k) => {
          const o = CATALOG.networkOptions[k];
          const label = k === "coffee" ? "Coffee with local owners" : k === "meetup" ? "An industry meetup or business breakfast" : "An industry conference";
          return { value: k, label, hint: `${money(o.cashCents)} and ${o.weeks} ${o.weeks === 1 ? "week" : "weeks"}. You can hope to meet ${o.min} to ${o.max} people.` };
        }),
        initial: "meetup",
      },
    ],
    submit: "Go and meet people",
    build: (v) => ({ type: "network", kind: (v.kind ?? "meetup") as "coffee" | "meetup" | "conference" }),
    listed: (s) => s.capacity !== null,
  },
  {
    id: "price",
    title: "Set price",
    blurb: "Change what customers are charged.",
    intro: (s) => `This is how you make money: every paying customer pays your price each time they buy, so weekly revenue is customers times price times how often they buy. ${typicalPrice(s)} You charge ${priceWords(s, s.priceCents)} now and have ${s.payingCustomers} paying ${s.payingCustomers === 1 ? "customer" : "customers"}. A price that is too low starves your cash; one that is too high means fewer people buy.`,
    fields: (s) => [
      {
        id: "price",
        label: "Price",
        kind: "radio",
        options: s.priceLadderCents.map((c) => ({ value: String(c), label: priceWords(s, c) })),
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
      ...(s.capacity === null
        ? []
        : [
            {
              id: "target",
              label: "Who to aim at",
              kind: "select" as const,
              options: s.segmentNames.map((n, i) => ({ value: String(i), label: n })),
              initial: String(formSegment.value ?? s.marketing.target ?? s.focusSegment),
            },
          ]),
    ],
    submit: "Set marketing",
    build: (v) => {
      const level = num(v, "level");
      return { type: "setMarketing", channel: level === 0 ? null : num(v, "channel"), level, ...(v.target !== undefined ? { target: num(v, "target") } : {}) };
    },
    listed: () => true,
  },
  {
    id: "hire",
    title: "Hire someone",
    blurb: "Add a person to the team. They cost money every week.",
    intro: (s) =>
      s.capacity === null
        ? `A contractor costs ${money(CATALOG.hireWeeklyCents)} every week, shortens every build by a week and adds 25 percent to the leads your marketing reaches. You have hired ${s.hires} of ${CATALOG.maxHires} you can.`
        : `Whether to hire is a real decision. Finding the right person takes about ${CATALOG.hireSearchWeeks} weeks of your time, and they are only a quarter as useful in their first week and fully useful in the fourth. Each costs their pay plus payroll tax and benefits every week, so your weekly costs (${costsOf(biz())}) go up before they earn anything back. You have ${s.hires} of ${CATALOG.maxTeam} people (at most ${CATALOG.roleCap} in each role), and you need a month of the new payroll in the bank. Some people quit once they are settled in. Letting someone go costs ${CATALOG.severanceWeeks} weeks of their pay.`,
    fields: (s) =>
      s.capacity === null
        ? []
        : [
            {
              id: "role",
              label: "Who to hire",
              kind: "radio",
              options: (CATALOG.roles as readonly Role[]).map((r) => {
                const info = roleInfo(biz(), r);
                const have = s.team[r];
                const effect = r === "builder" ? `Adds ${CATALOG.builderProgressPct} percent to what you are getting ready, every week.` : r === "seller" ? `Reaches ${CATALOG.sellerOutreachLeads} people by hand every week, once you have something to sell, and makes marketing reach 25 percent more.` : `Raises the most customers you can serve (now ${s.capacity}).`;
                const wage = s.wages[r];
                const after = s.weeklyBurnCents + wage;
                const weeks = Math.floor(s.cashCents / after);
                const need = (s.weeklyBurnCents + wage) * 4;
                return { value: r, label: `${info.label} (${have} of ${CATALOG.roleCap}), ${money(wage)} a week`, ...(s.cashCents < need ? { locked: `Needs ${money(need)} in the bank (a month of the new payroll); you have ${money(s.cashCents)}.` } : {}), hint: `Someone who ${info.what}. ${effect} Your running costs would go from ${money(s.weeklyBurnCents)} to ${money(after)} a week: your cash would cover ${weeks} ${weeks === 1 ? "week" : "weeks"} of them with no income at all.${s.cashCents < need ? ` Needs ${money(need)} in the bank first.` : ""}` };
              }),
              initial: "builder",
            },
          ],
    submit: "Hire",
    build: (v, s) => (s.capacity === null ? { type: "hire" } : { type: "hire", role: (v.role ?? "builder") as Role }),
    listed: () => true,
  },
  {
    id: "fire",
    title: "Let someone go",
    blurb: "End a job. It costs severance, and it lowers your weekly costs.",
    intro: (s) => `Letting someone go costs ${CATALOG.severanceWeeks} weeks of their pay, and you lose what they did for you. It lowers your costs from now on. You have ${s.hires} ${s.hires === 1 ? "person" : "people"} on the team.`,
    fields: (s) => [
      {
        id: "role",
        label: "Who to let go",
        kind: "radio",
        options: (CATALOG.roles as readonly Role[]).map((r) => ({ value: r, label: `${roleInfo(biz(), r).label} (${s.team[r]})`, hint: `${money(CATALOG.severanceWeeks * s.wages[r])} to let one go; saves ${money(s.wages[r])} a week.`, ...(s.team[r] < 1 ? { locked: "Nobody in this role." } : {}) })),
        initial: (CATALOG.roles as readonly Role[]).find((r) => s.team[r] > 0) ?? "builder",
      },
    ],
    submit: "Let them go",
    build: (v) => ({ type: "fire", role: (v.role ?? "builder") as Role }),
    listed: (s) => s.capacity !== null && s.hires > 0,
  },
  {
    id: "rnd",
    title: "Spend on R&D",
    blurb: "Pay every week to make what you offer better.",
    intro: (s) =>
      `Research and development makes ${ideaOf(biz())} better over time: better quality helps it sell, lets you charge more and keeps customers from leaving. It comes out of your cash every week until you turn it off. Quality now: ${s.qualityPct} percent.`,
    fields: (s) => [
      {
        id: "level",
        label: "Weekly R&D budget",
        kind: "radio",
        options: CATALOG.rndLevelsCents.map((c, i) => ({
          value: String(i),
          label: i === 0 ? "None" : `${["", "Light", "Steady", "Heavy"][i] ?? ""}, ${money(c)} a week`,
          hint: i === 0 ? "No R&D spending." : `About ${CATALOG.rndGain[i]} points of quality a week.`,
        })),
        initial: String(s.rndLevel),
      },
    ],
    submit: "Set R&D",
    build: (v) => ({ type: "setRnd", level: num(v, "level") }),
    listed: (s) => s.capacity !== null,
  },
  {
    id: "raise",
    title: "Raise money",
    blurb: "Take outside money in exchange for part of the company.",
    intro: (s) =>
      s.capacity === null
        ? `Take ${money(CATALOG.raiseAmountCents)} for ${CATALOG.raiseEquityPcts[s.raisesUsed] ?? 20} percent of the company. Raising takes three to nine weeks of your time. A second raise needs a customer who has paid.`
        : `Take ${money(CATALOG.raiseAmountCents)} for ${CATALOG.raiseEquityPcts[s.raisesUsed] ?? 20} percent of the company. Real raises take months: about twelve to twenty-six weeks (a little less if you know people), and your costs keep running the whole time. At ${money(s.weeklyBurnCents)} a week that is ${money(12 * s.weeklyBurnCents)} to ${money(26 * s.weeklyBurnCents)} before the money arrives, and you have ${money(s.cashCents)}.${s.cashCents < 12 * s.weeklyBurnCents ? " You would very likely run out of cash first." : ""} A second raise needs a customer who has paid.`,
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
        ? `A lender offers ${money(s.offer.amountCents)} now. You repay ${money(s.offer.weeklyRepaymentCents)} a week for ${s.offer.weeks} weeks: ${money(s.offer.weeklyRepaymentCents * s.offer.weeks)} in all, about ${Math.round(((s.offer.weeklyRepaymentCents * s.offer.weeks - s.offer.amountCents) * 52 * 100) / (s.offer.amountCents * s.offer.weeks))} percent a year in interest. It is repaid out of your weekly cash whether or not customers come. The offer ends in week ${s.offer.expiresWeek}.`
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
