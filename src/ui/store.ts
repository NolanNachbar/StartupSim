// The screen's state: which screen is showing, the run, and the settings. Rules stay in the sim;
// this file only calls `step` and `view` and remembers what to show.
import { computed, signal } from "@preact/signals";
import {
  BUSINESS_LIST, INDUSTRY_LIST, cleanCustom, cleanDifficulty, cleanIdea, cleanStartCash, newRun, type Custom, report as reportFor, step, toSave, view,
  type Action, type PublicState, type Report, type Run,
} from "../sim";
import { describeStep, reasonText, type StepDescription } from "./format";
import type { FormId } from "./forms";
import { cleanName, suggestName } from "./names";
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
  | { name: "books"; from: Screen }
  | { name: "notebook"; from: Screen }
  | { name: "help"; from: Screen }
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
export const challengeIndustry = signal<number | null>(null);
/** A shared link can name the business model and idea too. */
/** How hard the market is and how much money you start with, when the player (or a shared link) set them. */
export interface PlayOptions {
  difficulty?: number;
  startCashCents?: number;
}
export const challengeBusiness = signal<{ model: number; idea: string; custom?: Custom; play?: PlayOptions } | null>(null);
/** The company being run: its name and market. */
export const company = signal<{ name: string; industry: number; model: number; idea: string; custom?: Custom; play?: PlayOptions }>({ name: "", industry: 0, model: 0, idea: "" });
/** The setup form. */
/** The setup form. `custom` holds the player's own wording once they change anything under "Make it yours". */
export const draft = signal<{ name: string; industry: number; model: number; idea: string; custom?: { groups: string; situation: string; workaround: string }; play?: PlayOptions }>({ name: "", industry: 0, model: 0, idea: "" });
/** Which of the four setup pages is showing: 1 industry, 2 business model, 3 idea, 4 name. */
export const setupStep = signal<1 | 2 | 3 | 4>(1);
/** The wording of the questions asked in the interview round just held, in order (shown on the result). */
export const askedWording = signal<readonly string[]>([]);
/** The customer group a form opens on (picked on the map), or null for the one the company is focused on. */
export const formSegment = signal<number | null>(null);
/** Open an action's form, optionally already pointed at one customer group. */
export function openForm(id: FormId, segment: number | null = null): void {
  formSegment.value = segment;
  go({ name: "form", id });
}
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
  const ind = new URLSearchParams(search).get("industry");
  const indNum = ind === null ? NaN : Number.parseInt(ind, 10);
  if (Number.isInteger(indNum) && indNum >= 0 && indNum < INDUSTRY_LIST.length) {
    challengeIndustry.value = indNum;
    const params = new URLSearchParams(search);
    const modelNum = Number.parseInt(params.get("model") ?? "", 10);
    const idea = cleanIdea(params.get("idea") ?? "");
    if (Number.isInteger(modelNum) && modelNum >= 0 && modelNum < (BUSINESS_LIST[indNum]?.length ?? 0) && idea) {
      // the sharer's own customer groups and wording ride along in the link
      let custom: Custom | undefined;
      try {
        custom = cleanCustom(JSON.parse(params.get("custom") ?? "null") as Custom);
      } catch {
        custom = undefined;
      }
      const level = cleanDifficulty(Number.parseInt(params.get("difficulty") ?? "", 10));
      const cash = cleanStartCash(Number.parseInt(params.get("cash") ?? "", 10) * 100);
      const play: PlayOptions = { ...(params.get("difficulty") !== null ? { difficulty: level } : {}), ...(cash !== undefined ? { startCashCents: cash } : {}) };
      challengeBusiness.value = { model: modelNum, idea, ...(custom ? { custom } : {}), ...(Object.keys(play).length > 0 ? { play } : {}) };
    }
  }
  notes.value = loadNotes(storage);
  flights.value = loadFlights(storage);

  const loaded = loadRun(storage);
  if (loaded.kind === "restored") {
    savedRun.value = loaded.run;
    const meta = storage.getJson("runway.company");
    const saveIndustry = toSave(loaded.run).industry ?? 0;
    const savedName = meta && typeof meta === "object" && typeof (meta as { name?: unknown }).name === "string" ? cleanName((meta as { name: string }).name) : null;
    company.value = { name: savedName ?? suggestName(toSave(loaded.run).seed), industry: saveIndustry, model: toSave(loaded.run).model ?? 0, idea: toSave(loaded.run).idea ?? "", ...(toSave(loaded.run).custom ? { custom: toSave(loaded.run).custom as Custom } : {}), ...(toSave(loaded.run).difficulty !== undefined || toSave(loaded.run).startCash !== undefined ? { play: { ...(toSave(loaded.run).difficulty !== undefined ? { difficulty: toSave(loaded.run).difficulty as number } : {}), ...(toSave(loaded.run).startCash !== undefined ? { startCashCents: toSave(loaded.run).startCash as number } : {}) } } : {}) };
    currentSeed.value = toSave(loaded.run).seed;
  }
  if (loaded.kind === "corrupt") {
    storage.remove("runway.company");
    notice.value = "We could not restore your last run. Start a new run.";
  }
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

