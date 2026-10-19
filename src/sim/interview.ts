// One interview round: three conversations with people from one segment. Every draw is keyed by the
// round index (how many interviews came before) and the slot, never by the week, so inserting an
// unrelated action earlier does not change who you talk to.
import { ARCHETYPE_ROLL_MAX, pickArchetype, type Archetype } from "./archetypes";
import type { Business } from "./business";
import { randChance, randInt, randPick } from "./rng";
import { conversionPct, priceRatioPct } from "./runway";
import { debriefTag, endEarlyPct, noiseRange, painReading, signalQuality } from "./signal";
import type { DebriefTag, InterviewEvidence, QuestionType, Secret } from "./types";

const FRIEND_CHANCE = 0.1;
const FRIEND_YES_PCT = 70;

type QuoteTable = Readonly<Record<DebriefTag, readonly string[]>>;

const QUOTES: Readonly<Record<Exclude<QuestionType, "commitment">, QuoteTable>> = {
  "past-behavior": {
    fact: [
      "The last time was two weeks ago. I lost half a day fixing it by hand.",
      "It happened on Tuesday. I paid someone to sort it out and it cost real money.",
      "We keep a spreadsheet for it and it breaks every month.",
    ],
    fluff: ["It comes up now and then, I guess.", "Yeah, it can be annoying sometimes.", "I don't really keep track of how often."],
    compliment: ["Oh, that happens all the time. I couldn't tell you when, though."],
  },
  hypothetical: {
    fact: ["I wouldn't use it. What I do now works fine."],
    fluff: ["Maybe. It depends on the price and how it works.", "I could see that being useful for someone."],
    compliment: ["Yeah, I'd totally use that.", "That sounds really useful, I'm sure I would.", "Sure, why not. Sounds great."],
  },
  pitch: {
    fact: ["I have this exact problem and I would switch tomorrow."],
    fluff: ["Interesting. I'll have to think about it.", "Not sure it's for me, but good luck."],
    compliment: ["That's a great idea. You should definitely build it.", "I love it. Let me know when it launches."],
  },
};

const cap = (s: string): string => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

/**
 * What customers say when the player chose a business: the same kinds of answer (a fact, a vague one, a compliment),
 * in that business's own words. The tag still comes from the question and the person, never from the text.
 */
function businessQuotes(b: Business): { readonly table: Readonly<Record<Exclude<QuestionType, "commitment">, QuoteTable>>; readonly yes: readonly string[]; readonly no: readonly string[] } {
  return {
    table: {
      "past-behavior": {
        fact: [
          `The last time was two weeks ago. ${cap(b.cost)}, and I sorted it out with ${b.workaround}.`,
          `It happened on Tuesday: ${b.situation}. It cost me real money.`,
          `We deal with it using ${b.workaround}, and it falls apart every month.`,
        ],
        fluff: QUOTES["past-behavior"].fluff,
        compliment: QUOTES["past-behavior"].compliment,
      },
      hypothetical: {
        fact: [`I wouldn't ${b.model.useVerb} it. What I do now, ${b.workaround}, works fine.`],
        fluff: QUOTES.hypothetical.fluff,
        compliment: [`Yeah, I'd totally ${b.model.useVerb} ${b.idea}.`, ...QUOTES.hypothetical.compliment],
      },
      pitch: {
        fact: [`I have this exact problem: ${b.situation}. I would switch tomorrow.`],
        fluff: QUOTES.pitch.fluff,
        compliment: [`${cap(b.idea)}? That's a great idea. You should definitely go for it.`, ...QUOTES.pitch.compliment],
      },
    },
    yes: [`Yes. ${cap(b.cost)}, so that is worth paying for. Send me the link.`, ...COMMITMENT_QUOTES.yes],
    no: [`Not at that price. ${cap(b.workaround)} is good enough for now.`, ...COMMITMENT_QUOTES.no],
  };
}

