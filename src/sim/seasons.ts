// Demand has a calendar. Each industry has a monthly index (an average month is 100): gyms fill up in January, shops
// in November and December, tax help in spring. A run starts in a month drawn from the seed, so the first weeks are
// not always a quiet or a busy time. Sources and what is estimated are in docs/specs/realism-pass-3.md: Health,
// Retail, Money, Food, Travel and Beauty come from published data (secondary sources, shape partly interpolated); the
// rest are estimates, marked below.
import { randInt } from "./rng";
import type { Season } from "./types";

// Index 0..13 follow INDUSTRIES in world.ts. January first.
export const SEASONALITY: readonly (readonly number[])[] = [
  [90, 90, 100, 110, 115, 110, 105, 100, 100, 100, 95, 85], // 0 Local services (estimate: spring and early summer jobs)
  [125, 105, 100, 95, 95, 90, 90, 95, 105, 100, 105, 95], // 1 Consumer apps (estimate: new-year resolutions)
  [110, 105, 110, 95, 95, 100, 85, 80, 110, 110, 100, 80], // 2 Business software (estimate: budget cycles, quiet summer and December)
  [150, 110, 100, 115, 100, 90, 85, 90, 110, 95, 90, 70], // 3 Health and wellness (gyms: January sign-ups)
  [160, 190, 180, 220, 40, 35, 40, 40, 50, 70, 85, 90], // 4 Money and fintech (tax and accounting: spring)
  [120, 100, 100, 95, 90, 80, 75, 85, 130, 105, 100, 90], // 5 Creators and education (estimate: January and back to school)
  [90, 90, 100, 100, 110, 105, 110, 115, 95, 95, 100, 90], // 6 Food and drink (August busiest)
  [85, 85, 95, 95, 95, 95, 95, 100, 100, 115, 150, 140], // 7 Retail and e-commerce (Q4)
  [70, 75, 95, 105, 110, 120, 135, 125, 100, 95, 85, 85], // 8 Travel and hospitality (July peak)
  [80, 85, 110, 115, 120, 120, 110, 100, 95, 90, 80, 75], // 9 Real estate and home (estimate: spring and summer)
  [95, 95, 100, 105, 110, 110, 105, 100, 100, 100, 100, 115], // 10 Pets and animals (estimate: summer and the holidays)
  [80, 80, 95, 100, 110, 115, 110, 105, 100, 100, 105, 125], // 11 Entertainment and events (estimate: summer and December)
  [80, 80, 90, 95, 95, 95, 95, 100, 105, 110, 125, 135], // 12 Transport and logistics (estimate: Q4 parcels)
  [84, 84, 120, 100, 120, 120, 100, 96, 100, 100, 96, 80], // 13 Beauty and personal care (March, May and June)
];

export const FORECAST_WEEKS = 8;
const MONTH_OF_WEEK = (startMonth: number, week: number): number => (startMonth + Math.floor((week * 12) / 52)) % 12;

/** The month the run begins in: January is 0. */
export const startMonthOf = (seed: number): number => randInt(seed, 0, 11, "season", "start");

/** The calendar month and the demand index for a week, with the next eight weeks of index. */
export function seasonAt(industry: number, seed: number, week: number): Season {
  const table = SEASONALITY[industry] ?? (SEASONALITY[1] as readonly number[]);
  const start = startMonthOf(seed);
  const month = MONTH_OF_WEEK(start, week);
  return {
    month,
    index: table[month] ?? 100,
    forecast: Array.from({ length: FORECAST_WEEKS }, (_, i) => table[MONTH_OF_WEEK(start, week + 1 + i)] ?? 100),
  };
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
