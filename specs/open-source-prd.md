# PRD: Open-Sourcing gohan (Model A — Template, then Plugin)

Status: ready-for-agent
Date: 2026-07-04
Depends on: `specs/gohan-prd.md` (the core system, built and live)

## Glossary

Inherits `specs/gohan-prd.md` glossary. New terms:

- **Template repo**: the public repository — code, skills, scripts, empty data scaffold. What strangers fork via GitHub "Use this template".
- **Data repo**: a user's private repository created from the template, holding their personal data. The owner's current repo becomes his data repo.
- **Stage 1**: template + private-fork distribution. Updates flow by git merge from upstream.
- **Stage 2**: Claude Code plugin distribution — skills/core/scripts ship as a plugin; the data repo slims to pure data. Updates flow by plugin update.
- **Setup skill**: onboarding skill that interviews a new user and scaffolds their data files.
- **Food pack**: a redistributable `foods.json` collection with clean per-entry provenance (e.g. USDA-derived), shareable via community PRs.

## Problem Statement

The owner built gohan for himself and wants others to be able to use such a system. The current repo cannot simply be made public: personal data (day-files, profile, foods, measures, diet chart, and their full git history) is interleaved with the code, the committed INDB dataset has an unstated license that does not clearly permit redistribution, and several personal specifics (a treatment-specific field, hardcoded IST timezone, 04:00 cutoff) are baked in. A hosted multi-user product (DB, auth, web UI) was explicitly rejected: it would recreate the data-custody model gohan exists to escape, and would make the owner pay for or meter strangers' LLM calls.

## Solution

Model A: every user owns their instance. Publish a clean public template repo containing the code, skills, scripts, and an empty data scaffold; each user creates a private copy that becomes their data repo. The owner's existing repo stays private and becomes his data repo. Reference datasets are generated locally by each user via the existing import script, never redistributed. Later (Stage 2), the code moves into a Claude Code plugin so user data repos become pure data and updates arrive without git merges — the owner installs his own plugin as user #1.

## User Stories

1. As the owner, I want the public template extracted fresh (no shared history with my repo), so that my personal data never appears in any public commit.
2. As the owner, I want to keep logging meals exactly as I do today during and after the split, so that open-sourcing never interrupts my tracking.
3. As the owner, I want an upstream remote wired from my private repo to the template, so that template improvements merge into my instance.
4. As the owner, I want my personal specifics generalized (generic treatment annotations, timezone/cutoff from profile), so that the template carries no trace of my medical context.
5. As a new user, I want to click "Use this template" and get a private repo, so that my food data is mine from the first commit.
6. As a new user, I want a setup skill that interviews me (profile, timezone, wake-day cutoff, USDA key, optionally my diet plan) and scaffolds my data files, so that onboarding is conversational, not a README slog.
7. As a new user, I want to generate the INDB reference dataset locally with one command, so that I get Indian food data without anyone redistributing it.
8. As a new user, I want a README that explains the philosophy (your data, your repo, no server) and setup steps, so that I understand what I'm adopting before I invest.
9. As a new user, I want an explicit open-source license on the code, so that I know my rights.
10. As a non-Indian user, I want the system to work without the INDB step (USDA/compose/LLM paths still function), so that the tracker is useful for any cuisine.
11. As a user with different eating hours, I want the wake-day cutoff configurable in my profile, so that the day-boundary rule matches my life.
12. As a user in any timezone, I want all date logic driven by my profile timezone, so that nothing assumes IST.
13. As a user undergoing any treatment affecting weight, I want a generic treatment annotation on day-files, so that my weight trend can be interpreted honestly whatever the confounder.
14. As a template maintainer, I want CI running lint/typecheck/tests on every push, so that contributions can't break the template.
15. As a template maintainer, I want schema changes to ship with migration scripts once strangers hold day-files, so that an update never strands someone's history.
16. As a community member, I want to share food packs with clean provenance via PRs, so that common foods stop being re-resolved by every user.
17. As a Stage 2 user, I want to install gohan as a Claude Code plugin, so that I get skills and scripts without maintaining code in my data repo.
18. As a Stage 2 user, I want plugin updates instead of git merges, so that staying current is one command with no conflicts.
19. As the Stage 2 owner, I want my data repo reduced to data + a short CLAUDE.md, so that code lives in exactly one maintained place.
20. As a Stage 2 user, I want the plugin's scripts to run against my current working directory's data, so that validation and summaries work from any data repo.

## Implementation Decisions

