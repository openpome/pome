# Development State

This file preserves the current implementation state so a future terminal or agent can continue without losing context.

## Current Phase

Phase 1 has started after completing the Phase 0 scaffold.

Current version: `0.45.0-alpha.0`.

## Completed

- Documentation foundation is in place.
- Product rule clarified: OpenPome is work-item-first; Jira and GitHub are first connectors, not product limits.
- VPN/non-VPN support is documented as an MVP requirement.
- pnpm TypeScript monorepo scaffold is in place.
- Root/scoped `AGENTS.md` files are in place.
- CLI, local gateway, domain, capability, engine, and connector packages exist.
- Early CLI commands still support explicit demo/mock work for local testing:
  - `pnpm pome -- init`
  - `pnpm pome -- doctor`
  - `pnpm pome -- jira list`
  - `pnpm pome -- jira show POME-101`
  - `pnpm pome -- work-item list`
  - `pnpm pome -- work-item show POME-101`
- Validation passes with `pnpm validate`.
- Jira auth strategy supports API-token/basic-auth and OAuth browser flow scaffolding.
- `pome auth jira token` supports simple interactive Jira API-token setup, validates credentials against Jira before storing them, and stores accepted credentials through the OS credential store when available.
- Successful Jira token setup shows the verified Jira account and accessible board information; rejected credentials are not saved.
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
- GitHub foundation supports native OpenPome browser/device login when `OPENPOME_GITHUB_OAUTH_CLIENT_ID` is configured, with GitHub CLI auth as the alpha fallback.
- `pome auth github status` verifies an OpenPome-stored GitHub token through the GitHub authenticated-user API before falling back to GitHub CLI status.
- `pome pr create` creates a branch, commits local changes, pushes, and opens a PR through GitHub's REST API when OpenPome has a stored browser-login token. It falls back to GitHub CLI when the developer authenticated through `gh`.
- PR and work-item update drafts support local-only `pome pr draft` and `pome work-item update-draft`.
- `pome work-item post-update` posts the prepared Jira update through the Jira Cloud connector after the developer explicitly runs the command.
- Active task sessions refresh the Jira story before important continuation actions. If Jira story scope or acceptance criteria changed, OpenPome records `work_item_refreshed`, clears stale plan/AI/test/draft outputs, and moves the session back to planning.
- `getAssistantDecision()` is the gateway-level next-action brain for `pome next`; it detects missing auth, assigned-work selection, planning, approvals, AI patching, validation, failed-test repair, PR creation, Jira update posting, and final completion.
- Plain `pome` renders the daily assistant cockpit from `getAssistantDecision()`, showing active story, setup readiness, blockers, one next action, and exact commands.
- AI patch context selection ranks files by plan hints, work-item tokens, workspace metadata, likely source/test/config paths, and includes the reason each bounded context file was selected before sending it to the model provider.
- Planning now flags short descriptions, missing explicit acceptance criteria, missing bug expected/actual behavior, missing reproduction steps, missing labels/components, and missing linked references as missing context so developers see unclear requirements before implementation work proceeds.
- Test discovery adds related-test candidates from likely impacted files and work-item terms while keeping project-level validation scripts as the default approval path.
- Corporate error handling now gives clearer VPN/network, Jira permission/rate-limit, GitHub permission/SSO/scope, and AI provider setup/rate-limit guidance.
- Sensitive path and secret-content filtering protects AI context and rejects unsafe AI patch proposals before approval or file writes.
- Config explicitly defaults `telemetryEnabled` to `false`; `pome doctor` reports that OpenPome does not send analytics, prompts, source code, diffs, crash dumps, or usage data by default.
- npm publish strategy is documented in `docs/npm-publishing.md`; alpha uses multi-package publishing in runtime dependency order.
- launch status is documented in `docs/launch-readiness.md`.
- The long-term ownership execution plan is documented in `docs/ownership-roadmap.md`; it keeps the public CLI simple while sequencing work item intelligence, repository knowledge, persistent work orders, workflow engine, execution engine, workers, autonomous QA, delivery, and team memory.
- `pnpm release:publish-alpha` publishes the runtime package chain using `NODE_AUTH_TOKEN` from the local environment.
- `pnpm release:publish-alpha` now retries final npm alpha-tag verification to handle short registry propagation delays after successful publish.
- `pnpm release:publish-alpha -- --skip-validate --remove-latest` removes accidental `latest` tags that point at an alpha version after the alpha publish is complete.
- `pnpm release:publish-alpha -- --skip-validate --sync-latest` points stale alpha `latest` tags at the current alpha when npm refuses to delete `latest`.
- `pnpm release:status` reports dist-tags for the actual publishable package set; `@openpome/core`, `@openpome/github`, and `@openpome/jira` are not current npm package names.
- `pnpm smoke:jira` runs the Jira API-token smoke checklist using environment variables only.
- Public npm alpha publish completed through `0.34.0-alpha.0`; isolated global install of `@openpome/cli@alpha` was verified.
- Real Jira API-token smoke test passed against a Jira Cloud Scrum board with assigned issue lookup.
- First-run CLI guidance is improved for `pome`, `pome init`, `pome doctor`, and `pome help` in the current `0.45.0-alpha.0` development version.
- Main developer CLI now exposes the simple assistant flow:
  - `pome`
  - `pome onboard`
  - `pome use <SCOPE_ID>`
  - `pome work`
  - `pome start <KEY>`
  - `pome next`
  - `pome approve`
  - `pome done`
