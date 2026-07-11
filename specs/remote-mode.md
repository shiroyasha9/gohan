# Remote mode: gohan on claude.ai (phone + web)

Status: shipped 2026-07-11. Depends on: `specs/plugin-prd.md`. Research trail: `specs/mobile-access-research.md`.

## Architecture (proven live, zero infrastructure)

- **Brain**: this repo doubles as a claude.ai plugin marketplace. Settings → Plugins → Add marketplace → "Add from a repository" → `shiroyasha9/gohan`. Skills fire in claude.ai chats (web and mobile app).
- **Hands**: GitHub's official remote MCP server, `https://api.githubcopilot.com/mcp/x/repos`, added as a custom connector. Its repos toolset reads and writes repo files (get file contents returns a `sha`; create-or-update-file commits to a branch).
- **Auth**: a per-user GitHub OAuth App (GitHub does not support dynamic client registration). Homepage `https://claude.ai`, callback `https://claude.ai/api/mcp/auth_callback`; client ID + secret go into the connector config. No secret ever appears in a chat.
- **Database**: the same private data repo. Desktop plugin behavior is unchanged; both surfaces commit to `main` with the same message prefixes.

First end-to-end proof: a meal logged from the phone app, validated against the live diet chart, committed as `log: 2026-07-11 breakfast`.

## Constraints discovered

- On claude.ai only SKILL.md text loads. `${CLAUDE_PLUGIN_ROOT}` is empty: no `schemas.ts`, no script bundles, and the SessionStart hook never runs — hook-injected conventions never arrive. Skills must be self-sufficient remotely.
- The code sandbox has no bun, no repo checkout, and network egress limited to github.com. Assume the USDA API is unreachable; claude.ai's built-in web search is available.
- The claude.ai plugin importer silently drops any skill whose `description:` frontmatter contains angle brackets.
- claude.ai **web** has an open bug (anthropics/claude-ai-mcp#476, June 2026): custom connector tools never reach the model. The **mobile app works**. Documented in the README caveats; re-test web after Anthropic fixes it.

## Decisions

- **Repo discovery**: data repo is named `gohan-data` by convention; skills find it once via connector repo search; a user-stated repo always wins; remembered for the chat. No config file.
- **Validation**: each skill embeds its essential invariants inline (the hook and `validate.js` are absent). Escalation path: read `plugin/schemas.ts` from the public `shiroyasha9/gohan` repo via the same connector.
- **Conventions delivery**: the hook's conventions are mirrored compactly into each skill's Remote mode block, only where used. Editing `plugin/hooks/session-start.sh` requires mirroring the change here and in the skills.
- **Per-user OAuth App**: shipping a shared client would mean publishing its secret. Each user registers their own (2 minutes, README documents it).
- **Trigger is capability-based**: "no shell and no local file tools, only a GitHub connector" — not "no `data/` directory", which would misroute desktop setup in an empty dir.

## Rejected alternatives

- **Custom hosted MCP server** (Cloudflare Workers or Vercel, GitHub App, multi-tenant token store): superseded — GitHub's own MCP server already provides the authenticated write path, and claude.ai bug #476 would have blocked a custom connector identically.
- **First-party GitHub integration**: read-only, cannot commit.
- **PAT in chat/memory + sandbox git push**: plaintext secret in chat context; banned.
- **Telegram/Agent SDK bridge**: fallback only; not needed.

## Canonical Remote mode block

Skills append this section; `<prefix>` and the invariants vary per skill. Conventions bullets (wake-day, confidence, source discipline) are added only where that skill uses them.

```markdown
## Remote mode (claude.ai)

No shell and no local files — only a GitHub connector? Work through it:

- **Repo**: the user's private data repo, `gohan-data` by convention. Find it once via connector repo search; a user-stated repo always wins; remember it for the rest of the chat.
- **Read** files with the connector's file-contents tool and keep the returned `sha`. **Write** the full merged JSON (2-space indent, trailing newline) with create-or-update-file on `main`, commit message `<prefix>: <what>`. On a sha conflict: re-read, re-merge, retry once.
- **No validate script here.** Check output against the invariants below; when unsure, read `plugin/schemas.ts` from the public `shiroyasha9/gohan` repo via the same connector.
```

Remote replacements for script-dependent flows:

- `setup`: create `gohan-data` **private** via the connector (stop and route to manual creation if privacy can't be guaranteed); scaffold all files in one commit; INDB/USDA imports are desktop-only.
- `resolve-food`: lookup ladder becomes foods.json → web search grounded in primary sources (USDA FDC → `usda:<fdcId>`, INDB → `indb:<id>`, otherwise `web:<url>`, confidence at most medium) → cross-checked LLM estimate (`llm-estimate`, low).
- `summarize`: read day-files in range and aggregate manually; cap 14 days, longer ranges go to desktop.
- `recompute`: manual re-derivation, cap ~31 day-files, one batch commit; larger corrections go to desktop.
- `import-diet-chart`: envelope summed manually instead of `summary.js`.

## Unresolved questions

1. Does the connector's create-repository tool guarantee `private: true`? Setup words it defensively; verify on next phone onboarding.
2. Summarize/recompute caps (14/31 files) are guesses; tune once rate-limit behavior is observed.
3. Bug #476 timeline; recheck the web surface after the fix and drop the README caveat.
