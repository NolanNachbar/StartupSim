// What kind of business the player starts. Public content only: the four business models, who the customers are in each
// industry, and the words those customers use. Nothing here is hidden truth, so the UI may read it (through the sim index).
// The player supplies the idea itself (for example "a small strength-training gym"); this file supplies everything
// around it so the questions, the answers, the builds and the hires all fit the kind of business.

export type ModelId = "software" | "service" | "location" | "product";

export interface ModelInfo {
  readonly id: ModelId;
  readonly name: string;
  /** One plain sentence on how this kind of business makes money. */
  readonly blurb: string;
  /** Verbs that make a question or an answer read naturally: "pay for", "sign up for", "book", "buy". */
  readonly payVerb: string;
  /** "use", "visit", "try". */
  readonly useVerb: string;
  /** "building", "opening", "starting", "making". */
  readonly ingVerb: string;
}

export const MODELS: readonly ModelInfo[] = [
  { id: "software", name: "Software or app", blurb: "You build a product people use on a screen and charge a monthly fee.", payVerb: "pay for", useVerb: "use", ingVerb: "building" },
  { id: "service", name: "Service business", blurb: "You do the work for clients, such as coaching, repairs or advice, and charge for your time.", payVerb: "book", useVerb: "try", ingVerb: "starting" },
  { id: "location", name: "Physical location", blurb: "You open a place people come to, such as a gym, a cafe or a studio, and charge memberships or visits.", payVerb: "sign up for", useVerb: "visit", ingVerb: "opening" },
  { id: "product", name: "Physical product", blurb: "You make or source something and sell it to people, one order or one subscription at a time.", payVerb: "buy", useVerb: "try", ingVerb: "making" },
];

/** What is specific to one industry and one business model: who the customers are, and their world. */
export interface Combo {
  /** The customer groups, the smallest and easiest to reach first. */
  readonly segmentNames: readonly string[];
  /** A bad moment a customer has, as a clause that follows "the last time": "the gym was packed or too far away". */
  readonly situation: string;
  /** What that moment cost them, as a clause: "I skipped it and lost another week of progress". */
  readonly cost: string;
  /** How they cope today, as a noun phrase. */
  readonly workaround: string;
  /** Where these customers gather, as a noun phrase. */
  readonly place: string;
  /** Who the first hire is: "a trainer". */
  readonly hire: string;
  /** Example ideas the player can start from, or replace with their own. */
  readonly examples: readonly string[];
}

