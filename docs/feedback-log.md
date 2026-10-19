# Feedback log: every complaint becomes a guard

Rule (LOOP.md): when Nolan reports a problem, it is written here first, with the test or checker item that would have
caught it. The fix is not done until that guard exists and passes. This is how the loop stops missing the same kind of
problem twice.

| Date | What Nolan saw | Why the loop missed it | Guard |
|---|---|---|---|
| 2026-10-18 | The city looked copy-pasted, one building repeated | Checkers had no reference image | studio-pass.md section A; neighbour-variety and silhouette tests in `iso.test.ts` |
| 2026-10-18 | Roads ended in grass | Grid was smaller than the screen | `gridFor` tests; ultrawide coverage test |
| 2026-10-18 | Numbered labels on the map meant nothing | No checker played as a newcomer | `docs/specs/player-walkthrough.md` |
| 2026-10-18 | Setup could not describe a gym; examples were the same for every industry | No checker tried a business outside the presets | walkthrough personas; `describeModel` tests |
| 2026-10-18 | The HUD showed $30,000 and week 0 while the overview said week 7 | No test compared the places a number appears | `tests/e2e/consistency.spec.ts`; dev server now reloads fully on edits |
| 2026-10-18 | Stages exist but are not visible; you do not know what to do in the Idea stage | Nothing asked "can a newcomer tell what to do now?" | walkthrough items 1 and 5; stage tracker tests (below) |
| 2026-10-18 | Action lists with no sense of what a test is for; no way to act on a customer group from the map | Same | walkthrough items 1, 2, 4; segment-panel e2e (below) |
| 2026-10-18 | All interview questions seemed to ask the same thing | Question wording was checked, not variety | question-bank variety tests (below) |
| 2026-10-18 | (Realism auditor) Over capacity the game evicted existing customers; quality stopped helping churn once the product was finished | Economics audit checked break-even, not behaviour at the limits | Capacity now stops new sales only; quality trims churn at any progress; test "a full business" in `realism.test.ts` |
| 2026-10-18 | (Realism auditor, open) No cost of goods, no start capex or per-kind start cash, no founder pay or hours budget, flat subscription revenue for every kind, one price ladder, 1 week hires, loan APR about 200 percent | Same | Open: tracked in `docs/user-comments.md` and ROADMAP as realism pass 2 |
| 2026-10-19 | Simulator run: the HUD vans overlapped Cash at two-digit pivots; the overview named a different stage than the tracker | Layout was only measured at default cash; two stage vocabularies | `polish.spec.ts` financials test (no vans at 10+ pivots); one `stageInfo` for every screen |

Guards marked "(below)" are written in the same change as the fix.
