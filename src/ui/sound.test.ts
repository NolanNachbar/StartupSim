import { describe, expect, it } from "vitest";
import { TONES, createSound, type SoundName } from "./sound";

describe("sound", () => {
  it("defines quiet, short tones for every event", () => {
    const names: SoundName[] = ["tick", "warn", "report", "error"];
    for (const n of names) {
      const steps = TONES[n];
      expect(steps.length).toBeGreaterThan(0);
      for (const t of steps) {
        expect(t.gain).toBeGreaterThan(0);
        expect(t.gain).toBeLessThanOrEqual(0.08);
        expect(t.ms).toBeLessThanOrEqual(700);
        expect(t.hz).toBeGreaterThan(80);
      }
    }
  });

  it("does nothing, without throwing, when there is no audio support or it is muted", () => {
    const none = createSound(() => null);
    expect(() => none.play("tick")).not.toThrow();
    let created = 0;
    const muted = createSound(() => {
      created++;
      return null;
    });
    muted.setEnabled(false);
    muted.play("tick");
    expect(created).toBe(0);
  });

  it("creates the audio context only on first play, never at construction", () => {
    let created = 0;
    const s = createSound(() => {
      created++;
      return null;
    });
    expect(created).toBe(0);
    s.play("tick");
    expect(created).toBe(1);
  });
});
