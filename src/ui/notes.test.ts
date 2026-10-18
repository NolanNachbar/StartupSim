import { describe, expect, it } from "vitest";
import type { Report } from "../sim";
import { loadFlights, loadNotes, recordFlight } from "./notes";
import { createSafeStorage, type Backend } from "./storage";

const memory = (): Backend => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

const cause = (id: "V1" | "M2" | "M3") => ({ id, title: `Title ${id}`, evidence: ["e"], lesson: `Lesson ${id}` });
const crash = (probable: ReturnType<typeof cause> | null, contributing: ReturnType<typeof cause>[] = []): Report => ({
  outcome: "crashed", headline: "h", summary: "s", probableCause: probable, contributing, wouldHaveChanged: "x", noDominantCause: probable === null, numbers: [],
});
const landed: Report = { outcome: "landed", headline: "h", summary: "s", probableCause: null, contributing: [], wouldHaveChanged: null, noDominantCause: false, numbers: [] };

describe("field notes and flight history", () => {
  it("starts empty", () => {
    const s = createSafeStorage(memory());
    expect(loadNotes(s)).toEqual([]);
    expect(loadFlights(s)).toEqual([]);
  });

  it("records the probable and contributing causes, counting repeats", () => {
    const s = createSafeStorage(memory());
    recordFlight(s, 5, crash(cause("V1"), [cause("M3")]), 20);
    recordFlight(s, 6, crash(cause("V1")), 25);
    const notes = loadNotes(s);
    expect(notes.find((n) => n.id === "V1")).toMatchObject({ count: 2, lastSeed: 6, title: "Title V1", lesson: "Lesson V1" });
    expect(notes.find((n) => n.id === "M3")?.count).toBe(1);
  });

  it("keeps a flight list, newest first, capped at 30", () => {
    const s = createSafeStorage(memory());
    for (let i = 0; i < 35; i++) recordFlight(s, i, i % 2 ? landed : crash(cause("M2")), 10 + i);
    const flights = loadFlights(s);
    expect(flights.length).toBe(30);
    expect(flights[0]).toMatchObject({ seed: 34, week: 44, outcome: "crashed", cause: "M2" });
    expect(flights[1]).toMatchObject({ seed: 33, week: 43, outcome: "landed", cause: null });
  });

  it("names the cause of a crash in the flight list", () => {
    const s = createSafeStorage(memory());
    recordFlight(s, 1, crash(cause("M2")), 12);
    expect(loadFlights(s)[0]).toMatchObject({ outcome: "crashed", cause: "M2", week: 12 });
  });

  it("survives garbage in storage and blocked storage", () => {
    const s = createSafeStorage(memory());
    s.set("runway.notes", "[1,2,{");
    s.set("runway.flights", JSON.stringify([{ nope: true }, "x"]));
    expect(loadNotes(s)).toEqual([]);
    expect(loadFlights(s)).toEqual([]);
    const blocked = createSafeStorage(null);
    expect(() => recordFlight(blocked, 1, crash(cause("V1")), 3)).not.toThrow();
  });
});
