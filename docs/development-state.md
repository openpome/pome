# Development State

This file preserves the current implementation state so a future terminal or agent can continue without losing context.

## Current Phase

Phase 1 has started after completing the Phase 0 scaffold.

Current version: `0.11.0`.

## Completed

- Documentation foundation is in place.
- Product rule clarified: OpenPome is work-item-first; Jira and GitHub are first connectors, not product limits.
- VPN/non-VPN support is documented as an MVP requirement.
- pnpm TypeScript monorepo scaffold is in place.
- Root/scoped `AGENTS.md` files are in place.
- CLI, local gateway, domain, capability, engine, and connector packages exist.
- First CLI commands work with mock work items:
  - `pnpm pome -- init`
  - `pnpm pome -- doctor`
  - `pnpm pome -- jira list`
  - `pnpm pome -- jira show POME-101`
  - `pnpm pome -- work-item list`
  - `pnpm pome -- work-item show POME-101`
- Validation passes with `pnpm validate`.
- Jira auth strategy supports API-token/basic-auth and OAuth browser flow scaffolding.
- `pome auth jira status` reports stored/env auth mode.
- `pome auth jira login` creates the Atlassian authorization URL.
- `pome auth jira login --listen` starts a localhost callback listener.
- `pome auth jira callback <CODE>` exchanges an OAuth code and stores tokens in OS keychain where supported.
- Stored Jira OAuth tokens refresh automatically within five minutes of expiry when client credentials are available.
- `pome doctor` reports Jira reachability separately from auth configuration.
- Live Jira assigned-work list uses paginated search.
- Live `pome jira show <KEY>` fetches the issue directly by key.
- Jira API errors now distinguish auth, missing issues, rate limits, and network/VPN failures.
- Vitest test foundation is installed.
- Jira Cloud connector has deterministic mocked tests for auth modes, pagination, direct lookup, error handling, and reachability.
- Local gateway has deterministic mocked tests for Jira auth status and doctor behavior.
- Removed deprecated TypeScript `baseUrl` compiler option from `tsconfig.base.json` and explicitly included Node.js types.
- Workspace CLI now supports scanning local Git repositories, listing the persisted workspace index, and resolving workspace candidates for a work item.
- Workspace CLI supports explicit developer-confirmed links with `pome workspace link <KEY> <PATH>`.
- Task session CLI supports `pome start <KEY>`, `pome status`, and `pome plan`.
- Approval checkpoint CLI supports `pome approve plan` and `pome reject`.
- README now includes app flow, auth setup, workspace examples, linking, and task session usage.
- CLI implementation is split into a thin router, grouped command handlers, and presentation helpers.
- Local gateway now has a work item source registry boundary; Jira remains the first source behind that registry.
- Docs clarify that JSON files are temporary early CLI state and SQLite is required before event timelines, approval history, memory, retry evidence, and test history.
- Roadmap clarifies OAuth scaffold is MVP-supported while production OAuth hardening is post-MVP.
- `@iamdotk` is the repo code owner through `.github/CODEOWNERS`.
- Jira board scope selection is implemented:
  - `pome jira boards`
  - `pome jira board use <BOARD_ID>`
- The selected Jira board is persisted as a provider-neutral active work item scope in `~/.openpome/config.json`.
- Assigned Jira work listing uses the selected board scope when configured and stays assigned-to-me by default.
- Workspace scanning now records package names, README keywords, CODEOWNERS keywords, recent local branch names, and recent issue refs from Git logs.
- Workspace resolution uses linked code URLs, exact work item keys in branches, recent branch names, recent commit refs, and package metadata as ranking signals.

## Current Implementation Notes

- CLI must remain thin and call `@openpome/local-gateway`.
- Gateway coordinates operations and calls connectors.
- Jira-specific logic stays in `connectors/work-items/jira-cloud`.
- Mock Jira data is the default when credentials are absent.
- Live Jira Basic/API-token mode is scaffolded through environment variables:
  - `OPENPOME_JIRA_BASE_URL`
  - `OPENPOME_JIRA_EMAIL`
  - `OPENPOME_JIRA_API_TOKEN`
- Workspace scanning uses `OPENPOME_WORKSPACE_SCAN_PATHS` when present, then configured scan paths, then the invocation directory.
- Workspace index is stored at `${OPENPOME_HOME:-~/.openpome}/workspace-index.json`.
- Workspace index includes local repo metadata used for resolution confidence; it does not store secrets.
- Developer-confirmed workspace links are stored at `${OPENPOME_HOME:-~/.openpome}/workspace-links.json` and boost workspace resolution.
- Active task session state is stored at `${OPENPOME_HOME:-~/.openpome}/active-task-session.json`.
- Active work item scope is stored in config as `activeWorkItemScope`, with Jira board selection currently mapped to provider `jira-cloud`, kind `board`, and a board id.
- `pome plan` currently creates a deterministic first plan and sets the active session to `awaiting_approval`; model-provider assisted planning comes later.
- `pome approve plan` records approval and moves the active session to `implementing`.
- `pome reject` records rejection and moves the active session to `blocked`.

## Next Pending Items

1. Complete real OAuth smoke test with a configured Atlassian OAuth app.
2. Continue improving workspace resolution with test command history and monorepo package boundary signals.
3. Add session event timeline and approval history storage design.
4. Start GitHub/PR foundation after workspace confidence improves.

## Auth Direction

Support both:

- **API token/basic auth** for scripts, VPN, and simple setup.
- **OAuth/browser auth** for organizations where developers cannot create API tokens.

OAuth must not be designed as Jira-only. Auth belongs to connectors, but gateway and CLI expose provider-neutral setup/status commands.

## Continue Prompt

If resuming later, continue from:

```txt
Read docs/development-state.md, AGENTS.md, apps/cli/AGENTS.md,
services/local-gateway/AGENTS.md, connectors/AGENTS.md, then continue
Phase 1 with Jira scope selection and workspace resolution signal improvements.
Phase 1 Jira scope selection and first-pass workspace metadata signals are now
implemented, so continue with test command history, session event timeline, then
GitHub/PR foundation.
```
