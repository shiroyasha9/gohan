# PRD: gohan as a Claude Code Plugin (Stage 2)

Status: ready-for-agent
Date: 2026-07-04
Depends on: `specs/gohan-prd.md` (core system), `specs/open-source-prd.md` (Stage 1, shipped)

## Glossary

Inherits both prior glossaries. New terms:

- **Plugin**: the Claude Code plugin packaging of gohan (skills, script bundles, hooks), installed once, updated centrally.
- **Marketplace**: the plugin distribution index. The gohan repo doubles as its own marketplace via a manifest at repo root.
- **Plugin surface**: the subdirectory of the repo that ships to users' plugin caches (skills, bundles, hooks, schema copy). Everything outside it is dev-only.
- **Bundle**: a single-file JavaScript artifact produced by bun's bundler from a CLI script, with all dependencies inlined; runs with only the bun binary present.
- **Hook guard**: the check inside the SessionStart hook that detects a gohan data repo (profile file present) and injects conventions only there.
- **Data repo (Stage 2 shape)**: a user's repo reduced to data, a thin personal CLAUDE.md, and .gitignore: no code, no skills.
- **Scratch-dir round-trip**: the acceptance gate: a full setup→log→validate→commit→summarize cycle run against a fresh directory with the plugin loaded from local disk.

## Problem Statement

Stage 1 users copy the whole codebase into their data repo and receive updates by git merge (workable but heavy): every user carries code they never edit, merges can conflict with their data commits, and repo-level skills silently shadow any future plugin skills. The owner maintains code that is duplicated into every instance. Claude Code's plugin system exists precisely to ship skills + supporting scripts as an installable, centrally-updated unit, leaving user repos as pure data.

## Solution

Package gohan's skills, CLI scripts, and conventions as a Claude Code plugin distributed from the gohan repo itself (the repo doubles as its own marketplace). Users install the plugin once; their data repo is generated from scratch by the setup skill and contains only data plus a thin personal CLAUDE.md. Updates arrive via plugin update, never git merge. Scripts ship as prebuilt bun bundles so the only prerequisite is the bun binary. The owner migrates first as user #1.

## User Stories

1. As a new user, I want to install gohan with two commands (add marketplace, install plugin), so that onboarding has no template-forking step.
2. As a new user, I want the setup skill to scaffold my data repo from scratch (git init, profile, data files, thin CLAUDE.md, .gitignore), so that I never touch boilerplate.
3. As a new user, I want the setup skill to walk me through creating a private remote for my data repo, so that my history is backed up from day one.
4. As a user, I want the plugin's scripts to run against whatever data repo I'm standing in, so that validation and summaries work without configuration.
5. As a user, I want the scripts to work with only bun installed (no dependency install step, no network) so that a fresh machine works immediately and offline.
6. As a user, I want gohan's conventions injected only when I'm in my data repo, so that the plugin is invisible in my other projects.
7. As a user, I want skill routing (log:, weight:, summary) to work purely from skill descriptions, so that meals log correctly even without the ambient conventions.
8. As a user, I want `/plugin update gohan` to bring the latest skills and scripts, so that staying current is one command with no conflicts.
9. As a user, I want a personal CLAUDE.md in my data repo for my own shorthand and context, so that personalization survives plugin updates untouched.
10. As a user, I want the agent to read the authoritative data schemas from the plugin, so that logged files always match the shapes the scripts validate.
11. As a Stage 1 user, I want a documented migration (delete code and repo skills, install plugin), so that my existing day-files keep working unchanged.
12. As the owner, I want my data repo slimmed to pure data after migration, so that code lives in exactly one maintained place.
13. As the owner, I want repo-level skills deleted during migration, so that stale copies never silently shadow plugin skills.
14. As the maintainer, I want the plugin surface isolated in one subdirectory, so that users' caches never receive TS source, specs, or dev config.
15. As the maintainer, I want CI to fail when committed bundles drift from their source, so that shipped artifacts are always rebuilt from current code.
16. As the maintainer, I want commit-SHA versioning while iterating, so that every push is installable without version-bump ceremony.
17. As the maintainer, I want to develop the plugin with a local-dir flag and a validate command, so that iteration never requires publishing.
18. As the maintainer, I want the acceptance gate to pass in a scratch directory before my real data repo migrates, so that daily logging never breaks mid-transition.

## Implementation Decisions

