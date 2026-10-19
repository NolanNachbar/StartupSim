// The words of the company the player founded: the questions they can ask, what the builds, channels and hires are called,
// and what each stage of the business is. It reads only the public business content from the sim, so nothing here
// knows any hidden truth.
import { BUSINESS_LIST, BUSINESS_MODELS, CATALOG, cleanCustom, cleanIdea, type Business, type BusinessChoice, type QuestionType } from "../sim";

/** The business the player chose, as the words use it, or null before they chose one. */
export function businessOf(industry: number, choice: BusinessChoice | null): Business | null {
  const combo = BUSINESS_LIST[industry]?.[choice?.model ?? -1];
  const model = BUSINESS_MODELS[choice?.model ?? -1];
  const idea = choice ? cleanIdea(choice.idea) : null;
  if (!combo || !model || !idea) return null;
  // the player's own wording, tidied the same way the sim does it
  const c = cleanCustom(choice?.custom);
  return { ...combo, ...(c?.segmentNames ? { segmentNames: c.segmentNames } : {}), ...(c?.situation ? { situation: c.situation } : {}), ...(c?.cost ? { cost: c.cost } : {}), ...(c?.workaround ? { workaround: c.workaround } : {}), model, idea };
}

export interface QuestionOption {
  /** The topic id (see the sim's question bank); unique in the list. */
  readonly value: string;
  readonly type: QuestionType;
  /** A short name for the choice list. */
  readonly short: string;
  readonly text: string;
}

/** Twelve different questions, in this business's words. What each is about differs; the sim sees the topic and the kind. */
export function questionOptions(b: Business | null): QuestionOption[] {
  const idea = b?.idea ?? "this idea";
  const situation = b?.situation ?? "you ran into this problem";
  const workaround = b?.workaround ?? "what you do today";
  const pay = b?.model.payVerb ?? "pay for";
  const use = b?.model.useVerb ?? "use";
  const ing = b?.model.ingVerb ?? "building";
  const texts: Record<string, [string, string]> = {
    "last-time": ["Their last time", `Tell me about the last time ${situation}.`],
    cost: ["What it costs them", `What does it cost you when ${situation}, in money and in time?`],
    tried: ["What they have tried", `What have you tried to fix this, and why did it not stick?`],
    who: ["Who decides", `Who else is involved when this happens, and who decides what to do about it?`],
    "pay-today": ["Pay today", `Would you ${pay} ${idea} today?`],
    "pre-order": ["Pre-order", `If I could get ${idea} to you next month, would you pre-order it now?`],
    deposit: ["Put down a deposit", `Would you put down a deposit today to be first in line for ${idea}?`],
    "would-use": ["Would they use it", `Would you ${use} ${idea}?`],
    useful: ["Is it useful", `Do you think ${idea} would be useful for people like you?`],
    switch: ["Switch from today", `Would you switch from ${workaround} to ${idea}?`],
    pitch: ["Pitch it", `I'm ${ing} ${idea}. What do you think?`],
    feedback: ["Ask for feedback", `Here is my idea: ${idea}. What would you change?`],
  };
  return CATALOG.questionBank.map((q) => ({ value: q.topic, type: q.type, short: texts[q.topic]?.[0] ?? q.topic, text: texts[q.topic]?.[1] ?? q.topic }));
}

export const questionType = (topic: string): QuestionType => CATALOG.questionBank.find((q) => q.topic === topic)?.type ?? "past-behavior";
export const questionTextFor = (b: Business | null, topic: string): string => questionOptions(b).find((o) => o.value === topic)?.text ?? "";

export const ideaOf = (b: Business | null): string => b?.idea ?? "your idea";

type BuildKey = "landing-page" | "concierge" | "prototype";

