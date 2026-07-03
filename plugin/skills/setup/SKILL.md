---
name: setup
description: Onboard a fresh gohan instance by scaffolding a data repo from scratch. Use when the user says "set me up" or asks to get started, or when any skill finds `data/profile.json` missing.
---

Conversational onboarding: interview, then scaffold a data repo in the current directory. Shapes: `${CLAUDE_PLUGIN_ROOT}/schemas.ts` (`profileSchema` is authoritative).

## Steps

1. **Interview.** Ask, in one message:
   - Timezone (IANA name; suggest a guess from the system clock).
   - When their eating day rolls over (`wakeDayCutoffHour`; default 04:00 — a midnight snack counts toward the previous day).
   - Optional, may skip freely: height cm, current weight kg, birth year.
2. **Scaffold the data repo** in the current directory:
   - `git init` if not already a git repository.
   - `data/profile.json` from the answers (current weight → `startingWeightKg`).
   - `data/foods.json` → `{ "foods": [] }`, `data/measures.json` → `{ "measures": [] }`.
   - `.gitignore` with `.env` and `.DS_Store`.
   - A thin `CLAUDE.md` (verbatim, it is the user's file from here on):

     ```markdown
     # gohan data

     Data repo for the gohan plugin — skills, scripts, and conventions come from the plugin; this repo is data only.

     - `data/days/YYYY/MM/YYYY-MM-DD.json` — one day-file per date (meals, body, activity)
     - `data/foods.json` (per-100g food cache) · `data/measures.json` (units → grams) · `data/diet-chart/` (versioned plans) · `data/profile.json`

     ## Personal notes

     (your shorthand, aliases, and context — plugin updates never touch this file)
     ```

   - `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js` must pass.
3. **Offer the optional imports**, briefly, without pushing:
   - Indian food data: `bun ${CLAUDE_PLUGIN_ROOT}/scripts/import-indb.js` (generates `data/reference/indb.json` locally; a couple of MB).
   - USDA lookups for everything else: free key from https://fdc.nal.usda.gov/api-key-signup.html → `.env` as `USDA_API_KEY=...` (works without one at DEMO_KEY rate limits).
   - A diet plan from their dietician/nutritionist → run the `import-diet-chart` skill now if they have it handy.
   Run whichever they accept.
4. **Offer a private remote** so history is backed up from day one: with `gh` available, `gh repo create <name> --private --source . --push` (never public — this is personal health data); otherwise point them at creating a private repo on their host and `git remote add origin <url> && git push -u origin main`. Skipping is fine; everything works locally.
5. **Commit protocol**, prefix `chore` (skip the push if they skipped the remote).
6. **Point forward:** tell them the first real test is logging a meal — "log: <what you just ate>".

Done when profile + scaffolds validate, the commit exists, and the user knows the `log:` shorthand.
