// The hidden world, generated from the seed. Every draw names its key (see rng.ts).
import { randChance, randInt, randPick } from "./rng";
import { LATE_PAYER_DELAY_WEEKS, LATE_PAYER_PCT } from "./runway";
import { businessFor, type BusinessChoice } from "./business";
import { channelsFor } from "./channels";
import { WTP_PCT_BY_MODEL } from "./realism";
import type { Channel, LateWindow, Secret, Segment, Weather } from "./types";

export const PROBLEMS = [
  "Appointment booking for small clinics",
  "Invoice chasing for freelancers",
  "Route planning for lawn crews",
] as const;

export const SEGMENT_NAMES = [
  "Solo operators",
  "Small teams",
  "Established shops",
  "Franchise owners",
  "Enterprise buyers",
] as const;

/** A market. Public fields describe it in plain words; the multipliers are hidden and shape the generated world. */
export interface Industry {
  readonly name: string;
  readonly blurb: string;
  readonly problems: readonly string[];
  readonly segmentNames: readonly string[];
  /** Percent multipliers on willingness to pay, how reachable people are, market size, and how true their pain is. */
  readonly wtpPct: number;
  readonly reachPct: number;
  readonly sizePct: number;
  readonly painPct: number;
  /** Added to how polite (misleading) interviewees are. */
  readonly politeShift: number;
}

