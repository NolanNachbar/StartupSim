# Realism audit: does the game behave like a real business?

Nolan wants the game as realistic as possible: time constraints, hiring, interviewing, R&D, real unit economics. The
other checkers cannot judge that, so this auditor does. It compares the game's numbers and behaviour with how real
businesses of each kind work, and says where the game would mislead a founder.

## What it audits (each item gets pass, weak or fail, with a number or a quote)

1. Unit economics by kind of business (software, service, physical location, physical product): the cost to run, the
   price, what a customer is worth per week, how many customers cover costs. Run `REPORT=1 npx vitest run
   tests/unit/economics.test.ts` and read `.verify/economics.md`. Compare each row with a real benchmark (for example a
   small gym needs roughly 150 to 300 members at $40 to $100; a solo coach needs 5 to 15 clients at $200 to $1,000;
   SaaS churn is 3 to 7 percent a month). Name the benchmark and its source.
2. Time: how long does each thing take (interviews, building, hiring, raising money, R&D paying off, a pivot)? Does the
   player run out of time the way a founder does? Is there any time constraint the founder feels, or only cash?
3. The team: what each role does, whether the salary and the effect are plausible, whether hiring has the right
   tradeoffs (cost now, benefit later, a week to find someone), and whether the limits (two per role, five in all) are
   believable.
4. R&D: does spending on it behave like R&D (slow, cumulative, uncertain), and is it a reasonable choice at every stage?
5. Capacity: do places and services hit a limit when they should, and does hiring raise it?
6. Customer behaviour: conversion against price, churn against product quality, willingness to pay by kind of business,
   marketing reach by channel and by group.
7. Fit: does starting a gym, a cafe, a bakery, a consulting practice or an app play like that business, or like a generic
   one? Play the first 20 weeks of each through the real UI and the sim and say what feels wrong.
8. What is missing: list the real-world factors that matter and are not in the game (lease and deposits, equipment
   purchase, licences, insurance, inventory and cost of goods, seasonality, taxes, payroll taxes, founder pay, refunds),
   ranked by how much each would change a founder's decisions.

## How it must work

- Use real numbers. Cite benchmarks from the web where it can, and say when it is estimating.
- Play the game (Playwright against the dev server, or the sim through vitest) for at least three kinds of business.
- Do not edit any project file. Write scratch files under the scratchpad only.

## Return

verdict: pass | fail (fail if any item is fail or if more than two are weak)
a table: item, verdict, evidence (number, benchmark, quote)
the ten most unrealistic things, ranked by how badly they would mislead a founder, each with a concrete fix
what to add next, ranked
