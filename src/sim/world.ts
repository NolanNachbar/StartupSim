// The hidden world, generated from the seed. Every draw names its key (see rng.ts).
import { randChance, randInt, randPick } from "./rng";
import type { Channel, Secret, Segment, Weather } from "./types";

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

const CHANNELS = [
  { name: "Cold outreach", costPerLeadCents: 800 },
  { name: "Communities", costPerLeadCents: 300 },
  { name: "Paid ads", costPerLeadCents: 2500 },
] as const;

const WEATHER_DEMAND_PCT = 70;

function generateSegment(seed: number, i: number): Segment {
  const pain = randInt(seed, 20, 100, "seg", i, "pain");
  const size = randInt(seed, 200, 4999, "seg", i, "size");
  const incumbentSatisfactionPct = randInt(seed, 0, 80, "seg", i, "incumbent");
  return {
    name: SEGMENT_NAMES[i] ?? `Segment ${i + 1}`,
    pain,
    willingnessToPayCents: randInt(seed, 10, 199, "seg", i, "wtp") * 100,
    politeness: randInt(seed, 0, 100, "seg", i, "polite"),
    reachability: randInt(seed, 10, 100, "seg", i, "reach"),
    size,
    incumbentSatisfactionPct,
    trueDemand: Math.floor((size * pain * pain * (100 - incumbentSatisfactionPct)) / 1_000_000),
  };
}

function generateWeather(seed: number): Weather | null {
  if (!randChance(seed, 0.5, "world", "weather")) return null;
  const startWeek = randInt(seed, 20, 60, "world", "wstart");
  const endWeek = startWeek + randInt(seed, 10, 20, "world", "wlen");
  return { startWeek, endWeek, demandMultiplierPct: WEATHER_DEMAND_PCT };
}

/** Build the hidden world for a seed. Pure: equal seeds give deep-equal worlds. */
export function generateWorld(seed: number): Secret {
  const segmentCount = randInt(seed, 3, 5, "world", "segmentCount");
  const segments = Array.from({ length: segmentCount }, (_, i) => generateSegment(seed, i));
  const channels: Channel[] = CHANNELS.map((c, ci) => ({
    name: c.name,
    costPerLeadCents: c.costPerLeadCents,
    fit: segments.map((_, i) => randInt(seed, 0, 100, "chan", ci, "fit", i)),
  }));
  return {
    seed,
    problemName: randPick(seed, PROBLEMS, "world", "problem"),
    segments,
    channels,
    weather: generateWeather(seed),
    startFocus: randInt(seed, 0, segmentCount - 1, "world", "focus"),
  };
}

/** Demand multiplier in percent for a week: 70 inside the weather event, otherwise 100. */
export function weatherPctAt(secret: Secret, week: number): number {
  const w = secret.weather;
  if (w && week >= w.startWeek && week < w.endWeek) return w.demandMultiplierPct;
  return 100;
}
