import { CATALOG } from "../../sim";
import { back } from "../store";

/** How to play. It explains the rules, the numbers and the map, and asks questions. It never says what to do. */
export function Help() {
  return (
    <>
      <main class="board help">
        <h1 class="board__title" tabIndex={-1}>How to play</h1>

        <section class="help__section">
          <h2>The goal</h2>
          <p>{`Keep your startup alive until it covers its own costs for ${CATALOG.landingStreakWeeks} weeks in a row. That is called default alive. If your cash drops below zero first, the run ends and an accident report names the probable cause.`}</p>
          <p>Every run is a different company in a different city. Nobody tells you which customers are real. You find out by testing.</p>
        </section>

        <section class="help__section">
          <h2>What you are steering</h2>
          <dl class="facts help__facts">
            <dt>Pivots remaining</dt>
            <dd>About how many times you could change direction before the money runs out. It is the number to watch.</dd>
            <dt>Cash</dt>
            <dd>What you can spend. It falls every week.</dd>
            <dt>Week</dt>
            <dd>The clock. A run lasts at most {CATALOG.maxWeeks} weeks.</dd>
          </dl>
        </section>

        <section class="help__section">
          <h2>The map</h2>
          <p>Your company is the building in the middle of the map. Each road leading away from it ends at one group of people who might have the problem you are trying to solve. The van drives down the road of the group you are working on, and drives back and out another road when you pivot.</p>
          <ul class="help__list">
            <li>On each road, a dotted line is something you believe but have not tested.</li>
            <li>A dashed line is weak evidence: some signs, nothing that cost anyone anything.</li>
            <li>A solid green line is verified: real people paid, or did something that cost them.</li>
          </ul>
          <p>The bar under "Your customers" shows five milestones on the way to default alive. It tells you how far along you are. It does not tell you what to do.</p>
        </section>

        <section class="help__section">
          <h2>The five stages</h2>
          <p>Every company moves through five stages: Idea, Validating, getting ready (building, setting up or making it), Launched (ready, no customers yet) and Growing (customers are paying). The tracker names the one you are in. On the action screen, each stage lists what it asks before the next one, and ticks goals off as you do them.</p>
        </section>

        <section class="help__section">
          <h2>How your business makes money</h2>
          <p>Each paying customer pays your price every time they buy: a month for a membership or an app, a visit for a cafe, an order for a shop, a job for a service, a night for a hostel. A regular customer buys a few times a month, so what comes in each week is customers times price times how often they buy. What goes out is the cost of running the company (rent or tools, supplies and your own pay), the goods you sell, card fees, any marketing and R&D, and the pay of anyone you hire. The action screen shows what the next week would do to your cash before you click it, and the Financials screen shows the income statement, cash flow statement and balance sheet.</p>
          <p>Demand has a calendar: gyms fill up in January, shops in November and December, tax help in spring. Reviews move with how good you are and how crowded you get. A competitor may open nearby. Newcomers leave faster than regulars.</p>
        </section>

        <section class="help__section">
          <h2>What you can do</h2>
          <ul class="help__list">
            <li><strong>Interview a customer:</strong> tick three questions to ask one group. What you ask changes what you learn, and the notebook keeps every answer.</li>
            <li><strong>Build a test:</strong> get something in front of people: a landing page, a trial pass, a hand-made batch, a fit-out or a prototype, depending on your business. Opening a place takes months and tens of thousands of dollars.</li>
            <li><strong>Test a channel:</strong> pay a little to reach people through one channel and see who responds. Each kind of business has its own channels.</li>
            <li><strong>Charge for a test:</strong> ask real leads to pay. It needs the first test built.</li>
            <li><strong>Set price:</strong> what you charge each time a customer buys.</li>
            <li><strong>Set marketing:</strong> pay for a steady flow of leads on one channel, aimed at one group.</li>
            <li><strong>Run a promotion:</strong> a time-limited offer that costs something and trades price or customer quality for demand.</li>
            <li><strong>Network:</strong> meet people who will take your call, introduce you and send you leads.</li>
            <li><strong>Hire someone:</strong> one person in a role (build, sell, serve customers). They cost their pay every week, take a month to get up to speed, and might quit. You need a month of the new payroll in the bank. You can let someone go for two weeks of their pay.</li>
            <li><strong>Spend on R&D:</strong> make what you offer better, week after week.</li>
            <li><strong>Raise money:</strong> more cash, a share of the company, and months of your attention.</li>
            <li><strong>Pivot:</strong> switch to a different group of customers.</li>
            <li><strong>Wait a week:</strong> let time pass and see what changes.</li>
          </ul>
        </section>

        <section class="help__section">
          <h2>Reading what you learn</h2>
          <p>After an interview each answer is tagged. A fact is something that really happened. Fluff is a general or hypothetical answer. A compliment is someone being nice. Only some of these are worth building a company on.</p>
        </section>

        <section class="help__section">
          <h2>Questions worth asking yourself</h2>
          <ul class="help__list">
            <li>Who actually has this problem, and how do you know?</li>
            <li>What would make a stranger give you money, not a compliment?</li>
            <li>What does the money you have left buy you, and for how long?</li>
            <li>Is your price helping you or hurting you?</li>
            <li>What would you have to see before you changed direction?</li>
          </ul>
        </section>
      </main>
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
