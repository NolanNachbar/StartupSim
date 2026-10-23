// Channel tests and paid tests. Each lead is its own keyed draw, so results do not depend on the week
// and adding other actions earlier never changes who the leads are.
import { randInt } from "./rng";
import { CHANNEL_TEST_BUDGET_CENTS, CREDIBILITY_FLOOR_PCT, conversionPct, priceRatioPct } from "./runway";
import type { ChannelTestEvidence, PaidTestEvidence, Secret } from "./types";

interface BaseInput {
  readonly secret: Secret;
  readonly seed: number;
  /** How many tests of this kind came before. */
  readonly index: number;
  readonly week: number;
  readonly segment: number;
  readonly channel: number;
}

export interface PaidInput extends BaseInput {
  readonly priceCents: number;
  /** What the price comes to a month, when the business does not bill a month (conversion compares monthly prices). */
  readonly monthlyCents?: number;
  readonly productProgressPct: number;
}

function lookup(secret: Secret, segment: number, channel: number) {
  const seg = secret.segments[segment];
  const ch = secret.channels[channel];
  if (!seg || !ch) throw new RangeError(`segment ${segment} or channel ${channel} does not exist`);
  return { seg, ch, fit: ch.fit[segment] ?? 0, leads: Math.floor(CHANNEL_TEST_BUDGET_CENTS / ch.costPerLeadCents) };
}

export function runChannelTest(input: BaseInput): ChannelTestEvidence {
  const { secret, seed, index, week, segment, channel } = input;
  const { seg, fit, leads } = lookup(secret, segment, channel);
  let interested = 0;
  for (let i = 0; i < leads; i++) {
    const reached = randInt(seed, 1, 100, "ch", index, i, "fit") <= fit;
    if (reached && randInt(seed, 1, 100, "ch", index, i, "care") <= seg.pain) interested += 1;
  }
  return { kind: "channel-test", week, segment, channel, leads, interested };
}

export function runPaidTest(input: PaidInput): PaidTestEvidence {
  const { secret, seed, index, week, segment, channel, priceCents, productProgressPct } = input;
  const monthly = input.monthlyCents ?? priceCents;
  const { seg, fit, leads } = lookup(secret, segment, channel);
  const credibility = Math.max(CREDIBILITY_FLOOR_PCT, productProgressPct);
  const buyPct = Math.floor((conversionPct(priceRatioPct(monthly, seg.willingnessToPayCents)) * credibility) / 100);
  let payments = 0;
  for (let i = 0; i < leads; i++) {
    const reached = randInt(seed, 1, 100, "pt", index, i, "fit") <= fit;
    const hasProblem = randInt(seed, 1, 10_000, "pt", index, i, "need") <= seg.pain * (100 - seg.incumbentSatisfactionPct);
    if (reached && hasProblem && randInt(seed, 1, 100, "pt", index, i, "buy") <= buyPct) payments += 1;
  }
  return { kind: "paid-test", week, segment, channel, leads, payments, priceCents };
}
