# gohan

Personal calorie tracker. Claude Code is the interface; plain JSON in git is the database. The system counts and reports — coaching is your dietician's job. Full design: `specs/gohan-prd.md`.

## Repo map

- `data/days/YYYY/MM/YYYY-MM-DD.json` — one day-file per date: meals, body, activity.
- `data/foods.json` — personal food cache; per-100g nutrients, canon for every repeat log.
- `data/measures.json` — calibrated household units → grams.
- `data/diet-chart/<effectiveFrom>.json` — versioned diet plan from your dietician/nutritionist.
- `data/profile.json` — user stats.
- `data/reference/` — committed datasets (INDB etc.), read-only.
- `packages/core` — zod schemas + pure logic. `packages/core/src/schemas.ts` is the authoritative shape of every data file.
- `apps/scripts` — CLIs: `bun run validate | summary | recompute`.

## Skills

| When                                       | Skill               |
| ------------------------------------------ | ------------------- |
| User ate something (text/photo/"option N") | `log-meal`          |
| Food not in cache, or cache entry wrong    | `resolve-food`      |
| Weight, gym, treatment session             | `log-body`          |
| "summary", "how am I doing"                | `summarize`         |
| foods.json per-100g changed                | `recompute`         |
| Diet chart shared or changed               | `import-diet-chart` |
| User weighed a utensil/unit                | `calibrate`         |
| Fresh instance, "set me up", no profile    | `setup`             |

## Conventions

- **Wake-day**: entries before the profile's `wakeDayCutoffHour` (default 04:00) belong to the previous date. All times in the profile's `timezone`.
- **Confidence** (per logged item): `high` = cache hit + weighed/calibrated grams; `medium` = estimated grams; `low` = LLM-estimated food.
- **Never invent nutrition numbers silently** — every value traces to a `source`; LLM estimates are flagged and cross-checked.
- **JSON style**: 2-space indent, trailing newline (`JSON.stringify(x, null, 2) + '\n'`).
- **Commit protocol** (ends every skill that writes): `git pull --rebase && git add <changed files> && git commit -m "<prefix>: <what>" && git push`. Prefixes: `log`, `body`, `food`, `chart`, `calibrate`, `recompute`. On push rejection: pull-rebase again and retry. No asking.
- After code changes (not data logs): `bun test && bun run typecheck && bun run fix`.

## Shorthand

`log: <food>` · `weight: <kg>` · `gym: <what, duration>` · `treatment: <note>` · `summary [range]` — treat these as invocations of the matching skill.
