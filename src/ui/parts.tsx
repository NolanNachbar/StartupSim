// Pieces shared by several screens: the HUD, the route chips, the callout.
import type { ComponentChildren } from "preact";
import { CALLOUTS, nextCallout, type CalloutScreen } from "./callouts";
import { hypothesisLabel, money } from "./format";
import { spriteUrl } from "./art/city";
import { pathProgress } from "./guide";
import { markCalloutShown, openHelp, openMenu, selected, settings, shownCallouts, startPivots, state } from "./store";
import type { Hypothesis, PublicState } from "../sim";

export function Instrument({ caption, value }: { caption: string; value: string }) {
  return (
    <div class="instrument">
      <span class="instrument__caption">{caption}</span>
      <span class="instrument__row">
        <span key={value} class="instrument__value tick">{value}</span>
      </span>
    </div>
  );
}

/** Pivots remaining: the largest number, with one little delivery van per pivot. */
export function Pivots({ count, max }: { count: number; max: number }) {
  const shown = Math.min(Math.max(max, count), 6);
  return (
    <div class="pivots">
      <span class="instrument__caption">Pivots remaining</span>
      <div class="pivots__row">
        <span class="pivots__number" role="img" aria-label={`${count} of ${Math.max(max, count)}`}>{Math.max(0, count)}</span>
        <span class="pivots__vans" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (
            <img key={i} class={i < count ? "van-icon" : "van-icon van-icon--spent"} src={spriteUrl("car-van-0")} alt="" />
          ))}
        </span>
      </div>
    </div>
  );
}

/** The HUD: pivots first, then cash and week, then the menu. `fresh` is the starting state shown on the board. */
export function Strip({ fresh }: { fresh: PublicState }) {
  const s = state.value ?? fresh;
  const max = Math.max(startPivots.value || fresh.pivotsRemaining, s.pivotsRemaining, 1);
  return (
    <header class="strip">
      <Pivots count={s.pivotsRemaining} max={max} />
      <div class="strip__side">
        <div class="strip__buttons">
          <button type="button" class="button button--menu" onClick={openMenu}>
            Menu
          </button>
          <button type="button" class="button button--help" aria-label="How to play" onClick={openHelp}>
            ?
          </button>
        </div>
        <Instrument caption="Cash" value={money(s.cashCents)} />
        <Instrument caption="Week" value={String(s.week)} />
      </div>
    </header>
  );
}

/** One chip per hypothesis. Arrow keys move between chips; Enter or a tap selects. The border carries the
 * evidence language: dotted untested, dashed weak, solid verified. */
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
          <button type="button" class="route-row" data-state={h.state} data-focus={i === focus} aria-pressed={selected.value === i} aria-label={`${i + 1}. ${names[i] ?? "Group"}${i === focus ? " (your focus)" : ""}. ${hypothesisLabel(h.state)}`} onClick={() => (selected.value = i)}>
            <span class="route-row__name">{`${i + 1}. ${names[i] ?? "Group"}`}</span>
            <span class="route-row__state">{hypothesisLabel(h.state)}</span>
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


/** Five milestones toward default alive. It shows what has been achieved, never what to do next. */
export function PathBar({ s }: { s: PublicState }) {
  const p = pathProgress(s);
  const current = p.steps.find((x) => x.current);
  const doneCount = p.steps.filter((x) => x.done).length;
  return (
    <div class="path">
      <ol class="path__bar" aria-label="Your path to default alive">
        {p.steps.map((x) => (
          <li key={x.id} class={x.done ? "path__step path__step--done" : x.current ? "path__step path__step--current" : "path__step"} aria-label={`${x.label}${x.done ? ", done" : x.current ? ", in progress" : ""}`} />
        ))}
      </ol>
      <p class="path__label">{current ? `${doneCount} of 5: ${current.label}` : "Default alive"}</p>
    </div>
  );
}
