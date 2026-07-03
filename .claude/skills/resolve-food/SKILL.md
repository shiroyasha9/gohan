---
name: resolve-food
description: Resolve a food's per-100g nutrition into the personal food cache. Use when a logged food has no foods.json entry, or when correcting an existing entry's values.
---

Ground every food in real data before it enters `data/foods.json`. A cached food is canon: every future log of it reuses these numbers, so resolve carefully once. Shapes: `packages/core/src/schemas.ts`.

## Steps

1. **Context first.** If not already stated, ask: home-cooked, or ordered/restaurant? They cache separately — id slug `<food-name>-<context>` (e.g. `paneer-tikka-masala-home`). Outside versions bias oil/fat upward; note the assumption in `notes`.
2. **Grounded lookup, first solid hit wins:**
   - `data/reference/indb.json` — Indian cooked recipes; search name + synonyms (dal fry/dal tadka, chapati/roti).
   - USDA: `https://api.nal.usda.gov/fdc/v1/foods/search?query=<name>&api_key=${USDA_API_KEY:-DEMO_KEY}` — prefer generic/FNDDS entries over branded.
   - Compose from raw ingredients (`data/reference/` tables + the user's recipe — ask for main ingredients and oil/ghee amount).
   - LLM estimate, last resort: derive from ingredients, cross-check magnitude against the closest INDB/USDA neighbor, record the neighbor in `notes`, `source: "llm-estimate"`.
3. **Set `servingG`** when a natural serving exists (the user's katori, one piece, one glass).
4. **Append the entry**: id, name, context, per100g (core five always; micros when the source has them), servingG, aliases (include the user's exact phrasing), source (`indb:<id>`, `usda:<fdcId>`, `composed`, `llm-estimate`), resolvedAt (today), notes for every assumption. `bun run validate data/foods.json` must pass.
5. **If this corrected an existing entry** → run the `recompute` skill.

Done when the entry validates with provenance recorded and all core-five values present.