- Plain `pome` now renders a branded OpenPome wordmark home screen with active story, readiness, one next action, and the simple flow.
- Main assistant commands print a compact activity trail so developers can see Jira/story/repo/AI/test/PR stages while commands run without exposing hidden model reasoning.
- `pome start <KEY>` now starts the session and creates the initial plan in one step, then prints a task intelligence report.
- `pome start <KEY>` now refuses to overwrite an existing active task session; developers must run `pome next`, `pome done`, `pome stop`, or `pome reset` first.
- Plan approval output now explains the implementation loop: run `pome next`, let AI propose a patch, validate it, then approve again before OpenPome writes files.
- Manual-copy mode now clearly tells developers to connect Claude CLI, Claude API, or OpenAI before direct AI patch generation.
- Workspace safety is documented: OpenPome writes only inside the selected codebase and should ask before using or creating a project when codebase selection is unclear.
- `pome done` now waits for plan approval before preparing finish drafts.
- Generated initial plans now point at the simplified `pome approve` command instead of the advanced `pome approve plan` form.
- `pome onboard` and `pome work` auto-select the work scope when exactly one scope is available.
- `pome work` shows a concise scope setup screen with `pome use <SCOPE_ID>` when multiple scopes exist.
- `pome work-item scopes <VALUE>` now reports that the command lists scopes and points developers to `pome use <SCOPE_ID>` or `pome start <KEY>`.
- Primary `pome work` and `pome start <KEY>` require real Jira by default; sample work is available only through explicit `pome demo` or `OPENPOME_DEMO=1`.
- `pome onboard` now presents a product-style welcome screen with simple Jira/GitHub/AI readiness, one next action, and a short assigned-work preview when Jira and scope are ready.
- `pome onboard`, plain `pome`, and `pome auth jira status` now guide developers to `pome auth jira token` as the primary Jira setup path; OAuth is shown only when an Atlassian OAuth app is configured.
- `pome work` explains when assigned work is filtered by the active board/scope, and `pome work all` lists all Jira issues assigned to the developer without the saved scope filter for one run.
- Plain `pome` does not suggest AI patch work for stale non-demo sessions when Jira is disconnected; it guides the developer to connect Jira or reset the old session.
- `pome auth github login` runs native GitHub browser/device login when `OPENPOME_GITHUB_OAUTH_CLIENT_ID` is configured, otherwise it explains the GitHub CLI fallback path.
- `pome start <KEY>` prefers the current Git repository automatically when invoked from inside a repo, while advanced workspace commands remain available for repair.
- The primary task intelligence report hides workspace confidence percentages while showing concise human-readable reasons for the selected codebase.
- AI provider CLI supports `pome auth ai status`, `pome auth ai openai`, `pome auth ai claude`, `pome auth ai claude-cli`, and `pome auth ai manual-copy`.
- OpenAI/Claude API keys are stored in the OS credential store through `@openpome/credentials`; plaintext config stores only the active provider id.
- When OpenAI or Claude is active, `pome start <KEY>` uses that provider to generate the implementation plan through the OpenAI Responses API or Anthropic Messages API.
- When Claude CLI is active, `pome start <KEY>` and `pome next` invoke `claude --print` in plan/no-tools/no-session-persistence mode; OpenPome still owns patch approval and file writes.
- Manual-copy remains the deterministic fallback and default provider.
- Approval-gated AI file changes are implemented for connected OpenAI/Claude API providers and Claude CLI:
  - `pome next` proposes minimal file changes after the plan is approved.
  - `pome approve` applies the pending AI patch only after explicit developer approval.
  - OpenPome captures a file-level diff summary after applying approved AI changes.
  - Patch context is bounded and filters sensitive paths; full repository contents are not sent.
