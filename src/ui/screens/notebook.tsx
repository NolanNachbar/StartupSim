import type { Evidence, InterviewEvidence } from "../../sim";
import { currentBusiness, notebookGroup, back, state } from "../store";
import { questionOptions, questionTextFor } from "../business";
import { hypothesisLabel, money, questionLabel, tagExplain, tagLabel } from "../format";

function InterviewEntry({ e }: { e: InterviewEvidence }) {
  const b = currentBusiness();
  const asked = e.topic ? questionTextFor(b, e.topic) : "";
  const who = e.customer === "friend" ? "A friend of yours" : e.customer === "stranger" ? "A stranger" : "No one";
  return (
    <li class={`entry${e.tag ? ` entry--${e.tag}` : ""}`}>
      <p class="entry__meta">{`Week ${e.week}, interview`}</p>
      <p class="entry__head">{`${who}, asked: ${asked || questionLabel(e.question)}`}</p>
      <p class="entry__quote">{e.quote}</p>
      {e.outcome === "completed" && e.tag ? (
        <p class="entry__debrief"><span class={`tag tag--${e.tag}`}>{tagLabel(e.tag)}</span>{` ${tagExplain(e.tag)}`}</p>
      ) : e.outcome === "ended-early" ? (
        <p class="entry__debrief">The customer ended the call early. You learned little.</p>
      ) : (
        <p class="entry__debrief">No reply. Nothing learned from this one.</p>
      )}
    </li>
  );
}

function Entry({ e, channels }: { e: Evidence; channels: readonly { name: string }[] }) {
  if (e.kind === "interview") return <InterviewEntry e={e} />;
  if (e.kind === "channel-test") {
    return (
      <li class="entry">
        <p class="entry__meta">{`Week ${e.week}, channel test`}</p>
        <p class="entry__head">{`Tested ${channels[e.channel]?.name ?? "a channel"}`}</p>
        <p class="entry__quote">{`${e.leads} people reached, ${e.interested} interested.`}</p>
        <p class="entry__debrief">Interest is weak evidence. People say yes more easily than they pay.</p>
      </li>
    );
  }
  return (
    <li class="entry">
      <p class="entry__meta">{`Week ${e.week}, paid test`}</p>
      <p class="entry__head">{`Asked people to pay ${money(e.priceCents)} through ${channels[e.channel]?.name ?? "a channel"}`}</p>
      <p class="entry__quote">{e.payments === 0 ? `No one paid, out of ${e.leads} asked. That is information.` : `${e.payments} of ${e.leads} paid.`}</p>
    </li>
  );
}

/** Everything you have learned, by customer group, so a second interview can ask something new. */
export function Notebook() {
  const s = state.value;
  if (!s) return null;
  const b = currentBusiness();
  const group = notebookGroup.value;
  const shown = s.evidence.filter((e) => group === null || e.segment === group).slice().reverse();
  const askedTopics = new Set(s.evidence.filter((e): e is InterviewEvidence => e.kind === "interview" && (group === null || e.segment === group) && e.outcome === "completed" && !!e.topic).map((e) => e.topic as string));
  const options = questionOptions(b);
  const h = group !== null ? s.hypotheses[group] : null;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>What you have learned</h1>
        <p class="board__lede">Every interview and test you have run, newest first. Look here before you ask the next question.</p>
        <div class="notebook__tabs" role="group" aria-label="Customer group">
          <button type="button" class="button button--small" aria-pressed={group === null} onClick={() => (notebookGroup.value = null)}>All groups</button>
          {s.segmentNames.map((n, i) => (
            <button key={n} type="button" class="button button--small" aria-pressed={group === i} onClick={() => (notebookGroup.value = i)}>{n}</button>
          ))}
        </div>
        {h ? (
          <p class="panel__text">{`${s.segmentNames[group as number]}: ${hypothesisLabel(h.state)}. ${h.interviews} interviewed, ${h.interested} interested, ${h.payments} paid.`}</p>
        ) : null}
        <h2 class="board__sub">Questions you have asked{group !== null ? ` ${s.segmentNames[group]}` : ""}</h2>
        {askedTopics.size === 0 ? (
          <p class="panel__text">None yet.</p>
        ) : (
          <ul class="log">{options.filter((o) => askedTopics.has(o.value)).map((o) => (<li key={o.value}>{o.short}</li>))}</ul>
        )}
        <h2 class="board__sub">Not asked yet</h2>
        <ul class="log">{options.filter((o) => !askedTopics.has(o.value)).map((o) => (<li key={o.value}>{o.short}</li>))}</ul>
        <h2 class="board__sub">Results</h2>
        {shown.length === 0 ? (
          <p class="panel__text">Nothing yet. Interview people or test a channel and the results will be kept here.</p>
        ) : (
          <ul class="entries">{shown.map((e, i) => (<Entry key={i} e={e} channels={s.channels} />))}</ul>
        )}
      </main>
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
