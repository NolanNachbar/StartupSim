# Every comment from Nolan, and where it stands

Status: done (built and tested), partial (built, with a stated gap), open (not built yet).

## Look and feel
| Comment | Status | Notes |
|---|---|---|
| Font is off | done | Plus Jakarta Sans |
| City looks copy-pasted; I want varied buildings, colours, heights like the reference | partial | compounds, tints, themes, height rhythm done; the reference's curved glass, ring campuses and rooftop gardens are not yet built (art pass in progress) |
| City should differ by industry (rural, suburban, urban, downtown) | done | four themes, by industry |
| Roads go nowhere | done | grid sized to the screen |
| Reference photo: lighting, building colours and shapes, not logos | partial | golden-hour lighting is rendering now; shapes pending |
| Cars should drive; they morphed through buildings; the van was in front of a building | done | depth-sorted painter |
| Buildings greyed out away from the centre | done | haze removed |
| Labels meant nothing; one place and choose a direction | done | home plus a road per customer group |
| Plates overlap | done at 390 and up; a few at 360x740 | |

## Setup and flow
| Comment | Status | Notes |
|---|---|---|
| Choose industry, then name, on separate pages | done | four pages |
| Reset progress does not work; restart completely | done | Start over |
| Could not choose industry or name | done | |
| Business type inside an industry; a gym | done | four business models, your own idea |
| Tailor to a ton of options | partial | 14 industries x 4 models; free text only fills the idea words (see next row) |
| If users type their idea, how does it tailor the game? | open | keyword matching to a closer pack, and editable customers and problem, are NOT built yet |
| Examples under each model should match the industry | done | |
| Cash did not change; HUD said $30,000 while the overview said week 7 | done | change chip; dev full reload; consistency test |

## Gameplay
| Comment | Status | Notes |
|---|---|---|
| Clear path / stages visible | done | stage bar on the map and a stage guide on the action screen |
| Idea phase: what do I do? | done | stage guide with what each option is for |
| What is a test for; do I target a client? | partial | forms explain; the group panel points actions at a group |
| Click a group on the map and see options | done | interview, test, charge, aim marketing, switch |
| Set the target for marketing | done | target group |
| All interview questions are the same | done | 12 distinct questions, answers differ by topic, repeats tell you less |
| Overview after Wait a week | done | weekly overview |
| Launch is unclear | done | stage names per business and a Launched card |
| How you make money; what marketing and hiring mean | done | explained where you act and in Help |
| Realistic: time, hiring people, interviewing, R&D | done | team roles, R&D, capacity, per-kind start cash, cost of goods, per-kind price ladders, hiring takes 3 weeks and costs payroll tax; time is paid in weeks (interview 1, build 1 to 3, hire 3); no separate founder-hours meter, by design |
| Hiring options | done | three roles, two of each |

## Process
| Comment | Status | Notes |
|---|---|---|
| The loop and harness should catch these | done | player walkthrough checker, consistency test, feedback log |
| Make an auditor that critiques realism | done | `docs/specs/realism-audit.md`; first run fixed capacity eviction and churn, rest in ROADMAP pass 2 |
| Stage should be clearly shown | done | numbered five-step tracker with the stage named large, on the map and action screens; overview and panel use the same stage names |
| Test in the simulator | done | played a gym through the real UI on a phone viewport; found and fixed the HUD van overlap and stale overview stage text |
| Show cash flow in/out, cash flow statement, balance sheet | done | Financials screen (income statement, cash flow, balance sheet) from the Menu and the weekly overview; balance identity is a property test |

## Round 2 (2026-10-21 to 2026-10-22)
| Comment | Status | Notes |
|---|---|---|
| Cars phase through things | done | one speed, block slots that keep crossing streets apart, empty roundabout streets; collision tests in `iso.test.ts` |
| UI looks vibe coded: font, bubbles, van icons | proposal made | preview at `scratchpad/design/preview.html` (signboard plates, runway-light pivot gauge, Lilita One and Atkinson Hyperlegible Next); waiting on Nolan's approval before changing DESIGN.md and the UI |
| Hard to tell what to do next; unclear how to leave Idea or Validating | done | stage goals with ticks and a Do it button; compact next goal on the map |
| Build then "nothing built to sell" | done | Charge is locked with the reason and a Build first button; Build form marks what is built |
| Status of the startup unclear | done | status card on the Actions screen: cash, in, out, how long cash lasts, product, customers, team, season, reviews |
| Cannot see old interview results | done | notebook screen (every interview and test), reachable from Actions, groups, the interview form and results |
| Interview: mark asked questions, follow-ups | done | asked questions marked with what they said; follow-up suggestions for repeats |
| Interview questions as a checklist | done | tick three; others disable at three |
| Difficulty slider; adjustable start money | done | setup step 4, saved and carried in challenge links |
| Networking | done | Network action: coffee, meetup, conference; warm interviews, referral leads, faster hires and raises |
| Promotions for a gym | done | per-kind promotions with costs, lifts, discounts, deal churn, cooldown |
| Marketing options real and dynamic | partial | six channels per kind, seasonality, reputation, a rival; channel saturation, per-visit billing, capex and wages still to do (realism-pass-3.md) |
| Full audit with Haiku agents | done | sixteen audits; synthesis in `docs/specs/realism-pass-3.md` |
