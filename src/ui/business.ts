// The words of the company the player founded: the questions they can ask, what the builds, channels and hires are called,
// and what each stage of the business is. It reads only the public business content from the sim, so nothing here
// knows any hidden truth.
import { BUSINESS_LIST, BUSINESS_MODELS, cleanIdea, type Business, type BusinessChoice, type QuestionType } from "../sim";

/** The business the player chose, as the words use it, or null before they chose one. */
export function businessOf(industry: number, choice: BusinessChoice | null): Business | null {
  const combo = BUSINESS_LIST[industry]?.[choice?.model ?? -1];
  const model = BUSINESS_MODELS[choice?.model ?? -1];
  const idea = choice ? cleanIdea(choice.idea) : null;
  return combo && model && idea ? { ...combo, model, idea } : null;
}

export interface QuestionOption {
  /** Unique within the list; the part before "#" is the question type the sim understands. */
  readonly value: string;
  readonly type: QuestionType;
  readonly text: string;
}

/** Two ways to ask each kind of question, in this business's words. The sim sees only the type. */
export function questionOptions(b: Business | null): QuestionOption[] {
  const idea = b?.idea ?? "this idea";
  const situation = b?.situation ?? "you ran into this problem";
  const workaround = b?.workaround ?? "what you do today";
  const pay = b?.model.payVerb ?? "pay for";
  const use = b?.model.useVerb ?? "use";
  const ing = b?.model.ingVerb ?? "building";
  return [
    { value: "past-behavior#0", type: "past-behavior", text: `Tell me about the last time ${situation}.` },
    { value: "past-behavior#1", type: "past-behavior", text: `How do you handle this today with ${workaround}, and what does it cost you?` },
    { value: "commitment#0", type: "commitment", text: `Would you ${pay} ${idea} today?` },
    { value: "commitment#1", type: "commitment", text: `If ${idea} were ready next week, would you put your card down now?` },
    { value: "hypothetical#0", type: "hypothetical", text: `Would you ${use} ${idea}?` },
    { value: "hypothetical#1", type: "hypothetical", text: `Do you think ${idea} would be useful for people like you?` },
    { value: "pitch#0", type: "pitch", text: `I'm ${ing} ${idea}. What do you think?` },
    { value: "pitch#1", type: "pitch", text: `Here is my idea: ${idea}. Does it sound good?` },
  ];
}

export const questionType = (value: string): QuestionType => (value.split("#")[0] ?? "past-behavior") as QuestionType;
export const questionTextFor = (b: Business | null, value: string): string => questionOptions(b).find((o) => o.value === value)?.text ?? "";

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

/** Where the business is, in its own words. */
export function stageOf(b: Business | null, progressPct: number, landingPageBuilt: boolean): { label: string; detail: string } {
  const m = b?.model.id ?? "software";
  const words = {
    software: { idea: "Idea", mid: "Building", done: "Launched", doneText: "The product is finished and customers can use it.", unit: "product" },
    service: { idea: "Idea", mid: "Offering", done: "Running", doneText: "The service is set up and you can take clients.", unit: "service" },
    location: { idea: "Idea", mid: "Setting up", done: "Open for business", doneText: "The doors are open and people can come in.", unit: "place" },
    product: { idea: "Idea", mid: "Making it", done: "On sale", doneText: "The product is made and people can buy it.", unit: "product" },
  }[m];
  if (progressPct >= 100) return { label: words.done, detail: words.doneText };
  if (landingPageBuilt || progressPct > 0) {
    return { label: words.mid, detail: landingPageBuilt && progressPct === 0 ? `You can ask people to pay in tests. The ${words.unit} itself is not ready.` : `The ${words.unit} is ${progressPct} percent ready. At 100 percent it is ${words.done.toLowerCase()}.` };
  }
  return { label: words.idea, detail: `Nothing is ready yet. ${m === "location" ? "A trial pass" : "A first page"} lets you ask people to pay in tests.` };
}
