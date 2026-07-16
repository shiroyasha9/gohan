---
name: dashboard
description: Render a visual HTML dashboard of calorie, weight, and adherence trends as an artifact. Use for "dashboard", "visualize my calories", "show my trends", or "how does my month look". For numbers in chat instead of a visual, use summarize.
---

Read-only: no writes, no commit. Renders `${CLAUDE_PLUGIN_ROOT}/skills/dashboard/template.html` with real data and publishes it as an artifact.

## Steps

1. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/dashboard.js --from <date> --to <date>` (defaults to the last 30 days). Resolve a named period ("this week", "since June", "since the new chart") to explicit dates first.
2. Write insight prose: 2-5 short sentences derived ONLY from the blob's `derived` block, each an observation ("your data shows..."), never an instruction. Cover whichever apply:
   - Calibration: if `calibrationBiasKcalPerDay` exceeds ~300 in magnitude, say the food estimates likely carry systematic bias (positive bias = logged intake reads lower than the weight trend supports) and that weighing frequent foods via `resolve-food` corrects the cache entries behind it.
   - Energy balance: `tdee` vs recent intake — implied surplus/deficit per day, converted to kg/week at 7700 kcal/kg. Arithmetic only; target changes are the dietician's call.
   - Weekend drift (`weekend.deltaKcal`), cheat clustering (`cheats.bySlot`/`byWeekday`), logging consistency (`consistency` vs the 3-days-per-week research threshold), and the protein-gap fact (`proteinGap.topFoods` — "most days you hit protein included X"; the foods appear on at least half the hit days, so never claim "all").
   - Skip any insight whose inputs are null. Never prescribe ("eat X kcal"), never moralize.
3. Read the template, replace `__GOHAN_DATA__` with the script's JSON output and `__GOHAN_INSIGHTS__` with a JSON array of the insight strings. Write the result to a scratch file.
4. Publish with the Artifact tool, favicon 🍚, title "gohan dashboard":
   - Default: update the existing gohan dashboard artifact in place — same file path within a session; across sessions list artifacts, find "gohan dashboard", and pass its `url`. One stable link.
   - If the user asks for a "fresh" or "new" dashboard, publish to a new file path instead (new URL) and leave the existing one untouched.

Done when the user has the artifact link and the window it covers.

## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector. Still read-only:

- **Repo**: `gohan-data` by convention; find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- **No dashboard script here**: cap the window at 14 days (for longer ranges do the most recent 14 and point the user to a desktop session). List `data/days/YYYY/MM/` for the range, read the day-files that exist, plus `data/profile.json`, `data/foods.json`, and the latest `data/diet-chart/*.json`, and build the data blob by hand to the shape in the template's `__GOHAN_DATA__` consumer (see `plugin/skills/dashboard/template.html` in the public `shiroyasha9/gohan` repo). Formulas:
  - Per day: `logged`, macro `totals` summed over items, `kcalByConfidence` sums, `meals`, per-meal `adherence` counts plus `cheats`/`cheatSlots`, `weightKg`, `treatment`, `workoutMin`. Pad every date in the window.
  - Envelope segments: active chart = latest `effectiveFrom` on or before each date; kcal and protein min/max summed per slot as in import-diet-chart's remote mode.
  - Weight trend: linearly interpolate weigh-ins to daily values, then EMA with alpha 0.1 (`trend = prev + 0.1 * (weight - prev)`), rounded to 2 decimals. Change rate = (last trend - first trend) / span days * 7.
  - TDEE: null unless >= 14 logged days between first and last weigh-in; else `avg intake - (trend delta kg * 7700) / span days`, rounded.
  - Mifflin: `10*kg + 6.25*heightCm - 5*age + (male ? 5 : -161)` times 1.4; null if height, birth year, or gender missing. `calibrationBiasKcalPerDay` = mifflin minus tdee, null unless both exist.
  - `avgKcal7d` (logged days among last 7 dates), `proteinPerKgAvg` (avg protein / latest trend or weigh-in kg, 2 decimals), `weekend` split (Sat/Sun vs rest, null unless both present), `cheats` clusters, `consistency` (days logged, pct, meals/day, current + longest streak), `proteinGap` (envelope protein min as target; foods appearing on at least half the hit days, top 3).
- **Template**: fetch `plugin/skills/dashboard/template.html` from the public `shiroyasha9/gohan` repo via the connector, inject the two tokens, publish as an artifact exactly as in step 4.
- Insight prose rules from step 2 apply unchanged.