- Failed approved test runs trigger the AI retry loop:
  - `pome next` gives the active provider the failed command plus bounded stdout/stderr summaries.
  - Failed-test prompts include a root-cause hint such as type error, assertion mismatch, missing module, timeout, permission/environment failure, or snapshot mismatch.
  - OpenPome requests a focused fix patch and marks the session as `fixing`.
  - `pome approve` applies only the approved fix patch.
  - The next `pome next` reruns the approved test command after the latest patch.
- Planning now turns weak Jira story signals into explicit clarification questions, including missing acceptance criteria, missing bug expected/actual behavior, missing repro steps, unclear owning component, and missing linked references.
- Work Item Intelligence v1 is implemented for `pome start <KEY>`:
  - gateway-generated report includes task summary, extracted acceptance criteria, clarification questions, affected repository, likely file hints, linked references, dependency signals, test strategy, risk summary, and delivery checklist
  - the report is persisted in the active task session and exposed through task-session status
  - simple and advanced start output render the same gateway model without adding new primary commands
- Repository Knowledge v1 is implemented for `pome start <KEY>`:
  - selected workspaces get `.pome/knowledge/repository.json`
  - the knowledge file stores package manager, package names, scripts, build/test/lint/typecheck/validate commands, source/test/config/generated/sensitive/docs path maps, module boundaries, and CODEOWNERS ownership signals
  - knowledge is metadata-only and does not store source contents, secrets, prompts, diffs, or AI responses
  - work item intelligence, planning context, bounded AI patch context selection, and related-test discovery reuse repository knowledge without adding another primary command
- Advanced Jira, workspace, AI context, test, PR draft, and work-item update commands remain available as lower-level building blocks.
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
- Active and archived task sessions are snapshotted into `${OPENPOME_HOME:-~/.openpome}/sessions.sqlite` for durable restart/resume history, while JSON files remain as alpha compatibility state.
- `pome history` lists active and archived sessions with latest story, workspace, event, test, patch, PR, and Jira-update status.
- `pome resume <SESSION_ID>` reads SQLite-backed snapshots before falling back to legacy JSON history, so laptop restarts can recover the last task reliably.
- Stopped or reset task sessions are archived in `task-session-history.json` as a compatibility fallback and can be resumed.
- CLI failure handling now uses consistent error + next-step output for missing session, missing work item, missing scope, and unexpected command errors.
- The CLI package has npm public-alpha metadata, `bin`, Node engine, repository, keywords, and public publish config. Runtime workspace packages used by the CLI are also marked publishable.

## Current Implementation Notes

- CLI must remain thin and call `@openpome/local-gateway`.
- Gateway coordinates operations and calls connectors.
- Jira-specific logic stays in `connectors/work-items/jira-cloud`.
- Primary user commands require real Jira by default. Mock Jira data is only for explicit demo/testing paths such as `pome demo` or tests.
- Live Jira Basic/API-token mode is scaffolded through environment variables:
  - `OPENPOME_JIRA_BASE_URL`
  - `OPENPOME_JIRA_EMAIL`
  - `OPENPOME_JIRA_API_TOKEN`
