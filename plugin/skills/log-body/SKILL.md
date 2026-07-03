---
name: log-body
description: Record weight, workouts, or treatment sessions. Use for "weight:", "gym:", "treatment:", a weigh-in, a workout mention, or a session of any weight-affecting treatment.
---

Fast entries into the day-file's `body` and `activity` sections. Day-files live at `data/days/YYYY/MM/YYYY-MM-DD.json` in the current repo. Authoritative shapes: `${CLAUDE_PLUGIN_ROOT}/schemas.ts`.

## Steps

1. Wake-day date; a morning weigh-in belongs to that morning's date. Create the day-file if missing.
2. Write the entry:
   - Weight → `body.weightKg`.
   - Workout → append to `activity`: `{ type, durationMin, estimatedBurnKcal?, notes? }`. `estimatedBurnKcal` is display-only: never subtract it from intake anywhere.
   - Treatment session → `body.treatment` with a short note naming it (e.g. `"lymphatic drainage, session 4"`).
3. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js <day-file>`, then the commit protocol (gohan conventions).

Done when the day-file validates and the commit is pushed.
