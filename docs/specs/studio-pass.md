# Studio-quality pass: the bar

Goal: a stranger opening Runway on a phone should believe a studio shipped it. Nolan's words: "professional and like an actual studio released it". The loop (LOOP.md) runs until the three checkers all return `pass` with no blockers. The checkers are hostile by design: anything short of excellent is a blocker, not a note.

## Reference for the look

Nolan's reference image is the HBO Silicon Valley title-sequence city (a local file kept outside the repo, so nothing in it is copied; the build loop passes its location to the checkers). What it has that we must match in spirit:

- Building shapes vary a great deal: slabs, L-wings, courtyards and rings, podiums with towers, stepped terraces, big flat roofs with solar arrays, curved glass. Almost no two neighbouring buildings are the same shape or height.
- Muted, believable materials: warm sand, light stone, concrete grey, white, glass blue. Colour is an accent (signs, a few cars, a red logo), never a whole building painted pink or purple.
- Dense dark-green trees, tree-lined avenues, parks and ring roads, parking lots full of cars, rooftop detail.
- Everything connects: roads join up and run off the edge of the picture, they never stop in grass.

## What the checkers grade (each item pass or fail, with evidence)

### A. City art (check at phone 390x844 and desktop 1280x800, for all four themes: rural, suburban, urban, downtown)
1. No road ends inside the picture. Every road runs to a junction or off the screen edge.
2. No two touching buildings share the same model and view and tint. No row of three or more near-identical buildings. At least 12 clearly different silhouettes are visible in a typical view of an urban or downtown map.
3. Heights vary along every street; there is a skyline with a rhythm, not a flat wall of equal boxes.
4. Compound buildings (courtyards, podiums, L-wings, solar halls, yards, terraces, tower clusters) are visible and look like designed places.
5. Palette: no saturated pink, purple, orange or neon buildings. Walls are sand, stone, concrete, cream, white or glass. Foliage is natural green, not mint or teal. Lawns are olive-green, not lime.
6. The four themes are recognisable at a glance and different from each other: rural (fields, woods, farms), suburban (houses, yards), urban (mixed mid-rise), downtown (towers, dense core).
7. No sprite is cut off at a hard edge, floating above the ground, or overlapping a road. Cars face along their road. No black texture glitches.
8. The route and the customer-group landmarks are the first thing the eye finds. Name plates never overlap each other, are never hidden under a tower, and never run off the screen.
9. Shadows and lighting are consistent and the colours are the same across the whole map (no washed-out distance); nothing looks pasted on.

### B. Interface
1. One typeface, consistent weights and sizes. No orphaned words, no clipped or overflowing text at 390 px, at 200 percent text size, or on desktop.
2. Spacing follows the 4 px scale; alignment is exact; nothing touches a screen edge unintentionally; corners use the token radii.
3. Every screen (front door, setup, week, actions, forms, result, report, help, menu, notes) looks finished: hierarchy is obvious, one primary action, no dead space that looks like a bug, no raw or placeholder text.
4. Contrast meets WCAG AA; tap targets are at least 44 px; focus is always visible; keyboard order follows reading order.
5. The accident report is the one loud moment and works; the crash scene shows the van, debris, smoke and flames.

### C. Flow and clarity
1. First run: a new player cannot miss naming the company and choosing an industry, even if a run is saved. The front door states what is saved.
2. Setup is understandable in five seconds without scrolling on a 390x844 phone: name, six industries, a description of the chosen one, one obvious button.
3. "Start over" really wipes everything (run, company, notes, history, callouts, seen causes), asks for confirmation first, keeps settings, and cannot be triggered by accident.
4. Help explains the rules and never says which move to make. Every screen has a visible way back.
5. Copy is plain, consistent (run, company, pivots) and has no em dashes or emoji.

### D. Engineering
1. `npm run verify` is green on all gates. No test, lint rule, budget or accessibility check was weakened.
2. No console errors or warnings in a full play-through. First load stays under the budget in DESIGN.md.
3. Sim determinism and golden fixtures intact; the UI never reads hidden truth.
4. Tests exist for every behaviour added (themes, compounds, tints, start over).

### E. Not graded by the loop (Nolan's calls, marked `[HUMAN]`)
Whether it is fun, whether the first minute hooks a stranger, final taste.

## How the checkers must behave

- Assume the work is flawed and find the flaws. A pass needs a reason for each item, citing a screenshot or a measured value, not an absence of complaints.
- Take their own screenshots (Playwright) for every theme and viewport, and look at them closely. Do not trust earlier screenshots.
- Return at least five concrete observations even on a pass. Any single failed item in sections A to D is a blocker.
- Do not edit files. Read-only.
