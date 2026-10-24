import type { Business, Evidence, PublicState } from "../../sim";
import { buildCopy, roleInfo, type Role } from "../business";
import { STAGE_COUNT, stageInfo } from "../stage";
import { money, priceWords, questionLabel, tagExplain, tagLabel } from "../format";
import { Panel } from "../panel";
import { askedWording, currentBusiness, go, last, openBooks, openNotebook } from "../store";

function Interview({ e, asked }: { e: Extract<Evidence, { kind: "interview" }>; asked: string | undefined }) {
  const who = e.customer === "friend" ? "A friend of yours" : e.customer === "stranger" ? "A stranger" : "Nobody answered";
  return (
    <li class={`entry${e.tag ? ` entry--${e.tag}` : ""}`}>
      <p class="entry__head">{e.customer === "none" ? `${who} when you asked: ${asked ?? questionLabel(e.question)}` : `${who}, asked: ${asked ?? questionLabel(e.question)}`}</p>
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
    case "network": return "You went out and met people.";
    case "setPromotion": return "You changed your promotion.";
    case "fire": return "You let someone go.";
    case "setRnd": return "You changed your R&D spending.";
    case "pivot": return "You pivoted to a new customer group.";
    default: return "Time passed.";
  }
}

const signed = (n: number): string => `${n > 0 ? "+" : ""}${n}`;

export function Result() {
  const l = last.value;
  if (!l) return null;
  const { before, after, action, step: d } = l;
  // What moved the cash, from the books: exact even when the move took several weeks (a fit-out, a search for an investor).
  const weeks = Math.max(0, after.week - before.week);
  const diff = (k: keyof PublicState["books"]): number => after.books[k] - before.books[k];
  const fromCustomers = diff("salesCashCents");
  const fromTests = diff("testSalesCents");
  const funding = diff("equityRaisedCents") + diff("loanReceivedCents");
  const outs = [
    { label: "running the company", cents: diff("operatingCents") },
    { label: "marketing", cents: diff("marketingCents") },
    { label: "R&D", cents: diff("rndCents") },
    { label: "goods you sold", cents: diff("cogsCents") },
    { label: "interviews, tests and builds", cents: diff("learningCents") },
    { label: "a fit-out or equipment", cents: diff("capexCents") },
    { label: "the loan", cents: diff("principalRepaidCents") + diff("interestCents") },
  ].filter((o) => o.cents > 0);
  const moneyOut = outs.reduce((sum, o) => sum + o.cents, 0);
  const moneyIn = fromCustomers + fromTests;
  const over = weeks > 1 ? ` over ${weeks} weeks` : "";
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
        <h2 class="board__sub">{weeks > 1 ? "These weeks in numbers" : "This week in numbers"}</h2>
        <dl class="overview">
          <dt>Cash</dt><dd>{`${money(before.cashCents)} to ${money(after.cashCents)} (${d.cashDeltaCents >= 0 ? "+" : "-"}${money(Math.abs(d.cashDeltaCents))})`}</dd>
          <dt>Money in</dt><dd>{`${money(moneyIn)}${over}${fromTests > 0 ? ` (${money(fromCustomers)} from customers, ${money(fromTests)} from a paid test)` : ""}. You now earn ${money(after.weeklyRevenueCents)} a week from ${after.payingCustomers} paying ${after.payingCustomers === 1 ? "customer" : "customers"} (${signed(after.payingCustomers - before.payingCustomers)}).`}</dd>
          {funding > 0 ? (<><dt>Money raised</dt><dd>{`${money(funding)} came in from investors or a lender.`}</dd></>) : null}
          <dt>Money out</dt><dd>{`${money(moneyOut)}${over}${outs.length > 0 ? ` (${outs.map((o) => `${money(o.cents)} on ${o.label}`).join(", ")})` : ""}.`}</dd>
          <dt>Stage</dt><dd>{`${stageNow.index + 1} of ${STAGE_COUNT}: ${stageNow.name}. ${stageNow.short}`}</dd>
          <dt>Pivots left</dt><dd>{`${after.pivotsRemaining}: your cash buys that many changes of direction at ${money(after.pivotCostCents)} each, so spending cash lowers it`}</dd>
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