/** A shared-run link (?play=...) would bring the old challenge back on reload, so Start over drops the query string. */
function forgetLinkInAddressBar(): void {
  try {
    history.replaceState(history.state, "", location.pathname);
  } catch {
    // not allowed in this context: the in-memory reset still holds
  }
}

/** True while the menu is asking "are you sure?" before it wipes everything. */
export const confirmingStartOver = signal(false);

/**
 * Start over completely: the run in progress, the company, field notes, history, seen causes and callouts all go.
 * Settings (sound, motion, callouts on or off) are kept. The next run begins at the front door with a fresh world.
 */
export function startOver(): void {
  for (const key of ["runway.run", "runway.company", "runway.callouts", "runway.seen", "runway.notes", "runway.flights"]) storage.remove(key);
  run.value = null;
  savedRun.value = null;
  last.value = null;
  selected.value = null;
  shareNotice.value = null;
  notice.value = null;
  formError.value = null;
  shownCallouts.value = [];
  seenCauses.value = [];
  notes.value = [];
  flights.value = [];
  challengeSeed.value = null;
  challengeIndustry.value = null;
  challengeBusiness.value = null;
  company.value = { name: "", industry: 0, model: 0, idea: "" };
  draft.value = { name: "", industry: 0, model: 0, idea: "" };
  currentSeed.value = 0;
  baseSeed.value = randomSeed() % 0xfffffffd;
  confirmingStartOver.value = false;
  sheetOpen.value = false;
  revealDone.value = false;
  revealMode.value = "full";
  startPivots.value = 0;
  forgetLinkInAddressBar();
  announcement.value = "Everything is cleared. Start a new company whenever you like.";
  syncBlocked();
  go({ name: "board" });
}

export function go(next: Screen): void {
  formError.value = null;
  confirmingStartOver.value = false;
  screen.value = next;
}

export function openSetup(): void {
  const seed = challengeSeed.value ?? baseSeed.value;
  const industry = challengeIndustry.value ?? draft.value.industry;
  const chosen = challengeBusiness.value;
  const model = chosen?.model ?? draft.value.model;
  const pack = BUSINESS_LIST[industry]?.[model];
  const shared = chosen?.custom;
  draft.value = {
    name: suggestName(seed),
    industry,
    model,
    idea: chosen?.idea ?? exampleIdea(industry, draft.value.model),
    ...(chosen?.play ? { play: chosen.play } : {}),
    ...(shared && pack ? { custom: { groups: (shared.segmentNames ?? pack.segmentNames).join("\n"), situation: shared.situation ?? pack.situation, workaround: shared.workaround ?? pack.workaround } } : {}),
  };
  // a shared link that names the industry (and the business) skips the pages it already answers
  setupStep.value = challengeIndustry.value === null ? 1 : chosen === null ? 2 : 4;
  go({ name: "setup" });
}

export function flyAgain(): void {
  baseSeed.value = randomSeed() % 0xfffffffd;
  challengeSeed.value = null;
  challengeIndustry.value = null;
  openSetup();
}

import { businessOf } from "./business";
/** The business the company now running is, as the words use it. */
export const currentBusiness = () => businessOf(company.value.industry, company.value.idea ? { model: company.value.model, idea: company.value.idea, ...(company.value.custom ? { custom: company.value.custom } : {}) } : null);

/** The first example idea for an industry and model: the starting text of the idea page. */
export const exampleIdea = (industry: number, model: number): string => BUSINESS_LIST[industry]?.[model]?.examples[0] ?? "my business";

export function suggestAnotherName(): void {
  draft.value = { ...draft.value, name: suggestName(randomSeed()) };
}

/** Found the company from the setup form. */
export function startCompany(): void {
  const seed = challengeSeed.value ?? baseSeed.value;
  const name = cleanName(draft.value.name) ?? suggestName(seed);
  const idea = cleanIdea(draft.value.idea) ?? exampleIdea(draft.value.industry, draft.value.model);
  const typed = draft.value.custom;
  const pack = BUSINESS_LIST[draft.value.industry]?.[draft.value.model];
  const groups = typed ? typed.groups.split("\n").map((g) => g.trim()).filter(Boolean) : [];
  const custom: Custom | undefined =
    typed && pack
      ? {
          ...(groups.length >= 3 && groups.join("|") !== pack.segmentNames.join("|") ? { segmentNames: groups } : {}),
          ...(typed.situation.trim() && typed.situation.trim() !== pack.situation ? { situation: typed.situation.trim() } : {}),
          ...(typed.workaround.trim() && typed.workaround.trim() !== pack.workaround ? { workaround: typed.workaround.trim() } : {}),
        }
      : undefined;
  takeOff(seed, draft.value.industry, draft.value.model, idea, name, custom && Object.keys(custom).length > 0 ? custom : undefined, draft.value.play);
}

