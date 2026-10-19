// The side panel: business readout, the log, and the selected hypothesis.
import { CATALOG } from "../sim";
import { hypothesisLabel, money } from "./format";
import { Section } from "./parts";
import { selected, sheetOpen, state } from "./store";

export function Panel({ idle }: { idle?: boolean }) {
  const s = state.value;
  if (!s) {
    return (
      <aside class="panel panel--board" aria-label="Log and details">
        <Section title="Log" id="log-h">
          <p class="panel__text">No tests yet.</p>
        </Section>
        <Section title="Selected" id="sel-h">
          <p class="panel__text">Tap a customer group to see what you know about it.</p>
        </Section>
      </aside>
    );
  }
  const sel = selected.value;
  const h = sel === null ? null : s.hypotheses[sel];
  const log = s.log.slice(-8).reverse();
  return (
    <aside class={`${idle ? "panel panel--board" : "panel"}${sheetOpen.value ? " panel--open" : ""}`} aria-label="Log and details">
      <Section title="Business" id="biz-h">
        <dl class="facts">
          <dt>Price</dt><dd>{`${money(s.priceCents)} a month`}</dd>
          <dt>Paying customers</dt><dd>{String(s.payingCustomers)}</dd>
          <dt>Revenue</dt><dd>{`${money(s.weeklyRevenueCents)} a week`}</dd>
          <dt>Costs</dt><dd>{`${money(s.weeklyBurnCents + (CATALOG.budgetLevelsCents[s.marketing.level] ?? 0))} a week`}</dd>
          <dt>Product</dt><dd>{`${s.productProgressPct} percent built`}</dd>
        </dl>
      </Section>
      <Section title="Log" id="log-h">
        {log.length === 0 ? (
          <p class="panel__text">No tests yet.</p>
        ) : (
          <ul class="log">
            {log.map((e, i) => (
              <li key={i}>{`Week ${e.week}: ${e.text}`}</li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Selected" id="sel-h">
        {h ? (
          <dl class="facts">
            <dt>Group</dt><dd>{s.segmentNames[h.segment] ?? ""}</dd>
            <dt>Evidence</dt><dd>{hypothesisLabel(h.state)}</dd>
            <dt>Interviews</dt><dd>{String(h.interviews)}</dd>
            <dt>Interested leads</dt><dd>{String(h.interested)}</dd>
            <dt>Payments</dt><dd>{String(h.payments)}</dd>
            {h.failedPaidTests > 0 ? (<><dt>Tests with no payment</dt><dd>{String(h.failedPaidTests)}</dd></>) : null}
          </dl>
        ) : (
          <p class="panel__text">Tap a customer group to see what you know about it.</p>
        )}
      </Section>
    </aside>
  );
}
