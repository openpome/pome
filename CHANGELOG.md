# Changelog

## 0.40.0-alpha.0

- Add Repository Knowledge v1 under `.pome/knowledge/repository.json` for metadata-only repository understanding.
- Capture package manager, package names, scripts, build/test/lint/typecheck/validate command maps, source/test/config/generated/sensitive/docs path maps, module boundaries, and CODEOWNERS ownership signals.
- Reuse repository knowledge in `pome start <KEY>` task intelligence, AI planning context, bounded AI patch context selection, and related-test discovery without adding new primary commands.
- Keep sensitive files and generated outputs out of AI source context while still recording their paths as local-only metadata for safer planning.

## 0.39.0-alpha.0

- Add Work Item Intelligence v1 to `pome start <KEY>` through a gateway-generated report.
- Show a stronger task summary, extracted acceptance criteria, clarification questions, affected repository, likely file hints, linked references, dependency signals, test strategy, risk summary, and delivery checklist without adding new primary commands.
- Persist the work item intelligence report in the active task session and expose it through task-session status.
- Keep the CLI thin by rendering the gateway intelligence model in both simple `pome start` and advanced `pome start <KEY>` output.

## 0.38.0-alpha.0

- Add SQLite-backed task session snapshots under `~/.openpome/sessions.sqlite` while keeping JSON state for compatibility during the alpha.
- Add `pome history` so developers can browse active and archived sessions, see latest Jira/story/test/patch/PR/Jira-update status, and resume after a laptop restart.
- Persist active-session snapshots whenever OpenPome writes session state and persist archived snapshots when sessions are stopped or reset.
- Improve resume reliability by reading SQLite session snapshots before falling back to legacy JSON history.
- Strengthen failed-test retry context with root-cause hints so OpenAI, Claude API, and Claude CLI receive clearer repair prompts after validation failures.
- Turn weak Jira story signals into explicit clarification questions during planning so developers can resolve missing acceptance criteria before coding.

## 0.37.0-alpha.0

- Improve corporate network guidance for Jira, GitHub, OpenAI, Claude API, and Claude CLI workflows with clearer VPN, DNS, proxy, permission, SSO, scope, and rate-limit messages.
- Make missing AI-provider guidance explicit in `pome next` so manual-copy mode does not look ready for direct AI patch generation.
- Add stronger sensitive-path and secret-content filtering for AI context and patch proposals before OpenPome asks for approval or writes files.
- Add an explicit `telemetryEnabled: false` config default and doctor check; OpenPome does not send analytics, prompts, source code, diffs, crash dumps, or usage data by default.

## 0.36.0-alpha.0

- Strengthen the AI engine context package with ranked file reasons, workspace metadata, missing-requirement signals, and retry-specific repair instructions for OpenAI, Claude API, and Claude CLI.
- Detect short work-item descriptions, missing acceptance criteria, missing bug expected/actual behavior, missing repro steps, missing labels/components, and missing linked references as explicit planning context.
- Add related-test discovery from likely impacted files and work-item terms while keeping project-level validation commands as the safest default.
- Add a bounded filesystem fallback when Git tracked-file metadata is unavailable, so shallow or unusual local workspaces still produce useful AI context.

## 0.35.0-alpha.0

- Make plain `pome` render the daily assistant cockpit from the gateway decision engine.
- Show active story, codebase, setup readiness, one next action, blockers, and exact commands from the same model used by `pome next`.
- Keep the main flow visible and simple without exposing advanced commands on the home screen.

## 0.34.0-alpha.0

- Add a gateway-level assistant decision engine for `pome next` so CLI and future desktop surfaces share the same next-action brain.
- Improve AI patch context ranking by scoring likely source, test, config, and plan-hinted files before sending bounded context to the model provider.
- Detect missing acceptance criteria in work items and surface it as missing context during planning and next-step guidance.

## 0.33.0-alpha.0

- Create GitHub pull requests through GitHub's REST API when OpenPome has a stored native GitHub OAuth token.
- Keep GitHub CLI PR creation as the fallback when users authenticated through `gh`.
- Record the PR creation provider in approval evidence and task-session timeline events.

## 0.32.0-alpha.0

