---
name: setup
description: Onboard a fresh gohan instance. Use when the user says "set me up" or asks to get started, or when any skill finds `data/profile.json` missing.
---

Conversational onboarding: interview, then scaffold. Shapes: `packages/core/src/schemas.ts` (`profileSchema` is authoritative).

## Steps

1. **Interview.** Ask, in one message:
   - Timezone (IANA name; suggest a guess from the system clock).
   - When their eating day rolls over (`wakeDayCutoffHour`; default 04:00 — a midnight snack counts toward the previous day).
   - Optional, may skip freely: height cm, current weight kg, birth year.
2. **Write `data/profile.json`** with the answers (current weight → `startingWeightKg`). Scaffold any missing data files: `data/foods.json` → `{ "foods": [] }`, `data/measures.json` → `{ "measures": [] }`. `bun run validate` must pass.
3. **Offer the optional imports**, briefly, without pushing:
   - Indian food data: `bun run import-indb` (generates `data/reference/indb.json` locally; a couple of MB).
   - USDA lookups for everything else: free key from https://fdc.nal.usda.gov/api-key-signup.html → `.env` as `USDA_API_KEY=...` (works without one at DEMO_KEY rate limits).
   - A diet plan from their dietician/nutritionist → run the `import-diet-chart` skill now if they have it handy.
   Run whichever they accept.
4. **Commit protocol** (CLAUDE.md), prefix `chore`.
5. **Point forward:** tell them the first real test is logging a meal — "log: <what you just ate>".

Done when profile + scaffolds validate, the commit is pushed, and the user knows the `log:` shorthand.
