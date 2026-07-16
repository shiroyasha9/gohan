# gohan dashboard — visual trends artifact

## Problem Statement

I log meals, weight, workouts, and treatments into gohan every day, but the data lives as JSON day-files and text summaries. Numbers in chat answer "how was this week?", but they don't show trajectories: whether my weight trend is actually moving, whether my logged intake is consistent with that trend, where my cheats cluster, or whether my weekends quietly undo my weekdays. I have no way to *see* my data — and no third-party app is allowed to have it.

## Solution

A new read-only skill, `dashboard`, that renders a living HTML dashboard as a private artifact. One stable URL, bookmarkable on the phone, updated in place on each run; the layout never changes, so the user learns where to look. Default window is the last 30 wake-days, with an accepted period argument ("this week", "since June", "since the new chart"). Asking for a "fresh" dashboard mints a new URL instead of updating the existing one.

The dashboard shows stat tiles (trend weight and change rate, estimated TDEE, 7-day average intake vs the envelope, protein g/kg), a calorie chart against the envelope band with an estimated-TDEE reference line, a weight chart with smoothed trend, a protein chart, a logging calendar heatmap, and an insights panel of computed observations. It counts and reports; it never prescribes. Coaching stays with the dietician.

All arithmetic is done by tested pure logic in core, emitted as one JSON blob by a new prebuilt script, and injected into a shipped self-contained HTML template. On claude.ai (remote mode), the same dashboard renders from a capped window with aggregation done in-context against documented formulas.

## User Stories

1. As a gohan user, I want a visual dashboard of my tracked calories, so that trends become charts without authentication or third parties.
2. As a gohan user, I want the dashboard to update the same artifact URL by default, so that one phone bookmark always shows my latest data.
3. As a gohan user, I want to ask for a fresh dashboard and get a new URL, so that I can keep a point-in-time snapshot (e.g. to share with my dietician) without it changing under me.
4. As a gohan user, I want a default 30-day window, so that a bare "show my dashboard" needs no arguments.
5. As a gohan user, I want to name a period ("this week", "since June", "since the new diet chart"), so that I can inspect any stretch of my history.
6. As a gohan user, I want a stable chart layout across runs, so that I build pattern recognition and can read the dashboard at a glance.
7. As a gohan user, I want a trend-weight tile with weekly change rate, so that I judge progress by the smoothed trend, not by noisy daily weigh-ins.
8. As a gohan user, I want an estimated-TDEE tile back-calculated from my intake and weight trend, so that my logging converts into a personalized expenditure estimate.
9. As a gohan user, I want the TDEE tile hidden until enough paired intake-and-weight data exists, so that I am never shown a number the data cannot support.
10. As a gohan user, I want a 7-day average intake tile compared against my diet-chart envelope, so that I see at a glance whether I am living inside the plan.
11. As a gohan user, I want a protein g/kg tile, so that I can judge protein intake relative to my body weight rather than in absolute grams.
12. As a gohan user, I want daily calorie bars drawn against the envelope band (min–max), so that "on plan" reads as bars inside a shaded region, judged against the chart version active on each day.
13. As a gohan user, I want an estimated-TDEE reference line on the calorie chart, so that I can see days where I missed the envelope but stayed in deficit.
14. As a gohan user, I want my intake uncertainty made visible (whiskers or opacity derived from item confidence), so that estimated meals don't masquerade as weighed precision.
15. As a gohan user, I want workout markers on the calorie chart, so that I can compare intake on training days versus rest days.
16. As a gohan user, I want raw weigh-ins as faint dots under a bold smoothed trend line, so that I trust the smoothing because I can see what it smooths.
17. As a gohan user, I want treatment sessions shaded on the weight chart, so that weight-affecting treatments are visible as trend confounders.
18. As a gohan user, I want daily protein bars against the envelope's protein band and a 1.6 g/kg reference line, so that I can compare my dietician's plan against the evidence-based plateau.
19. As a gohan user, I want a calendar heatmap of logging completeness, so that consistency is visible without streak anxiety.
20. As a gohan user, I want cheat meals marked on the heatmap, so that I can see where they cluster in the week.
21. As a gohan user, I want my current streak as a caption rather than a hero number, so that a missed day reads as a gap, not a failure.
22. As a gohan user, I want a calibration observation when my logged energy balance disagrees with my actual weight trend, so that systematic estimation bias surfaces instead of silently misleading me.
23. As a gohan user, I want a weekend-versus-weekday intake observation, so that weekend drift is quantified rather than suspected.
24. As a gohan user, I want a cheat-clustering observation (which slots, which days), so that I know my weak points.
25. As a gohan user, I want a logging-consistency observation framed against the evidence threshold (≥3 days/week), so that consistency is judged by outcomes research, not perfectionism.
26. As a gohan user, I want a protein-gap-fill fact mined from my own food cache ("days you hit protein all included paneer"), so that closing the gap is grounded in foods I actually eat.
27. As a gohan user, I want all insights phrased as computed observations, never imperatives, so that the system counts and reports while coaching stays with my dietician.
28. As a gohan user, I want the dashboard on claude.ai from my phone, so that glancing at trends doesn't require a laptop.
29. As a phone user in remote mode, I want the window capped to what connector reads can afford, so that a dashboard request doesn't burn the whole session reading day-files.
30. As a phone user in remote mode, I want the same layout and formulas as desktop, so that the dashboard means the same thing on both surfaces.
31. As a gohan user, I want the artifact fully self-contained (inline data, inline chart code, no external fetches), so that it renders under the artifact CSP and my data never leaves the page.
32. As a gohan user, I want the artifact to respect light and dark themes, so that it is readable wherever I open it.
33. As a gohan user, I want the dashboard to tolerate sparse data (missed days, missing weigh-ins, no diet chart yet), so that early or patchy logging still produces a useful page.
34. As a gohan user, I want past days judged against the diet-chart version active on that date, so that a chart change mid-window doesn't rewrite history.
35. As a dev, I want all derived numbers computed by pure tested core logic, so that the dashboard shows the same numbers on every run.
36. As a dev, I want the skill to be read-only with no commit protocol, so that rendering a dashboard can never corrupt the data repo.
37. As a dev, I want the HTML template shipped with the plugin, so that layout changes are code-reviewed, versioned, and identical for every user.