- Add native GitHub browser/device login for OpenPome-owned auth when `OPENPOME_GITHUB_OAUTH_CLIENT_ID` is configured.
- Store GitHub OAuth tokens in the OS credential store and verify status through GitHub's authenticated-user API before falling back to GitHub CLI auth.
- Update onboarding/auth documentation so the simple setup flow guides Jira, GitHub, and AI connections without exposing connector internals.

## 0.31.0-alpha.0

- Add a visible assistant activity trail to the main CLI flow so developers see what OpenPome is doing while it checks Jira, fetches assigned work, starts a task, asks AI for patches, runs tests, and prepares finish drafts.
- Keep the activity trail factual and operational: it shows observable workflow stages without exposing hidden model reasoning.
- Update the main flow docs to describe OpenPome as a transparent AI assistant, not a silent command runner.

## 0.30.0-alpha.0

- Add the AI retry loop after failed approved tests: `pome next` now asks the active AI provider for a focused fix patch when the latest validation run after the approved patch failed.
- Include bounded failed test command, stdout, and stderr summaries in the AI patch prompt so OpenAI, Claude API, or Claude CLI can propose a targeted repair.
- Keep failed-test fixes behind the same approval checkpoint: AI proposes, OpenPome validates, developer approves, then OpenPome writes.
- Add `pnpm smoke:jira-oauth`, a guarded real Jira OAuth browser-login smoke script for Atlassian OAuth app validation.
- Add regression coverage for the failed-test retry path.

## 0.29.0-alpha.0

- Refresh the active Jira story before status, planning, AI patch proposal/application, test, PR, and Jira update actions.
- Invalidate stale plans, pending AI patches, diff summaries, test evidence, PR drafts, and work-item update drafts when Jira story scope or acceptance criteria changes.
- Add `work_item_refreshed` task session timeline events so developers can see when OpenPome synced the story from Jira.
- Add regression coverage for Jira story refresh and stale-plan invalidation.

## 0.28.0-alpha.0

- Add `pome auth ai claude-cli` for using an installed/authenticated Claude CLI as the active OpenPome model provider.
- Let Claude CLI generate implementation plans and approval-gated patch proposals through `claude --print` while OpenPome keeps file writes behind its own approval checkpoint.
- Report Claude CLI readiness in `pome auth ai status`, `pome onboard`, and `pome doctor`.
- Add a real daily developer workflow guide that documents Jira story -> AI plan -> approved patch -> tests -> GitHub PR -> Jira update as the primary product path.
- Simplify README and demo docs so smoke/demo commands do not appear as the normal corporate developer workflow.

## 0.27.0-alpha.0

- Make plain `pome` a friendly developer dashboard that shows active story state, setup readiness, and the next useful action.
- Remove normal-flow guidance that suggests silent mock work; sample work now stays behind the explicit `pome demo` path.
- Improve the `pome start <KEY>` task intelligence report with story status, selected codebase reasoning, step details, checks, missing context, and risks.

## 0.26.0-alpha.0

- Require a recorded diff review before `pome pr create` can commit, push, and open a PR.
- Add safer PR creation options: `pome pr create --draft`, `pome pr create --base <BRANCH>`, and explicit `--allow-untested`.
- Detect the default GitHub base branch from `origin/HEAD` or `git remote show origin` before falling back to `main`.
- Add `pnpm smoke:external`, an opt-in disposable external smoke script for the real PR/Jira completion flow.
- Update release docs for the `0.26.0-alpha.0` publish and smoke-test path.

## 0.25.0-alpha.0

- Add real approval-gated GitHub PR creation through `pome pr create`.
- `pome pr create` now creates/switches a branch, commits local changes, pushes to origin, and runs `gh pr create` with the prepared PR draft.
- Add real Jira work-item update posting through `pome work-item post-update`.
- Jira Cloud comments are posted using Atlassian document format through the Jira connector.
- Update `pome done` and `pome next` guidance toward explicit PR creation and Jira update posting once drafts are ready.

## 0.24.0-alpha.0

- Add the approval-gated AI patch loop behind the simple flow: `pome next` asks the active OpenAI/Claude provider for minimal file changes after the plan is approved.
- Add safe patch boundaries: bounded source context, sensitive-path filtering, workspace path validation, full-file replacement validation, and explicit `edit_files` approval before writing.
- Make `pome approve` apply the pending AI patch when file changes are waiting for approval; plan approval remains the first approval checkpoint.
- Capture a file-level diff summary after applying approved AI changes, without storing full diffs.
- Add regression coverage proving AI file changes are not written before approval and are applied only after approval.

