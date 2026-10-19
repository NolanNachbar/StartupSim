import { describe, expect, it } from "vitest";
import { COMBOS, MAX_IDEA, MODELS, businessFor, cleanIdea } from "./business";
import { INDUSTRY_LIST, fromSave, newRun, step, toSave, view } from "./index";
import { INDUSTRIES } from "./world";

const gym = { model: 2, idea: "a small strength-training gym" };

describe("business models and combos", () => {
  it("has four models, and every industry has content for every model", () => {
    expect(MODELS.map((m) => m.id)).toEqual(["software", "service", "location", "product"]);
    expect(COMBOS.length).toBe(INDUSTRIES.length);
    for (const list of COMBOS) {
      expect(list.length).toBe(MODELS.length);
      for (const c of list) {
        expect(c.segmentNames.length).toBe(5);
        expect(new Set(c.segmentNames).size).toBe(5);
        expect(c.examples.length).toBeGreaterThanOrEqual(3);
        for (const field of [c.situation, c.cost, c.workaround, c.place, c.hire]) expect(field.length).toBeGreaterThan(4);
        for (const e of c.examples) expect(cleanIdea(e)).not.toBeNull();
      }
    }
  });

  it("gives every industry its own customers, not a copy of another", () => {
    const all = COMBOS.flat().map((c) => c.segmentNames.join("|"));
    expect(new Set(all).size).toBeGreaterThan(all.length * 0.8);
  });

  it("tidies the player's idea and rejects ones that are too short", () => {
    expect(cleanIdea("  a   small <b>gym</b>!  ")).toBe("a small b gym /b");
    expect(cleanIdea("ab")).toBeNull();
    expect(cleanIdea("x".repeat(200))?.length).toBeLessThanOrEqual(MAX_IDEA);
    expect(businessFor(2, { model: 9, idea: "a gym" })).toBeNull();
    expect(businessFor(null, gym)).toBeNull();
  });
});

describe("a run with a chosen business", () => {
  it("names the problem after the idea and the customer groups after the industry and model", () => {
    const h = INDUSTRY_LIST.findIndex((i) => i.name === "Health and wellness");
    const s = view(newRun(7, h, gym));
    expect(s.problemName).toBe("a small strength-training gym");
    expect(s.segmentNames).toEqual(COMBOS[h]![2]!.segmentNames.slice(0, s.segmentNames.length));
  });

  it("keeps the numbers of the industry: only the words change", () => {
    const h = INDUSTRY_LIST.findIndex((i) => i.name === "Health and wellness");
    const a = view(newRun(11, h, { model: 0, idea: "a reminder app" }));
    const b = view(newRun(11, h, gym));
    expect(a.segmentNames.length).toBe(b.segmentNames.length);
    expect(a.cashCents).toBe(b.cashCents);
    expect(a.focusSegment).toBe(b.focusSegment);
  });

  it("has customers answer in their own words and the idea's, deterministically", () => {
    const h = INDUSTRY_LIST.findIndex((i) => i.name === "Health and wellness");
    const combo = COMBOS[h]![2]!;
    const act = { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"] } as const;
    const ask = (seed: number) => {
      const r = step(newRun(seed, h, gym), act);
      return r.ok ? view(r.run).evidence.flatMap((e) => (e.kind === "interview" ? [e.quote] : [])) : [];
    };
    expect(ask(5).length).toBe(3);
    expect(ask(5)).toEqual(ask(5));
    let own = 0;
    for (let seed = 0; seed < 20; seed++) for (const q of ask(seed)) if (q.includes(combo.workaround) || q.includes(combo.situation) || q.toLowerCase().includes(combo.cost.toLowerCase())) own += 1;
    expect(own).toBeGreaterThan(5);
  });

  it("saves and loads with the model and idea, and refuses nonsense", () => {
    const run = newRun(9, 2, gym);
    const save = toSave(run);
    expect(save.model).toBe(2);
    expect(save.idea).toBe("a small strength-training gym");
    const loaded = fromSave(JSON.parse(JSON.stringify(save)));
    expect(loaded.ok && view(loaded.run).problemName).toBe("a small strength-training gym");
    expect(fromSave({ ...save, model: 9 }).ok).toBe(false);
    expect(fromSave({ ...save, model: -1 }).ok).toBe(false);
    expect(fromSave({ ...save, idea: "x" }).ok).toBe(false);
    expect(fromSave({ ...save, idea: "y".repeat(500) }).ok).toBe(false);
    expect(fromSave({ ...save, idea: 42 }).ok).toBe(false);
    expect(fromSave({ simVersion: save.simVersion, seed: 1, actions: [], model: 0, idea: "an app" }).ok).toBe(false); // needs an industry
    expect(() => newRun(1, 2, { model: 7, idea: "a gym" })).toThrow(RangeError);
    expect(() => newRun(1, undefined, gym)).toThrow(RangeError);
  });

  it("leaves the original generic worlds exactly as they were", () => {
    expect(view(newRun(3, 1)).segmentNames).toEqual(INDUSTRIES[1]!.segmentNames.slice(0, view(newRun(3, 1)).segmentNames.length));
  });
});
