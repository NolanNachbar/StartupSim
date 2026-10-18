import { describe, expect, it } from "vitest";
import { createSafeStorage, type Backend } from "./storage";

const memory = (): Backend => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

const throwing: Backend = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
  removeItem: () => { throw new Error("blocked"); },
};

describe("safe storage", () => {
  it("reads back what it wrote", () => {
    const s = createSafeStorage(memory());
    expect(s.set("a", "1")).toBe(true);
    expect(s.get("a")).toBe("1");
    s.remove("a");
    expect(s.get("a")).toBeNull();
    expect(s.blocked()).toBe(false);
  });

  it("never throws when the browser blocks storage, and says so", () => {
    const s = createSafeStorage(throwing);
    expect(s.get("a")).toBeNull();
    expect(s.set("a", "1")).toBe(false);
    expect(() => s.remove("a")).not.toThrow();
    expect(s.blocked()).toBe(true);
  });

  it("works with no backend at all", () => {
    const s = createSafeStorage(null);
    expect(s.set("a", "1")).toBe(false);
    expect(s.get("a")).toBeNull();
    expect(s.blocked()).toBe(true);
  });

  it("reads and writes JSON safely", () => {
    const s = createSafeStorage(memory());
    s.setJson("k", { x: 1 });
    expect(s.getJson("k")).toEqual({ x: 1 });
    s.set("bad", "{not json");
    expect(s.getJson("bad")).toBeNull();
  });
});