- Workspace scanning uses `OPENPOME_WORKSPACE_SCAN_PATHS` when present, then configured scan paths, then the invocation directory.
- Workspace index is stored at `${OPENPOME_HOME:-~/.openpome}/workspace-index.json`.
- Workspace index includes local repo metadata used for resolution confidence; it does not store secrets.
- Developer-confirmed workspace links are stored at `${OPENPOME_HOME:-~/.openpome}/workspace-links.json` and boost workspace resolution.
- Active task session state is stored at `${OPENPOME_HOME:-~/.openpome}/active-task-session.json`.
- Durable task session snapshots are stored at `${OPENPOME_HOME:-~/.openpome}/sessions.sqlite`.
- Active task session state currently includes the active event timeline and approval history. SQLite snapshots are now the durable history index; JSON files remain for active-state compatibility and fallback recovery.
- Active task session state currently includes discovered test command candidates, approved command evidence, and generated local PR/work-item update drafts.
- Active task session state currently includes approved test run evidence, manual-copy AI context/prompt text, and diff summaries.
- Active task session snapshots are refreshed from Jira before status, planning, AI patch, test, PR, and Jira-update actions. Material Jira changes reset stale AI outputs so the next plan uses the current story.
- Archived task session history is still written to `${OPENPOME_HOME:-~/.openpome}/task-session-history.json` as a compatibility fallback, but `pome history` and resume prefer SQLite snapshots.
- Active work item scope is stored in config as `activeWorkItemScope`. Jira board selection currently maps to provider `jira-cloud`, kind `board`, and a board id, but the gateway uses a provider-neutral scope API.
- `pome start <KEY>` is now the primary path; it creates the task session and initial plan together.
- `pome plan` remains an advanced command that creates or refreshes the implementation plan and sets the active session to `awaiting_approval`.
- `pome approve` is the primary approval command. It approves the current checkpoint: plan first, then a pending AI file-edit proposal. `pome approve plan` remains the advanced explicit plan approval form.
- `pome reject` records approval history/events and moves the active session to `blocked`.
- `pome test discover` detects likely validation commands from `package.json` scripts and package-manager lockfiles.
- `pome approve command [COMMAND]` records approval evidence only; `pome test run [COMMAND]` is the separate execution checkpoint.
- `pome ai context` and `pome ai prompt` are for safe manual copy into Claude, ChatGPT, Codex, or another provider.
- `pome diff` stores a file-level diff summary only, not the full diff.
- `pome pr draft` and `pome work-item update-draft` produce local drafts. `pome pr create` and `pome work-item post-update` perform external writes only after the developer explicitly runs those commands.
- `pnpm smoke:jira-oauth` runs the guarded real Jira OAuth browser-login smoke checklist with a configured Atlassian OAuth app.
- `docs/daily-developer-workflow.md` documents the real corporate daily flow: Jira story, AI plan, approved AI patch, tests, GitHub PR creation, and Jira update posting.
- README now keeps the real workflow first and moves demo/smoke language into release/testing documentation.

## Next Pending Items

1. Revoke any npm/Jira token that has been pasted into chat, issue trackers, terminal recordings, or logs before release work continues.
2. Publish `0.45.0-alpha.0` after the post-approval implementation guidance PR lands.
3. Run `pnpm release:publish-alpha -- --skip-validate --sync-latest` with a fresh npm token if npm refuses to delete stale alpha `latest` tags.
4. Create GitHub release `v0.45.0-alpha.0` with alpha boundaries and install instructions.
5. Complete real OAuth smoke test with a configured Atlassian OAuth app, or keep OAuth clearly marked experimental for public alpha.
6. Run `pnpm smoke:external` with a disposable GitHub repo/branch and Jira issue before public announcement.
7. Smoke-test Jira OAuth with a real Atlassian OAuth app before calling browser login stable.
8. Start Persistent Work Order v1 so SQLite snapshots have explicit phase, step, owner, and restart checkpoints.
9. Continue improving impacted-file learning from completed SQLite session history.
10. Add safer partial patch support so OpenPome can apply validated hunks instead of requiring full-file replacements for every AI edit.
11. Use `docs/ownership-roadmap.md` as the next planning source: persistent work order model and workflow engine v1 come before broad autonomous worker/agent expansion.

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
Phase 1 with the real daily developer flow:
Jira assigned work -> AI plan -> approved AI patch -> test evidence -> GitHub PR -> Jira update.
Jira scope selection, workspace metadata signals, session timeline/approval
history, config/session recovery, test command discovery/evidence, approved test
runs, AI providers, diff summaries, real GitHub PR creation, and real Jira update
posting are in place. Public npm alpha publish and Jira API-token smoke testing
are complete through 0.35.0-alpha.0; main is now 0.45.0-alpha.0. SQLite
session snapshots, `pome history`, SQLite-first resume, failed-test root-cause
hints, clarification-question planning, work item intelligence, and repository
knowledge are in place. Continue by publishing 0.45.0-alpha.0 with fresh npm
auth, creating the GitHub release, Jira OAuth smoke testing, native GitHub auth
smoke testing, external disposable PR/Jira smoke testing, Persistent Work Order
v1, Workflow Engine v1, impacted-file learning from completed session history,
and safer partial patch support.
```