## Implementation Decisions

- New pure core function `buildDashboardData(days, charts, foods, profile, window) → DashboardData` is the single seam. It returns the complete blob: per-day series (kcal/macro totals, weight, adherence per meal, confidence mix, workout and treatment markers) plus a pre-computed `derived` block. Everything downstream is presentation.
- Derived block contents and formulas:
  - Trend weight: exponential moving average, smoothing constant 0.1, with linear interpolation across missing days before smoothing; change rate expressed per week from the trend series.
  - Estimated TDEE: energy-balance back-calculation (average intake minus trend-weight delta × 7700 kcal/kg over the period); `null` until at least 14 days of paired intake-and-weight data exist — consumers hide the tile when null.
  - Weekend-vs-weekday average intake delta; cheat clustering by slot and weekday; logging consistency (days logged per week, meals per day); Mifflin-St Jeor TDEE (times 1.4 activity, null when profile fields are missing) as the calibration baseline, with the calibration signal computed as Mifflin minus back-calculated TDEE (null unless both exist — inheriting the 14-day guard); protein-gap-fill fact (foods appearing on at least half the protein-target-hit days, from the personal food cache — prose says "most hit days", never "all").
  - Envelope per active chart version within the window, resolved per day via the existing chart-for-date logic (kcal and protein bands only — that is all the model derives).
