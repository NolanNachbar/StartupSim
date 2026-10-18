// Who answers an interview. Strangers vary with the segment's politeness; friends are drawn separately.

export type StrangerArchetype = "polite" | "blunt" | "curious" | "hostile";
export type Archetype = StrangerArchetype | "friend";

export interface ArchetypeWeights {
  readonly polite: number;
  readonly blunt: number;
  readonly curious: number;
  readonly hostile: number;
}

const CURIOUS_WEIGHT = 30;
const HOSTILE_WEIGHT = 20;

/** Polite weighs the segment's politeness, blunt its complement; curious and hostile are fixed. Total 150. */
export function archetypeWeights(politeness: number): ArchetypeWeights {
  return {
    polite: politeness,
    blunt: 100 - politeness,
    curious: CURIOUS_WEIGHT,
    hostile: HOSTILE_WEIGHT,
  };
}

export const ARCHETYPE_ROLL_MAX = 150;

/** Map a roll in 1..150 to an archetype in the order polite, blunt, curious, hostile. */
export function pickArchetype(politeness: number, roll: number): StrangerArchetype {
  const w = archetypeWeights(politeness);
  if (roll <= w.polite) return "polite";
  if (roll <= w.polite + w.blunt) return "blunt";
  if (roll <= w.polite + w.blunt + w.curious) return "curious";
  return "hostile";
}
