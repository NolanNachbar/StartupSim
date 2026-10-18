// Pieces shared by several screens: the instrument strip, the route chart, the hypothesis list, the callout.
import type { ComponentChildren } from "preact";
import { CALLOUTS, nextCallout, type CalloutScreen } from "./callouts";
import { countStates, hypothesisLabel, money } from "./format";
import { markCalloutShown, openMenu, selected, settings, shownCallouts, startPivots, state, updateSettings } from "./store";
import type { Hypothesis, HypothesisState, PublicState } from "../sim";

export function Instrument({ caption, value, large, area }: { caption: string; value: string; large?: boolean; area: string }) {
  return (
    <div class={large ? "instrument instrument--large" : "instrument"} style={{ gridArea: area }}>
      <span class="instrument__caption">{caption}</span>
      <span class="instrument__value">{value}</span>
    </div>
  );
}

export function PivotGauge({ count, max }: { count: number; max: number }) {
  return (
    <div class="gauge" role="img" aria-label={`${count} of ${max} pivots remaining`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} class={i < count ? "gauge__segment gauge__segment--on" : "gauge__segment"} />
      ))}
    </div>
  );
}

/** The banner: pivots first, then cash and week, then the menu. `fresh` is the starting state shown on the board. */
export function Strip({ fresh }: { fresh: PublicState }) {
  const s = state.value ?? fresh;
  const max = Math.max(startPivots.value || fresh.pivotsRemaining, s.pivotsRemaining, 1);
  return (
    <header class="strip">
      <Instrument area="pivots" caption="Pivots remaining" value={String(s.pivotsRemaining)} large />
      <PivotGauge count={s.pivotsRemaining} max={max} />
      <Instrument area="cash" caption="Cash" value={money(s.cashCents)} />
      <Instrument area="week" caption="Week" value={String(s.week)} />
      <button type="button" class="button button--menu" onClick={openMenu}>
        Menu
      </button>
      <button type="button" class="button button--menu button--sound" aria-pressed={settings.value.sound} onClick={() => updateSettings({ sound: !settings.value.sound })}>
        {settings.value.sound ? "Sound on" : "Sound off"}
      </button>
    </header>
  );
}

const WAYPOINTS: ReadonlyArray<readonly [number, number]> = [
  [40, 280], [100, 220], [170, 165], [235, 105], [280, 50],
];

function point(i: number, n: number): readonly [number, number] {
  // Spread n waypoints between the start and the destination along the fixed route.
  const idx = Math.round(((i + 1) * (WAYPOINTS.length - 1)) / (n + 1));
  return WAYPOINTS[idx] ?? WAYPOINTS[0]!;
}

const DASH: Record<HypothesisState, { dash: string; stroke: string; width: number }> = {
  untested: { dash: "1 7", stroke: "var(--ink-soft)", width: 2.5 },
  weak: { dash: "9 6", stroke: "var(--ink-soft)", width: 2.5 },
  verified: { dash: "none", stroke: "var(--blue)", width: 3.5 },
};

export function LineSample({ state: st }: { state: HypothesisState }) {
  const d = DASH[st];
  return (
    <svg class="swatch" viewBox="0 0 40 8" aria-hidden="true">
      <line x1="2" y1="4" x2="38" y2="4" stroke={d.stroke} stroke-width={d.width} stroke-dasharray={d.dash === "none" ? undefined : d.dash} stroke-linecap="round" />
    </svg>
  );
}

export function Chart({ hypotheses, focus }: { hypotheses: readonly Hypothesis[]; focus: number }) {
  const n = Math.max(hypotheses.length, 1);
  const pts = Array.from({ length: n }, (_, i) => point(i, n));
  const start = WAYPOINTS[0]!;
  const dest = WAYPOINTS[WAYPOINTS.length - 1]!;
  const summary = hypotheses.length === 0 ? "No hypotheses yet." : countStates(hypotheses);
  const sel = selected.value;
  return (
    <svg class="chart" viewBox="0 0 320 320" role="img" aria-label={`Route chart. ${summary}.`}>
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--line)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="320" height="320" fill="url(#grid)" />
      {pts.map((p, i) => {
        const from = i === 0 ? start : pts[i - 1]!;
        const d = DASH[hypotheses[i]?.state ?? "untested"];
        return (
          <path
            key={i}
            d={`M ${from[0]} ${from[1]} Q ${(from[0] + p[0]) / 2 + 14} ${(from[1] + p[1]) / 2 - 14} ${p[0]} ${p[1]}`}
            fill="none" stroke={d.stroke} stroke-width={d.width}
            stroke-dasharray={d.dash === "none" ? undefined : d.dash} stroke-linecap="round"
          />
        );
      })}
      <line x1={pts[n - 1]![0]} y1={pts[n - 1]![1]} x2={dest[0]} y2={dest[1]} stroke="var(--ink-soft)" stroke-width="2.5" stroke-dasharray="1 7" stroke-linecap="round" />
      <circle cx={start[0]} cy={start[1]} r="6" fill="var(--paper-raised)" stroke="var(--ink)" stroke-width="2" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={sel === i ? 9 : 6} fill="var(--paper-raised)" stroke={i === focus ? "var(--airspace)" : "var(--ink)"} stroke-width="2" />
          <text x={p[0] + 12} y={p[1] + 22} font-size="14" fill="var(--ink)">{`${i + 1}`}</text>
        </g>
      ))}
      <circle cx={dest[0]} cy={dest[1]} r="6" fill="var(--paper-raised)" stroke="var(--airspace)" stroke-width="2" />
    </svg>
  );
}

/** One row per hypothesis. Arrow keys move between rows; Enter or a tap selects. */
export function HypothesisList({ hypotheses, names, focus }: { hypotheses: readonly Hypothesis[]; names: readonly string[]; focus: number }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("button");
    const at = Array.from(list).indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? Math.min(list.length - 1, at + 1) : Math.max(0, at - 1);
    list[next]?.focus();
    e.preventDefault();
  };
  return (
    <ul class="routes" onKeyDown={onKey}>
      {hypotheses.map((h, i) => (
        <li key={i}>
          <button type="button" class="route-row" aria-pressed={selected.value === i} onClick={() => (selected.value = i)}>
            <span class="route-row__name">{`${i + 1}. ${names[i] ?? "Group"}${i === focus ? " (your focus)" : ""}`}</span>
            <span class="route-row__state">
              <LineSample state={h.state} />
              {hypothesisLabel(h.state)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CalloutHost({ screen }: { screen: CalloutScreen }) {
  const s = state.value;
  const callout = nextCallout({
    enabled: settings.value.callouts,
    shown: shownCallouts.value,
    screen,
    startPivots: startPivots.value,
    pivotsRemaining: s?.pivotsRemaining ?? 0,
    hasUntested: s?.hypotheses.some((h) => h.state === "untested") ?? false,
    hasVerified: s?.hypotheses.some((h) => h.state === "verified") ?? false,
    crashed: s?.status === "crashed",
  });
  if (!callout) return null;
  return (
    <div class="callout" role="note">
      <p class="callout__text">{callout.text}</p>
      <button type="button" class="button button--quiet" onClick={() => markCalloutShown(callout.id)}>
        Got it
      </button>
    </div>
  );
}

export function Section({ title, id, children }: { title: string; id: string; children: ComponentChildren }) {
  return (
    <section class="panel__section" aria-labelledby={id}>
      <h2 class="panel__title" id={id}>{title}</h2>
      {children}
    </section>
  );
}

export const CALLOUT_COUNT = CALLOUTS.length;
