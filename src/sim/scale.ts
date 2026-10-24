// A "place" is not one thing: a laundromat, a cafe, a restaurant and a gym differ in how many people they serve, what
// staff cost, what fitting them out costs and what they cost to run. The industry sets a base, and the words of the idea
// the player typed adjust it ("a pizza restaurant" is not "a coffee cart"). Percentages of the usual for a place; 100
// changes nothing. Only places use this: apps, services and products keep their own numbers.
import type { ModelId } from "./business";

export interface Scale {
  /** The starting price, as a percent of the usual. */
  readonly price: number;
  /** How many customers it can serve. */
  readonly capacity: number;
  /** What staff cost. */
  readonly wage: number;
  /** What fitting it out costs. */
  readonly fitout: number;
  /** Weekly running costs. */
  readonly burn: number;
}
const S = (price: number, capacity: number, wage: number, fitout: number, burn: number): Scale => ({ price, capacity, wage, fitout, burn });
export const NO_SCALE: Scale = S(100, 100, 100, 100, 100);

// By industry (the order of INDUSTRIES in world.ts), for a place.
const PLACE_BY_INDUSTRY: readonly Scale[] = [
  /* 0 Local services: repair shop, laundromat */ S(100, 150, 90, 70, 80),
  /* 1 Consumer apps: a board-game cafe */ S(100, 200, 70, 80, 90),
  /* 2 Business software: coworking */ S(100, 100, 90, 100, 110),
  /* 3 Health and wellness: a gym */ NO_SCALE,
  /* 4 Money: an office */ S(100, 80, 100, 40, 60),
  /* 5 Creators and education: a studio */ S(100, 70, 90, 60, 70),
  /* 6 Food and drink */ S(100, 300, 60, 150, 110),
  /* 7 Retail: a shop */ S(100, 200, 70, 70, 90),
  /* 8 Travel: a hostel or guesthouse */ S(100, 100, 80, 250, 130),
  /* 9 Real estate and home: a showroom */ S(100, 60, 100, 100, 100),
  /* 10 Pets: day-care, grooming */ S(100, 80, 80, 90, 100),
  /* 11 Entertainment: escape room, bar */ S(100, 120, 70, 100, 100),
  /* 12 Transport: a bike hub */ S(100, 100, 90, 60, 80),
  /* 13 Beauty: barber, nails, spa */ S(100, 60, 100, 70, 90),
];

/** Words in the idea that change what kind of place it is. Every match multiplies. */
const IDEA_WORDS: readonly (readonly [RegExp, Scale])[] = [
  [/restaurant|pizza|steakhouse|diner|bistro|ramen|trattoria|grill/i, S(200, 70, 100, 180, 140)],
  [/food truck|truck|cart|kiosk|stall/i, S(100, 50, 100, 35, 45)],
  [/bar\b|pub\b|brewery|taproom|cocktail/i, S(160, 80, 100, 150, 130)],
  [/bakery|donut|pastry/i, S(80, 90, 100, 100, 100)],
  [/yoga|pilates|barre|boutique/i, S(150, 40, 100, 70, 90)],
  [/crossfit|boxing|martial|climbing/i, S(130, 60, 100, 100, 100)],
  [/spa\b|massage|sauna/i, S(150, 50, 100, 120, 110)],
  [/luxury|premium|upscale|fine dining/i, S(180, 70, 120, 160, 130)],
  [/budget|discount|cheap|24.?7 gym|basic/i, S(60, 150, 80, 70, 90)],
];

/** What a place of this industry and idea is like, as percents of the usual. Not a place: no change. */
export function scaleFor(industry: number | null, model: ModelId, idea: string): Scale {
  if (model !== "location") return NO_SCALE;
  const base = PLACE_BY_INDUSTRY[industry ?? 3] ?? NO_SCALE;
  let out = base;
  for (const [re, s] of IDEA_WORDS) {
    if (re.test(idea)) out = S(Math.round((out.price * s.price) / 100), Math.round((out.capacity * s.capacity) / 100), Math.round((out.wage * s.wage) / 100), Math.round((out.fitout * s.fitout) / 100), Math.round((out.burn * s.burn) / 100));
  }
  return out;
}

export const pct = (n: number, p: number): number => Math.round((n * p) / 100);
