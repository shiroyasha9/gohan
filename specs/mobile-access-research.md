# Research: Logging from the phone (Claude app)

Status: findings, no decision yet
Date: 2026-07-11
Question: how can the owner log meals (text + photos), record weight, and get summaries from his phone, given gohan is a Claude Code plugin writing JSON to a private git repo?

## Constraints that shape every option

- Photo → nutrition estimation always happens in whatever LLM hosts the chat. Tools/servers only ever receive structured args the model passes; the server never needs the raw photo ([MCP tools spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)).
- git-as-database (commit per meal, private repo as source of truth) is gohan's core design; options differ mainly in how they reach it.
- Owner is on a Claude subscription; options split into subscription-token surfaces (claude.ai chat, cloud Claude Code, Agent SDK today) vs paid-API surfaces (custom app, Shortcuts).

## Option A - Cloud Claude Code sessions (Code tab in Claude app / claude.ai/code)

The user's option 1. Cloud sessions run in Anthropic-managed sandboxes, clone a GitHub repo (private OK; creds held outside the sandbox by a proxy), and are usable from the mobile app incl. photo upload ([announcement](https://www.anthropic.com/news/claude-code-on-the-web), [sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)).

- Plugin skills load in cloud sessions, but **hooks do not run** - gohan's SessionStart conventions injection is dead there ([plugins in Claude](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)).
- Git flow is branch + PR with manual review, not commit-to-main - breaks commit-per-meal ([announcement](https://www.anthropic.com/news/claude-code-on-the-web)).
- Unverified: whether the sandbox honors repo-checked-in marketplace/plugin settings, whether bun exists there (setup scripts can install deps: [power-user tips](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips)).
- Ergonomics: start/resume a session, wait for sandbox, review a branch - per-meal friction is high. It is a dev surface, not a logging surface.

Verdict: workable for occasional/repair use, wrong shape for 3-5x daily logging.

## Option B - claude.ai custom Skills + code-exec sandbox + git push (zero infra)

Consumer claude.ai accepts custom skill ZIPs (same SKILL.md format) on all plans, managed in Settings → Capabilities/Skills; skills run inside the code-execution sandbox ([use skills](https://support.claude.com/en/articles/12512180-use-skills-in-claude), [create custom skills](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)). That sandbox has network access to an allowlist that includes github.com on Free/Pro/Max ([files/code env](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude)). So in principle: port gohan skills, have Claude clone the data repo with a PAT, edit JSON, push.

- Unverified showstoppers: authenticated push through the allowlist; whether skills execute in mobile chats at all (docs silent); sandbox lifetime within a chat.
- No persistence between chats (re-clone every time); PAT has to live somewhere Claude can read (secret-hygiene smell); bun bundles won't run (Python/Node sandbox) so scripts need porting or dropping.

Verdict: zero-infra and tempting, but stacked unverified assumptions; needs a live spike before trusting it. Even if it works, every log pays clone+push latency inside the chat.

## Option C - Remote MCP server as a custom connector (+ Project for conventions)

The consumer-surface equivalent of "install gohan on my phone": a small personal MCP server exposing `log_meal`, `log_weight`, `get_summary`, `resolve_food`, added once as a custom connector, then available in normal Claude app chats on iOS/Android ([custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), [connectors on mobile](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities)).

- Build: Cloudflare Workers `remote-mcp-authless` template, Streamable HTTP, tools defined with the existing `packages/core` zod schemas; ~400-700 LOC, ~1-2 focused days; free tier covers a personal logger ([CF guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/)).
- Auth: OAuth optional. Bearer/API-key request headers exist in the connector dialog but are beta/rolling out ([remote MCP docs](https://claude.com/docs/connectors/custom/remote-mcp)); fallback is secret URL or full OAuth.
- Persistence: GitHub Contents API with a fine-grained PAT (Contents r/w on the data repo only): GET sha → PUT new content = one commit per meal; 5k req/hr limit is irrelevant at personal scale; SHA-conflict retry needed ([contents API](https://docs.github.com/en/rest/repos/contents)). git stays the database; desktop plugin keeps working against the same repo (pull before log).
- Intelligence: photo estimation + orchestration run in the subscription chat model - no API key, no separate billing.
- Conventions layer: wake-day/confidence/source discipline re-homed into tool descriptions + a claude.ai Project's instructions; optionally an uploaded skill (see B) drives the connector - skill+MCP is an endorsed pattern ([skills+MCP](https://claude.com/blog/extending-claude-capabilities-with-skills-mcp-servers)).
- Add connector on desktop/web once (mobile add is beta); use from phone afterwards.

Verdict: the strongest "open Claude app, send photo, done" path. Cost: one small server to own, and skill logic re-expressed as tools + instructions.

## Option D - Headless bridge: Agent SDK runs the plugin verbatim, Telegram as the phone UI

The Agent SDK loads the shipped plugin unchanged via `plugins: [{ type: "local", path: ".../gohan/plugin" }]` - skills, hooks, bun scripts, commit protocol all intact, cwd = data repo ([SDK plugins](https://code.claude.com/docs/en/agent-sdk/plugins)). Bridge Telegram (long-polling, no public URL needed; photos supported) to `query()` on an always-on machine ([Telegram Bot API](https://core.telegram.org/bots/api)).

- Billing: subscription OAuth for the Agent SDK is currently allowed and draws from plan limits; Anthropic announced a separate metered SDK credit, then paused it 2026-06-15 - unchanged today, may return ([SDK with plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan), [pause coverage](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/)). API key is the stable fallback.
- Photos: base64 blocks via streaming input, or write to disk and let the log-meal skill read it ([SDK TS docs](https://code.claude.com/docs/en/agent-sdk/typescript)).
- Cost of ownership: a few hundred LOC bot + an always-on host (home Mac via launchd, or small VPS). UI is Telegram, not the Claude app.

Verdict: highest fidelity (the actual plugin, actual commit protocol), lowest rework; trades "Claude app" for Telegram and adds an always-on process to babysit.

## Option E - Custom app (Mastra or plain AI SDK + Expo/TanStack)

The user's option 3. Mastra has agents/memory/tools/MCP but no skills primitive - gohan's 8 skills don't port; only `packages/core` reuses. Cheap vision models (Gemini Flash class, $0.25-0.30/M in) make per-photo cost sub-cent via AI Gateway, but VLM nutrition estimation is only moderately accurate per recent benchmarks, and you rebuild chat UI, camera flow, GitHub persistence, auth ([Mastra](https://mastra.ai), [MCP client](https://mastra.ai/en/reference/tools/mcp-client), [accuracy](https://arxiv.org/html/2504.06925v1)).

Verdict: most work, least reuse, off-subscription; justified only if a branded standalone app is itself the goal.

## Dismissed

- **Claude Tag / Claude in Slack**: Team/Enterprise only - wrong tier for a solo tracker ([what is Claude Tag](https://support.claude.com/en/articles/15594475-what-is-claude-tag)).
- **First-party GitHub connector on claude.ai**: read-only sync, no write path ([GitHub integration](https://support.claude.com/en/articles/10167454-use-the-github-integration)) - useful as read context, not for logging.
- **iOS Shortcuts → API / email-in**: capture without gohan's logic; reimplements logging or defers it. Note: Claude iOS app ships App Intents/Shortcuts/widgets - useful as a launcher on top of whichever option wins ([iOS shortcuts](https://support.claude.com/en/articles/10263469-use-claude-app-intents-shortcuts-and-widgets-on-ios)).

## Sensible combinations

- C is phone-primary; the existing plugin stays desktop-primary; both write the same repo (server commits via API, desktop pulls first).
- B's skill-upload, even if push fails, still works as the conventions/UX layer on top of C's connector.
- D can be a stopgap or a fallback if connector auth beta stalls.

## Unresolved questions

1. Does the owner's account have the connector request-header (bearer) auth beta? Gates C's easy auth path.
2. Do uploaded skills execute in mobile-app chats? Gates B, affects B+C combo.
3. Can the code-exec sandbox do an authenticated git push? Gates B entirely.
4. Does the paused Agent SDK subscription-billing change return? Long-term risk on D.
5. Concurrency: if phone (API commits) and desktop (local commits) log the same day-file, who wins? Needs a pull-before-log rule or server-side-only writes for phone days.
6. Summaries on phone: port summary math into MCP tools, or let the chat model compute from raw JSON (slower, drift risk)?
