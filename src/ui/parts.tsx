// Pieces shared by several screens: the HUD, the route chips, the callout.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { CALLOUTS, nextCallout, type CalloutScreen } from "./callouts";
import { hypothesisLabel, money } from "./format";
import { pathProgress } from "./guide";
import { currentBusiness, last, weekAhead, markCalloutShown, openForm, openNotebook, openHelp, openMenu, screen, selected, settings, shownCallouts, startPivots, state } from "./store";
import { STAGE_COUNT, lockedReason, stageInfo } from "./stage";
import { CATALOG, MONTH_NAMES, type Hypothesis, type PublicState } from "../sim";

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

/** Pivots remaining: the largest number, with runway edge lights beside it (one lit for every pivot left, up to five). */
export function Pivots({ count, max }: { count: number; max: number }) {
  const shown = Math.min(Math.max(max, count, 1), 5);
  return (
    <div class="pivots">
      <span class="instrument__caption">Pivots remaining</span>
      <div class="pivots__row">
        <span class="pivots__number" role="img" aria-label={`${count} of ${Math.max(max, count)}`}>{Math.max(0, count)}</span>
        <span class="pivots__lights" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (<i key={i} class={i < count ? "light" : "light light--off"} />))}
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
        <CashChange />
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
  const list = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  const measure = () => {
    const el = list.current;
    if (el) setMore(el.scrollWidth > el.clientWidth + el.scrollLeft + 4);
  };
  useEffect(() => {
    measure();
    const el = list.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [hypotheses.length]);
  return (
    <ul class="routes" data-more={more} ref={list} onScroll={measure} onKeyDown={onKey}>
      {hypotheses.map((h, i) => (
        <li key={i}>
          <button type="button" class="route-row" data-state={h.state} data-focus={i === focus} aria-pressed={selected.value === i} onClick={() => (selected.value = i)}>
            <span class="route-row__name">{names[i] ?? "Group"}</span>
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

/** What the last action did to the cash, so a change in the number is never a surprise. */
export function CashChange() {
  const l = last.value;
  if (!l || state.value === null || screen.value.name === "board") return null;
  const d = l.step.cashDeltaCents;
  if (d === 0) return null;
  return (
    <p class={`delta ${d < 0 ? "delta--out" : "delta--in"}`} aria-hidden="true">{`${d < 0 ? "-" : "+"}${money(Math.abs(d))} since your last move`}</p>
  );
}

/** The five stages: the one you are in named large, every stage numbered and labelled, and what the stage means. */
export function StageBar({ s, compact = false }: { s: PublicState; compact?: boolean }) {
  const info = stageInfo(s, currentBusiness());
  return (
    <div class={compact ? "stage stage--compact" : "stage"}>
      <p class="stage__now">
        <span class="stage__count">{`Stage ${info.index + 1} of ${STAGE_COUNT}`}</span>
        <span class="stage__title">{info.name}</span>
      </p>
      <ol class="stage__bar" aria-label="Stages of your business">
        {info.names.map((n, i) => (
          <li key={n} class={i < info.index ? "stage__step stage__step--done" : i === info.index ? "stage__step stage__step--now" : "stage__step"} aria-current={i === info.index ? "step" : undefined}>
            <span class="stage__dot" aria-hidden="true">{i < info.index ? "\u2713" : String(i + 1)}</span>
            <span class="stage__name">{n}</span>
          </li>
        ))}
      </ol>
      {compact ? null : <p class="stage__what">{info.what}</p>}
      {compact ? null : <p class="stage__goal-title">{info.exitTitle}</p>}
      <ul class="stage__goals">
        {(compact ? info.goals.filter((g) => !g.done).slice(0, 1) : info.goals).map((g) => {
          const lock = g.form ? lockedReason(g.form, s) : null;
          const target = lock ? lock.first : g.form;
          return (
            <li key={g.label} class={g.done ? "goal goal--done" : "goal"}>
              <span class="goal__box" aria-hidden="true">{g.done ? "\u2713" : ""}</span>
              <span class="goal__text">{compact ? `Next: ${g.label}` : g.label}<span class="sr-only">{g.done ? ", done" : ", not done"}</span></span>
              {!g.done && target ? <button type="button" class="button button--small" onClick={() => openForm(target)}>{lock ? "Build first" : "Do it"}</button> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Where the company stands, in plain numbers: cash and how long it lasts, product, customers, money in and out. */
export function StatusCard({ s }: { s: PublicState }) {
  const marketing = s.marketing.channel === null ? 0 : (CATALOG.budgetLevelsCents[s.marketing.level] ?? 0);
  const goods = Math.floor((s.weeklyRevenueCents * s.cogsPct) / 100);
  const costs = s.weeklyBurnCents + marketing + (CATALOG.rndLevelsCents[s.rndLevel] ?? 0) + goods;
  const net = s.weeklyRevenueCents - costs;
  const weeks = net >= 0 ? null : Math.floor(s.cashCents / -net);
  return (
    <dl class="status" aria-label="Where your company stands">
      {s.season ? (
        <>
          <dt>Season</dt>
          <dd>{`${MONTH_NAMES[s.season.month]}: ${s.season.index >= 115 ? "a busy time" : s.season.index <= 85 ? "a quiet time" : "an ordinary time"} (${s.season.index} percent of an average month). ${(() => {
            const next = s.season.forecast[s.season.forecast.length - 1] ?? s.season.index;
            return next >= s.season.index + 15 ? "Busier ahead." : next <= s.season.index - 15 ? "Quieter ahead." : "";
          })()}`}</dd>
        </>
      ) : null}
      <dt>Cash</dt><dd>{money(s.cashCents)}</dd>
      <dt>Money in a week</dt><dd>{money(s.weeklyRevenueCents)}</dd>
      <dt>Money out a week</dt><dd>{money(costs)}</dd>
      <dt>Cash lasts</dt><dd>{weeks === null ? "You are not losing cash" : `${weeks} ${weeks === 1 ? "week" : "weeks"} at this rate`}</dd>
      <dt>Product ready</dt><dd>{`${s.productProgressPct} percent`}</dd>
      <dt>Paying customers</dt><dd>{String(s.payingCustomers)}</dd>
      {s.season ? (<><dt>Reviews</dt><dd>{s.payingCustomers < 5 ? "Too few customers to have reviews yet" : `${(1 + s.reputation / 25).toFixed(1)} out of 5`}</dd></>) : null}
      {s.rivalSince !== null ? (<><dt>Competition</dt><dd>{`A rival opened in week ${s.rivalSince}`}</dd></>) : null}
      {s.promo ? (<><dt>Promotion</dt><dd>{`${s.promo.weeksLeft} ${s.promo.weeksLeft === 1 ? "week" : "weeks"} left`}</dd></>) : null}
      <dt>Team</dt><dd>{s.hires === 0 ? "Just you" : `${s.hires} ${s.hires === 1 ? "person" : "people"} besides you`}</dd>
      {s.capacity !== null ? (<><dt>People you know</dt><dd>{String(s.network.contacts)}</dd></>) : null}
      <dt>What you know</dt><dd>{`${s.evidence.length} ${s.evidence.length === 1 ? "result" : "results"}`}</dd>
    </dl>
  );
}

/** What waiting a week would do to your cash, before you click it: money in, each cost, and where cash ends up. */
export function WeekAheadCard({ compact = false }: { compact?: boolean }) {
  const w = weekAhead.value;
  if (!w) return null;
  const change = w.cashCents - (state.value?.cashCents ?? 0);
  const head = `If you wait a week: ${money(w.cashCents)} (${change < 0 ? "-" : "+"}${money(Math.abs(change))})`;
  if (compact) {
    return <p class="ahead ahead--compact" role="status">{w.endsRun ? "If you wait a week, you run out of cash." : head}</p>;
  }
  return (
    <section class="ahead" aria-label="What waiting a week would do">
      <p class="ahead__head">{head}</p>
      {w.endsRun ? <p class="notice notice--error" role="note">You would run out of cash.</p> : null}
      <dl class="status">
        <dt>Money in</dt><dd>{money(w.moneyInCents)}</dd>
        {w.costs.map((c) => (<><dt key={c.label}>{c.label}</dt><dd>{`-${money(c.cents)}`}</dd></>))}
        <dt>Cash at the end</dt><dd>{money(w.cashCents)}</dd>
      </dl>
    </section>
  );
}

/** What you can do with one customer group, opened from the map or the chips. */
export function GroupActions({ s, index }: { s: PublicState; index: number }) {
  const name = s.segmentNames[index] ?? "this group";
  const h = s.hypotheses[index];
  const isFocus = index === s.focusSegment;
  const items: { form: Parameters<typeof openForm>[0]; label: string; why: string }[] = [
    { form: "interview", label: `Interview ${name}`, why: "Three conversations with people in this group." },
    { form: "test-channel", label: "Test reaching them", why: "Spend a little to see whether they respond to outreach or ads." },
    { form: "charge", label: "Ask them to pay", why: "A paid test: real money from this group counts as proof." },
    { form: "marketing", label: "Aim marketing at them", why: "Pay each week to reach this group and win customers." },
    ...(isFocus ? [] : [{ form: "pivot" as const, label: "Switch to them", why: "Make this your main group. It uses up a pivot." }]),
  ];
  return (
    <section class="group" aria-label={`Actions for ${name}`}>
      <p class="group__title">{name}</p>
      <p class="group__facts">{h ? `${hypothesisLabel(h.state)}. ${h.interviews} interviewed, ${h.interested} interested, ${h.payments} paid.` : ""}</p>
      <ul class="group__list">
        {items.map((it) => (
          <li key={it.form}>
            <button type="button" class="button button--row" onClick={() => openForm(it.form, index)}>
              <span class="row__text"><span class="row__title">{it.label}</span><span class="row__hint">{it.why}</span></span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" class="button button--row" onClick={() => openNotebook(index)}>
            <span class="row__text"><span class="row__title">{`What you have learned about ${name}`}</span><span class="row__hint">Every interview and test with this group, and the questions you have not asked yet.</span></span>
          </button>
        </li>
      </ul>
    </section>
  );
}
