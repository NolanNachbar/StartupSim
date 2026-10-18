// The screen's state: which screen is showing, the run, and the settings. Rules stay in the sim;
// this file only calls `step` and `view` and remembers what to show.
import { computed, signal } from "@preact/signals";
import {
  newRun, report as reportFor, step, toSave, view,
  type Action, type PublicState, type Report, type Run,
} from "../sim";
import { describeStep, reasonText, type StepDescription } from "./format";
import type { FormId } from "./forms";
import { loadFlights, loadNotes, recordFlight, type Flight, type Note } from "./notes";
import { clearRun, loadRun, saveRun } from "./persist";
import { renderShareCard } from "./shareCard";
import { sound } from "./sound";
import { browserBackend, createSafeStorage } from "./storage";

export type Screen =
  | { name: "board" }
  | { name: "setup" }
  | { name: "week" }
  | { name: "actions" }
  | { name: "form"; id: FormId }
  | { name: "result" }
  | { name: "report" }
  | { name: "notes"; from: Screen }
  | { name: "menu"; from: Screen };

export interface Settings {
  callouts: boolean;
  reduceMotion: boolean;
  sound: boolean;
}

const DEFAULT_SETTINGS: Settings = { callouts: true, reduceMotion: false, sound: true };

export const storage = createSafeStorage(browserBackend());

export const screen = signal<Screen>({ name: "board" });
export const run = signal<Run | null>(null);
export const savedRun = signal<Run | null>(null);
export const notice = signal<string | null>(null);
export const formError = signal<string | null>(null);
export const announcement = signal("");
export const selected = signal<number | null>(null);
export const last = signal<{ before: PublicState; after: PublicState; action: Action; step: StepDescription } | null>(null);
export const settings = signal<Settings>({ ...DEFAULT_SETTINGS });
export const shownCallouts = signal<readonly string[]>([]);
export const seenCauses = signal<readonly string[]>([]);
export const revealMode = signal<"full" | "compressed">("full");
export const revealDone = signal(false);
export const startPivots = signal(0);
export const baseSeed = signal(1);
export const chosenSeed = signal(1);
export const storageBlocked = signal(false);
export const challengeSeed = signal<number | null>(null);
export const currentSeed = signal(0);
export const shareNotice = signal<string | null>(null);
export const notes = signal<Note[]>([]);
export const flights = signal<Flight[]>([]);

export const state = computed<PublicState | null>(() => (run.value ? view(run.value) : null));
export const finalReport = computed<Report | null>(() => (run.value ? reportFor(run.value) : null));

const syncBlocked = () => {
  storageBlocked.value = storage.blocked();
};

function randomSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
  } catch {
    return 1;
  }
}

/** Three problem spaces, the three seeds that start at the base seed. */
export const setupSeeds = computed(() => [0, 1, 2].map((i) => (baseSeed.value + i) % 0x100000000));

