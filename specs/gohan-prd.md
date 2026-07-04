# PRD: gohan, a Personal Claude Code-Driven Calorie Tracker

Status: ready-for-agent
Date: 2026-07-04

## Glossary

- **Day-file**: one JSON file per calendar day holding meals, body metrics, and activity.
- **Wake-day convention**: entries logged before 04:00 belong to the previous date.
- **Food cache** (`foods.json`): personal dictionary of resolved foods, per-100g nutrients + source.
- **Measures** (`measures.json`): calibration table mapping household units (katori, roti, scoop) to grams, built up by weighing.
- **Resolution trail**: the full record per logged item: raw input, resolved grams, basis, source, confidence.
- **Diet chart**: the dietician-provided plan; per meal slot, 2-3 allowed options. Versioned with effective-from dates.
- **Envelope**: the daily kcal/protein range implied by resolving the diet chart's options: derived targets, never invented ones.
- **Adherence label**: per-meal classification `on-plan | variation | cheat`. Cheat is a label on a real slot, not a meal category. Off-chart items log under an `extra` slot.

## Problem Statement

The user needs a simple, reliable calorie tracker. Existing apps fail on three fronts: they paywall essential features (photo logging, macros, export), their Indian food data is inaccurate or crowd-sourced garbage (the same roti ranging 70-150 kcal across duplicate entries), and the user's data is held hostage by third parties. The user already has a dietician, gym routine, and an ongoing body treatment. They need counting, not coaching. They eat Indian home-cooked and restaurant food that no mainstream database resolves accurately.

## Solution

A git-versioned repository where Claude Code is the tracking interface. The user logs meals conversationally (text, photos, or shorthand) from laptop or phone; Claude resolves nutrition against grounded Indian data sources (INDB primary, USDA/IFCT fallback), maintains a personal food cache so repeated meals resolve identically, tracks adherence against the dietician's actual diet chart, and records weight as ground truth for calibrating estimation bias. All data is plain JSON in the repo: portable, diffable, owned. Workflows are packaged as repo-level Claude Code skills; CLAUDE.md is a lean orchestrator describing the repo, formats, and conventions.

## User Stories

