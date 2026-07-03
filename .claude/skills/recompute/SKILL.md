---
name: recompute
description: Propagate a corrected food cache entry through past day-files. Use after changing any per-100g value in foods.json.
---

History follows the cache: day-files silently re-derive from corrected entries so trends stay consistent.

## Steps

1. `bun run recompute [from] [to]` (no args = all days). It rewrites only items whose `foodId` matches a changed entry.
2. Review the printed change list; `bun run validate` must pass.
3. Commit protocol, message `recompute: <food> correction`.

Done when validate passes and the commit is pushed.
