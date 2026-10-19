import { describe, expect, it } from "vitest";
import { newRun, statements, step, view, type Action, type Run } from "./index";

const plays: Action[][] = [
  [{ type: "wait" }, { type: "interview", segment: 0, questions: ["past-behavior", "past-behavior", "past-behavior"] }, { type: "buildTest", kind: "landing-page" }, { type: "chargeTest", segment: 0, channel: 0 }, { type: "setMarketing", channel: 0, level: 2 }],
  [{ type: "raiseMoney" }, { type: "pickChannel", segment: 1, channel: 1 }, { type: "setPrice", priceCents: 9900 }, { type: "hire", role: "ops" }],
];

function play(run: Run, actions: readonly Action[], weeks: number, check: (r: Run) => void): void {
  let r = run;
  const go = (a: Action): void => {
    const out = step(r, a);
    if (out.ok) r = out.run;
    check(r);
  };
  for (const a of actions) go(a);
  for (let i = 0; i < weeks && view(r).status === "running"; i++) {
    go({ type: "wait" });
    if (view(r).offer) go({ type: "respondOffer", accept: true });
  }
}

describe("the three statements", () => {
  const balances = (r: Run): void => {
    const s = statements(r);
    // Assets equal what is owed plus what the owners have in.
    expect(s.balance.assetsCents).toBe(s.balance.liabilitiesCents + s.balance.equityCents);
    // The cash flow statement ends where the HUD says cash is.
    expect(s.cashFlow.startCashCents + s.cashFlow.netChangeCents).toBe(view(r).cashCents);
    expect(s.cashFlow.endCashCents).toBe(view(r).cashCents);
    // Income: revenue less goods and expenses is net income.
    expect(s.income.grossProfitCents - s.income.expenses.reduce((a, l) => a + l.cents, 0)).toBe(s.income.netIncomeCents);
  };

  it("balance and agree with the cash on screen after every move, with and without a chosen business", () => {
    for (const seed of [1, 2, 3, 7, 11]) {
      for (const choice of [undefined, { model: 2, idea: "a small strength-training gym" }, { model: 0, idea: "a reminder app" }]) {
        for (const actions of plays) play(choice ? newRun(seed, 3, choice) : newRun(seed), actions, 40, balances);
      }
    }
  });

  it("a fresh company has only its starting cash", () => {
    const s = statements(newRun(5, 3, { model: 2, idea: "a small strength-training gym" }));
    expect(s.balance.assets).toEqual([{ label: "Cash", cents: view(newRun(5, 3, { model: 2, idea: "a small strength-training gym" })).cashCents }]);
    expect(s.income.netIncomeCents).toBe(0);
    expect(s.cashFlow.netChangeCents).toBe(0);
  });

  it("a loan shows as cash in, a liability, then paid back with interest as an expense", () => {
    let r = newRun(4, 3, { model: 2, idea: "a small strength-training gym" });
    let borrowed = false;
    for (let i = 0; i < 80 && view(r).status === "running"; i++) {
      const o = step(r, { type: "wait" });
      if (!o.ok) break;
      r = o.run;
      if (view(r).offer) {
        r = (step(r, { type: "respondOffer", accept: true }) as { run: Run }).run;
        borrowed = true;
        expect(statements(r).balance.liabilitiesCents).toBeGreaterThan(0);
      }
      balances(r);
    }
    if (borrowed) expect(statements(r).income.expenses.some((l) => l.label === "Loan interest")).toBe(true);
  });
});
