import { CalloutHost, HypothesisList, PathBar } from "../parts";
import { money } from "../format";
import { Panel } from "../panel";
import { INDUSTRY_LIST } from "../../sim";
import { act, company, go, sheetOpen, state } from "../store";

let lastWait = 0;
/** One week per press: the second click of a double click, within a quarter second, is the other half of one tap, not a new decision. */
function waitOnce(e: MouseEvent): void {
  const now = Date.now();
  if (e.detail > 1 && now - lastWait < 250) return;
  lastWait = now;
  act({ type: "wait" });
}

export function Week() {
  const s = state.value;
  if (!s) return null;
  return (
    <>
      <main class="board board--open">
        {s.offer ? (
          <div class="notice">
            <p>{`A lender offers ${money(s.offer.amountCents)} now. The offer ends in week ${s.offer.expiresWeek}.`}</p>
            <button type="button" class="button" onClick={() => go({ name: "form", id: "offer" })}>Answer the cash offer</button>
          </div>
        ) : null}
        <div class="plate">
          <div class="plate__head">
            <h1 class="board__title" tabIndex={-1}>Your route</h1>
            <p class="board__lede plate__company">{`${company.value.name}, ${INDUSTRY_LIST[company.value.industry]?.name ?? ""}`}</p>
          </div>
          <CalloutHost screen="week" />
          <PathBar s={s} />
          <HypothesisList hypotheses={s.hypotheses} names={s.segmentNames} focus={s.focusSegment} />
        </div>
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => go({ name: "actions" })}>Choose an action</button>
        <div class="actions__row">
          <button type="button" class="button" onClick={waitOnce}>Wait a week</button>
          <button type="button" class="button button--phone" aria-expanded={sheetOpen.value} onClick={() => (sheetOpen.value = !sheetOpen.value)}>Details</button>
        </div>
      </footer>
    </>
  );
}