1. As the user, I want to log a meal in natural language ("1 katori dal, 2 rotis"), so that tracking takes seconds, not a database search.
2. As the user, I want to log a meal by pasting a photo, so that I can capture what I ate without describing it.
3. As the user, I want photo parses always confirmed with me before writing (initially), so that silent vision errors never corrupt my data.
4. As the user, I want to add text alongside photos ("pan-fried in 1 tsp oil"), so that invisible ingredients are captured accurately.
5. As the user, I want to log with exact weights when I have them ("100g pan-fried chicken tikka"), so that weighed meals are recorded at full precision.
6. As the user, I want to log with household units or relative sizes ("small katori") when I haven't weighed, so that imprecision never blocks logging.
7. As the user, I want my utensils calibrated once (weigh my katori, my roti) and reused, so that vague units still resolve to accurate grams.
8. As the user, I want each repeated food to resolve to identical nutrients every time, so that my trends stay meaningful even if an absolute value is somewhat off.
9. As the user, I want new foods resolved against Indian-specific data (INDB) before western databases, so that dal, sabzi, and tikka get realistic numbers.
10. As the user, I want to be asked "home-cooked or ordered/outside?" when logging a food for the first time, so that restaurant versions (heavier oil, bigger portions) get separate cache entries from my home recipes.
11. As the user, I want LLM-estimated nutrition flagged as such and sanity-checked against the nearest database entry, so that guesses never masquerade as data.
12. As the user, I want each logged item to keep its raw input, resolved grams, basis, source, and confidence, so that history can be recomputed when estimates improve.
13. As the user, I want corrections to a cached food to propagate through past day-files silently, so that history stays consistent for trend analysis.
14. As the user, I want my dietician's diet chart encoded as versioned data, so that "what I should eat" is machine-checkable.
15. As the user, I want each meal labeled on-plan, variation, or cheat (inferred, asked only when ambiguous), so that adherence (not just calories) is tracked.
16. As the user, I want daily targets derived from the diet chart's own options, so that I'm measured against my dietician's plan, not invented numbers.
17. As the user, I want to log "had option 2 for lunch", so that on-plan meals are near-zero effort.
18. As the user, I want old days judged against the chart version active at the time, so that a chart revision doesn't rewrite past adherence.
19. As the user, I want to log my weight in seconds, so that the system accumulates ground truth.
20. As the user, I want weight trend compared against logged intake, so that systematic estimation bias is detected and corrected over time.
21. As the user, I want treatment sessions recorded as dated annotations, so that treatment-driven changes aren't misattributed to diet.
22. As the user, I want gym sessions logged minimally (type, duration, estimated burn), so that I can see my consistency.
23. As the user, I want estimated burn kept out of all intake/balance math, so that fictional burn numbers never justify extra eating.
24. As the user, I want core nutrients (kcal, protein, carbs, fat, fiber) always present and micros stored opportunistically, so that a missing micro never blocks a log.
25. As the user, I want a post-midnight snack counted toward the previous day (before 04:00), so that late eating lands on the day it belongs to.
26. As the user, I want every logging session to auto pull-rebase, commit, and push, so that phone and laptop sessions never diverge.
27. As the user, I want to log from my phone via Claude Code pointed at the repo, so that eating out doesn't mean logging later from memory.
28. As the user, I want shorthand commands (`log:`, `weight:`, `gym:`, `summary`), so that phone typing is minimal.
29. As the user, I want daily totals and weekly summaries (averages, adherence %, weight trend, cheat patterns), so that I and my dietician see patterns, not raw numbers.
30. As the user, I want each workflow packaged as a dedicated skill, so that tasks are delegable to subagents and individually invocable.
31. As the user, I want a lean CLAUDE.md orchestrator, so that every session knows the repo's formats and conventions without bloating context.
32. As the user, I want all data as plain JSON in git, so that I own it outright, can diff it, and can leave any tool without export lock-in.
33. As the user, I want schema validation on every write, so that a malformed day-file fails loudly, not silently.
34. As the user, I want a visualization website later, so that trends become charts without authentication or third parties.

## Implementation Decisions

### Data model

- One day-file per date, sharded by month, full date in filename. Wake-day convention at 04:00.
- Day-file sections: meals (by slot: breakfast, lunch, snacks, tea, dinner, extra…), body (weight, treatment annotations), activity (workouts with `estimatedBurn`).
- Per-item resolution trail (shape locked during design grill):

```json
{
  "input": "1 katori paneer tikka masala",
  "food": "paneer tikka masala",
  "qty": {
    "amount": 1,
    "unit": "katori",
    "grams": 180,
    "basis": "measures.json"
  },
  "nutrients": {
    "kcal": 320,
    "protein": 14,
    "carbs": 11,
    "fat": 25,
    "fiber": 2
  },
  "source": "indb:PANEER_TIKKA_MASALA",
  "confidence": "high"
}
```

- `qty.basis` records where grams came from: weighed | measures.json | estimate.
- Core five nutrients mandatory; optional `micros` object holds whatever the source provides.
- Meals carry an adherence label; cheat replaces a slot rather than being its own category.

### Nutrition resolution

- Personal food cache is consulted first; hits skip all external lookup.
- Cache-miss pipeline, in order: INDB (1,014 Indian cooked recipes, converted once from the Anuvaad xlsx and committed) → USDA FoodData Central API (free, public domain) → IFCT 2017 raw-ingredient composition (compose dish from ingredients) → LLM estimate, flagged and sanity-checked against nearest database neighbor.
- On cache miss, the user is asked home-cooked vs ordered/outside; the two resolve and cache separately.
- Cache entries store per-100g nutrients, source, and resolution date.
- Corrections to the cache trigger silent recomputation of affected day-files (possible because raw inputs are preserved).
- Skipped data sources (decided during research): Nutritionix (no viable free tier), FatSecret (India coverage unconfirmed), Open Food Facts (near-zero Indian home-cooking coverage).

