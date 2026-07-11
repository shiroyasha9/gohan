---
name: resolve-food
description: Resolve a food's per-100g nutrition into the personal food cache. Use when a logged food has no foods.json entry, or when correcting an existing entry's values.
---

Ground every food in real data before it enters `data/foods.json`. A cached food is canon: every future log of it reuses these numbers, so resolve carefully once. Shapes: `${CLAUDE_PLUGIN_ROOT}/schemas.ts`.

## Steps

1. **Context first.** If not already stated, ask: home-cooked, or ordered/restaurant? They cache separately: id slug `<food-name>-<context>` (e.g. `paneer-tikka-masala-home`). Outside versions bias oil/fat upward; note the assumption in `notes`.
2. **Grounded lookup, first solid hit wins:**
   - `data/reference/indb.json`: Indian cooked recipes; search name + synonyms (dal fry/dal tadka, chapati/roti). Missing? Offer `bun ${CLAUDE_PLUGIN_ROOT}/scripts/import-indb.js` to generate it.
   - USDA: `https://api.nal.usda.gov/fdc/v1/foods/search?query=<name>&api_key=${USDA_API_KEY:-DEMO_KEY}`, prefer generic/FNDDS entries over branded.
   - Compose from raw ingredients (`data/reference/` tables plus the user's recipe; ask for main ingredients and oil/ghee amount).
   - LLM estimate, last resort: derive from ingredients, cross-check magnitude against the closest INDB/USDA neighbor, record the neighbor in `notes`, `source: "llm-estimate"`.
3. **Set `servingG`** when a natural serving exists (the user's katori, one piece, one glass).
4. **Append the entry**: id, name, context, per100g (core five always; micros when the source has them), servingG, aliases (include the user's exact phrasing), source (`indb:<id>`, `usda:<fdcId>`, `composed`, `llm-estimate`), resolvedAt (today), notes for every assumption. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js data/foods.json` must pass (desktop; remote: invariants below).
5. **If this corrected an existing entry** → run the `recompute` skill.

Done when the entry validates with provenance recorded and all core-five values present.

## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector? Work through it:

- **Repo**: `gohan-data` by convention; find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- **The lookup ladder replaces INDB/USDA** (no local reference files, no API access): search the web for grounded per-100g values. Prefer primary sources — a USDA FoodData Central page → `source: "usda:<fdcId>"`; INDB/anuvaad data → `source: "indb:<id>"`; any other credible source → `source: "web:<url>"` with the page named in `notes` and `confidence` at most `medium`. Last resort stays the cross-checked LLM estimate (`source: "llm-estimate"`, confidence low).
- **Append with sha**: read `data/foods.json`, keep its `sha`, append the entry, write the full file back (2-space indent, trailing newline) on `main`, message `food: <name>`. On a sha conflict: re-read, re-merge, retry once.
- **Entry invariants** as in step 4: id slug with context, per100g core five always, `servingG` when natural, `aliases`, `source`, `resolvedAt`, `notes` for every assumption. When unsure, read `plugin/schemas.ts` from the public `shiroyasha9/gohan` repo via the same connector.
- Never invent numbers silently: every value traces to a `source`; estimates are flagged.
