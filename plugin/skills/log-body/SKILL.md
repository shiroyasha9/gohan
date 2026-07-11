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
3. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js <day-file>`, then the commit protocol (desktop; remote: see below).

Done when the day-file validates and the commit is pushed.

## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector? Work through it:

- **Repo**: `gohan-data` by convention; find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- **Read** the day-file and keep its `sha` (missing → create with `{ "date": ..., "meals": [] }`); merge the entry; **write** the full file (2-space indent, trailing newline) with create-or-update-file on `main`, message `body: <what>`. On a sha conflict: re-read, re-merge, retry once.
- **Invariants**: `body.weightKg` positive number; `activity` entries `{ type, durationMin, estimatedBurnKcal?, notes? }`; burn is never netted against intake. When unsure, read `plugin/schemas.ts` from the public `shiroyasha9/gohan` repo via the same connector.
- **Wake-day**: entries before the profile's `wakeDayCutoffHour` (default 04:00) belong to the previous date; a morning weigh-in is that morning's date.
