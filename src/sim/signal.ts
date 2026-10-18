// The Mom Test as numbers. How much real information a conversation carries depends on the question
// asked and who answers. Integer math only. Changing any value here is a SIM_VERSION bump.
import type { Archetype } from "./archetypes";
import type { DebriefTag, QuestionType } from "./types";

const BASE: Readonly<Record<QuestionType, number>> = {
  "past-behavior": 80,
  commitment: 70,
  hypothetical: 35,
  pitch: 15,
};

/** Archetype adjustment per question type. Friends are handled by a cap instead. */
const MODIFIER: Readonly<Record<Archetype, Readonly<Record<QuestionType, number>>>> = {
  polite: { "past-behavior": -5, commitment: -10, hypothetical: -20, pitch: -10 },
  blunt: { "past-behavior": 5, commitment: 5, hypothetical: 5, pitch: 5 },
  curious: { "past-behavior": 10, commitment: 0, hypothetical: 0, pitch: 0 },
  hostile: { "past-behavior": -15, commitment: -15, hypothetical: -15, pitch: -15 },
  friend: { "past-behavior": 0, commitment: 0, hypothetical: 0, pitch: 0 },
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** How much real information a conversation carries, 0 to 100. */
export function signalQuality(question: QuestionType, archetype: Archetype, pain: number): number {
  let q = BASE[question] + MODIFIER[archetype][question];
  if (question === "past-behavior" || question === "commitment") q += Math.floor((pain - 60) / 4);
  if (archetype === "friend") q = Math.min(q, question === "past-behavior" ? 45 : 25);
  return clamp(q, 0, 100);
}

/** The post-call debrief. Brush-offs from blunt or hostile people are fluff, not compliments. */
export function debriefTag(quality: number, archetype: Archetype): DebriefTag {
  if (quality >= 60) return "fact";
  if (quality >= 30) return "fluff";
  return archetype === "blunt" || archetype === "hostile" ? "fluff" : "compliment";
}

/** Chance in percent that a stranger ends the call early. Friends never do. */
export function endEarlyPct(question: QuestionType, archetype: Archetype, pain: number): number {
  if (archetype === "friend") return 0;
  const hostile = archetype === "hostile" ? 40 : 0;
  const commitment = question === "commitment" ? 50 - Math.floor(pain / 4) : 0;
  return clamp(hostile + commitment, 0, 95);
}

/** The largest noise, in either direction, that a reading of this quality can carry. */
export function noiseRange(quality: number): number {
  return Math.floor((100 - quality) / 2);
}

/** What they say about how bad the problem is: the truth plus noise, plus flattery for polite or friendly answers. */
export function painReading(
  truth: number,
  quality: number,
  question: QuestionType,
  archetype: Archetype,
  noise: number,
): number {
  const flatters = question === "hypothetical" || question === "pitch";
  const flattery = flatters && (archetype === "polite" || archetype === "friend") ? Math.floor((100 - quality) / 4) : 0;
  return clamp(truth + noise + flattery, 0, 100);
}
