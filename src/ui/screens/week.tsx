import { CalloutHost, Chart, HypothesisList } from "../parts";
import { countStates, money } from "../format";
import { Panel } from "../panel";
import { act, go, state } from "../store";

export function Week() {
  const s = state.value;
  if (!s) return null;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Your route</h1>
        <p class="board__lede">{countStates(s.hypotheses)}</p>
        <Chart hypotheses={s.hypotheses} focus={s.focusSegment} />
        <HypothesisList hypotheses={s.hypotheses} names={s.segmentNames} focus={s.focusSegment} />
        {s.offer ? (
          <div class="notice">
            <p>{`A lender offers ${money(s.offer.amountCents)} now. The offer ends in week ${s.offer.expiresWeek}.`}</p>
            <button type="button" class="button" onClick={() => go({ name: "form", id: "offer" })}>Answer the cash offer</button>
          </div>
        ) : null}
        <CalloutHost screen="week" />
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => go({ name: "actions" })}>Choose an action</button>
        <button type="button" class="button" onClick={() => act({ type: "wait" })}>Wait a week</button>
      </footer>
    </>
  );
}
