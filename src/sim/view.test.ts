import { describe, expect, it } from "vitest";
import { collectKeys, playFuzz } from "../../tests/unit/helpers/fuzz";
import { initialRun, unsafeRunForTest } from "./state";
import type { Secret } from "./types";
import { view } from "./view";

const HIDDEN_KEYS = [
  "pain",
  "willingnessToPayCents",
  "politeness",
  "reachability",
  "size",
  "incumbentSatisfactionPct",
  "trueDemand",
  "channels",
  "weather",
  "secret",
  "seed",
];

function mutatedSecret(secret: Secret, k: number): Partial<Secret> {
  return {
    segments: secret.segments.map((s, i) => ({
      ...s,
      pain: 20 + ((s.pain + k + i) % 81),
      willingnessToPayCents: 1000 + (((s.willingnessToPayCents / 100 + k) % 190) * 100),
      politeness: (s.politeness + k + 1) % 101,
      reachability: 10 + ((s.reachability + k + 1) % 91),
      size: 200 + ((s.size + k + 1) % 4800),
      incumbentSatisfactionPct: (s.incumbentSatisfactionPct + k + 1) % 81,
      trueDemand: s.trueDemand + k + 1,
    })),
    channels: secret.channels.map((c) => ({ ...c, costPerLeadCents: c.costPerLeadCents + k + 1 })),
    weather: secret.weather ? null : { startWeek: 30, endWeek: 40, demandMultiplierPct: 70 },
  };
}

describe("view", () => {
  it("is identical for worlds that differ only in hidden parameters (200 seeds)", () => {
    // protects: the UI sees evidence only; fails_when: view() starts reading anything from the Secret.
    for (let seed = 0; seed < 200; seed++) {
      const a = initialRun(seed);
      const overrides = mutatedSecret(a.secret, seed);
      const b = unsafeRunForTest(seed, {}, overrides);
      expect(JSON.stringify(b.secret)).not.toBe(JSON.stringify(a.secret));
      expect(view(b)).toEqual(view(a));
    }
  });

  it("contains none of the hidden keys, at the start and after play (200 seeds)", () => {
    for (let seed = 0; seed < 200; seed++) {
      const fresh = collectKeys(JSON.parse(JSON.stringify(view(initialRun(seed)))));
      const played = collectKeys(JSON.parse(JSON.stringify(view(playFuzz(seed, 40).run))));
      for (const key of HIDDEN_KEYS) {
        expect(fresh.has(key), `${key} leaked at start of seed ${seed}`).toBe(false);
        expect(played.has(key), `${key} leaked after play of seed ${seed}`).toBe(false);
      }
    }
  });

  it("returns frozen state so the screen cannot change the run", () => {
    // protects: determinism against UI mutation; fails_when: view() hands out writable internals.
    const pub = view(playFuzz(9, 20).run);
    expect(Object.isFrozen(pub)).toBe(true);
    expect(Object.isFrozen(pub.log)).toBe(true);
    expect(Object.isFrozen(pub.segmentNames)).toBe(true);
    expect(() => {
      (pub as { week: number }).week = 999;
    }).toThrow(TypeError);
    for (const entry of pub.log) expect(Object.isFrozen(entry)).toBe(true);
  });

  it("exposes segment names but no numbers about the segments", () => {
    const pub = view(initialRun(2));
    expect(pub.segmentNames.every((n) => typeof n === "string")).toBe(true);
  });
});
