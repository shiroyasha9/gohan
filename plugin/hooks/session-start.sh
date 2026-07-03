#!/bin/bash
[ -f "./data/profile.json" ] || exit 0

cat <<'EOF'
# gohan conventions (data repo detected)

- Data map: `data/days/YYYY/MM/YYYY-MM-DD.json` (one day-file per date), `data/foods.json` (per-100g cache), `data/measures.json` (units → grams), `data/diet-chart/<effectiveFrom>.json`, `data/profile.json`.
- Wake-day: entries before the profile's `wakeDayCutoffHour` (default 04:00) belong to the previous date. All times in the profile's `timezone`.
- Confidence per logged item: `high` = cache hit + weighed/calibrated grams; `medium` = estimated grams; `low` = LLM-estimated food.
- Never invent nutrition numbers silently: every value traces to a `source`, and LLM estimates are flagged and cross-checked.
- JSON style: 2-space indent, trailing newline.
- Commit protocol (ends every skill that writes): `git pull --rebase && git add <changed files> && git commit -m "<prefix>: <what>" && git push`. Prefixes: `log`, `body`, `food`, `chart`, `calibrate`, `recompute`. On push rejection: pull-rebase again and retry. No asking.
- Shorthand: `log: <food>` → gohan:log-meal · `weight: <kg>` / `gym: <what, duration>` / `treatment: <note>` → gohan:log-body · `summary [range]` → gohan:summarize.
EOF