const COMMITMENT_QUOTES = {
  yes: ["Yes. I'd pay that today. Send me the link.", "I can start next week. Who do I send the payment to?", "Yes, and I know two other people who need this."],
  no: ["Not at that price, and not right now.", "I can't commit to paying for this yet.", "I'd have to ask my partner, and honestly probably not."],
  friendYes: ["Of course I would. I'm happy to support you.", "Absolutely, put me down. Anything for you."],
  friendNo: ["Maybe later. Let's see how it goes.", "Ask me again when it's finished."],
} as const;

const ENDED_QUOTES = ["I have to run. Sorry.", "I don't have time for this.", "Let's not do this on a call."] as const;
const ENDED_COMMITMENT_QUOTES = ["I'm not committing to anything on a call.", "Send me something in writing and I'll look."] as const;

export interface RoundInput {
  readonly secret: Secret;
  readonly seed: number;
  /** How many interview rounds came before this one. */
  readonly index: number;
  /** The week the round starts. */
  readonly week: number;
  readonly segment: number;
  readonly questions: readonly QuestionType[];
  readonly priceCents: number;
}

export function runInterviewRound(input: RoundInput): InterviewEvidence[] {
  return input.questions.map((question, slot) => converse(input, question, slot));
}

function converse(input: RoundInput, question: QuestionType, slot: number): InterviewEvidence {
  const { secret, seed, index, week, segment } = input;
  const seg = secret.segments[segment];
  if (!seg) throw new RangeError(`segment ${segment} does not exist`);
  const base = { kind: "interview", week, segment, question } as const;
  const key = ["iv", index, slot] as const;

  const friend = randChance(seed, FRIEND_CHANCE, ...key, "friend");
  const responds = friend || randInt(seed, 1, 100, ...key, "reach") <= seg.reachability;
  if (!responds) {
    return { ...base, customer: "none", outcome: "no-response", tag: null, painReading: null, committed: null, quote: "No reply." };
  }

  const archetype: Archetype = friend
    ? "friend"
    : pickArchetype(seg.politeness, randInt(seed, 1, ARCHETYPE_ROLL_MAX, ...key, "arch"));
  const customer = friend ? "friend" : "stranger";
  const needsIt = randInt(seed, 1, 10_000, ...key, "need") <= seg.pain * (100 - seg.incumbentSatisfactionPct);

  const ends = randInt(seed, 1, 100, ...key, "end") <= endEarlyPct(question, archetype, seg.pain);
  if (ends) {
    const pool = question === "commitment" ? ENDED_COMMITMENT_QUOTES : ENDED_QUOTES;
    return { ...base, customer, outcome: "ended-early", tag: null, painReading: null, committed: null, quote: randPick(seed, pool, ...key, "quote") };
  }

  const quality = signalQuality(question, archetype, seg.pain);
  const tag = debriefTag(quality, archetype);
  const truth = needsIt ? seg.pain : Math.floor(seg.pain / 4);
  const m = noiseRange(quality);
  const reading = painReading(truth, quality, question, archetype, randInt(seed, -m, m, ...key, "noise"));

  let committed: boolean | null = null;
  let quote: string;
  if (question === "commitment") {
    const roll = randInt(seed, 1, 100, ...key, "buy");
    committed = friend
      ? roll <= FRIEND_YES_PCT
      : needsIt && roll <= conversionPct(priceRatioPct(input.priceCents, seg.willingnessToPayCents));
    const own = secret.business ? businessQuotes(secret.business) : null;
    const pool = friend
      ? committed ? COMMITMENT_QUOTES.friendYes : COMMITMENT_QUOTES.friendNo
      : committed ? (own?.yes ?? COMMITMENT_QUOTES.yes) : (own?.no ?? COMMITMENT_QUOTES.no);
    quote = randPick(seed, pool, ...key, "quote");
  } else {
    quote = randPick(seed, (secret.business ? businessQuotes(secret.business).table : QUOTES)[question][tag], ...key, "quote");
  }
  return { ...base, customer, outcome: "completed", tag, painReading: reading, committed, quote };
}
