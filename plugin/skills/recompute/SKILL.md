---
name: recompute
description: Propagate a corrected food cache entry through past day-files. Use after changing any per-100g value in foods.json.
---

History follows the cache: day-files silently re-derive from corrected entries so trends stay consistent.

## Steps

1. `bun ${CLAUDE_PLUGIN_ROOT}/scripts/recompute.js [from] [to]` (no args = all days). It rewrites only items whose `foodId` matches a changed entry.
2. Review the printed change list; `bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js` must pass.
3. Commit protocol, message `recompute: <food> correction`.

Done when validate passes and the commit is pushed.

## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector? Small corrections only:

- **Repo**: `gohan-data` by convention; find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- Read the corrected `data/foods.json` entry, list the affected day-files, and re-derive `nutrients` = per-100g × `qty.grams` for matching `foodId` items only. `qty`, `input`, and `source` never change.
- **Cap ~31 day-files**; anything larger belongs on desktop, where `recompute.js` does it in one command.
- Commit every rewritten file in one batch (push-files tool) on `main`, message `recompute: <food> correction`.