- New prebuilt script `dashboard.js` (same pattern as the existing summary script): thin CLI wrapper over the seam, resolves the window against the profile timezone (wake-day assignment is already encoded in day-file dates at logging time), prints the blob as JSON. Bundled and committed like the other plugin scripts; CI drift check applies.
- Shipped HTML template lives in the skill directory: fully self-contained (inline CSS, hand-rolled vanilla-JS SVG charts, no CDN — artifact CSP blocks external hosts), theme-aware for light/dark, with a data placeholder the skill replaces with the blob plus Claude-written insight prose strings. Layout order: stat tiles, calorie chart, weight chart, protein chart, heatmap, insights panel, and a collapsed data-table twin of the charts (the accessibility fallback every chart needs).
- Template authoring follows the design skills available in the dev environment: the dataviz skill (chart form, color formula, mark specs, stat-tile guidance), artifact-design (design-investment calibration, artifact conventions), frontend-design/impeccable (visual quality, hierarchy, spacing), and the polishing-artifacts pass before calling it done. These govern the one-time template build, not runtime behavior.
- Insight prose is the only model-generated content: Claude turns the derived block's numbers into observation sentences ("your data shows…"), never imperatives, never target prescriptions. The prescription tier (eat X to hit Y) is explicitly excluded.
- Artifact lifecycle: on each run the skill looks for the existing gohan dashboard artifact and updates it in place (stable URL, stable favicon, stable title — artifact identity conventions require it); the word "fresh" in the request mints a new artifact instead. Window changes update the same URL; the header label reflects the current window.
- Skill is read-only: no writes to the data repo, no commit protocol — same stance as the summarize skill.
- Skill frontmatter: name `dashboard`; description mentions dashboard, visualize, and trends as triggers, contains no angle brackets (claude.ai importer constraint), and disambiguates against summarize (summarize = numbers in chat, dashboard = visual artifact). The summarize skill's description gains the mirror-image disambiguation.
- Remote mode (claude.ai): no scripts, no core functions. The SKILL.md documents every derived formula so the model can aggregate in-context; window capped at ~14 days (summarize precedent); the template is fetched from the public gohan repo via the GitHub connector and filled the same way. Repo discovery, sha-keeping, and escalation-to-desktop follow the established remote-mode conventions.

## Testing Decisions

- Tests target external behavior at the single seam: feed synthetic day-files, charts, foods, and profile into `buildDashboardData` and assert on the returned blob. No tests reach into helper internals.
- Cases to cover: EMA smoothing with gaps and interpolation; TDEE null-guard below 14 paired days and correct back-calculation above it; envelope resolution across a mid-window chart version change; weekend drift and cheat clustering on constructed fixtures; consistency stats with missed days; protein-gap fact with and without qualifying days; empty and single-day windows.
- Prior art: the existing core test file (bun test) covering the aggregate and chart functions — same style, same runner, extended not replaced.
- The CLI wrapper stays untested (matches the summary script precedent).
- The template has no unit seam. It is verified during development by generating mocked blobs (rich 30-day fixture, sparse/early-logging fixture, TDEE-null fixture) and driving the rendered page with browser automation (agent-browser): load, screenshot, inspect both themes and narrow viewports, fix, repeat until clean.

## Out of Scope

- Any hosted web app (the PRD's deferred TanStack site remains deferred).
- Prescriptive coaching: target adjustments, food plans, "eat X kcal" advice — dietician's job.
- Netting workout burn against intake (standing convention: burn is display-only).
- Carb/fat/fiber targets (the data model derives only kcal and protein envelopes).
- Micros visualization.
- Charting libraries or any external asset; everything is hand-rolled inline.
- Writing anything to the user's data repo.
- Historical artifact management (cleaning up old "fresh" snapshots is the user's business).

## Further Notes

- The confidence-weighted intake rendering (uncertainty whiskers/opacity from per-item confidence) is a gohan-original — no mainstream tracker ships it. It is also the honest counterpart to gohan's source-discipline convention.
- MacroFactor is the closest design reference (energy-balance chart with two reference series, trend-weight-first, change-rate rows); Whoop supplies the progressive-disclosure layout (tiles → charts → detail); the heatmap-over-streaks stance follows the habit-tracking research.
- Evidence anchors used by the insights: protein plateau ~1.6 g/kg/day (Morton 2018 meta-analysis), weekend drift outcomes (JMIR Lose It cohort), logging ≥3 days/week threshold.
- TDEE trustworthiness with sparse weigh-ins is the one soft spot; the 14-day paired-data guard plus trend (not raw) weights is the mitigation. If it still proves jumpy in practice, lengthen the guard window.
