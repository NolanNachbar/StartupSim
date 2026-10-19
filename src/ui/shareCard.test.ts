import { describe, expect, it } from "vitest";
import type { Report } from "../sim";
import { cardText, wrapLines } from "./shareCard";

describe("wrapLines", () => {
  it("wraps on word boundaries without exceeding the width", () => {
    const lines = wrapLines("Cash lasted 20 weeks. The first payment never came.", 24);
    expect(lines.every((l) => l.length <= 24)).toBe(true);
    expect(lines.join(" ")).toBe("Cash lasted 20 weeks. The first payment never came.");
  });
  it("keeps a word longer than the width on its own line", () => {
    expect(wrapLines("a supercalifragilistic b", 8)).toEqual(["a", "supercalifragilistic", "b"]);
  });
  it("returns nothing for empty text", () => {
    expect(wrapLines("", 10)).toEqual([]);
  });
});

describe("cardText", () => {
  const base: Report = { outcome: "crashed", headline: "Cash lasted 20 weeks.", summary: "s", probableCause: { id: "M2", title: "Money ran out before proof", evidence: [], lesson: "l" }, contributing: [], wouldHaveChanged: "x", noDominantCause: false, numbers: [] };
  it("puts the headline, the cause and the seed on the card", () => {
    const t = cardText(base, 77);
    expect(t.headline).toBe("Cash lasted 20 weeks.");
    expect(t.cause).toBe("Probable cause: Money ran out before proof");
    expect(t.footer).toContain("Runway");
    expect(t.footer).toContain("77");
  });
  it("says default alive for a landing and handles no dominant cause", () => {
    expect(cardText({ ...base, outcome: "landed", probableCause: null }, 1).cause).toBe("Default alive");
    expect(cardText({ ...base, probableCause: null, noDominantCause: true }, 1).cause).toBe("No single dominant cause");
  });
});
