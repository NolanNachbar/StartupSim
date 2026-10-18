import { describe, expect, it } from "vitest";
import { archetypeWeights, pickArchetype, type Archetype } from "./archetypes";
import { generateWorld } from "./world";
import { debriefTag, endEarlyPct, noiseRange, painReading, signalQuality } from "./signal";
import type { QuestionType } from "./types";

const ARCHETYPES: Archetype[] = ["polite", "blunt", "curious", "hostile", "friend"];
const QUESTIONS: QuestionType[] = ["past-behavior", "commitment", "hypothetical", "pitch"];

describe("signalQuality", () => {
  it("matches a hand-checked table", () => {
    // protects: the Mom Test model behind every interview; fails_when: a base, modifier, bonus or cap changes.
    const cases: Array<[QuestionType, Archetype, number, number]> = [
      ["past-behavior", "polite", 60, 75],
      ["past-behavior", "polite", 100, 85],
      ["past-behavior", "polite", 20, 65],
      ["past-behavior", "curious", 100, 100],
      ["past-behavior", "blunt", 100, 95],
      ["past-behavior", "friend", 100, 45],
      ["hypothetical", "polite", 60, 15],
      ["hypothetical", "blunt", 100, 40],
      ["hypothetical", "friend", 60, 25],
      ["pitch", "hostile", 60, 0],
      ["pitch", "polite", 100, 5],
      ["pitch", "friend", 60, 15],
      ["commitment", "hostile", 20, 45],
      ["commitment", "friend", 60, 25],
    ];
    for (const [q, a, pain, expected] of cases) {
      expect(signalQuality(q, a, pain), `${q} ${a} pain ${pain}`).toBe(expected);
    }
  });

  it("floors the pain bonus toward minus infinity", () => {
    expect(signalQuality("past-behavior", "blunt", 59)).toBe(80 + 5 - 1);
    expect(signalQuality("past-behavior", "blunt", 21)).toBe(80 + 5 - 10);
  });

  it("stays inside [0, 100] for every input", () => {
    for (const q of QUESTIONS) {
      for (const a of ARCHETYPES) {
        for (let pain = 20; pain <= 100; pain++) {
          const v = signalQuality(q, a, pain);
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("is strictly ordered pitch < hypothetical < past-behavior for every archetype and pain", () => {
    // protects: more specific questions never give worse signal; fails_when: the ordering breaks for any customer.
    for (const a of ARCHETYPES) {
      for (let pain = 20; pain <= 100; pain++) {
        const pitch = signalQuality("pitch", a, pain);
        const hypo = signalQuality("hypothetical", a, pain);
        const past = signalQuality("past-behavior", a, pain);
        expect(pitch, `${a} pain ${pain}`).toBeLessThan(hypo);
        expect(hypo, `${a} pain ${pain}`).toBeLessThan(past);
      }
    }
  });

  it("across 500 seeds, past-behavior beats hypothetical by 15+ points and hypothetical beats pitch, per archetype", () => {
    for (const a of ARCHETYPES) {
      let past = 0;
      let hypo = 0;
      let pitch = 0;
      for (let seed = 0; seed < 500; seed++) {
        const pain = generateWorld(seed).segments[0]?.pain ?? 60;
        past += signalQuality("past-behavior", a, pain);
        hypo += signalQuality("hypothetical", a, pain);
        pitch += signalQuality("pitch", a, pain);
      }
      expect((past - hypo) / 500, a).toBeGreaterThanOrEqual(15);
      expect(hypo / 500, a).toBeGreaterThan(pitch / 500);
    }
  });
});

describe("debriefTag", () => {
  it("maps quality to fact, fluff and compliment, with brush-offs counted as fluff", () => {
    expect(debriefTag(75, "polite")).toBe("fact");
    expect(debriefTag(60, "blunt")).toBe("fact");
    expect(debriefTag(59, "polite")).toBe("fluff");
    expect(debriefTag(30, "polite")).toBe("fluff");
    expect(debriefTag(29, "polite")).toBe("compliment");
    expect(debriefTag(29, "curious")).toBe("compliment");
    expect(debriefTag(15, "friend")).toBe("compliment");
    expect(debriefTag(29, "blunt")).toBe("fluff");
    expect(debriefTag(0, "hostile")).toBe("fluff");
  });
});

describe("endEarlyPct", () => {
  it("is 0 for friends, higher for commitment questions and hostile strangers, and capped at 95", () => {
    for (const q of QUESTIONS) expect(endEarlyPct(q, "friend", 60)).toBe(0);
    expect(endEarlyPct("commitment", "polite", 100)).toBe(25);
    expect(endEarlyPct("commitment", "polite", 20)).toBe(45);
    expect(endEarlyPct("past-behavior", "hostile", 60)).toBe(40);
    expect(endEarlyPct("past-behavior", "polite", 60)).toBe(0);
    expect(endEarlyPct("commitment", "hostile", 20)).toBe(85);
    for (const a of ARCHETYPES) {
      for (const q of QUESTIONS) {
        for (let pain = 20; pain <= 100; pain++) {
          expect(endEarlyPct(q, a, pain)).toBeLessThanOrEqual(95);
          expect(endEarlyPct(q, a, pain)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("noiseRange", () => {
  it("is half the missing quality: no noise at 100, 30 at 40, 50 at 0", () => {
    expect(noiseRange(100)).toBe(0);
    expect(noiseRange(40)).toBe(30);
    expect(noiseRange(0)).toBe(50);
    expect(noiseRange(75)).toBe(12);
  });
});

describe("painReading", () => {
  it("adds noise and flattery, and clamps to [0, 100]", () => {
    expect(painReading(60, 100, "past-behavior", "polite", 0)).toBe(60);
    expect(painReading(60, 40, "hypothetical", "polite", 10)).toBe(85);
    expect(painReading(60, 40, "hypothetical", "blunt", 10)).toBe(70);
    expect(painReading(60, 40, "past-behavior", "polite", 10)).toBe(70);
    expect(painReading(95, 0, "pitch", "friend", 40)).toBe(100);
    expect(painReading(5, 0, "past-behavior", "blunt", -50)).toBe(0);
  });
});

describe("archetype weights", () => {
  it("weights polite by politeness and blunt by its complement, with fixed curious and hostile weights", () => {
    expect(archetypeWeights(70)).toEqual({ polite: 70, blunt: 30, curious: 30, hostile: 20 });
    expect(archetypeWeights(0)).toEqual({ polite: 0, blunt: 100, curious: 30, hostile: 20 });
  });

  it("maps rolls 1 to 150 to archetypes in order polite, blunt, curious, hostile", () => {
    expect(pickArchetype(70, 1)).toBe("polite");
    expect(pickArchetype(70, 70)).toBe("polite");
    expect(pickArchetype(70, 71)).toBe("blunt");
    expect(pickArchetype(70, 100)).toBe("blunt");
    expect(pickArchetype(70, 101)).toBe("curious");
    expect(pickArchetype(70, 130)).toBe("curious");
    expect(pickArchetype(70, 131)).toBe("hostile");
    expect(pickArchetype(70, 150)).toBe("hostile");
  });

  it("never produces blunt strangers at politeness 100 or polite ones at politeness 0", () => {
    const seen100 = new Set<Archetype>();
    const seen0 = new Set<Archetype>();
    for (let roll = 1; roll <= 150; roll++) {
      seen100.add(pickArchetype(100, roll));
      seen0.add(pickArchetype(0, roll));
    }
    expect(seen100.has("blunt")).toBe(false);
    expect(seen0.has("polite")).toBe(false);
    expect(seen100.has("polite")).toBe(true);
    expect(seen0.has("blunt")).toBe(true);
  });
});
