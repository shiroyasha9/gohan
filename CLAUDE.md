# gohan

Personal calorie tracker shipped as a Claude Code plugin. Claude Code or claude.ai is the interface; plain JSON in each user's private data repo is the database. The system counts and reports. Coaching is the dietician's job. Design: `specs/gohan-prd.md` · plugin packaging: `specs/plugin-prd.md` · claude.ai surface: `specs/remote-mode.md`.

This repo is the dev workspace and its own plugin marketplace. User data never lives here.

## Repo map

- `packages/core` holds zod schemas and pure logic. `packages/core/src/schemas.ts` is the authoritative shape of every data file.
- `apps/scripts` holds the CLI sources (validate, summary, recompute, import-indb). They resolve `data/` relative to cwd, i.e. the user's data repo.
- `plugin/` is the shipped surface: `skills/` (all 9), `scripts/` (prebuilt bun bundles, generated, never hand-edit), `schemas.ts` (copy), `hooks/` (guarded SessionStart conventions).
- `.claude-plugin/marketplace.json`: the repo doubles as its own marketplace, `source: ./plugin`.

## Working on the plugin

- After changing `apps/scripts` or `packages/core`: `bun run build:plugin` and commit the regenerated bundles. CI fails on drift.
- User-facing conventions (wake-day, confidence, source discipline, commit protocol, shorthand) live in `plugin/hooks/session-start.sh`; the data-file map lives there and in skill bodies. Edit those, not this file, to change user behavior. The hook never runs on claude.ai, so each skill mirrors the conventions it uses in its "Remote mode" section per `specs/remote-mode.md` — edit both together.
- Skill `description:` frontmatter must never contain angle brackets: the claude.ai plugin importer silently drops such skills.
- Dev loop: `claude --plugin-dir ./plugin` from a scratch data repo (`data/profile.json` present triggers the hook); `/reload-plugins` after edits; `claude plugin validate .` checks both manifests.
- Versioning: commit-SHA mode until 1.0, no version fields, every push to main is installable.

## Quality gates

After code changes: `bun test && bun run typecheck && bun run fix`.