## 0.23.0-alpha.0

- Add `pome auth ai status`, `pome auth ai openai`, `pome auth ai claude`, and `pome auth ai manual-copy`.
- Store OpenAI and Claude API keys in the OS credential store instead of plaintext config.
- Show active AI provider readiness in `pome onboard` and `pome doctor`.
- Use the active OpenAI/Claude provider for implementation-plan generation when connected, with deterministic fallback only for manual-copy mode.
- Keep AI execution approval-gated; file edits, commands, branches, PRs, and Jira updates still require explicit checkpoints.

## 0.22.0-alpha.0

- Make the primary CLI more product-friendly: `pome work` and `pome start <KEY>` require real Jira by default instead of silently showing mock work.
- Add explicit `pome demo` for trying OpenPome with sample work.
- Simplify `pome onboard` around Jira, GitHub, and AI readiness instead of exposing connector internals.
- Add `pome auth github login` guidance using GitHub CLI auth and keep `pome auth github status` in the setup flow.
- Prefer the current Git repository automatically when starting a task from inside a repo, while keeping advanced workspace commands available for recovery.
- Hide confidence percentages and resolver details from the main task intelligence report.

## 0.21.0-alpha.0

- Add `pnpm release:status` to report npm dist-tags for the actual published OpenPome package set.
- Move release package names into one shared release package list used by publish and status scripts.
- Add `--sync-latest` to the alpha publish script so stale alpha `latest` tags can be moved to the current alpha when npm refuses deletion.
- Make `--remove-latest` cleanup non-fatal when npm rejects deleting `latest`.
- Add `.npmrc` to `.gitignore` to avoid committing local npm auth config.
- Clarify Jira browser-login OAuth output and keep it marked experimental until a real Atlassian OAuth app smoke test passes.

## 0.20.0-alpha.0

- Add simple `pome use <SCOPE_ID>` scope selection.
- Make `pome onboard` and `pome work` auto-select the work scope when exactly one scope is available.
- Make `pome work` show a concise scope setup screen when multiple scopes exist.
- Add helpful guidance when `pome work-item scopes` is called with an accidental work item key.
- Update doctor/help guidance toward the simple `pome work` and `pome use` flow.

## 0.19.0-alpha.0

- Prevent `pome start <KEY>` from overwriting an active task session.
- Make `pome done` wait for plan approval before preparing finish drafts.
- Align generated plan commands with the simplified `pome approve` flow.
- Add regression coverage for active-session overwrite protection.

## 0.18.0-alpha.0

- Add the simple assistant CLI surface: `pome onboard`, `pome work`, `pome next`, `pome approve`, and `pome done`.
- Make `pome start <KEY>` create a task session and initial plan in one step, then print a task intelligence report.
- Add workflow-based next-action guidance so developers do not need to remember the full advanced command set.
- Keep Jira, workspace, AI context, test, PR draft, and update draft commands as advanced building blocks behind the main flow.

## 0.17.0-alpha.0

- Improve first-run CLI guidance for `pome init`, `pome doctor`, and `pome help`.
- Add clearer setup sections, recommended next steps, and the typical first task flow to reduce onboarding confusion.
- Make npm `--remove-latest` cleanup remove any alpha version from the `latest` dist-tag while keeping stable latest tags untouched.

## 0.16.0-alpha.0

- Add manual-copy AI context and prompt commands that exclude source code, secrets, and full diffs.
- Add `pome diff` for Git diff summaries without full diff payloads.
- Add `pome test run [COMMAND]` to execute only previously approved test commands and store run evidence.
- Add `pome github auth status` plus guarded `pome pr create` and `pome work-item post-update` alpha placeholders.
- Add public alpha launch, Jira API-token smoke test, and demo script documentation.
- Add npm publishing and launch-readiness documentation for the alpha package strategy.
- Add token-safe `pnpm release:publish-alpha` and `pnpm smoke:jira` release scripts.
- Keep validation deterministic when local Jira smoke-test environment variables are set.
- Retry final npm alpha-tag verification after publish to avoid failing on short registry propagation delays.
- Document the one-package user install story and add `--remove-latest` cleanup for accidental alpha `latest` tags.