/** What the three build actions are in each kind of business. The sim treats them the same; the words differ. */
export function buildCopy(b: Business | null): Record<BuildKey, { label: string; hint: string }> {
  const idea = ideaOf(b);
  switch (b?.model.id) {
    case "location":
      return {
        "landing-page": { label: "Trial pass or pop-up", hint: `A sign-up page and a few trial sessions or a pop-up, so people can try ${idea} and join.` },
        concierge: { label: "Run it small", hint: `Start in a rented space or out of your own place, a few sessions at a time, before you sign a lease.` },
        prototype: { label: "Fit out the space", hint: `Lease a location and set it up for ${idea}: rent, equipment and fit-out.` },
      };
    case "service":
      return {
        "landing-page": { label: "Offer page", hint: `A one-page description of ${idea} with a way to book.` },
        concierge: { label: "Do it by hand", hint: `Deliver ${idea} yourself to a few clients, before any systems.` },
        prototype: { label: "Repeatable package", hint: `Turn ${idea} into a standard package you can sell again and again.` },
      };
    case "product":
      return {
        "landing-page": { label: "Pre-order page", hint: `A page where people can pre-order ${idea}.` },
        concierge: { label: "Hand-made batch", hint: `Make a small batch by hand and sell it directly.` },
        prototype: { label: "Small production run", hint: `A first proper production run of ${idea}.` },
      };
    default:
      return {
        "landing-page": { label: "Landing page", hint: `A one-page site that explains ${idea}.` },
        concierge: { label: "Concierge version", hint: `Do the work by hand for a few customers instead of building ${idea}.` },
        prototype: { label: "Prototype", hint: `A first working version of ${idea}.` },
      };
  }
}

/** What each channel means for this business's customers (the sim's channel names stay as they are). */
export function channelCopy(b: Business | null, name: string): { label: string; hint: string } {
  const place = b?.place ?? "the places they spend time";
  const local = b?.model.id === "location" || b?.model.id === "service";
  if (name === "Cold outreach") return { label: local ? "Door-to-door and local partnerships" : "Cold outreach", hint: local ? "Visiting nearby businesses and people, and asking local partners to send customers." : "Calls and emails to people in this group." };
  if (name === "Communities") return { label: "Communities", hint: `Where they gather: ${place}.` };
  if (name === "Paid ads") return { label: local ? "Local ads and flyers" : "Paid ads", hint: local ? "Ads and flyers aimed at people near you." : "Ads on search and social, aimed at this group." };
  return { label: name, hint: "" };
}

/** What the first hire is, and what the weekly costs of running the business are made of. */
export const hireRole = (b: Business | null): string => b?.hire ?? "a contractor";
export const costsOf = (b: Business | null): string =>
  b?.model.id === "location" ? "rent, supplies and your own pay" : b?.model.id === "product" ? "materials, storage and your own pay" : b?.model.id === "service" ? "tools, travel and your own pay" : "tools, hosting and your own pay";

export type Role = "builder" | "seller" | "ops";

/** Who each role is in this kind of business, and what they do for it. */
export function roleInfo(b: Business | null, role: Role): { label: string; what: string } {
  const m = b?.model.id ?? "software";
  if (role === "builder") {
    const label = { software: "Developer", service: "Delivery specialist", location: "Fit-out and upkeep crew", product: "Maker" }[m];
    const what = { software: "builds the product every week, without you", service: "builds your methods and materials every week, without you", location: "sets the place up and keeps it running every week, without you", product: "makes the product every week, without you" }[m];
    return { label, what };
  }
  if (role === "seller") return { label: m === "location" ? "Membership salesperson" : "Salesperson", what: "reaches people by hand every week and makes your marketing reach more of them" };
  const hire = b?.hire ? b.hire.replace(/^an? /, "") : "support person";
  const ops = m === "software" ? "Support agent" : hire.charAt(0).toUpperCase() + hire.slice(1);
  return { label: ops, what: m === "software" ? "looks after customers, so you can serve far more of them" : "serves customers, so the business can hold more of them" };
}
