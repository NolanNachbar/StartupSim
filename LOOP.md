# Build loop

How Claude Code builds this game item by item without Nolan prompting every step. The shape follows the graph-and-loop pattern: separate jobs with clear inputs and outputs, and a checker that never shares context with the worker.

Run it from a session in this folder with: "Run the build loop on the next roadmap item." For several items in a row: "Run the build loop until you hit a human gate or three items complete."

## The graph

```
Plan  ->  Build  ->  Verify (fresh context, up to 3 checkers in parallel)  ->  Gate  ->  Commit
  ^                                                                              |
  +------------------------------ failure report, max 3 tries ------------------+
```

### Plan node
- Input: ROADMAP.md, GAME-DESIGN.md, DESIGN.md, `git log -10`, `.verify/report.json` if present.
- Job: pick the first unchecked item whose dependencies are done and that is not marked `[HUMAN]`. Write a plan of at most 15 lines: files to touch, tests to write first, the exact checks from the roadmap.
- Output: the plan, shown before building. If the item is too big for one session, split it in ROADMAP.md first and stop to say so.
- Large or unclear items: use plan mode and get Nolan's approval before building.

### Build node
- Write the tests for the roadmap checks first, then the implementation.
- Keep the sim pure and seeded. No `Math.random` in `src/sim/`, no UI imports in `src/sim/`.
- One item per iteration. Do not start the next item in the same pass.
- Run `npm run verify` before handing off to verification.

### Verify node (fresh context)
Verification runs in separate subagents that did not do the building and have not seen the build conversation. Give each only the item text, the diff, and the file paths it needs. Up to three run in parallel because they are read-only:

1. Behavior checker: runs `npm run verify`, reads `.verify/report.json`, and reports each roadmap check as pass or fail with evidence. Passing means the real signal, such as a test result or a measured value, not a claim that the work is done.
2. Design checker: for any UI change, opens the screenshots in `.verify/screens/` and answers the DESIGN.md verify checklist question by question, with a pass or fail and the screenshot name for each.
3. Adversary: tries to break the work. Reads the diff for hidden-truth leaks into the UI, nondeterminism, missing edge cases, and any weakened test or gate. Reports concrete failing cases or "none found" with what it tried.

Each checker returns this shape so the gate can read it:

```
verdict: pass | fail
checks: [{ name, result: pass|fail, evidence }]
blockers: [ ... ]   # only items that must change before commit
notes: [ ... ]      # non-blocking observations
```

### Gate
- Commit only if all checkers pass and `npm run verify` is green.
- On failure, send the blockers back to the Build node. Do not argue with a failing check by editing the check.
- Three failed attempts on one item: stop, write what was tried and why it failed to `docs/stuck.md`, and ask Nolan.

### Commit
- Tick the roadmap item, commit with a message that names the item (for example "M2: interview signal model"), then continue or stop per the stop rules.
- No push without Nolan's say-so until the GitHub remote exists and he has approved auto-push.

## Stop rules

Stop and report when any of these happens:
- The next item is marked `[HUMAN]`.
- Three failed attempts on one item.
- The requested iteration count is done.
- A gate would need to be weakened to pass.
- A new dependency or a change to DESIGN.md or GAME-DESIGN.md seems needed. Ask first.
- Anything that spends money or sends data to an outside service.

## Parallelism

Default is one agent at a time. The only sanctioned fan-out is the three read-only checkers in the Verify node. Do not launch parallel builders, researchers, or explorers unless Nolan asks.

## Models

Use the strongest available model for planning, the Adversary, and anything touching the sim, since subtle errors there corrupt balance. Routine UI and test-writing can run on a cheaper model. Keep each iteration short so context stays clean.

## What the loop cannot judge

Whether the game is fun, whether it feels expensive, whether the first minute hooks a stranger. Those are `[HUMAN]` gates. After a playtest, Nolan describes what felt wrong in plain words and the Plan node turns that into roadmap items.
