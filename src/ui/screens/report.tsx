import { useEffect } from "preact/hooks";
import { CalloutHost } from "../parts";
import { Panel } from "../panel";
import { copyChallengeLink, currentSeed, finalReport, state, flyAgain, revealDone, revealMode, saveShareCard, settings, shareNotice } from "../store";

const FULL_MS = 2400;
const COMPRESSED_MS = 800;

export function ReportScreen() {
  const r = finalReport.value;
  const mode = revealMode.value;
  const reduced = settings.value.reduceMotion || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (reduced) {
      revealDone.value = true;
      return;
    }
    const t = setTimeout(() => (revealDone.value = true), mode === "full" ? FULL_MS : COMPRESSED_MS);
    return () => clearTimeout(t);
  }, [reduced, mode]);
  if (!r) return null;
  const landed = r.outcome === "landed";
  const phase = revealDone.value ? "done" : mode;
  return (
    <>
      <main class="board">
        <article class="report" data-reveal={phase} data-outcome={r.outcome} onClick={() => (revealDone.value = true)}>
          <p class="report__form">Accident investigation report</p>
          <dl class="report__fields">
            <dt>Flight</dt><dd>{String(currentSeed.value)}</dd>
            <dt>Weeks flown</dt><dd>{String(state.value?.week ?? 0)}</dd>
            <dt>Outcome</dt><dd>{landed ? "Landed" : r.outcome === "stalled" ? "Stalled" : "Crashed"}</dd>
          </dl>
          <header class={landed ? "report__head report__head--landed" : "report__head"}>
            <h1 class="report__title" tabIndex={-1}>{r.headline}</h1>
          </header>
          <section class="report__section" style={{ "--i": 1 }}>
            <h2>Summary</h2>
            <p>{r.summary}</p>
            {landed ? <p>Default alive: the business can pay its own way.</p> : null}
          </section>
          {r.probableCause ? (
            <section class="report__section" style={{ "--i": 2 }}>
              <h2>Probable cause</h2>
              <p class="report__cause">{`${r.probableCause.id}. ${r.probableCause.title}`}</p>
              <ul>{r.probableCause.evidence.map((e, i) => (<li key={i}>{e}</li>))}</ul>
              <p>{r.probableCause.lesson}</p>
            </section>
          ) : r.noDominantCause ? (
            <section class="report__section" style={{ "--i": 2 }}>
              <h2>Probable cause</h2>
              <p>No single dominant cause.</p>
            </section>
          ) : null}
          {r.contributing.length > 0 ? (
            <section class="report__section" style={{ "--i": 3 }}>
              <h2>Contributing factors</h2>
              <ul>
                {r.contributing.map((c) => (<li key={c.id}>{`${c.id}. ${c.title}: ${c.evidence[0] ?? ""}`}</li>))}
              </ul>
            </section>
          ) : null}
          {r.wouldHaveChanged ? (
            <section class="report__section" style={{ "--i": 4 }}>
              <h2>What would have changed the outcome</h2>
              <p>{r.wouldHaveChanged}</p>
            </section>
          ) : null}
          {r.numbers.length > 0 ? (
            <section class="report__section" style={{ "--i": 5 }}>
              <h2>The numbers</h2>
              <p>{r.numbers.join(", ")}</p>
            </section>
          ) : null}
          <div class="stamp" aria-hidden="true">{landed ? "Default alive" : r.probableCause ? "Cause found" : "Inconclusive"}</div>
        </article>
        {shareNotice.value ? <p class="notice" role="status">{shareNotice.value}</p> : null}
        <CalloutHost screen="report" />
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={flyAgain}>Fly again</button>
        <button type="button" class="button" onClick={() => void copyChallengeLink()}>Copy challenge link</button>
        <button type="button" class="button" onClick={() => void saveShareCard()}>Save share card</button>
      </footer>
    </>
  );
}
