---
name: log-meal
description: Log food into today's day-file. Use when the user describes something they ate ("log:", "I had", "just ate"), pastes a meal photo, or says "had option 2 of lunch"-style shorthand.
---

Write the meal into the day-file with a full resolution trail, grounded in the personal food cache. Authoritative shapes: `${CLAUDE_PLUGIN_ROOT}/schemas.ts`. Conventions (wake-day, confidence, commit protocol) arrive via the gohan session hook (desktop) or the Remote mode section below (claude.ai).

## Steps

1. **Date, slot, file.** Apply the wake-day rule (profile's `wakeDayCutoffHour`) to the current time in the profile's `timezone`. Slot comes from the user's words, else from time of day. Day-file: `data/days/YYYY/MM/YYYY-MM-DD.json`, create with `{ "date": "...", "meals": [] }` if missing.
2. **Parse items and hit the cache.** Split the input into food items. Look each up in `data/foods.json` by name and aliases, matching context (home vs outside). Every miss → run the `resolve-food` skill before continuing. Done when every item has a `foodId`.
3. **Resolve grams.** Weighed input → use directly (`basis: "weighed"`). Unit found in `data/measures.json` → multiply out (`basis: "measures"`). Otherwise estimate grams and state the assumption in your reply (`basis: "estimate"`).
4. **Photo gate.** If the input included a photo: present the parsed items with portions and wait for explicit confirmation before writing anything. Text-only input logs immediately.
5. **Scale nutrients.** Per-100g from the cache entry × grams: kcal rounded to integer, macros to 1 decimal. Carry `micros` when the cache has them.
6. **Label adherence.** Find the active chart (`data/diet-chart/`, latest `effectiveFrom` ≤ date). Matching an option → `on-plan`; within the chart's spirit → `variation`; off-plan indulgence → `cheat`. Ask only when genuinely ambiguous. No chart yet → default `on-plan` unless the user calls it a cheat.
7. **Write the trail.** Item carries: `input` (user's words verbatim), `food`, `foodId`, `qty {amount, unit, grams, basis}`, `nutrients`, `source` (copied from the cache entry), `confidence` per the conventions vocabulary.
8. **Validate.** `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js <day-file>` must pass (desktop; remote: invariants below).
9. **Reply with what was logged + running day totals (kcal, protein), one or two lines.** Then finish with the commit protocol.

Done when the day-file validates, the commit is pushed, and the user has seen their totals.

## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector? Work through it:

- **Repo**: the user's private data repo, `gohan-data` by convention. Find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- **Read** `data/profile.json` (once per chat), the day-file (missing → create with `{ "date": ..., "meals": [] }`), `data/foods.json`, `data/measures.json`, and the `data/diet-chart/` listing (missing → no chart). Keep each returned `sha`. Cache misses still go through `resolve-food` (its remote flow) before logging.
- **Write** the full merged day-file (2-space indent, trailing newline) with create-or-update-file on `main`, message `log: <date> <slot>`. On a sha conflict: re-read, re-merge, retry once.
- **No validate script here.** Invariants per item: `input`, `food`, `foodId`, `qty` (`amount` > 0, `unit`, `grams` > 0, `basis` weighed|measures|estimate), `nutrients` (kcal integer, macros to 1 decimal), `source`, `confidence`; no extra keys. When unsure, read `plugin/schemas.ts` from the public `shiroyasha9/gohan` repo via the same connector.
- **Wake-day**: entries before the profile's `wakeDayCutoffHour` (default 04:00) belong to the previous date, in the profile's `timezone`.
- **Confidence**: `high` = cache hit + weighed/calibrated grams; `medium` = estimated grams; `low` = LLM-estimated food.
