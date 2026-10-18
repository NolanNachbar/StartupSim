// Generated sound (DESIGN.md, Sound): soft ticks, a low warning, one report tone. No files.
// The audio context is created on the first play, which always follows a tap (browser rule).

export type SoundName = "tick" | "warn" | "report" | "error";

export interface Tone {
  readonly hz: number;
  readonly ms: number;
  readonly gain: number;
}

export const TONES: Readonly<Record<SoundName, readonly Tone[]>> = {
  tick: [{ hz: 880, ms: 40, gain: 0.04 }],
  warn: [{ hz: 196, ms: 260, gain: 0.06 }],
  error: [{ hz: 165, ms: 140, gain: 0.05 }],
  report: [
    { hz: 330, ms: 280, gain: 0.06 },
    { hz: 247, ms: 280, gain: 0.06 },
    { hz: 165, ms: 520, gain: 0.06 },
  ],
};

interface Ctx {
  readonly currentTime: number;
  readonly destination: unknown;
  resume(): Promise<void>;
  createOscillator(): { frequency: { value: number }; connect(n: unknown): void; start(t: number): void; stop(t: number): void; type: string };
  createGain(): { gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void }; connect(n: unknown): void };
}

export interface Sound {
  play(name: SoundName): void;
  setEnabled(on: boolean): void;
}

export function createSound(makeContext: () => Ctx | null): Sound {
  let enabled = true;
  let ctx: Ctx | null | undefined;
  return {
    setEnabled(on) {
      enabled = on;
    },
    play(name) {
      if (!enabled) return;
      try {
        if (ctx === undefined) ctx = makeContext();
        if (!ctx) return;
        void ctx.resume();
        let at = ctx.currentTime;
        for (const t of TONES[name]) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = t.hz;
          g.gain.setValueAtTime(t.gain, at);
          g.gain.exponentialRampToValueAtTime(0.0001, at + t.ms / 1000);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(at);
          osc.stop(at + t.ms / 1000);
          at += t.ms / 1000;
        }
      } catch {
        // Sound is a nicety; never let it break the game.
      }
    },
  };
}

export const sound = createSound(() => {
  const Ctor = (globalThis as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx }).AudioContext
    ?? (globalThis as { webkitAudioContext?: new () => Ctx }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
});
