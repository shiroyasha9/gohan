# gohan 🍚

A calorie tracker where **Claude Code is the app** and **a git repo is the database**.

No server, no account, no subscription, no one else holding your food history. You describe what you ate in plain language (or paste a photo); the agent resolves it against real nutrition data, writes a JSON file into your repo, and commits it. Every number is traceable to its source. Your data outlives every framework in this repo: it's just dated JSON files you can read in fifty years.

## Why this exists

Mainstream trackers paywall essentials (photo logging, data export), have terrible coverage of non-Western foods, and hold your history hostage in their cloud. gohan inverts all three:

- Your data, your repo. Each user runs their own private copy. Nothing is hosted, shared, or metered.
- An LLM is the best food parser ever built. "2 rotis and a katori of dal" needs no forms, dropdowns, or barcode.
- Counting, not coaching. The system records and reports. What to eat is between you and your dietician/nutritionist. gohan gives you honest numbers to bring to that conversation.

## How it works

- `data/days/YYYY/MM/YYYY-MM-DD.json` holds one file per day: meals, weight, workouts.
- `data/foods.json` is your personal food cache. Each food is resolved once (nutrition database → USDA API → composed estimate, always source-flagged), then becomes canon for every repeat log.
- `data/measures.json` records your actual utensils, weighed once ("my katori = 150 g"), so "1 katori" resolves to real grams forever.
- `data/diet-chart/` is optional: your nutritionist's plan as versioned data, so every meal gets an adherence label and summaries compare intake against the plan's envelope.
- Every logged item carries a resolution trail: your words verbatim, resolved food, grams and how they were derived, nutrients, source, confidence.

Skills drive everything. You talk, the agent routes:

| You say                                | Skill              |
| -------------------------------------- | ------------------ |
| "log: 2 rotis and dal" / meal photo    | `log-meal`         |
| (new food, resolved automatically)     | `resolve-food`     |
| "weight: 81.4" / "gym: legs, 60min"    | `log-body`         |
| "summary" / "how was this week"        | `summarize`        |
| "my katori weighs 150g"                | `calibrate`        |
| share a diet plan                      | `import-diet-chart`|
| (cache entry corrected)                | `recompute`        |

## Setup

Requirements: [Claude Code](https://claude.com/claude-code) and [bun](https://bun.sh).

1. In Claude Code, install the plugin (this repo doubles as its own marketplace):

   ```
   /plugin marketplace add shiroyasha9/gohan
   /plugin install gohan@gohan
   ```

2. Make an empty directory for your food history, open Claude Code in it, and say **"set me up"**. The `setup` skill interviews you (timezone, day boundary, optional stats), scaffolds your private data repo (git init, profile, data files, a personal CLAUDE.md that's yours to edit), walks you through creating a **private** remote, and offers the optional imports:
   - Indian food data downloads and converts the [INDB](https://www.anuvaad.org.in/) dataset (~1,000 Indian recipes) locally. It's generated on your machine, never redistributed.
   - USDA lookups need a free [FDC API key](https://fdc.nal.usda.gov/api-key-signup.html) for everything else.
3. Log your first meal: "log: what you just ate".

Not eating Indian food? Skip the INDB step. USDA and composed estimates cover any cuisine.

Updating: `/plugin update gohan` brings the latest skills and scripts; your data repo is never touched.

## Conventions worth knowing

- Wake-day: entries before your configured cutoff (default 04:00) count toward the previous day. A midnight snack belongs to the day you were awake for.
- Confidence per item: `high` (cached food + weighed/calibrated grams), `medium` (estimated grams), `low` (estimated food). Estimates are always flagged, never silent.
- Burn is display-only: workout calories are logged for consistency tracking but never netted against intake.

## Development

This repo is the dev workspace; `plugin/` is what ships (skills, prebuilt script bundles, schemas copy, session hook). `bun run build:plugin` regenerates the bundles from source; CI fails if they drift. Dev loop: `claude --plugin-dir ./plugin` in a scratch directory, `/reload-plugins` after edits.

`bun test` · `bun run typecheck` · `bun run check` (biome via ultracite). Schemas in `packages/core/src/schemas.ts` are the single source of truth for every data shape. Design docs live in `specs/`.

## License

MIT
