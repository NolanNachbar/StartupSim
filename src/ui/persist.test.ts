import { describe, expect, it } from "vitest";
import { newRun, step, toSave, view } from "../sim";
import { loadRun, saveRun } from "./persist";
import { createSafeStorage, type Backend } from "./storage";

const memory = (): Backend => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe("run persistence", () => {
  it("restores a saved run exactly", () => {
    const s = createSafeStorage(memory());
    let run = newRun(7);
    const r = step(run, { type: "wait" });
    if (!r.ok) throw new Error("wait failed");
    run = r.run;
    saveRun(s, run);
    const loaded = loadRun(s);
    expect(loaded.kind).toBe("restored");
    if (loaded.kind === "restored") expect(toSave(loaded.run)).toEqual(toSave(run));
  });

  it("reports none when nothing is saved", () => {
    expect(loadRun(createSafeStorage(memory())).kind).toBe("none");
  });

  it("reports corrupt for garbage, wrong version, or a bad action list, and clears it", () => {
    for (const raw of ["{nope", JSON.stringify({ simVersion: 0, seed: 1, actions: [] }), JSON.stringify({ simVersion: 4, seed: 1, actions: [{ type: "setPrice", priceCents: 1 }] })]) {
      const s = createSafeStorage(memory());
      s.set("runway.run", raw);
      expect(loadRun(s).kind).toBe("corrupt");
      expect(s.get("runway.run")).toBeNull();
    }
  });

  it("clears the save once the run is over so a finished run is not offered as Continue", () => {
    const s = createSafeStorage(memory());
    let run = newRun(3);
    for (let i = 0; i < 200 && view(run).status === "running"; i++) {
      const r = step(run, { type: "wait" });
      if (!r.ok) break;
      run = r.run;
    }
    expect(view(run).status).not.toBe("running");
    saveRun(s, run);
    expect(loadRun(s).kind).toBe("none");
  });
});
