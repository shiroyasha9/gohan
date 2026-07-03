---
name: summarize
description: Report intake totals and trends. Use for "summary", "how am I doing", "how was this week", or preparing numbers for a dietician/nutritionist.
---

Read-only: no writes, no commit.

## Steps

1. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/summary.js --from <date> --to <date>` (defaults to the last 7 days).
2. Present, in plain prose:
   - Daily kcal/protein averages vs the chart envelope (when present; name unresolved options).
   - Adherence: on-plan %, cheat count, and _where_ cheats cluster (days, slots).
   - Weight change — flag any treatment sessions in the window as confounders on the trend.
   - Workout consistency: sessions and minutes. Show estimated burn if asked; never net it against intake.
3. **Calibration check**: if ≥2 weeks of data show intake-implied balance disagreeing with the actual weight trend, say so — it means the food estimates carry a systematic bias worth correcting via `resolve-food`.

Done when the user has the numbers and any calibration warning.
