import { statements, type Line } from "../../sim";
import { money } from "../format";
import { back, run } from "../store";

const figure = (cents: number): string => (cents < 0 ? `-${money(-cents)}` : money(cents));

function Rows({ lines }: { lines: readonly Line[] }) {
  return (
    <>
      {lines.map((l) => (
        <tr key={l.label}>
          <th scope="row">{l.label}</th>
          <td>{figure(l.cents)}</td>
        </tr>
      ))}
    </>
  );
}

function Total({ label, cents }: { label: string; cents: number }) {
  return (
    <tr class="books__total">
      <th scope="row">{label}</th>
      <td>{figure(cents)}</td>
    </tr>
  );
}

/** The company's money in three views: what it earned, where cash came from and went, and what it owns and owes. */
export function Books() {
  const r = run.value;
  if (!r) return null;
  const s = statements(r);
  const { income, cashFlow, balance } = s;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Your financials</h1>
        <p class="board__lede">The same money seen three ways, from week 0 to now.</p>

        <section class="books" aria-labelledby="books-income">
          <h2 class="board__sub" id="books-income">Income statement</h2>
          <p class="panel__text">Did the company make or lose money? Sales minus what it cost to make them, minus everything else it spent.</p>
          <table>
            <tbody>
              <Rows lines={income.revenue} />
              <Total label="Revenue" cents={income.revenueCents} />
              <tr><th scope="row">Cost of goods</th><td>{figure(-income.costOfGoodsCents)}</td></tr>
              <Total label="Gross profit" cents={income.grossProfitCents} />
              <Rows lines={income.expenses.map((l) => ({ label: l.label, cents: -l.cents }))} />
              <Total label="Net income" cents={income.netIncomeCents} />
            </tbody>
          </table>
        </section>

        <section class="books" aria-labelledby="books-cash">
          <h2 class="board__sub" id="books-cash">Cash flow statement</h2>
          <p class="panel__text">Where the cash came from and where it went. A company can show a profit and still run out of cash, so this is the one that decides whether you survive.</p>
          <table>
            <tbody>
              <tr><th scope="row">Cash at the start</th><td>{figure(cashFlow.startCashCents)}</td></tr>
              <Rows lines={cashFlow.operating} />
              <Total label="Cash from running the business" cents={cashFlow.operatingCents} />
              {cashFlow.investing.length > 0 ? (
                <>
                  <Rows lines={cashFlow.investing} />
                  <Total label="Cash spent on things that last" cents={cashFlow.investingCents} />
                </>
              ) : null}
              {cashFlow.financing.length > 0 ? (
                <>
                  <Rows lines={cashFlow.financing} />
                  <Total label="Cash from funding" cents={cashFlow.financingCents} />
                </>
              ) : null}
              <Total label="Cash now" cents={cashFlow.endCashCents} />
            </tbody>
          </table>
        </section>

        <section class="books" aria-labelledby="books-balance">
          <h2 class="board__sub" id="books-balance">Balance sheet</h2>
          <p class="panel__text">What the company owns, what it owes, and what is left for the owners. What it owns always equals what it owes plus the owners' share.</p>
          <table>
            <tbody>
              <Rows lines={balance.assets} />
              <Total label="What you own" cents={balance.assetsCents} />
              {balance.liabilities.length > 0 ? <Rows lines={balance.liabilities} /> : <tr><th scope="row">Debts</th><td>{figure(0)}</td></tr>}
              <Total label="What you owe" cents={balance.liabilitiesCents} />
              <Rows lines={balance.equity} />
              <Total label="Owners' share" cents={balance.equityCents} />
            </tbody>
          </table>
        </section>
      </main>
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