### Distribution model
- Model A only: template + private per-user instances. Hosted multi-user (Supabase/Convex, auth, web UI) explicitly rejected — wrong custody model, wrong economics. If ever revisited, it builds on the core package's storage-agnostic pure logic, not by retrofitting this codebase.
- Two stages. Stage 1 (template + fork) ships first — mostly repo surgery, zero loss. Stage 2 (plugin) is the v2 distribution once template/schema churn settles. Migration 1→2 for any user: delete code from the data repo, install plugin.

### Stage 1 — template extraction
- The public repo is a fresh extraction, not this repo flipped public: personal data already exists in this repo's history, so history cannot be shared.
- The owner's current repo remains private and becomes his data repo, gaining an upstream remote to the template.
- Template ships: core package, scripts, the seven skills, orchestrator CLAUDE.md, specs, empty data scaffold (structure without content).
- Template must NOT ship: any day-files, profile, foods, measures, diet charts — and no `indb.json`: INDB's license is unstated, so the converted dataset is never redistributed. Users generate it locally via the existing import script; the script is the deliverable. Same reasoning shields IFCT (AGPL mirrors) — no IFCT-derived code or data is vendored.
- License: code under a permissive license (MIT or Apache-2.0 — owner to pick; unresolved).

### De-personalization
- The treatment-specific field generalizes to a treatment annotation (free-text, dated) with the same confounder semantics in summaries.
- Timezone: currently hardcoded (summary script, profile default) — becomes a required profile field driving all date logic.
- Wake-day cutoff (04:00) becomes a profile setting with 04:00 as default.
- Skill and doc wording neutralized where it references the owner's dietician/treatment context; the original PRD stays as a design document.
- Diet-chart support stays fully in — it is a feature (any user with a nutritionist's plan), not a personalization.

### Onboarding
- New `setup` skill: conversational interview → writes profile (with timezone, cutoff), scaffolds empty data files, prompts for USDA API key (env), offers INDB import, offers diet-chart import. Follows the conversational-profile pattern from prior art.
- README: philosophy first (data ownership, no server, Claude Code as interface), then setup, then the skill vocabulary.

### Maintenance discipline
- CI workflow: lint (ultracite), typecheck, tests on push/PR.
- Schema versioning: once the template has users, every schema change ships with a migration script; day-file schemas gain a version discipline. Pre-1.0 churn is why Stage 2 waits.

### Stage 2 — plugin
- Skills, core package, and scripts move into a Claude Code plugin; skills reference bundled scripts via the plugin root rather than repo paths.
- User data repos become pure data + short CLAUDE.md + git remote.
- Runtime prerequisite question (bun on user machines vs precompiled standalone binaries via bun's compiler) is the piece to prototype first — it gates the whole stage.
- The owner dogfoods: installs the plugin, deletes code from his data repo.

### Community surface
- Food packs: redistributable foods collections with per-entry provenance, contributed by PR to the template (or a sibling repo). Only provenance-clean sources (USDA public domain, user-measured originals) qualify — INDB-derived entries do not.

## Testing Decisions

- Same single seam as the core PRD: the core package's public API, tested with bun's test runner. New/changed pure logic under test: profile-driven timezone and cutoff (wake-day with configurable cutoff already parameterized; timezone plumbing is new), treatment annotation in summaries (rename/generalize of existing tested behavior), any schema migration scripts (given old-shape day-file, expect new-shape output).
- Template integrity gets a smoke check in CI: fresh-clone → install → validate empty scaffold → tests pass — proving the template works without any personal data present.
- Setup skill and plugin packaging are not unit-tested; their acceptance test is a fresh user (or the owner's slimmed repo) completing onboarding to a first valid logged meal.
- Prior art: the existing core test suite in this repo.

## Out of Scope

- Hosted/multi-user anything: databases, auth, accounts, web backends.
- The visualization website (separate, still-planned feature from the core PRD).
- Paying for or proxying anyone's LLM usage.
- Marketing/launch mechanics (Show HN, etc.).
- Stage 2 implementation details beyond the runtime-prerequisite prototype — sequenced after Stage 1 settles.
- Migrating existing INDB-derived personal cache entries for food packs.

## Further Notes

- Audience is honestly niche: requires Claude Code and terminal comfort — the plain-text-tracking crowd. That is the intended market, not a flaw.
- Stage 1 estimated as roughly a day of work from current state.
- The owner's daily logging must never break mid-migration; his repo is the reference instance throughout.
- Unresolved: (1) license choice MIT vs Apache-2.0; (2) template repo name (`gohan` public + private data fork name); (3) whether food packs live in the template repo or a sibling community repo.
