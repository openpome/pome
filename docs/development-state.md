# Development State

This file preserves the current implementation state so a future terminal or agent can continue without losing context.

## Current Phase

Phase 1 has started after completing the Phase 0 scaffold.

Current version: `0.6.0`.

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
- `@iamdotk` is the repo code owner through `.github/CODEOWNERS`.

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
- Developer-confirmed workspace links are stored at `${OPENPOME_HOME:-~/.openpome}/workspace-links.json` and boost workspace resolution.

## Next Pending Items

1. Complete real OAuth smoke test with a configured Atlassian OAuth app.
2. Start task session commands:
   - `pome start <KEY>`
   - `pome status`
   - `pome plan`

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
Phase 1 with task session start/status/plan commands.
```
