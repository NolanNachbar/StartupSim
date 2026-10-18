import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { playFuzz } from "../../tests/unit/helpers/fuzz";
import { rand } from "./rng";
import { step } from "./reducer";
import { SIM_VERSION, fromSave, toSave } from "./save";
import { initialRun } from "./state";
import { view } from "./view";

const VALID = { simVersion: SIM_VERSION, seed: 7, actions: [{ type: "wait" }] };

describe("save round trip", () => {
  it("replays 200 random legal runs to the same public state", () => {
    // protects: a saved run reproduces exactly; fails_when: toSave drops an action or fromSave replays differently.
    for (let seed = 0; seed < 200; seed++) {
      const length = 1 + Math.floor(rand(seed, "len") * 60);
      const { run } = playFuzz(seed, length);
      const loaded = fromSave(toSave(run));
      expect(loaded.ok, `seed ${seed}`).toBe(true);
      if (!loaded.ok) return;
      expect(view(loaded.run)).toEqual(view(run));
    }
  });

  it("round trips runs that contain interviews", () => {
    const actions = [
      { type: "interview", segment: 0, questions: ["past-behavior", "commitment", "pitch"] },
      { type: "wait" },
      { type: "interview", segment: 1, questions: ["hypothetical", "hypothetical", "past-behavior"] },
    ];
    const loaded = fromSave({ simVersion: SIM_VERSION, seed: 21, actions });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(view(loaded.run).evidence).toHaveLength(6);
    expect(toSave(loaded.run).actions).toEqual(actions);
  });

  it("round trips runs that build, test channels and charge", () => {
    const actions = [
      { type: "buildTest", kind: "landing-page" },
      { type: "pickChannel", segment: 0, channel: 1 },
      { type: "chargeTest", segment: 0, channel: 1 },
      { type: "buildTest", kind: "prototype" },
    ];
    const loaded = fromSave({ simVersion: SIM_VERSION, seed: 21, actions });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(view(loaded.run).evidence).toHaveLength(2);
    expect(toSave(loaded.run).actions).toEqual(actions);
  });

  it("survives a JSON round trip", () => {
    const { run } = playFuzz(11, 25);
    const loaded = fromSave(JSON.parse(JSON.stringify(toSave(run))));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(view(loaded.run)).toEqual(view(run));
  });

  it("stores the seed, the accepted actions and the sim version", () => {
    const { run } = playFuzz(3, 10);
    const save = toSave(run);
    expect(save.simVersion).toBe(SIM_VERSION);
    expect(save.seed).toBe(3);
    expect(save.actions).toEqual(run.actions);
    expect(toSave(initialRun(5)).actions).toEqual([]);
  });
});

