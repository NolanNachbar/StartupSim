import { describe, expect, it } from "vitest";
import { COMBOS, MAX_IDEA, MODELS, businessFor, cleanCustom, cleanIdea, describeModel, matchPack } from "./business";
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
        expect(c.kinds.length).toBe(3);
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

describe("business model descriptions", () => {
  it("use examples from the chosen industry, not the same ones everywhere", () => {
    const health = INDUSTRY_LIST.findIndex((i) => i.name === "Health and wellness");
    const food = INDUSTRY_LIST.findIndex((i) => i.name === "Food and drink");
    expect(describeModel(health, 2)).toContain("a gym, a yoga studio or a physiotherapy clinic");
    expect(describeModel(food, 2)).toContain("a restaurant, a coffee shop or a bakery");
    for (let i = 0; i < INDUSTRY_LIST.length; i++) for (let m = 0; m < MODELS.length; m++) expect(describeModel(i, m)).not.toContain("{kinds}");
    const descriptions = INDUSTRY_LIST.flatMap((_, i) => MODELS.map((_m, m) => describeModel(i, m)));
    expect(new Set(descriptions).size).toBe(descriptions.length);
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
    expect(b.cashCents).toBeGreaterThan(a.cashCents); // a place needs far more money than an app
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
    for (let seed = 0; seed < 80; seed++) for (const q of ask(seed)) if (q.includes(combo.workaround) || q.includes(combo.situation) || q.toLowerCase().includes(combo.cost.toLowerCase())) own += 1;
    expect(own).toBeGreaterThan(15); // in their own words often, not always: some answers are polite filler
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

describe("the player's own customers and words", () => {
  const health = 3;
  it("replaces the pack's customers and wording, leaves the rest, and tidies it", () => {
    const b = businessFor(health, { model: 2, idea: "a boxing gym", custom: { segmentNames: ["Amateur boxers", "Office workers <b>", "Teenagers"], situation: "your gloves stank and the gym was full" } })!;
    expect(b.segmentNames).toEqual(["Amateur boxers", "Office workers b", "Teenagers"]);
    expect(b.situation).toBe("your gloves stank and the gym was full");
    expect(b.workaround).toBe(COMBOS[health]![2]!.workaround);
    expect(cleanCustom({ segmentNames: ["only", "two"] })).toBeUndefined();
    expect(cleanCustom({ situation: "x" })).toBeUndefined();
  });

  it("flows into the run: the groups, the interviews, and the save", () => {
    const choice = { model: 2, idea: "a boxing gym", custom: { segmentNames: ["Amateur boxers", "Office workers", "Teenagers", "Retirees"], workaround: "a damp garage and a heavy bag" } };
    const run = newRun(5, health, choice);
    expect(view(run).segmentNames).toEqual(["Amateur boxers", "Office workers", "Teenagers", "Retirees"].slice(0, view(run).segmentNames.length));
    const save = toSave(run);
    expect(save.custom?.workaround).toBe("a damp garage and a heavy bag");
    const loaded = fromSave(JSON.parse(JSON.stringify(save)));
    expect(loaded.ok && view(loaded.run).segmentNames).toEqual(view(run).segmentNames);
    expect(fromSave({ ...save, custom: "oops" }).ok).toBe(false);
    expect(fromSave({ ...save, custom: { segmentNames: [1, 2, 3] } }).ok).toBe(true); // junk entries are dropped, not fatal
  });
});

describe("matching an idea to a closer pack", () => {
  const health = 3;
  it("suggests the pack an idea sounds like, and keeps quiet when the current one fits", () => {
    expect(matchPack("a boxing gym", 1, 0)).toEqual({ industry: health, model: 2 });
    expect(matchPack("a family pizza restaurant", 3, 0)?.industry).toBe(6); // food and drink
    expect(matchPack("a small strength-training gym", health, 2)).toBeNull();
    expect(matchPack("zzz qqq", 1, 0)).toBeNull();
    expect(matchPack("", 1, 0)).toBeNull();
  });
});

describe("matching an idea keeps the kind of business the player chose", () => {
  it("does not turn a restaurant into an app", () => {
    const m = matchPack("a family pizza restaurant", 6, 2);
    expect(m === null || m.model === 2).toBe(true);
  });
});

describe("rules to know", () => {
  it("every industry says what a real founder must get right before opening", async () => {
    const { INDUSTRY_LIST, MODEL_RULES } = await import("./index");
    for (const i of INDUSTRY_LIST) expect(i.rules.length, i.name).toBeGreaterThan(40);
    for (const m of ["software", "service", "location", "product"] as const) expect(MODEL_RULES[m].length).toBeGreaterThan(40);
    expect(INDUSTRY_LIST[4]?.rules).toMatch(/licen/i); // fintech
    expect(INDUSTRY_LIST[6]?.rules).toMatch(/permit/i); // food
  });
});

describe("what customers say", () => {
  it("varies far more than before: hundreds of distinct lines across rounds, and some people say they have no problem", () => {
    const lines = new Set<string>();
    let noProblem = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const r = step(newRun(seed, 3, gym), { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"], topics: ["last-time", "cost", "tried"] });
      if (!r.ok) continue;
      for (const e of view(r.run).evidence) {
        if (e.kind !== "interview") continue;
        lines.add(e.quote);
        if (/don't really have this problem|never bothered me|has not really been an issue|works fine for me/.test(e.quote)) noProblem += 1;
      }
    }
    expect(lines.size).toBeGreaterThan(150);
    expect(noProblem).toBeGreaterThan(0);
  });
});
