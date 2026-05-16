# Development State

This file preserves the current implementation state so a future terminal or agent can continue without losing context.

## Current Phase

Phase 1 has started after completing the Phase 0 scaffold.

Current version: `0.16.0-alpha.0`.

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
- Task session CLI supports `pome start <KEY>`, `pome status`, `pome timeline`, `pome approvals`, `pome stop`, `pome resume [SESSION_ID]`, `pome reset`, and `pome plan`.
- Config CLI supports `pome config path`, `pome config show`, and `pome config reset`.
- Approval checkpoint CLI supports `pome approve plan` and `pome reject`.
- Test command discovery supports `pome test discover`, `pome approve command [COMMAND]`, and `pome test history`.
- Approved test execution supports `pome test run [COMMAND]`; it only runs commands with recorded approval evidence and stores bounded output summaries.
- Manual-copy AI context supports `pome ai context` and `pome ai prompt`; generated text excludes source code, secrets, and full diffs.
- Diff summaries support `pome diff`; summaries include file/status/count metadata and exclude full diff contents.
- GitHub foundation supports `pome github auth status`; external PR creation remains guarded.
- PR and work-item update drafts support local-only `pome pr draft` and `pome work-item update-draft`.
- `pome pr create` and `pome work-item post-update` are explicit guarded commands in alpha; they explain the safe manual path instead of performing external writes.
- README now includes app flow, auth setup, workspace examples, linking, and task session usage.
- CLI implementation is split into a thin router, grouped command handlers, and presentation helpers.
- Local gateway now has a work item source registry boundary; Jira remains the first source behind that registry.
- Docs clarify that JSON files are temporary early CLI state and SQLite is required before multi-session timelines, memory, retry evidence, and test history.
- Roadmap clarifies OAuth scaffold is MVP-supported while production OAuth hardening is post-MVP.
- `@iamdotk` is the repo code owner through `.github/CODEOWNERS`.
- Jira board scope selection is implemented:
  - `pome work-item scopes`
  - `pome work-item scope use <SCOPE_ID>`
  - `pome jira boards`
  - `pome jira board use <BOARD_ID>`
- The selected Jira board is persisted as a provider-neutral active work item scope in `~/.openpome/config.json`.
- Assigned Jira work listing uses the selected board scope when configured and stays assigned-to-me by default.
- Work item source registry now exposes provider-neutral `listScopes()` and `listAssigned(scope)` adapter methods; Jira board commands are aliases over the neutral scope API.
- Workspace scanning now records package names, README keywords, CODEOWNERS keywords, recent local branch names, and recent issue refs from Git logs.
- Workspace resolution uses linked code URLs, exact work item keys in branches, recent branch names, recent commit refs, and package metadata as ranking signals.
- Active task sessions persist an event timeline and approval history in `active-task-session.json`.
- Stopped or reset task sessions are archived in `task-session-history.json` and can be resumed.
- CLI failure handling now uses consistent error + next-step output for missing session, missing work item, missing scope, and unexpected command errors.
- The CLI package has npm public-alpha metadata, `bin`, Node engine, repository, keywords, and public publish config. Runtime workspace packages used by the CLI are also marked publishable.

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
- Active task session state currently includes the active event timeline and approval history. This remains JSON-backed until the SQLite migration.
- Active task session state currently includes discovered test command candidates, approved command evidence, and generated local PR/work-item update drafts.
- Active task session state currently includes approved test run evidence, manual-copy AI context/prompt text, and diff summaries.
- Archived task session history is stored at `${OPENPOME_HOME:-~/.openpome}/task-session-history.json`.
- Active work item scope is stored in config as `activeWorkItemScope`. Jira board selection currently maps to provider `jira-cloud`, kind `board`, and a board id, but the gateway uses a provider-neutral scope API.
- `pome plan` currently creates a deterministic first plan and sets the active session to `awaiting_approval`; model-provider assisted planning comes later.
- `pome approve plan` records approval history/events and moves the active session to `implementing`.
- `pome reject` records approval history/events and moves the active session to `blocked`.
- `pome test discover` detects likely validation commands from `package.json` scripts and package-manager lockfiles.
- `pome approve command [COMMAND]` records approval evidence only; `pome test run [COMMAND]` is the separate execution checkpoint.
- `pome ai context` and `pome ai prompt` are for safe manual copy into Claude, ChatGPT, Codex, or another provider.
- `pome diff` stores a file-level diff summary only, not the full diff.
- `pome pr draft` and `pome work-item update-draft` produce local drafts only; they do not create a PR or post to Jira.

## Next Pending Items

1. Complete real OAuth smoke test with a configured Atlassian OAuth app, or keep OAuth clearly marked experimental for public alpha.
2. Continue improving workspace resolution with test command history and monorepo package boundary signals.
3. Add real GitHub PR creation behind explicit approval after the guarded `pome pr create` placeholder is replaced.
4. Add real Jira work-item update posting behind explicit approval after the guarded `pome work-item post-update` placeholder is replaced.
5. Publish to npm after npm 2FA or a publish token is available.

## Auth Direction

Support both:

- **API token/basic auth** for scripts, VPN, and simple setup.
- **OAuth/browser auth** for organizations where developers cannot create API tokens. This path is experimental until the real Atlassian OAuth app smoke test is completed.

OAuth must not be designed as Jira-only. Auth belongs to connectors, but gateway and CLI expose provider-neutral setup/status commands.

## Continue Prompt

If resuming later, continue from:

```txt
Read docs/development-state.md, AGENTS.md, apps/cli/AGENTS.md,
services/local-gateway/AGENTS.md, connectors/AGENTS.md, then continue
Phase 1 with Jira scope selection and workspace resolution signal improvements.
Phase 1 Jira scope selection and first-pass workspace metadata signals are now
implemented, and session timeline/approval history is JSON-backed in the active
session. CLI launch recovery/config commands, test command discovery/evidence,
approved test runs, manual-copy AI context/prompt, diff summaries, and local
PR/work-item update drafts are in place. Continue with OAuth smoke testing,
workspace ranking improvements from evidence, npm publishing, and approval-gated
PR/Jira posting.
```
