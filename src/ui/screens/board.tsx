import { INDUSTRY_LIST, view } from "../../sim";
import { company, continueFlight, notice, openSetup, savedRun, challengeSeed } from "../store";
import { Panel } from "../panel";

export function Board() {
  const saved = savedRun.value;
  const hasSaved = saved !== null;
  return (
    <>
      <main class="board board--open">
        <div class="plate">
          <h1 class="board__title board__title--hero" tabIndex={-1}>Runway</h1>
          <p class="board__lede">Run a startup. Learn why most fail. Run again.</p>
          {notice.value ? <p class="notice" role="status">{notice.value}</p> : null}
          {challengeSeed.value !== null ? <p class="notice" role="status">A shared run is waiting: the same world, your decisions.</p> : null}
          {saved ? (
            <p class="board__empty">
              Saved run: {company.value.name || "your company"}, {INDUSTRY_LIST[company.value.industry]?.name ?? "your market"}, week {view(saved).week}.
            </p>
          ) : (
            <p class="board__empty">Name your company, pick a market, and build your route.</p>
          )}
        </div>
      </main>
      <Panel idle />
      <footer class="actions">
        {hasSaved ? (
          <>
            <button type="button" class="button button--primary" onClick={continueFlight}>Continue run</button>
            <button type="button" class="button" onClick={openSetup}>Start a new run</button>
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
