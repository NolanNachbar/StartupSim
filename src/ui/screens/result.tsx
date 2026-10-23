import type { Business, Evidence, PublicState } from "../../sim";
import { buildCopy, roleInfo, type Role } from "../business";
import { CATALOG } from "../../sim";
import { STAGE_COUNT, stageInfo } from "../stage";
import { money, priceWords, questionLabel, tagExplain, tagLabel } from "../format";
import { Panel } from "../panel";
import { askedWording, currentBusiness, go, last, openBooks, openNotebook } from "../store";

function Interview({ e, asked }: { e: Extract<Evidence, { kind: "interview" }>; asked: string | undefined }) {
  const who = e.customer === "friend" ? "A friend of yours" : e.customer === "stranger" ? "A stranger" : "No one";
  return (
    <li class={`entry${e.tag ? ` entry--${e.tag}` : ""}`}>
      <p class="entry__head">{`${who}, asked: ${asked ?? questionLabel(e.question)}`}</p>
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
        <p class="entry__head">{`Paid test: ${after.channels[e.channel]?.name ?? "channel"}, ${priceWords(after, e.priceCents)}`}</p>
        <p class="entry__quote">
          {e.payments === 0 ? "No one paid. That is information." : `${e.payments} of ${e.leads} paid.`}
        </p>
        <p class="entry__debrief">{e.payments === 0 ? "Zero payments from a real test says more than any compliment." : "Payments are the strongest evidence there is."}</p>
      </li>
    );
  }
  return null;
}

/** What the player just did, in a sentence. */
function didWhat(action: { type: string; role?: string; kind?: string }, b: Business | null): string {
  switch (action.type) {
    case "wait": return "You waited a week.";
    case "interview": return "You held a round of customer interviews.";
    case "buildTest": return action.kind ? `You built: ${buildCopy(b)[action.kind as keyof ReturnType<typeof buildCopy>].label}.` : "You worked on getting ready.";
    case "pickChannel": return "You tested a channel.";
    case "chargeTest": return "You ran a paid test.";
    case "setPrice": return "You changed your price.";
    case "setMarketing": return "You changed your marketing.";
    case "hire": return action.role ? `You hired someone for the ${roleInfo(b, action.role as Role).label.toLowerCase()} role.` : "You hired a contractor.";
    case "raiseMoney": return "You raised money.";
    case "pivot": return "You pivoted to a new customer group.";
    default: return "Time passed.";
  }
}

const signed = (n: number): string => `${n > 0 ? "+" : ""}${n}`;

export function Result() {
  const l = last.value;
  if (!l) return null;
  const { before, after, action, step: d } = l;
  const marketing = after.marketing.channel === null ? 0 : (CATALOG.budgetLevelsCents[after.marketing.level] ?? 0);
  const goods = Math.floor((after.weeklyRevenueCents * after.cogsPct) / 100);
  const rnd = CATALOG.rndLevelsCents[after.rndLevel] ?? 0;
  const repay = before.loan ? before.loan.weeklyRepaymentCents : 0;
  const weeklyCosts = after.weeklyBurnCents + marketing + goods + rnd + repay;
  const b = currentBusiness();
  const stageNow = stageInfo(after, b);
  const launched = before.productProgressPct < 100 && after.productProgressPct >= 100;
  const interviews = d.evidence.filter((e) => e.kind === "interview");
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>{`Week ${after.week}`}</h1>
        <p class="board__lede">
          {didWhat(action, b)}
          {d.weeksPassed > 1 ? ` ${d.weeksPassed} weeks passed.` : ""}
        </p>
        {launched ? (
          <div class="launch" role="status">
            <p class="launch__title">{stageNow.name}</p>
            <p class="launch__text">{`${stageNow.what} Fewer customers leave now than while it was half ready.`}</p>
          </div>
        ) : null}
        <h2 class="board__sub">This week in numbers</h2>
        <dl class="overview">
          <dt>Cash</dt><dd>{`${money(before.cashCents)} to ${money(after.cashCents)} (${d.cashDeltaCents >= 0 ? "+" : "-"}${money(Math.abs(d.cashDeltaCents))})`}</dd>
          <dt>Money in</dt><dd>{`${money(after.weeklyRevenueCents)} a week from ${after.payingCustomers} paying ${after.payingCustomers === 1 ? "customer" : "customers"} (${signed(after.payingCustomers - before.payingCustomers)})`}</dd>
          <dt>Money out</dt><dd>{`${money(weeklyCosts)} a week (${money(after.weeklyBurnCents)} to run the company${marketing > 0 ? `, ${money(marketing)} on marketing` : ""}${rnd > 0 ? `, ${money(rnd)} on R&D` : ""}${goods > 0 ? `, ${money(goods)} for the goods you sold` : ""}${repay > 0 ? `, ${money(repay)} repaying the loan` : ""})`}</dd>
          <dt>Stage</dt><dd>{`${stageNow.index + 1} of ${STAGE_COUNT}: ${stageNow.name}. ${stageNow.short}`}</dd>
          <dt>Pivots left</dt><dd>{String(after.pivotsRemaining)}</dd>
        </dl>
        {d.evidence.length > 0 ? (
          <>
            <h2 class="board__sub">What you learned</h2>
            <ol class="entries">
              {d.evidence.map((e, i) => (e.kind === "interview" ? <Interview key={i} e={e} asked={askedWording.value[interviews.indexOf(e)]} /> : <Other key={i} e={e} after={after} />))}
            </ol>
          </>
        ) : null}
        {d.newLog.length > 0 ? (
          <>
            <h2 class="board__sub">What happened</h2>
            <ul class="log">
              {d.newLog.map((e, i) => (<li key={i}>{`Week ${e.week}: ${e.text}`}</li>))}
            </ul>
          </>
        ) : null}
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => go({ name: "week" })}>Continue</button>
        <button type="button" class="button" onClick={() => openNotebook()}>What you have learned</button>
        <button type="button" class="button" onClick={openBooks}>Financials</button>
      </footer>
    </>
  );
}