describe("run history is isolated from callers", () => {
  it("does not change the run when the caller mutates an action object after stepping", () => {
    // protects: replay history; fails_when: the reducer stores the caller's object by reference.
    const action = { type: "setPrice", priceCents: 9900 } as { type: "setPrice"; priceCents: number };
    const r = step(initialRun(1), action);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    action.priceCents = 49_900;
    expect(toSave(r.run).actions).toEqual([{ type: "setPrice", priceCents: 9900 }]);
  });

  it("drops unknown extra fields from stored actions", () => {
    const r = step(initialRun(1), { type: "wait", sneaky: "x" } as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(toSave(r.run).actions).toEqual([{ type: "wait" }]);
  });

  it("returns a save whose actions are copies", () => {
    const r = step(initialRun(1), { type: "setPrice", priceCents: 9900 });
    if (!r.ok) throw new Error(r.reason);
    const save = toSave(r.run);
    (save.actions[0] as { priceCents: number }).priceCents = 1;
    expect(toSave(r.run).actions).toEqual([{ type: "setPrice", priceCents: 9900 }]);
  });
});

describe("fromSave limits", () => {
  it("rejects a save with more than 5,000 actions as invalid without replaying it", () => {
    // protects: loading cannot be made to loop for a very long time; fails_when: the cap is removed.
    const actions = Array.from({ length: 5001 }, (_, i) => ({ type: "setPrice", priceCents: i % 2 ? 9900 : 4900 }));
    expect(fromSave({ simVersion: SIM_VERSION, seed: 1, actions })).toEqual({ ok: false, reason: "invalid" });
    const ok = Array.from({ length: 5000 }, () => ({ type: "wait" }));
    expect(fromSave({ simVersion: SIM_VERSION, seed: 1, actions: ok }).ok).toBe(false); // replay-failed: run finishes first
  });
});

describe("fromSave errors", () => {
  it("returns invalid for 10 malformed inputs", () => {
    const bad: unknown[] = [
      null,
      42,
      {},
      { simVersion: SIM_VERSION },
      { ...VALID, seed: -1 },
      { ...VALID, seed: 1.5 },
      { ...VALID, seed: 0x100000000 },
      { ...VALID, actions: "wait" },
      { ...VALID, actions: [{ type: "nope" }] },
      { ...VALID, actions: [{ type: "setPrice", priceCents: 49.5 }] },
      { ...VALID, actions: [{ type: "setPrice", priceCents: Number.NaN }] },
      { ...VALID, actions: [{ type: "pivot", toSegment: "1" }] },
      { ...VALID, actions: [null] },
      { ...VALID, actions: [{ type: "buildTest", kind: "castle" }] },
      { ...VALID, actions: [{ type: "buildTest" }] },
      { ...VALID, actions: [{ type: "pickChannel", segment: 0 }] },
      { ...VALID, actions: [{ type: "chargeTest", segment: 0, channel: 1.5 }] },
      { ...VALID, actions: [{ type: "interview", segment: 0, questions: ["pitch", "pitch"] }] },
      { ...VALID, actions: [{ type: "interview", segment: 0, questions: ["pitch", "pitch", "nope"] }] },
      { ...VALID, actions: [{ type: "interview", segment: 0.5, questions: ["pitch", "pitch", "pitch"] }] },
    ];
    for (const input of bad) {
      const r = fromSave(input);
      expect(r.ok, JSON.stringify(input)).toBe(false);
      if (!r.ok) expect(r.reason, JSON.stringify(input)).toBe("invalid");
    }
  });

  it("returns version-mismatch for other sim versions", () => {
    for (const simVersion of [0, SIM_VERSION + 1]) {
      const r = fromSave({ ...VALID, simVersion });
      expect(r).toEqual({ ok: false, reason: "version-mismatch" });
    }
  });

  it("returns replay-failed with the index of the first rejected action", () => {
    const second = fromSave({
      simVersion: SIM_VERSION,
      seed: 7,
      actions: [{ type: "wait" }, { type: "setPrice", priceCents: 12_345 }, { type: "wait" }],
    });
    expect(second).toEqual({ ok: false, reason: "replay-failed", atAction: 1 });
    const first = fromSave({ simVersion: SIM_VERSION, seed: 7, actions: [{ type: "hire" }] });
    expect(first).toEqual({ ok: false, reason: "replay-failed", atAction: 0 });
  });

  it("returns invalid instead of throwing for hostile objects (throwing getters, Proxy)", () => {
    // protects: the "never throws" contract; fails_when: input is read outside a guard.
    const getter = {
      simVersion: SIM_VERSION,
      seed: 1,
      actions: [
        {
          get type(): string {
            throw new Error("boom");
          },
        },
      ],
    };
    expect(fromSave(getter)).toEqual({ ok: false, reason: "invalid" });
    const boom = (): never => {
      throw new Error("boom");
    };
    const proxy = new Proxy({}, { get: boom, has: boom, ownKeys: boom, getOwnPropertyDescriptor: boom });
    expect(fromSave(proxy)).toEqual({ ok: false, reason: "invalid" });
  });

  it("never throws, whatever it is given", () => {
    fc.assert(
      fc.property(fc.anything(), (x) => {
        expect(() => fromSave(x)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
    fc.assert(
      fc.property(
        fc.record({
          simVersion: fc.oneof(fc.constant(SIM_VERSION), fc.integer()),
          seed: fc.oneof(fc.integer({ min: 0, max: 0xffffffff }), fc.double()),
          actions: fc.array(fc.anything(), { maxLength: 6 }),
        }),
        (x) => {
          expect(() => fromSave(x)).not.toThrow();
        },
      ),
      { numRuns: 1000 },
    );
  });
});