## 0.15.0-alpha.0

- Add `pome test discover`, `pome approve command [COMMAND]`, and `pome test history` for local test-command discovery and approval evidence.
- Add local-only `pome pr draft` and `pome work-item update-draft` outputs from the active task session.
- Mark Jira OAuth/browser auth as experimental until a real Atlassian OAuth app smoke test is completed.
- Tighten npm package file lists so public alpha packages ship compiled artifacts without source or build-info files.

## 0.14.0

- Add CLI launch-readiness metadata for the public alpha package and publish config for its runtime workspace packages.
- Add `pome config path`, `pome config show`, and `pome config reset`.
- Add `pome stop`, `pome resume [SESSION_ID]`, and `pome reset` with bounded local session history.

## 0.13.0

- Persist active task session event timelines and approval history.
- Add `pome timeline` and `pome approvals` for inspecting active session history.
- Make CLI failure output consistent with actionable next steps.

## 0.12.0

- Make the local-gateway work item source adapter scope-neutral with `listScopes()` and `listAssigned(scope)`.
- Add provider-neutral scope CLI aliases: `pome work-item scopes` and `pome work-item scope use <SCOPE_ID>`.
- Keep Jira board commands as aliases over the neutral work item scope flow.

## 0.11.0

- Add workspace metadata scanning for package names, README keywords, CODEOWNERS keywords, branch refs, and recent issue refs from Git logs.
- Improve workspace ranking with linked code URL remote matching and exact work item key signals from branches and recent commits.
- Add gateway test coverage for metadata-assisted workspace resolution.

## 0.10.0

- Add Jira board discovery with `pome jira boards`.
- Add Jira board scope selection with `pome jira board use <BOARD_ID>`.
- Persist selected Jira boards as provider-neutral active work item scopes and use the scope for assigned-work listing.

## 0.9.0

- Split the CLI into a thin router, grouped command handlers, and presentation helpers.
- Add a local-gateway work item source registry boundary before future connectors are added.
- Clarify OAuth, Jira scope selection, and JSON-to-SQLite persistence direction in docs.

## 0.8.0

- Add plan approval and rejection commands: `pome approve plan` and `pome reject`.
- Store plan approval state in the active task session.
- Expand README with app flow, auth setup, workspace examples, linking, and task session usage.

## 0.7.0

- Add task session CLI commands: `pome start <KEY>`, `pome status`, and `pome plan`.
- Persist the active task session under OpenPome home.
- Generate a deterministic first implementation plan and move the session to `awaiting_approval`.

## 0.6.0

- Add `pome workspace link <KEY> <PATH>` for developer-confirmed workspace links.
- Persist learned workspace links under OpenPome home.
- Use learned links to boost `pome workspace resolve <KEY>` with an explainable reason.

## 0.5.0

- Add workspace scan, list, and resolve gateway operations.
- Add `pome workspace scan`, `pome workspace list`, and `pome workspace resolve <KEY>`.
- Persist a local workspace index under OpenPome home and rank workspace candidates with explainable reasons.

## 0.4.1

- Remove deprecated TypeScript `baseUrl` compiler option while preserving path aliases.
- Explicitly include Node.js types in the shared TypeScript config.

## 0.4.0

- Add Vitest gateway-level tests for Jira auth status and doctor behavior.
- Mock credential storage and Jira reachability checks so gateway tests remain deterministic.

## 0.3.0

- Add Vitest test foundation.
- Add deterministic Jira Cloud connector tests for auth mode detection, pagination, direct issue lookup, error handling, and reachability mapping.
- Keep live Jira APIs out of CI by mocking `fetch`.

## 0.2.0

- Harden Jira Cloud live list/show behavior with paginated assigned-work search.
- Fetch `pome jira show <KEY>` directly from Jira in live mode.
- Improve Jira error messages for auth, missing issues, rate limits, and network/VPN failures.
- Document Jira OAuth client registration requirements.

## 0.1.0

- Scaffold OpenPome monorepo foundation.
- Add CLI, local gateway, domain, capability, engine, and connector package shells.
- Add Jira Cloud mock flow, API-token live-mode skeleton, OAuth login skeleton, and macOS Keychain token storage.
