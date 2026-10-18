import { continueFlight, discardSaved, notice, openSetup, savedRun, challengeSeed } from "../store";
import { Panel } from "../panel";

export function Board() {
  const hasSaved = savedRun.value !== null;
  return (
    <>
      <main class="board board--open">
        <div class="plate">
          <h1 class="board__title board__title--hero" tabIndex={-1}>Runway</h1>
          <p class="board__lede">Run a startup. Learn why most fail. Run again.</p>
          {notice.value ? <p class="notice" role="status">{notice.value}</p> : null}
          {challengeSeed.value !== null ? <p class="notice" role="status">A shared run is waiting: the same world, your decisions.</p> : null}
          <p class="board__empty">No tests yet. Interview a customer to start your route.</p>
        </div>
      </main>
      <Panel idle />
      <footer class="actions">
        {hasSaved ? (
          <>
            <button type="button" class="button button--primary" onClick={continueFlight}>Continue run</button>
            <button type="button" class="button" onClick={() => { discardSaved(); openSetup(); }}>Start a new run</button>
          </>
        ) : challengeSeed.value !== null ? (
          <>
            <button type="button" class="button button--primary" onClick={openSetup}>Start the shared run</button>
            <button type="button" class="button" onClick={() => { challengeSeed.value = null; openSetup(); }}>Start a run</button>
          </>
        ) : (
          <button type="button" class="button button--primary" onClick={openSetup}>Start a run</button>
        )}
      </footer>
    </>
  );
}