export function takeOff(seed: number, industry: number, model: number, idea: string, name: string, custom?: Custom, play?: PlayOptions): void {
  const next = newRun(seed, industry, { model, idea, ...(custom ? { custom } : {}), ...(play?.difficulty !== undefined ? { difficulty: play.difficulty } : {}), ...(play?.startCashCents !== undefined ? { startCashCents: play.startCashCents } : {}) });
  run.value = next;
  currentSeed.value = seed;
  company.value = { name, industry, model, idea, ...(custom ? { custom } : {}), ...(play && Object.keys(play).length > 0 ? { play } : {}) };
  storage.setJson("runway.company", { name });
  shareNotice.value = null;
  savedRun.value = null;
  selected.value = null;
  last.value = null;
  startPivots.value = view(next).pivotsRemaining;
  saveRun(storage, next);
  syncBlocked();
  if (storageBlocked.value) notice.value = "Progress will not be saved in this browser. You can keep playing.";
  else notice.value = null;
  announcement.value = `${name} is founded. Week 1.`;
  go({ name: "week" });
}

export function continueFlight(): void {
  const saved = savedRun.value;
  if (!saved) return;
  run.value = saved;
  savedRun.value = null;
  const origin = toSave(saved);
  startPivots.value = view(newRun(origin.seed, origin.industry, origin.model !== undefined && origin.idea ? { model: origin.model, idea: origin.idea } : undefined)).pivotsRemaining;
  notice.value = null;
  go({ name: "week" });
}

export function discardSaved(): void {
  savedRun.value = null;
  clearRun(storage);
  storage.remove("runway.company");
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
      recordFlight(storage, currentSeed.value, rep, after.week, company.value.name);
      notes.value = loadNotes(storage);
      flights.value = loadFlights(storage);
    }
    shareNotice.value = null;
    screen.value = { name: "report" };
  } else if (described.weeksPassed > 0 || described.newLog.length > 0 || described.evidence.length > 0) {
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
    case "setup":
      if (setupStep.value === 4 && challengeBusiness.value === null) setupStep.value = 3;
      else if (setupStep.value === 3) setupStep.value = 2;
      else if (setupStep.value === 2 && challengeIndustry.value === null) setupStep.value = 1;
      else go({ name: "board" });
      break;
    case "result": go({ name: "week" }); break;
    case "menu": go(s.from); break;
    case "notes": go(s.from); break;
    case "books": go(s.from); break;
    case "notebook": go(s.from); break;
    case "help": go(s.from); break;
    default: break;
  }
}

/**
 * The browser's own Back (a phone's edge swipe, the Back button). One history entry is kept in reserve while a
 * screen other than the front door is showing, so Back steps back through the game and never drops a player out of
 * a run. On the front door it is left alone, so Back can leave the page as usual.
 */
export function watchSystemBack(): void {
  try {
    history.pushState({ runway: true }, "");
    window.addEventListener("popstate", () => {
      if (screen.value.name === "board") {
        history.back(); // the front door: Back leaves the page, as people expect
        return;
      }
      history.pushState({ runway: true }, "");
      systemBack();
    });
  } catch {
    // history is unavailable (a sandboxed frame): the on-screen Back buttons still work
  }
}

/**
 * Back from the browser. It steps back through the screens like the on-screen Back, and from the route screen it
 * returns to the front door, where the run is waiting under Continue run (a run is saved after every action).
 */
export function systemBack(): void {
  const s = screen.value;
  if (s.name === "week" && run.value && state.value?.status === "running") {
    savedRun.value = run.value;
    go({ name: "board" });
    return;
  }
  if (s.name === "report" || s.name === "week") {
    go({ name: "board" });
    return;
  }
  back();
}

export function openMenu(): void {
  const s = screen.value;
  if (s.name === "menu") return;
  go({ name: "menu", from: s });
}

/** The group the notebook is filtered to (null: all groups). */
export const notebookGroup = signal<number | null>(null);

export function openNotebook(segment: number | null = null): void {
  const s = screen.value;
  if (s.name === "notebook") return;
  notebookGroup.value = segment;
  go({ name: "notebook", from: s });
}

export function openBooks(): void {
  const s = screen.value;
  if (s.name === "books") return;
  go({ name: "books", from: s });
}

export function openNotes(): void {
  const s = screen.value;
  go({ name: "notes", from: s });
}

/** A link that starts anyone in the same world. */
export function challengeLink(seed: number, industry: number, model: number, idea: string, custom?: Custom, play?: PlayOptions): string {
  const extra = `${custom ? `&custom=${encodeURIComponent(JSON.stringify(custom))}` : ""}${play?.difficulty !== undefined ? `&difficulty=${play.difficulty}` : ""}${play?.startCashCents !== undefined ? `&cash=${play.startCashCents / 100}` : ""}`;
  return `${location.origin}${location.pathname}?play=${seed}&industry=${industry}&model=${model}&idea=${encodeURIComponent(idea)}${extra}`;
}

export async function copyChallengeLink(): Promise<void> {
  const link = challengeLink(currentSeed.value, company.value.industry, company.value.model, company.value.idea, company.value.custom, company.value.play);
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
    const blob = await renderShareCard(rep, currentSeed.value, company.value.name);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `runway-run-${currentSeed.value}.png`;
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

export function openHelp(): void {
  const s = screen.value;
  if (s.name === "help") return;
  go({ name: "help", from: s });
}