export function init(search: string): void {
  const stored = storage.getJson("runway.settings");
  if (stored && typeof stored === "object") settings.value = { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
  sound.setEnabled(settings.value.sound);
  const shown = storage.getJson("runway.callouts");
  if (Array.isArray(shown)) shownCallouts.value = shown.filter((x): x is string => typeof x === "string");
  const seen = storage.getJson("runway.seen");
  if (Array.isArray(seen)) seenCauses.value = seen.filter((x): x is string => typeof x === "string");

  const param = new URLSearchParams(search).get("seed");
  const parsed = param === null ? NaN : Number.parseInt(param, 10);
  baseSeed.value = Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xfffffffd ? parsed : randomSeed() % 0xfffffffd;

  const play = new URLSearchParams(search).get("play");
  const playSeed = play === null ? NaN : Number.parseInt(play, 10);
  if (Number.isInteger(playSeed) && playSeed >= 0 && playSeed <= 0xffffffff) challengeSeed.value = playSeed;
  notes.value = loadNotes(storage);
  flights.value = loadFlights(storage);

  const loaded = loadRun(storage);
  if (loaded.kind === "restored") {
    savedRun.value = loaded.run;
    currentSeed.value = toSave(loaded.run).seed;
  }
  if (loaded.kind === "corrupt") notice.value = "We could not restore your last flight. Start a new run.";
  syncBlocked();
  if (storageBlocked.value && !notice.value) notice.value = "Progress will not be saved in this browser. You can keep playing.";
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
  sound.setEnabled(settings.value.sound);
  storage.setJson("runway.settings", settings.value);
  syncBlocked();
  announcement.value = "Setting changed.";
}

export function markCalloutShown(id: string): void {
  if (shownCallouts.value.includes(id)) return;
  shownCallouts.value = [...shownCallouts.value, id];
  storage.setJson("runway.callouts", shownCallouts.value);
}

export function resetProgress(): void {
  shownCallouts.value = [];
  seenCauses.value = [];
  notes.value = [];
  flights.value = [];
  storage.remove("runway.callouts");
  storage.remove("runway.seen");
  storage.remove("runway.notes");
  storage.remove("runway.flights");
  announcement.value = "Progress reset.";
}

export function go(next: Screen): void {
  formError.value = null;
  screen.value = next;
}

export function openSetup(): void {
  chosenSeed.value = setupSeeds.value[0] ?? 1;
  go({ name: "setup" });
}

export function flyAgain(): void {
  baseSeed.value = randomSeed() % 0xfffffffd;
  openSetup();
}

export function takeOff(seed: number): void {
  const next = newRun(seed);
  run.value = next;
  currentSeed.value = seed;
  shareNotice.value = null;
  savedRun.value = null;
  selected.value = null;
  last.value = null;
  startPivots.value = view(next).pivotsRemaining;
  saveRun(storage, next);
  syncBlocked();
  if (storageBlocked.value) notice.value = "Progress will not be saved in this browser. You can keep playing.";
  else notice.value = null;
  announcement.value = `Week 1. Cash and pivots ready.`;
  go({ name: "week" });
}

export function continueFlight(): void {
  const saved = savedRun.value;
  if (!saved) return;
  run.value = saved;
  savedRun.value = null;
  startPivots.value = view(newRun(0)).pivotsRemaining;
  notice.value = null;
  go({ name: "week" });
}

export function discardSaved(): void {
  savedRun.value = null;
  clearRun(storage);
}

function announce(s: PublicState): void {
  announcement.value = `Week ${s.week}. Pivots remaining ${s.pivotsRemaining}. Cash ${Math.floor(s.cashCents / 100)} dollars.`;
}

/** Send an action to the sim. Returns true when it was accepted. */
export function act(action: Action): boolean {
  const current = run.value;
  if (!current) return false;
  const result = step(current, action);
  if (!result.ok) {
    formError.value = reasonText(result.reason);
    sound.play("error");
    return false;
  }
  const before = view(current);
  const after = view(result.run);
  run.value = result.run;
  saveRun(storage, result.run);
  syncBlocked();
  const described = describeStep(before, after);
  last.value = { before, after, action, step: described };
  announce(after);
  formError.value = null;
  if (after.status !== "running") sound.play("report");
  else if (after.pivotsRemaining <= 1 && before.pivotsRemaining > 1) sound.play("warn");
  else if (described.weeksPassed > 0) sound.play("tick");
  if (after.status !== "running") {
    const rep = reportFor(result.run);
    const key = rep?.probableCause?.id ?? rep?.outcome ?? "none";
    revealMode.value = seenCauses.value.includes(key) ? "compressed" : "full";
    revealDone.value = false;
    if (!seenCauses.value.includes(key)) {
      seenCauses.value = [...seenCauses.value, key];
      storage.setJson("runway.seen", seenCauses.value);
    }
    if (rep) {
      recordFlight(storage, currentSeed.value, rep, after.week);
      notes.value = loadNotes(storage);
      flights.value = loadFlights(storage);
    }
    shareNotice.value = null;
    screen.value = { name: "report" };
  } else if (described.newLog.length > 0 || described.evidence.length > 0) {
    screen.value = { name: "result" };
  } else {
    screen.value = { name: "week" };
  }
  return true;
}

/** The system back gesture and the Escape key. Never leaves a run in progress. */
export function back(): void {
  const s = screen.value;
  switch (s.name) {
    case "form": go({ name: "actions" }); break;
    case "actions": go({ name: "week" }); break;
    case "setup": go({ name: "board" }); break;
    case "result": go({ name: "week" }); break;
    case "menu": go(s.from); break;
    case "notes": go(s.from); break;
    default: break;
  }
}

export function openMenu(): void {
  const s = screen.value;
  if (s.name === "menu") return;
  go({ name: "menu", from: s });
}

export function openNotes(): void {
  const s = screen.value;
  go({ name: "notes", from: s });
}

/** A link that starts anyone in the same world. */
export function challengeLink(seed: number): string {
  return `${location.origin}${location.pathname}?play=${seed}`;
}

export async function copyChallengeLink(): Promise<void> {
  const link = challengeLink(currentSeed.value);
  try {
    await navigator.clipboard.writeText(link);
    shareNotice.value = `Link copied: ${link}`;
  } catch {
    shareNotice.value = `Copy this link: ${link}`;
  }
  announcement.value = "Challenge link ready.";
}

export async function saveShareCard(): Promise<void> {
  const rep = finalReport.value;
  if (!rep) return;
  try {
    const blob = await renderShareCard(rep, currentSeed.value);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `runway-flight-${currentSeed.value}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    shareNotice.value = "Share card saved.";
  } catch {
    shareNotice.value = "We could not make the share card in this browser.";
  }
  announcement.value = shareNotice.value ?? "";
}

/** The window size, so the world map can draw itself to fit. */
export const viewport = signal({ w: typeof innerWidth === "number" ? innerWidth : 390, h: typeof innerHeight === "number" ? innerHeight : 844 });

export function trackViewport(): void {
  let frame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => (viewport.value = { w: innerWidth, h: innerHeight }));
  });
}

/** Phone only: whether the log and details sheet is open. From 600 px the panel is always shown. */
export const sheetOpen = signal(false);