/** By industry (the order of INDUSTRIES in world.ts), then by model (the order of MODELS). */
export const COMBOS: readonly (readonly Combo[])[] = [
  // Local services
  [
    { segmentNames: ["Solo tradespeople", "Small crews", "Multi-van firms", "Franchisees", "Property managers"], situation: "a crew showed up at the wrong time", cost: "the wasted trip cost me half a day", workaround: "a whiteboard and a group chat", place: "trade groups and contractor forums", hire: "a developer", examples: ["an app that schedules crews and texts customers when they are on the way", "a quoting app for contractors", "an online booking page for small clinics"] },
    { segmentNames: ["Homeowners", "Landlords", "Small offices", "Property managers", "Restaurants"], situation: "you needed a repair and nobody called back", cost: "it dragged on for a week", workaround: "asking neighbours for names and waiting", place: "neighbourhood groups and local forums", hire: "a technician", examples: ["a same-day handyman service", "a recurring home-cleaning service", "a pressure-washing service for small businesses"] },
    { segmentNames: ["Walk-in neighbours", "Commuters", "Nearby businesses", "Tourists", "Local employers"], situation: "you needed it done and the nearest shop was closed or far away", cost: "I lost an afternoon going across town", workaround: "driving to the big shop across town", place: "local business associations and neighbourhood pages", hire: "a counter assistant", examples: ["a neighbourhood repair shop", "a self-service laundromat with a cafe", "a bike repair shop"] },
    { segmentNames: ["Homeowners", "DIY hobbyists", "Small contractors", "Landscapers", "Property managers"], situation: "you could not find the right part or tool locally", cost: "the project sat unfinished for a week", workaround: "big online marketplaces and long delivery times", place: "DIY forums and hardware hobby groups", hire: "a packer", examples: ["a tool-rental kit for homeowners", "an organised toolbox for apartments", "a garden maintenance box"] },
  ],
  // Consumer apps
  [
    { segmentNames: ["Students", "Young professionals", "Parents", "Shift workers", "Retirees"], situation: "you dropped a habit you meant to keep", cost: "I fell off the routine and it took weeks to rebuild", workaround: "reminders on my phone that I swipe away", place: "productivity communities and self-improvement groups", hire: "a developer", examples: ["a habit tracker that nudges you at the right time of day", "an app that splits shared bills with roommates", "a meal planner for busy families"] },
    { segmentNames: ["Students", "Young professionals", "Parents", "Remote workers", "Retirees"], situation: "you needed help with life admin and had no time", cost: "it cost me a whole weekend", workaround: "doing it myself at midnight", place: "community groups and parent networks", hire: "an assistant", examples: ["a personal life-admin concierge", "a meal-prep service for busy parents", "an online tutor for adults"] },
    { segmentNames: ["Students", "Young professionals", "Families", "Hobbyists", "Retirees"], situation: "you wanted somewhere to spend an evening and nowhere good was nearby", cost: "I stayed home again", workaround: "chain cafes that are always loud and full", place: "campus groups and local social pages", hire: "a barista", examples: ["a board-game cafe", "a study cafe with quiet pods", "a climbing and coffee space"] },
    { segmentNames: ["Students", "Young professionals", "Parents", "Hobbyists", "Retirees"], situation: "you wanted a better version of an everyday thing and could not find one", cost: "I kept using something that annoyed me", workaround: "whatever the big store had in stock", place: "hobby communities and social media groups", hire: "a packer", examples: ["a subscription box of healthy snacks", "a better reusable water bottle", "a compact desk organiser"] },
  ],
  // Business software
  [
    { segmentNames: ["Startups", "Small teams", "Mid-size companies", "Departments", "Enterprises"], situation: "a new hire had no laptop or access on day one", cost: "they sat idle for three days", workaround: "a shared document and a lot of emails", place: "HR and operations communities", hire: "a developer", examples: ["a checklist tool that gets new hires set up in their first week", "an app that turns receipts into expense reports", "a weekly operations report builder"] },
    { segmentNames: ["Startups", "Small teams", "Agencies", "Departments", "Enterprises"], situation: "the team needed a specialist and could not hire one", cost: "the project slipped by a month", workaround: "stretching existing staff and freelancers", place: "founder and operations communities", hire: "a consultant", examples: ["a done-for-you bookkeeping service", "an outsourced onboarding and HR service", "a fractional operations manager"] },
    { segmentNames: ["Freelancers", "Startups", "Small teams", "Remote workers", "Corporate teams"], situation: "you needed a place to meet or work and the options were awful", cost: "the meeting went badly and we lost the client", workaround: "noisy cafes and borrowed meeting rooms", place: "coworking and startup communities", hire: "a community manager", examples: ["a coworking space for small teams", "a podcast and video studio for rent", "a meeting-room space for agencies"] },
    { segmentNames: ["Startups", "Small teams", "Agencies", "Departments", "Enterprises"], situation: "the office equipment was broken or wrong and nobody owned fixing it", cost: "the team lost half a day", workaround: "buying whatever was cheapest online", place: "office-manager communities", hire: "a packer", examples: ["a plug-and-play remote work kit", "branded onboarding kits for new hires", "an ergonomic desk set for small teams"] },
  ],
  // Health and wellness
  [
    { segmentNames: ["Solo practitioners", "Small clinics", "Physio groups", "Multi-clinic owners", "Hospital clinics"], situation: "a patient forgot their appointment", cost: "the empty slot cost me an hour of income", workaround: "phone calls and a paper diary", place: "practitioner groups and clinic owner forums", hire: "a developer", examples: ["an app that reminds patients and lets them confirm with one tap", "a patient intake form tool", "a recovery plan app for physiotherapists"] },
    { segmentNames: ["Busy professionals", "Older adults", "New parents", "Athletes", "Corporate buyers"], situation: "you could not find a trainer or therapist who fit your schedule", cost: "I put my health off for another month", workaround: "random videos and the occasional appointment", place: "local wellness groups and parent networks", hire: "a coach", examples: ["a personal training service that comes to you", "a postnatal recovery coaching service", "a corporate stretching programme"] },
    { segmentNames: ["Local regulars", "Busy professionals", "Students", "Older adults", "Corporate groups"], situation: "you tried to work out and the gym was packed or too far away", cost: "I skipped it and lost another week of progress", workaround: "a crowded big-box gym and workouts at home", place: "local running clubs, neighbourhood pages and social media", hire: "a trainer", examples: ["a small strength-training gym", "a yoga and pilates studio", "a physiotherapy and recovery clinic"] },
    { segmentNames: ["Athletes", "Busy professionals", "Older adults", "Parents", "Corporate buyers"], situation: "you wanted a healthy option and everything good was out of stock or tasted awful", cost: "I fell back on junk food again", workaround: "protein bars from the supermarket", place: "fitness communities and gym groups", hire: "a packer", examples: ["a line of low-sugar protein snacks", "a recovery supplement for runners", "a home-workout equipment kit"] },
  ],
  // Money and fintech
  [
    { segmentNames: ["New freelancers", "Freelancers", "Small studios", "Agencies", "Consultancies"], situation: "a client paid six weeks late", cost: "I could not cover my own rent that month", workaround: "calendar reminders and awkward emails", place: "freelancer communities and design forums", hire: "a developer", examples: ["a tool that sends invoices and chases late payers", "a cash-flow forecasting app for shop owners", "an app that collects rent for landlords"] },
    { segmentNames: ["Freelancers", "Small shops", "Landlords", "Households", "Small businesses"], situation: "you needed money advice and everyone tried to sell you something", cost: "I made a bad decision and lost money", workaround: "a spreadsheet and a friend who knows a bit", place: "small-business and personal finance communities", hire: "an advisor", examples: ["a bookkeeping service for freelancers", "a tax-prep service for small shops", "an independent budgeting coach"] },
    { segmentNames: ["Freelancers", "Small shops", "Local businesses", "Households", "Newcomers"], situation: "you needed to sort out money matters and the nearest help was far away or closed", cost: "I lost half a day and it still was not fixed", workaround: "a bank branch with long queues", place: "local business associations and community centres", hire: "a clerk", examples: ["a neighbourhood tax and paperwork office", "a currency exchange and remittance shop", "a walk-in bookkeeping office for small businesses"] },
    { segmentNames: ["Freelancers", "Small shops", "Landlords", "Households", "Students"], situation: "you wanted a simple way to keep your money organised and nothing fit", cost: "I lost track of what I owed", workaround: "a cheap notebook and bank statements", place: "personal finance communities", hire: "a packer", examples: ["a physical budgeting planner", "a receipt and invoice organiser kit", "a savings-goal box"] },
  ],
  // Creators and education
  [
    { segmentNames: ["Hobby teachers", "Course creators", "Coaches", "Training studios", "Ed-tech firms"], situation: "a student could not get into the course after paying", cost: "I spent a weekend sorting it out by email", workaround: "a payment link and a shared folder", place: "creator communities and online-teaching groups", hire: "a developer", examples: ["a simple page that sells and delivers a course", "a booking app for private tutors", "a feedback app for coaches"] },
    { segmentNames: ["Hobby learners", "Parents", "Young professionals", "Small schools", "Companies"], situation: "you wanted to learn a skill and could not find a good teacher", cost: "I wasted months on videos that went nowhere", workaround: "free videos and the occasional lesson", place: "learning communities and parent networks", hire: "a teacher", examples: ["a private tutoring service", "a music lessons service", "a language conversation coaching service"] },
    { segmentNames: ["Kids and teens", "Parents", "Hobbyists", "Adult learners", "Schools and clubs"], situation: "you wanted a class or workshop nearby and nothing good was on", cost: "the kids stayed home on screens", workaround: "community centre classes that fill up fast", place: "parent groups, school networks and local social pages", hire: "an instructor", examples: ["an after-school coding and robotics studio", "a music and art studio", "a language school"] },
    { segmentNames: ["Hobby learners", "Parents", "Teachers", "Schools", "Young professionals"], situation: "you wanted learning materials that actually work and could not find any", cost: "I gave up halfway through", workaround: "random workbooks and free printouts", place: "teacher and homeschooling communities", hire: "a packer", examples: ["a hands-on science kit for kids", "a craft-learning subscription box", "a language flashcard set"] },
  ],
];

/** The player's choice: a model, and an idea in their own words. */
export interface BusinessChoice {
  readonly model: number;
  readonly idea: string;
}

/** A business as the sim and the UI use it: the combo for this industry and model, with the player's idea. */
export interface Business extends Combo {
  readonly model: ModelInfo;
  /** The idea, as the player wrote it, as a noun phrase. */
  readonly idea: string;
}

export const MAX_IDEA = 60;

/** Tidy an idea: letters, digits and common punctuation only, one space between words, at most MAX_IDEA characters. */
export function cleanIdea(raw: string): string | null {
  const s = raw
    .replace(/[^\p{L}\p{N} .,'&/+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_IDEA)
    .trim();
  return s.length >= 3 ? s : null;
}

export function businessFor(industry: number | null, choice: BusinessChoice | null): Business | null {
  if (industry === null || choice === null) return null;
  const combo = COMBOS[industry]?.[choice.model];
  const model = MODELS[choice.model];
  const idea = cleanIdea(choice.idea);
  if (!combo || !model || !idea) return null;
  return { ...combo, model, idea };
}
