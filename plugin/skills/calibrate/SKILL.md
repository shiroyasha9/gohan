---
name: calibrate
description: Record a weighed utensil or portion unit into measures.json. Use when the user reports weighing something reusable ("my katori holds 150g", "each roti came to 40g").
---

Every calibrated unit makes future vague logs precise.

## Steps

1. Upsert into `data/measures.json`: `{ unit, grams, weighedOn: today, notes? }`. Unit names lowercase and unambiguous (`katori`, `roti (homemade)`, `protein scoop`).
2. When updating an existing unit, tell the user old → new. Past day-files keep the grams they were logged with — recalibration is forward-only. If the correction is large and the user wants history fixed, update `qty.grams` in the affected day-files by hand, then run the `recompute` skill to re-derive their nutrients.
3. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js data/measures.json`, then the commit protocol.

Done when measures.json validates and the commit is pushed.
