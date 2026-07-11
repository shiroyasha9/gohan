---
name: import-diet-chart
description: Transcribe a dietician/nutritionist's diet chart into versioned data. Use when the user shares a diet chart (photo or text) or announces the plan changed.
---

The chart is ground truth for adherence: transcribe it faithfully and never paraphrase options. Shapes: `${CLAUDE_PLUGIN_ROOT}/schemas.ts`.

## Steps

1. Transcribe every slot and every option verbatim from the photo/text; ask only about parts you cannot read.
2. Ask for the effective-from date; write `data/diet-chart/<effectiveFrom>.json`. Never edit an old chart version: past days are judged against the chart active then.
3. Resolve each option's foods via the `resolve-food` skill to fill `foodIds`. Skip options that need the user's recipe details for another time; list them as `unresolvedOptions` in the envelope so they don't get lost.
4. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js`, then `bun ${CLAUDE_PLUGIN_ROOT}/scripts/summary.js` to show the derived kcal/protein envelope with any unresolved options named (desktop; remote: see below).
5. Commit protocol.

Done when the chart validates, the envelope is shown, and unresolved options are listed explicitly.

## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector? Work through it:

- **Repo**: `gohan-data` by convention; find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- **Write** `data/diet-chart/<effectiveFrom>.json` as a new file (never overwrite an old version) with create-or-update-file on `main`, message `chart: effective <date>`. 2-space indent, trailing newline.
- **No summary script here**: derive the kcal/protein envelope yourself — sum each slot's min/max across resolved options — and present it with `unresolvedOptions` named.
- **Shape** per `dietChartSchema`: slots with verbatim options, `effectiveFrom`, `unresolvedOptions`. When unsure, read `plugin/schemas.ts` from the public `shiroyasha9/gohan` repo via the same connector.
