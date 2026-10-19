// The three financial statements, written from the books. They are the same money seen three ways: what the company
// earned (income statement), where the cash came from and went (cash flow), and what it owns and owes (balance sheet).
import type { Cents, PublicState } from "./types";

export interface Line {
  readonly label: string;
  readonly cents: Cents;
}

export interface Statements {
  readonly income: {
    readonly revenue: readonly Line[];
    readonly revenueCents: Cents;
    readonly costOfGoodsCents: Cents;
    readonly grossProfitCents: Cents;
    readonly expenses: readonly Line[];
    readonly netIncomeCents: Cents;
  };
  readonly cashFlow: {
    readonly operating: readonly Line[];
    readonly operatingCents: Cents;
    readonly financing: readonly Line[];
    readonly financingCents: Cents;
    readonly netChangeCents: Cents;
    readonly startCashCents: Cents;
    readonly endCashCents: Cents;
  };
  readonly balance: {
    readonly assets: readonly Line[];
    readonly assetsCents: Cents;
    readonly liabilities: readonly Line[];
    readonly liabilitiesCents: Cents;
    readonly equity: readonly Line[];
    readonly equityCents: Cents;
  };
}

const sum = (lines: readonly Line[]): Cents => lines.reduce((a, l) => a + l.cents, 0);
const keep = (lines: readonly Line[]): readonly Line[] => lines.filter((l) => l.cents !== 0);

export function statementsOf(pub: PublicState): Statements {
  const b = pub.books;
  const owed = pub.receivables.reduce((a, r) => a + r.amountCents, 0);
  const revenueCents = pub.ledger.revenueCents + b.testSalesCents;
  const revenue = keep([
    { label: "Customer sales", cents: pub.ledger.revenueCents },
    { label: "Paid tests", cents: b.testSalesCents },
  ]);
  const expenses = keep([
    { label: "Running the company", cents: b.operatingCents },
    { label: "Marketing", cents: b.marketingCents },
    { label: "R&D", cents: b.rndCents },
    { label: "Interviews, tests and builds", cents: b.learningCents },
    { label: "Loan interest", cents: b.interestCents },
  ]);
  const grossProfitCents = revenueCents - b.cogsCents;
  const netIncomeCents = grossProfitCents - sum(expenses);

  const operating = keep([
    { label: "Cash from customers", cents: b.salesCashCents + b.testSalesCents },
    { label: "Goods you sold", cents: -b.cogsCents },
    { label: "Running the company", cents: -b.operatingCents },
    { label: "Marketing", cents: -b.marketingCents },
    { label: "R&D", cents: -b.rndCents },
    { label: "Interviews, tests and builds", cents: -b.learningCents },
    { label: "Loan interest", cents: -b.interestCents },
  ]);
  const financing = keep([
    { label: "Money raised from investors", cents: b.equityRaisedCents },
    { label: "Loan received", cents: b.loanReceivedCents },
    { label: "Loan paid back", cents: -b.principalRepaidCents },
  ]);

  const assets = keep([
    { label: "Cash", cents: pub.cashCents },
    { label: "Owed to you by customers", cents: owed },
  ]);
  const liabilities = keep([{ label: "Loan still to repay", cents: b.loanReceivedCents - b.principalRepaidCents }]);
  const equity = keep([
    { label: "Money you started with", cents: b.startCashCents },
    { label: "Money from investors", cents: b.equityRaisedCents },
    { label: "Profit and loss so far", cents: netIncomeCents },
  ]);

  return {
    income: { revenue, revenueCents, costOfGoodsCents: b.cogsCents, grossProfitCents, expenses, netIncomeCents },
    cashFlow: {
      operating,
      operatingCents: sum(operating),
      financing,
      financingCents: sum(financing),
      netChangeCents: sum(operating) + sum(financing),
      startCashCents: b.startCashCents,
      endCashCents: pub.cashCents,
    },
    balance: { assets, assetsCents: sum(assets), liabilities, liabilitiesCents: sum(liabilities), equity, equityCents: sum(equity) },
  };
}