### Diet chart and adherence

- Chart transcribed from a photo into versioned JSON with effective-from dates; per meal slot, the allowed options.
- Daily kcal/protein envelope derived by resolving the chart options' nutrition.
- Adherence inferred by matching the logged meal against the active chart version for that date; user asked only when ambiguous.

### Body and activity

- Weight is the calibration signal: intake-implied balance vs actual weight trend exposes systematic estimation bias (MacroFactor-style). Treatment annotations mark confounded periods so the trend is interpreted honestly.
- Workout estimated burn is display-only, excluded from all balance math.

### Photos

- Pipeline: identify dishes → match personal food cache → estimate portions in the user's calibrated units → always confirm before writing. Relax to confidence-gated auto-logging only after accuracy is demonstrated (a workflow-doc change, not code).

### Repository and tooling

- Bun workspaces monorepo: a plain data directory at root (deliberately NOT a workspace: data outlives frameworks; its git history stays untangled from code), a core package (zod schemas doubling as validation + typed loaders), a scripts app (recompute, summaries, INDB import), a web app later (TanStack Start). Turborepo added only when the web app lands.
- Every logging session ends with pull-rebase, commit (`log: <date> <slot>`), push, no asking.

### Skills architecture

- CLAUDE.md is a lean orchestrator: repo map, data formats, conventions, skill routing. All workflows are repo-level skills authored via the writing-great-skills skill:
  - `log-meal`, the daily driver: parse text/photo → resolve → confirm → write → commit.
  - `resolve-food`, the cache-miss pipeline; delegable to a subagent to keep lookup noise out of main context.
  - `log-body`: weight, gym, treatment entries.
  - `summarize`: daily totals, weekly rollups, adherence %, calibration check; read-only.
  - `recompute`: propagate cache corrections; smaller-model candidate.
  - `import-diet-chart`: chart photo → versioned chart JSON + derived envelope.
  - `calibrate`: record weighing sessions into measures.

## Testing Decisions

- Single seam: the core package's public API. All deterministic logic lives there as pure functions over JSON and is tested at that boundary with `bun test`: schema validation (malformed day-files rejected loudly), wake-day date assignment, unit-to-grams resolution via measures, daily/weekly aggregation, envelope derivation from a chart, adherence matching, recompute propagation.
- Good tests assert external behavior (given day-files, expect these totals), never internal structure.
- Skills and prompts are not unit-tested; the acceptance test is a real first log producing a valid, schema-passing day-file.
- Greenfield repo: no prior art to follow; these tests establish it.

## Out of Scope

- The visualization website (later phase; only the monorepo shape accommodates it now).
- Coaching, diet advice, meal planning: the dietician's job. The system counts and reports.
- Calorie-burn accuracy or wearable integrations.
- Authentication, hosting, multi-user anything.
- Turborepo config until the web app exists.
- Complete micronutrient coverage.

## Further Notes

- INDB coverage of the user's staples (notably chicken tikka; the dataset skews vegetarian home cooking) must be verified during the INDB import task (the first build step). If absent, those foods resolve via the IFCT-compose or flagged-LLM path.
- INDB's license is unstated ("open-access"); fine for this private personal repo, revisit before ever publishing the repo with the data embedded.
- IFCT GitHub mirrors are AGPL-3.0, relevant only if this repo is ever shared publicly.
- Photo estimation realistically caps at ~75-90% accuracy on mixed Indian dishes (invisible oil/ghee); the always-confirm policy and text-for-invisibles habit are the mitigations, and weight-trend calibration is the backstop.
- Diet chart photo to be provided by the user; transcription does not block any other build step.
- User profile stats (height, weight, age, gender) needed only at profile setup.
