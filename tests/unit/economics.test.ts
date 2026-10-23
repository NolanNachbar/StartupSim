// The economics audit. It checks that the numbers behind each kind of business are realistic enough to teach something
// true: what a business costs to run, what a customer is worth, how many customers it must hold to break even, and
// whether a hire pays for itself. Run with REPORT=1 to write the table to .verify/economics.md for a human to read.
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUSINESS_MODELS, newRun, view } from "../../src/sim";
import { CAPACITY_BY_MODEL, BURN_BY_MODEL, COGS_PCT_BY_MODEL, HIRE_LOADED_WEEKLY_CENTS, PRICE_LADDER_BY_MODEL, START_CASH_BY_MODEL, START_PRICE_BY_MODEL, ROLES, type Role } from "../../src/sim/realism";

const weeklyPerCustomer = (priceCents: number): number => Math.floor((priceCents * 12) / 52);

describe("the economics of each kind of business", () => {
  const rows = BUSINESS_MODELS.map((m, i) => {
    const id = m.id;
    const price = START_PRICE_BY_MODEL[id];
    const burn = BURN_BY_MODEL[id];
    // What is left of a customer's weekly payment after cost of goods.
    const perCustomer = Math.floor((weeklyPerCustomer(price) * (100 - COGS_PCT_BY_MODEL[id])) / 100);
    const breakEven = Math.ceil(burn / perCustomer);
    const cap = CAPACITY_BY_MODEL[id];
    const withHire = Math.ceil((burn + HIRE_LOADED_WEEKLY_CENTS) / perCustomer);
    return { i, id, name: m.name, price, burn, perCustomer, breakEven, capBase: cap.base, capOne: cap.base + cap.perOps, withHire, runwayWeeks: Math.floor(START_CASH_BY_MODEL[id] / burn) };
  });

  it("can reach break-even before it hits its customer limit, at the price it starts at", () => {
    for (const r of rows) expect(r.breakEven, `${r.name}: customers needed to cover costs, against the ${r.capBase} it can serve`).toBeLessThanOrEqual(r.capBase);
  });

  it("is not trivially easy: break-even needs a real number of customers, and cash lasts a plausible time", () => {
    for (const r of rows) {
      expect(r.breakEven, `${r.name}: it should take more than a couple of customers`).toBeGreaterThanOrEqual(3);
      expect(r.runwayWeeks, `${r.name}: the starting cash lasts between 3 and 12 months at cost, with no income`).toBeGreaterThanOrEqual(12);
      expect(r.runwayWeeks).toBeLessThanOrEqual(52);
    }
  });

  it("a place costs the most to run and a service the least, as in life", () => {
    const by = Object.fromEntries(rows.map((r) => [r.id, r.burn]));
    expect(by.location).toBeGreaterThan(by.software!);
    expect(by.location).toBeGreaterThan(by.product!);
    expect(by.service).toBeLessThan(by.software!);
  });

  it("a service charges the most per customer and a software product the least per customer's cost", () => {
    const by = Object.fromEntries(rows.map((r) => [r.id, r.price]));
    expect(by.service).toBeGreaterThan(by.location!);
    expect(by.service).toBeGreaterThan(by.software!);
  });

  it("only a place or a service is limited by how many people it can serve", () => {
    expect(CAPACITY_BY_MODEL.software.base).toBeGreaterThanOrEqual(100_000);
    expect(CAPACITY_BY_MODEL.service.base).toBeLessThan(CAPACITY_BY_MODEL.location.base);
    expect(CAPACITY_BY_MODEL.location.base).toBeLessThan(CAPACITY_BY_MODEL.product.base);
  });

  it("a hire in a limited business must be able to earn its salary: it raises the limit past the extra break-even", () => {
    for (const r of rows) {
      if (r.capBase >= 100_000) continue;
      expect(r.withHire, `${r.name}: customers needed to cover costs after one hire, against the ${r.capOne} it could then serve`).toBeLessThanOrEqual(r.capOne);
    }
  });

  it("physical kinds pay for goods, a place needs the most money to open, and each kind sells at its own prices", () => {
    expect(COGS_PCT_BY_MODEL.location).toBeGreaterThanOrEqual(25);
    expect(COGS_PCT_BY_MODEL.product).toBeGreaterThanOrEqual(25);
    expect(COGS_PCT_BY_MODEL.service).toBe(0);
    expect(START_CASH_BY_MODEL.location).toBeGreaterThan(START_CASH_BY_MODEL.product);
    expect(START_CASH_BY_MODEL.product).toBeGreaterThan(START_CASH_BY_MODEL.software);
    for (const m of BUSINESS_MODELS) expect(PRICE_LADDER_BY_MODEL[m.id], m.name).toContain(START_PRICE_BY_MODEL[m.id]);
    expect(Math.min(...PRICE_LADDER_BY_MODEL.service)).toBeGreaterThanOrEqual(9900);
  });

  it("every role exists, and a new company starts with nobody on the team and no R&D", () => {
    expect(ROLES).toEqual(["builder", "seller", "ops"] as Role[]);
    const s = view(newRun(3, 3, { model: 2, idea: "a small strength-training gym" }));
    expect(s.team).toEqual({ builder: 0, seller: 0, ops: 0 });
    expect(s.rndLevel).toBe(0);
    expect(Math.abs(s.priceCents - START_PRICE_BY_MODEL.location)).toBeLessThan(500); // the menu price nearest a $99 membership
    expect(s.priceLadderCents).toContain(s.priceCents);
  });

  it.runIf(process.env.REPORT === "1")("writes the economics table", () => {
    const lines = ["# Economics by kind of business", "", "| Kind | Start price a month | Costs a week | Earns per customer a week after cost of goods | Break-even customers | Can serve | With one hire: need / can serve | Weeks the starting cash lasts |", "|---|---|---|---|---|---|---|---|"];
    for (const r of rows) lines.push(`| ${r.name} | $${r.price / 100} | $${r.burn / 100} | $${(r.perCustomer / 100).toFixed(2)} | ${r.breakEven} | ${r.capBase >= 100_000 ? "no limit" : r.capBase} | ${r.capBase >= 100_000 ? "n/a" : `${r.withHire} / ${r.capOne}`} | ${r.runwayWeeks} |`);
    mkdirSync(".verify", { recursive: true });
    writeFileSync(".verify/economics.md", lines.join("\n") + "\n");
  });
});