export const INDUSTRIES: readonly Industry[] = [
  { name: "Local services", blurb: "Small businesses with real day-to-day problems. Easy to find, moderate budgets.", problems: ["Scheduling for home-service crews", "Booking for small clinics", "Quotes and invoices for contractors"], segmentNames: ["Solo operators", "Small shops", "Multi-site owners", "Franchise groups", "Regional chains"], wtpPct: 100, reachPct: 100, sizePct: 100, painPct: 100, politeShift: 0 },
  { name: "Consumer apps", blurb: "Millions of people, tiny budgets. Everyone is happy to tell you they love the idea.", problems: ["Habit tracking for busy people", "Splitting bills with roommates", "Meal planning for families"], segmentNames: ["Students", "Young professionals", "Parents", "Hobbyists", "Retirees"], wtpPct: 40, reachPct: 140, sizePct: 250, painPct: 85, politeShift: 25 },
  { name: "Business software", blurb: "Companies pay well to save time, but they are slow to answer and hard to reach.", problems: ["Onboarding for new hires", "Expense reports for teams", "Reporting for operations managers"], segmentNames: ["Startups", "Small teams", "Mid-size companies", "Departments", "Enterprises"], wtpPct: 220, reachPct: 60, sizePct: 70, painPct: 100, politeShift: 10 },
  { name: "Health and wellness", blurb: "Strong needs and real budgets, but busy, careful buyers who guard their time.", problems: ["Appointment reminders for clinics", "Patient intake paperwork", "Recovery plans for physiotherapists"], segmentNames: ["Independent practitioners", "Small clinics", "Gym owners", "Wellness buyers", "Hospital groups"], wtpPct: 150, reachPct: 55, sizePct: 90, painPct: 110, politeShift: 15 },
  { name: "Money and fintech", blurb: "Money problems hurt and people pay to fix them, but they trust slowly.", problems: ["Invoice chasing for freelancers", "Cash-flow forecasts for shop owners", "Rent collection for landlords"], segmentNames: ["Freelancers", "Small businesses", "Landlords", "Accountants", "Credit unions"], wtpPct: 200, reachPct: 50, sizePct: 80, painPct: 110, politeShift: 0 },
  { name: "Creators and education", blurb: "Passionate people with thin margins. Plenty to reach, modest budgets.", problems: ["Selling courses without a platform", "Scheduling for private tutors", "Feedback tools for coaches"], segmentNames: ["Hobby teachers", "Course creators", "Tutors", "Schools", "Training companies"], wtpPct: 60, reachPct: 120, sizePct: 150, painPct: 95, politeShift: 20 },
  { name: "Food and drink", blurb: "Everyone eats, margins are thin, and people stay loyal to what they already know.", problems: ["Kitchen stock tracking", "Meal prep for families", "Neighbourhood coffee shops"], segmentNames: ["Home cooks", "Food bloggers", "Small cafes", "Restaurant owners", "Catering firms"], wtpPct: 70, reachPct: 130, sizePct: 160, painPct: 95, politeShift: 15 },
  { name: "Retail and e-commerce", blurb: "Many buyers and plenty of choice, but shoppers compare prices and leave fast.", problems: ["Inventory sync for small shops", "Fulfilment for online sellers", "Handmade gifts"], segmentNames: ["Market sellers", "Online sellers", "Boutique stores", "Retail chains", "Brands"], wtpPct: 80, reachPct: 120, sizePct: 200, painPct: 90, politeShift: 20 },
  { name: "Travel and hospitality", blurb: "People spend freely on trips, but demand swings with the seasons and bookings are fickle.", problems: ["Booking sync for small hotels", "Itinerary planning", "Boutique stays"], segmentNames: ["Small hotels", "Hostels", "Tour operators", "Travel agents", "Hotel groups"], wtpPct: 110, reachPct: 90, sizePct: 120, painPct: 95, politeShift: 15 },
  { name: "Real estate and home", blurb: "Big sums change hands and decisions are slow, careful and personal.", problems: ["Maintenance tracking", "Property management", "Home improvement"], segmentNames: ["Solo landlords", "Small agencies", "Property managers", "Developers", "Housing groups"], wtpPct: 190, reachPct: 70, sizePct: 80, painPct: 105, politeShift: 5 },
  { name: "Pets and animals", blurb: "Owners love their pets and spend on them, and they say yes to anything that sounds kind.", problems: ["Bookings for pet businesses", "Pet sitting", "Pet food and gear"], segmentNames: ["Dog walkers", "Groomers", "Small vets", "Pet sitters", "Shelters"], wtpPct: 90, reachPct: 110, sizePct: 130, painPct: 105, politeShift: 20 },
  { name: "Entertainment and events", blurb: "Memorable nights out and big occasions, but spending is irregular and everyone is a critic.", problems: ["Ticketing for small venues", "Event planning", "Party supplies"], segmentNames: ["Event organisers", "Small venues", "Bands and artists", "Promoters", "Festival teams"], wtpPct: 80, reachPct: 120, sizePct: 140, painPct: 90, politeShift: 25 },
  { name: "Transport and logistics", blurb: "Businesses pay well to get things moved on time, and they are hard to reach and slow to switch.", problems: ["Route planning for fleets", "Local courier service", "Bike repair and storage"], segmentNames: ["Freelance couriers", "Small fleets", "Delivery shops", "Logistics firms", "Warehouses"], wtpPct: 160, reachPct: 70, sizePct: 90, painPct: 105, politeShift: 5 },
  { name: "Beauty and personal care", blurb: "People care how they look and are loyal to who they trust, but chairs and slots go empty.", problems: ["Booking for stylists", "Mobile beauty services", "Skincare products"], segmentNames: ["Solo stylists", "Barbers", "Small salons", "Spas", "Salon groups"], wtpPct: 100, reachPct: 110, sizePct: 130, painPct: 95, politeShift: 20 },
];

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

const CHANNELS = [
  { name: "Cold outreach", costPerLeadCents: 800 },
  { name: "Communities", costPerLeadCents: 300 },
  { name: "Paid ads", costPerLeadCents: 2500 },
] as const;

const WEATHER_DEMAND_PCT = 70;
/** Scales the customers a segment can hold. Tuned in M7 so a careful founder lands about 4 runs in 10. */
const DEMAND_POOL_DIVISOR = 3_000_000;

