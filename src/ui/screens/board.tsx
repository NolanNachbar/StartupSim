import { Chart } from "../parts";
import { challengeSeed, continueFlight, discardSaved, notice, openSetup, savedRun, takeOff } from "../store";
import { Panel } from "../panel";
import type { Hypothesis } from "../../sim";

const EMPTY: readonly Hypothesis[] = [];

export function Board() {
  const hasSaved = savedRun.value !== null;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Runway</h1>
        <p class="board__lede">Run a startup. Learn why most fail. Fly again.</p>
        {notice.value ? <p class="notice" role="status">{notice.value}</p> : null}
        {challengeSeed.value !== null ? <p class="notice" role="status">A shared flight is waiting: the same world, your decisions.</p> : null}
        <Chart hypotheses={EMPTY} focus={0} />
        <p class="board__empty">No tests yet. Interview a customer to start your route.</p>
      </main>
      <Panel idle />
      <footer class="actions">
        {hasSaved ? (
          <>
            <button type="button" class="button button--primary" onClick={continueFlight}>Continue flight</button>
            <button type="button" class="button" onClick={() => { discardSaved(); openSetup(); }}>Start a new run</button>
          </>
        ) : challengeSeed.value !== null ? (
          <>
            <button type="button" class="button button--primary" onClick={() => takeOff(challengeSeed.value ?? 0)}>Start the shared flight</button>
            <button type="button" class="button" onClick={openSetup}>Start a run</button>
          </>
        ) : (
          <button type="button" class="button button--primary" onClick={openSetup}>Start a run</button>
        )}
      </footer>
    </>
  );
}
