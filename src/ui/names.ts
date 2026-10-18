// Company names. The player names their own company; a name is suggested to start with. Names are only ever shown,
// never used in the simulation, so they cannot change a run.
export const MAX_NAME = 24;

const FIRST = ["Nimbus", "Kiln", "Tally", "Orbit", "Mosaic", "Fathom", "Pylon", "Quill", "Ember", "Lumen", "Harbor", "Basil", "Cobalt", "Juniper", "Atlas", "Cinder", "Marlow", "Tidal", "Sparrow", "Granite", "Willow", "Vector", "Plover", "Saffron", "Bramble", "Copper", "Meridian", "Ladle", "Parcel", "Thistle"];
const SECOND = ["Labs", "Works", "Systems", "Co", "Studio", "Health", "Logic", "Supply", "Cloud", "Loop", "Forge", "Collective", "Hub", "Ops", "Bay"];

export function suggestName(seed: number): string {
  const a = FIRST[(seed >>> 0) % FIRST.length] as string;
  const b = SECOND[Math.floor((seed >>> 0) / FIRST.length) % SECOND.length] as string;
  return `${a} ${b}`;
}

/** Trim, collapse spaces, drop characters outside letters, digits and . , ' & -, and cap the length. Null when nothing useful is left. */
export function cleanName(raw: string): string | null {
  const kept = raw.replace(/[^\p{L}\p{N} .,'&-]/gu, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME).trim();
  return kept.length >= 2 ? kept : null;
}
