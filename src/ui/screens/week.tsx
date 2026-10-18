import { CalloutHost, HypothesisList } from "../parts";
import { countStates, money } from "../format";
import { Panel } from "../panel";
import { act, go, sheetOpen, state } from "../store";

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
        <CalloutHost screen="week" />
        <div class="plate">
          <h1 class="board__title" tabIndex={-1}>Your route</h1>
          <p class="board__lede">{countStates(s.hypotheses)}</p>
          <HypothesisList hypotheses={s.hypotheses} names={s.segmentNames} focus={s.focusSegment} />
        </div>
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => go({ name: "actions" })}>Choose an action</button>
        <div class="actions__row">
          <button type="button" class="button" onClick={() => act({ type: "wait" })}>Wait a week</button>
          <button type="button" class="button button--phone" aria-expanded={sheetOpen.value} onClick={() => (sheetOpen.value = !sheetOpen.value)}>Log and details</button>
        </div>
      </footer>
    </>
  );
}
