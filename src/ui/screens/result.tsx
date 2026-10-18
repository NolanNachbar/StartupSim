import type { Evidence, PublicState } from "../../sim";
import { money, questionLabel, tagExplain, tagLabel } from "../format";
import { Panel } from "../panel";
import { go, last } from "../store";

function Interview({ e }: { e: Extract<Evidence, { kind: "interview" }> }) {
  const who = e.customer === "friend" ? "A friend of yours" : e.customer === "stranger" ? "A stranger" : "No one";
  return (
    <li class="entry">
      <p class="entry__head">{`${who}, asked: ${questionLabel(e.question)}`}</p>
      <p class="entry__quote">{e.quote}</p>
      {e.outcome === "completed" && e.tag ? (
        <p class="entry__debrief">{`${tagLabel(e.tag)}. ${tagExplain(e.tag)}`}</p>
      ) : e.outcome === "ended-early" ? (
        <p class="entry__debrief">The customer ended the call early. You learned little.</p>
      ) : (
        <p class="entry__debrief">No reply. Nothing learned from this one.</p>
      )}
    </li>
  );
}

function Other({ e, after }: { e: Evidence; after: PublicState }) {
  if (e.kind === "channel-test") {
    const small = e.leads < 10 ? " Only a few people were reached. Treat this as weak evidence." : "";
    return (
      <li class="entry">
        <p class="entry__head">{`Channel test: ${after.channels[e.channel]?.name ?? "channel"}`}</p>
        <p class="entry__quote">{`${e.leads} people reached, ${e.interested} interested.${small}`}</p>
        <p class="entry__debrief">Interest is weak evidence. People say yes more easily than they pay.</p>
      </li>
    );
  }
  if (e.kind === "paid-test") {
    return (
      <li class="entry">
        <p class="entry__head">{`Paid test: ${after.channels[e.channel]?.name ?? "channel"}, ${money(e.priceCents)} a month`}</p>
        <p class="entry__quote">
          {e.payments === 0 ? "No one paid. That is information." : `${e.payments} of ${e.leads} paid.`}
        </p>
        <p class="entry__debrief">{e.payments === 0 ? "Zero payments from a real test says more than any compliment." : "Payments are the strongest evidence there is."}</p>
      </li>
    );
  }
  return null;
}

export function Result() {
  const l = last.value;
  if (!l) return null;
  const { step: d, after } = l;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>What happened</h1>
        <p class="board__lede">
          {d.weeksPassed > 0 ? `${d.weeksPassed} ${d.weeksPassed === 1 ? "week" : "weeks"} passed. ` : ""}
          {`Cash changed by ${money(d.cashDeltaCents)}.`}
        </p>
        {d.evidence.length > 0 ? (
          <ol class="entries">
            {d.evidence.map((e, i) => (e.kind === "interview" ? <Interview key={i} e={e} /> : <Other key={i} e={e} after={after} />))}
          </ol>
        ) : null}
        {d.newLog.length > 0 ? (
          <ul class="log">
            {d.newLog.map((e, i) => (<li key={i}>{`Week ${e.week}: ${e.text}`}</li>))}
          </ul>
        ) : null}
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => go({ name: "week" })}>Continue</button>
      </footer>
    </>
  );
}
