// Pieces shared by several screens: the instrument strip, the route chart, the hypothesis list, the callout.
import type { ComponentChildren } from "preact";
import { CALLOUTS, nextCallout, type CalloutScreen } from "./callouts";
import { hypothesisLabel, money } from "./format";
import { markCalloutShown, openMenu, selected, settings, shownCallouts, startPivots, state, updateSettings } from "./store";
import type { Hypothesis, HypothesisState, PublicState } from "../sim";

export function Instrument({ caption, value, large, area }: { caption: string; value: string; large?: boolean; area: string }) {
  return (
    <div class={large ? "instrument instrument--large" : "instrument"} style={{ gridArea: area }}>
      <span class="instrument__caption">{caption}</span>
      <span key={value} class="instrument__value tick">{value}</span>
    </div>
  );
}

/** Pivots as a cockpit dial: one arc segment per pivot, filled while it remains. */
export function PivotGauge({ count, max }: { count: number; max: number }) {
  const cx = 50, cy = 48, rad = 40, gap = 5;
  const span = 180 - gap * (max - 1);
  const arc = (from: number, to: number) => {
    const pt = (deg: number): [number, number] => [cx + rad * Math.cos((Math.PI * (180 + deg)) / 180), cy + rad * Math.sin((Math.PI * (180 + deg)) / 180)];
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rad} ${rad} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  return (
    <svg class="gauge" viewBox="0 0 100 54" role="img" aria-label={`${count} of ${max} pivots remaining`}>
      {Array.from({ length: max }, (_, i) => {
        const from = i * (span / max + gap), to = from + span / max;
        return <path key={i} d={arc(from, to)} fill="none" stroke={i < count ? "var(--ink)" : "var(--line)"} stroke-width="9" />;
      })}
      <line x1={cx} y1={cy} x2={cx + 28 * Math.cos((Math.PI * (180 + 180 * (count / Math.max(max, 1)))) / 180)} y2={cy + 28 * Math.sin((Math.PI * (180 + 180 * (count / Math.max(max, 1)))) / 180)} stroke="var(--ink-soft)" stroke-width="2.5" stroke-linecap="round" style={{ transition: "all 200ms var(--ease-out)" }} />
      <circle cx={cx} cy={cy} r="4" fill="var(--ink)" />
    </svg>
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

/** One row per hypothesis. Arrow keys move between rows; Enter or a tap selects. */
export function HypothesisList({ hypotheses, names, focus }: { hypotheses: readonly Hypothesis[]; names: readonly string[]; focus: number }) {
  const onKey = (e: KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const list = (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("button");
    const at = Array.from(list).indexOf(document.activeElement as HTMLButtonElement);
    const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
    const next = forward ? Math.min(list.length - 1, at + 1) : Math.max(0, at - 1);
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

/** The board and menus show the world with three untested waypoints. */
export const BOARD_NAMES = ["Your idea", "Your customers", "Your first sale"];
export const BOARD_HYPOTHESES: readonly Hypothesis[] = BOARD_NAMES.map((_, segment) => ({
  segment, state: "untested", interviews: 0, interested: 0, payments: 0, failedPaidTests: 0,
}));