### Topology and distribution
- The plugin lives inside the public gohan repo; the repo carries a marketplace manifest at its root and doubles as its own marketplace. No separate plugin repo.
- The plugin surface is a dedicated subdirectory referenced by the marketplace entry as a relative source; only it reaches user caches. TS source, specs, CI, and dev config stay outside it.
- Versioning: commit-SHA mode (no version fields) during active development: every push to main is a new installable version. Adopt explicit semver at 1.0. Updates are pull-based; auto-update stays off (third-party marketplace default).
- The repo stops being a GitHub template; Stage 1's use-this-template flow is retired. The data scaffold leaves the repo: the setup skill generates it.

### Scripts as bundles
- Each CLI (validate, summary, recompute, import-indb) is prebuilt with bun's bundler targeting the bun runtime, dependencies inlined, committed inside the plugin surface. Users need only the bun binary on PATH: no install hook, no node_modules, works offline. This resolves the Stage 2 runtime-prerequisite question: require bun, never compile platform binaries.
- Scripts keep resolving the data directory relative to cwd (the user's data repo), which is why they work unchanged when invoked from the plugin cache path.
- A build script in the dev workspace regenerates bundles; CI rebuilds and diffs to guarantee freshness.

### Skills
- All existing skills move from repo-level skill directories into the plugin surface, format unchanged; they become namespaced under the plugin.
- Every repo-relative reference in skill bodies is rewritten against the plugin root variable: script invocations become `bun ${CLAUDE_PLUGIN_ROOT}/…` and the authoritative-shapes pointer targets a schemas copy shipped in the plugin surface (kept in sync by the same build step as the bundles).
- The setup skill grows the data-repo-from-scratch flow: interview (unchanged), then git init, data scaffolds, thin CLAUDE.md, .gitignore, and an offered private-remote creation walkthrough.

### Always-on context
- A SessionStart hook injects the conventions block (wake-day, confidence vocabulary, source discipline, JSON style, commit protocol, shorthand) as additional context, but only after the hook guard confirms the cwd is a gohan data repo (profile file present). Elsewhere the hook is a silent no-op, so user-scope installation is safe.
- Skill descriptions alone carry invocation routing; the hook carries conventions only. A plugin cannot ship a CLAUDE.md (documented limitation), and the hook-injection pattern is the established substitute.

### Data repo (Stage 2 shape)
- Generated contents: the data directory, a thin CLAUDE.md (three-line data map plus a personal-notes section for user shorthand and context, the designated home for owner-specific aliases removed during Stage 1 de-personalization), and .gitignore.
- The commit protocol is unchanged and runs in the data repo as cwd.
- Migration for any Stage 1 instance: pass the acceptance gate first, then delete all code, dev config, specs, and repo-level skills (mandatory: repo skills override same-named plugin skills), drop the upstream remote (updates now arrive via plugin update), keep data and .gitignore, add the thin CLAUDE.md. The owner's repo migrates first as dogfood.

## Testing Decisions

- The core package's test suite and seam are untouched; pure logic stays tested exactly as before in the dev workspace.
- New seam: the plugin surface as a whole, exercised end-to-end rather than unit-tested. The acceptance gate is the scratch-dir round-trip: load the plugin from local disk with the local-dir flag, then in an empty directory run setup → log a body entry → validate gates it → commit protocol → summarize reads it back. This exercises every changed seam (scaffolding, plugin-root path substitution, cwd-relative data access, hook guard) with zero risk to real data.
- CI additions on the gohan repo: plugin manifest validation via the official validate command, and bundle freshness (rebuild bundles + fail on diff). Existing check/typecheck/test/validate jobs continue.
- Final acceptance: after the owner's migration, the first real meal logged through the installed plugin.
- Prior art: the Stage 1 fresh-clone smoke check (same philosophy: prove the shipped artifact works with no personal context present).

## Out of Scope

- Publishing to the community marketplace (possible later; needs their submission flow).
- Compiled standalone binaries, rejected: no precedent among surveyed plugins, multi-platform artifact weight, and bun is already the project prerequisite.
- Auto-update mechanics beyond documenting `/plugin update`.
- Food packs (still deferred from Stage 1).
- The visualization website.
- Any hosted/multi-user surface.

## Further Notes

- Sequencing: prototype gate first (bundle one script + wrap one small skill, prove the round-trip), then mechanical replication across the remaining skills, then repo restructure, then owner migration.
- Known trade-off accepted: committed bundle artifacts in git history; revisit only if churn bloats the repo; switching to install-time builds later is non-breaking.
- Known gotcha to encode in migration docs: repo-level skills silently shadow plugin skills; deletion is not optional.
- The plugin cache copies files; no path may escape the plugin surface (no `..`), and nothing outside it is available at runtime, hence the schemas copy and inlined dependencies.
- Estimated effort: roughly a day, gated by the prototype.
