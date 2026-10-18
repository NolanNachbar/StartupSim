// M0 shell. Placeholder readouts prove the layout and tokens; real state arrives in M1 and M6.

const PLACEHOLDER = { pivots: 3, cash: 50000, week: 1 };

function Instrument({ caption, value, large }: { caption: string; value: string; large?: boolean }) {
  return (
    <div class={large ? "instrument instrument--large" : "instrument"}>
      <span class="instrument__caption">{caption}</span>
      <span class="instrument__value">{value}</span>
    </div>
  );
}

function PivotGauge({ count, max }: { count: number; max: number }) {
  return (
    <div class="gauge" role="img" aria-label={`${count} of ${max} pivots remaining`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} class={i < count ? "gauge__segment gauge__segment--on" : "gauge__segment"} />
      ))}
    </div>
  );
}

function Chart() {
  return (
    <svg class="chart" viewBox="0 0 320 320" role="img" aria-label="Route chart. No hypotheses tested yet.">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--line)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="320" height="320" fill="url(#grid)" />
      <path d="M 40 280 C 100 240, 140 200, 180 170 S 260 90, 280 50" fill="none"
        stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round" />
      <circle cx="40" cy="280" r="6" fill="var(--paper-raised)" stroke="var(--ink)" stroke-width="2" />
      <circle cx="280" cy="50" r="6" fill="var(--paper-raised)" stroke="var(--airspace)" stroke-width="2" />
    </svg>
  );
}

export function App() {
  return (
    <div class="shell">
      <header class="strip">
        <Instrument caption="Pivots remaining" value={String(PLACEHOLDER.pivots)} large />
        <PivotGauge count={PLACEHOLDER.pivots} max={5} />
        <Instrument caption="Cash" value={`$${PLACEHOLDER.cash.toLocaleString("en-US")}`} />
        <Instrument caption="Week" value={String(PLACEHOLDER.week)} />
      </header>
      <main class="board">
        <h1 class="board__title">Runway</h1>
        <p class="board__lede">Run a startup. Learn why most fail. Fly again.</p>
        <Chart />
      </main>
      <footer class="actions">
        <button type="button" class="button button--primary">Start a run</button>
      </footer>
    </div>
  );
}
