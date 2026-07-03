---
name: import-diet-chart
description: Transcribe a dietician/nutritionist's diet chart into versioned data. Use when the user shares a diet chart (photo or text) or announces the plan changed.
---

The chart is ground truth for adherence — transcribe it faithfully, never paraphrase options. Shapes: `${CLAUDE_PLUGIN_ROOT}/schemas.ts`.

## Steps

1. Transcribe every slot and every option verbatim from the photo/text; ask only about parts you cannot read.
2. Ask for the effective-from date; write `data/diet-chart/<effectiveFrom>.json`. Never edit an old chart version — past days are judged against the chart active then.
3. Resolve each option's foods via the `resolve-food` skill to fill `foodIds`. Skip options that need the user's recipe details for another time — they surface as `unresolvedOptions` in the envelope, not silently.
4. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js`, then `bun ${CLAUDE_PLUGIN_ROOT}/scripts/summary.js` to show the derived kcal/protein envelope with any unresolved options named.
5. Commit protocol.

Done when the chart validates, the envelope is shown, and unresolved options are listed explicitly.
