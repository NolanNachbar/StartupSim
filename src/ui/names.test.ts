import { describe, expect, it } from "vitest";
import { cleanName, MAX_NAME, suggestName } from "./names";

describe("company names", () => {
  it("suggests a name that is valid, and the same one for the same seed", () => {
    for (let seed = 0; seed < 50; seed++) {
      const n = suggestName(seed);
      expect(cleanName(n) ?? "").toBe(n);
      expect(suggestName(seed)).toBe(n);
    }
  });

  it("suggests plenty of different names", () => {
    const names = new Set(Array.from({ length: 60 }, (_, i) => suggestName(i)));
    expect(names.size).toBeGreaterThan(30);
  });

  it("tidies what the player types", () => {
    expect(cleanName("  Kiln   Labs  ")).toBe("Kiln Labs");
    expect(cleanName("Acme <b>Co</b>")).toBe("Acme bCob");
    expect(cleanName("Mo's Taxi & Co.")).toBe("Mo's Taxi & Co.");
    expect(cleanName("x".repeat(100))?.length).toBe(MAX_NAME);
  });

  it("refuses a name that is empty or has nothing in it", () => {
    expect(cleanName("")).toBeNull();
    expect(cleanName("   ")).toBeNull();
    expect(cleanName("<>")).toBeNull();
    expect(cleanName("a")).toBeNull();
  });
});