function generateSegment(seed: number, i: number, industry: Industry | null): Segment {
  const pain = randInt(seed, 20, 100, "seg", i, "pain");
  const size = randInt(seed, 200, 4999, "seg", i, "size");
  const incumbentSatisfactionPct = randInt(seed, 0, 80, "seg", i, "incumbent");
  const wtp = randInt(seed, 10, 199, "seg", i, "wtp") * 100;
  const polite = randInt(seed, 0, 100, "seg", i, "polite");
  const reach = randInt(seed, 10, 100, "seg", i, "reach");
  if (industry) {
    // A market shapes the same draws; it never adds new ones, so the world stays a pure function of seed and industry.
    const painI = clamp(Math.floor((pain * industry.painPct) / 100), 20, 100);
    const sizeI = clamp(Math.floor((size * industry.sizePct) / 100), 100, 9999);
    return {
      name: industry.segmentNames[i] ?? `Segment ${i + 1}`,
      pain: painI,
      willingnessToPayCents: clamp(Math.floor((wtp * industry.wtpPct) / 100), 500, 59_900),
      politeness: clamp(polite + industry.politeShift, 0, 100),
      reachability: clamp(Math.floor((reach * industry.reachPct) / 100), 10, 100),
      size: sizeI,
      incumbentSatisfactionPct,
      trueDemand: Math.floor((sizeI * painI * painI * (100 - incumbentSatisfactionPct)) / DEMAND_POOL_DIVISOR),
    };
  }
  return {
    name: SEGMENT_NAMES[i] ?? `Segment ${i + 1}`,
    pain,
    willingnessToPayCents: wtp,
    politeness: polite,
    reachability: reach,
    size,
    incumbentSatisfactionPct,
    trueDemand: Math.floor((size * pain * pain * (100 - incumbentSatisfactionPct)) / DEMAND_POOL_DIVISOR),
  };
}

function generateWeather(seed: number): Weather | null {
  if (!randChance(seed, 0.5, "world", "weather")) return null;
  const startWeek = randInt(seed, 20, 60, "world", "wstart");
  const endWeek = startWeek + randInt(seed, 10, 20, "world", "wlen");
  return { startWeek, endWeek, demandMultiplierPct: WEATHER_DEMAND_PCT };
}

function generateLateWindow(seed: number): LateWindow | null {
  if (!randChance(seed, 0.5, "world", "late")) return null;
  const startWeek = randInt(seed, 15, 70, "world", "lstart");
  const endWeek = startWeek + randInt(seed, 8, 16, "world", "llen");
  return { startWeek, endWeek, pct: LATE_PAYER_PCT, delayWeeks: LATE_PAYER_DELAY_WEEKS };
}

/** Build the hidden world for a seed. Pure: equal seeds give deep-equal worlds. */
export function generateWorld(seed: number, industryIndex: number | null = null, choice: BusinessChoice | null = null): Secret {
  const industry = industryIndex === null ? null : (INDUSTRIES[industryIndex] ?? null);
  const business = businessFor(industryIndex, choice);
  const segmentCount = randInt(seed, 3, 5, "world", "segmentCount");
  // The chosen business renames the customer groups; it never changes a draw, so the numbers stay those of the industry.
  const segments = Array.from({ length: segmentCount }, (_, i) => {
    const seg = generateSegment(seed, i, industry);
    const name = business?.segmentNames[i];
    const named = name ? { ...seg, name } : seg;
    return business ? { ...named, willingnessToPayCents: clamp(Math.floor((named.willingnessToPayCents * WTP_PCT_BY_MODEL[business.model.id]) / 100), 500, 59_900) } : named;
  });
  // A chosen business has its own channels (the first three keep their draws); the original worlds keep the original three.
  const specs: readonly { readonly name: string; readonly costPerLeadCents: number; readonly blurb?: string }[] = business ? channelsFor(business.model.id, industryIndex) : CHANNELS;
  const channels: Channel[] = specs.map((c, ci) => ({
    name: c.name,
    ...("blurb" in c && c.blurb ? { blurb: c.blurb } : {}),
    costPerLeadCents: c.costPerLeadCents,
    fit: segments.map((_, i) => randInt(seed, 0, 100, "chan", ci, "fit", i)),
  }));
  return {
    seed,
    problemName: business ? business.idea : randPick(seed, industry ? industry.problems : PROBLEMS, "world", "problem"),
    segments,
    channels,
    weather: generateWeather(seed),
    lateWindow: generateLateWindow(seed),
    startFocus: randInt(seed, 0, segmentCount - 1, "world", "focus"),
    business,
  };
}

/** Demand multiplier in percent for a week: 70 inside the weather event, otherwise 100. */
export function weatherPctAt(secret: Secret, week: number): number {
  const w = secret.weather;
  if (w && week >= w.startWeek && week < w.endWeek) return w.demandMultiplierPct;
  return 100;
}
