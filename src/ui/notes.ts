// Field notes (patterns met) and the flight history, kept in browser storage through the safe wrapper.
import type { Report } from "../sim";
import type { SafeStorage } from "./storage";

const NOTES_KEY = "runway.notes";
const FLIGHTS_KEY = "runway.flights";
const MAX_FLIGHTS = 30;

export interface Note {
  readonly id: string;
  readonly title: string;
  readonly lesson: string;
  readonly count: number;
  readonly lastSeed: number;
}

export interface Flight {
  readonly seed: number;
  readonly outcome: Report["outcome"];
  readonly week: number;
  /** The probable cause id for a crash or stall, otherwise null. */
  readonly cause: string | null;
  readonly company?: string;
}

const isNote = (x: unknown): x is Note => {
  const n = x as Note;
  return typeof x === "object" && x !== null && typeof n.id === "string" && typeof n.title === "string" && typeof n.lesson === "string" && Number.isInteger(n.count) && Number.isInteger(n.lastSeed);
};

const isFlight = (x: unknown): x is Flight => {
  const f = x as Flight;
  return typeof x === "object" && x !== null && Number.isInteger(f.seed) && Number.isInteger(f.week) && typeof f.outcome === "string" && (f.cause === null || typeof f.cause === "string");
};

export function loadNotes(storage: SafeStorage): Note[] {
  const raw = storage.getJson(NOTES_KEY);
  return Array.isArray(raw) ? raw.filter(isNote) : [];
}

export function loadFlights(storage: SafeStorage): Flight[] {
  const raw = storage.getJson(FLIGHTS_KEY);
  return Array.isArray(raw) ? raw.filter(isFlight) : [];
}

/** Add a finished run: one flight entry, and a note count for every cause the report named. */
export function recordFlight(storage: SafeStorage, seed: number, report: Report, week: number, company?: string): void {
  const notes = loadNotes(storage);
  for (const c of [report.probableCause, ...report.contributing]) {
    if (!c) continue;
    const at = notes.findIndex((n) => n.id === c.id);
    const prev = at >= 0 ? notes[at] : undefined;
    const next: Note = { id: c.id, title: c.title, lesson: c.lesson, count: (prev?.count ?? 0) + 1, lastSeed: seed };
    if (at >= 0) notes[at] = next;
    else notes.push(next);
  }
  storage.setJson(NOTES_KEY, notes);
  const entry: Flight = { seed, outcome: report.outcome, week, cause: report.outcome === "landed" ? null : (report.probableCause?.id ?? null), ...(company ? { company } : {}) };
  const flights = [entry, ...loadFlights(storage)].slice(0, MAX_FLIGHTS);
  storage.setJson(FLIGHTS_KEY, flights);
}
