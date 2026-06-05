# Launch Readiness

This file is the source of truth for alpha readiness checks.

## Resolved Review Items

- Version consistency: all packages and gateway health use `0.34.0-alpha.0`.
- First-run CLI guidance is improved for `pome init`, `pome doctor`, and `pome help`.
- Main developer flow is now `pome onboard`, optional `pome use <SCOPE_ID>`, `pome work`, `pome start <KEY>`, `pome next`, `pome approve`, and `pome done`.
- Main developer flow now prints a compact activity trail so users can see Jira/story/repo/AI/test/PR stages while commands run.
- Work scope setup auto-selects when only one scope is available and uses `pome use <SCOPE_ID>` when a developer must choose.
- `pome work` and `pome start <KEY>` require real Jira by default; `pome demo` is the explicit sample-work path.
- `pome onboard` shows simple Jira/GitHub/AI readiness and one next action instead of raw provider internals.
- `pome start <KEY>` prefers the current Git repo automatically when run from inside one.
- `pome auth ai openai` and `pome auth ai claude` connect API keys through the OS credential store.
- `pome auth ai claude-cli` uses an installed/authenticated Claude CLI without storing an Anthropic API key in OpenPome.
- `pome auth github login` supports native GitHub browser/device login when an OAuth client ID is configured and falls back to GitHub CLI guidance for alpha compatibility.
- `pome auth github status` verifies OpenPome-stored GitHub tokens before checking GitHub CLI status.
- `pome pr create` opens pull requests through GitHub's REST API when OpenPome has a stored browser-login token, with GitHub CLI as the fallback.
- Connected OpenAI/Claude providers can generate implementation plans and approval-gated AI file patch proposals.
- `pome next` uses a gateway-level assistant decision engine so CLI and future desktop surfaces share one next-action model.
- AI patch context selection ranks likely source/test/config files and plan-hinted files before sending bounded context to the model provider.
- Planning flags missing explicit acceptance criteria as missing context instead of silently treating vague tickets as ready.
- Active task sessions refresh the Jira story before important continuation actions and reset stale AI outputs when story scope or acceptance criteria changes.
- Failed approved test runs now feed the next `pome next` AI repair prompt, and the repair patch stays behind developer approval before OpenPome writes files.
- Active task sessions are protected from accidental overwrite when starting a new work item.
- `pome done` waits for plan approval before preparing finish drafts.
- Advanced Jira/workspace/session/test/draft commands remain available but are no longer the primary path.
- CLI publishability: `@openpome/cli` is `private: false`, has `publishConfig.access=public`, has a `bin` entry, and ships a dist-only file list.
- Help output: `pome help` lists config, session lifecycle, AI context, diff, test, GitHub auth, PR draft/create, and work-item update commands.
- Workspace dependency strategy: OpenPome uses multi-package publishing for alpha. Runtime packages are publishable in dependency order.
- Docs: README, changelog, development state, launch checklist, Jira smoke test, demo script, and npm publishing docs are present.
- Previous npm alpha publishing completed for `0.26.0-alpha.0`. Check current published tags with `pnpm release:status`.
- Isolated global install was verified with `npm install -g @openpome/cli@alpha`.
- Real Jira API-token smoke test passed against a Jira Cloud Scrum board with assigned issue lookup.
- Plain `pome` now shows a friendly dashboard instead of the full advanced command list.
- Doctor guidance points to `pome onboard` or explicit `pome demo`; normal setup no longer suggests silent mock work.
- README and `docs/daily-developer-workflow.md` now present the real Jira -> AI -> PR -> Jira-update workflow before demo/smoke material.

## Still Required

- Jira OAuth smoke test with a configured Atlassian OAuth app, or keep OAuth labeled experimental.
- Publish `0.34.0-alpha.0` after the smarter assistant decision engine PR lands.
- Sync npm `latest` to `0.34.0-alpha.0` if npm refuses to delete stale alpha `latest` tags, so default installs do not receive old CLI builds.
- Create a GitHub release for `v0.34.0-alpha.0`.
- Real GitHub PR creation and Jira posting are implemented behind explicit CLI commands. Smoke-test them with a disposable repo/Jira issue before public announcement.

## Release Scripts

- `pnpm release:publish-alpha` publishes the runtime package chain with the `alpha` dist-tag. It reads `NODE_AUTH_TOKEN` from the local shell and does not require tokens in repo files.
- `pnpm release:publish-alpha -- --skip-validate --remove-latest` attempts to remove only `latest` tags that point at an alpha version after the alpha publish is complete.
- `pnpm release:publish-alpha -- --skip-validate --sync-latest` points stale alpha `latest` tags at the current alpha when npm refuses to delete `latest`.
- `pnpm release:status` prints the release tags for the actual OpenPome npm package set.
- `pnpm smoke:jira` runs the Jira API-token smoke checklist from environment variables.
- `pnpm smoke:jira-oauth` runs the guarded real Jira OAuth browser-login smoke checklist. It requires `OPENPOME_JIRA_OAUTH_SMOKE=I_UNDERSTAND_THIS_USES_REAL_JIRA_OAUTH`.
- `pnpm smoke:github-oauth` runs the guarded real GitHub OAuth device-login smoke checklist. It requires `OPENPOME_GITHUB_OAUTH_SMOKE=I_UNDERSTAND_THIS_USES_REAL_GITHUB_OAUTH`.
- `pnpm smoke:external` runs the opt-in disposable GitHub PR/Jira posting smoke flow. It requires `OPENPOME_EXTERNAL_SMOKE=I_UNDERSTAND_THIS_CREATES_PR_AND_JIRA_COMMENT`.

If a publish or Jira token is exposed outside a local shell or password manager, revoke it and create a replacement before release work continues.

## Current Safe External Action Behavior

`pome done` prepares local PR and Jira update drafts. External writes happen only through explicit follow-up commands:

```bash
pome pr create
pome work-item post-update
```

Those commands record approval history and then perform the requested external action.

## Disposable External Smoke Test

Use only a disposable GitHub repository/branch and a disposable Jira issue.

Required environment:

```bash
export OPENPOME_EXTERNAL_SMOKE=I_UNDERSTAND_THIS_CREATES_PR_AND_JIRA_COMMENT
export OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net
export OPENPOME_JIRA_EMAIL=you@example.com
export OPENPOME_JIRA_API_TOKEN=...
export OPENPOME_SMOKE_WORK_ITEM_KEY=SCRUM-1
export OPENPOME_SMOKE_REPO_PATH=/path/to/disposable/repo
export OPENPOME_SMOKE_ALLOW_UNTESTED=1
```

Optional:

```bash
export OPENPOME_SMOKE_PR_BASE=main
export OPENPOME_HOME=/tmp/openpome-external-smoke
```

Run:

```bash
pnpm validate
pnpm smoke:external
```

## Jira OAuth Smoke Test

Use a real Atlassian OAuth 2.0 3LO app with localhost callback:

```bash
export OPENPOME_JIRA_OAUTH_SMOKE=I_UNDERSTAND_THIS_USES_REAL_JIRA_OAUTH
export OPENPOME_JIRA_OAUTH_CLIENT_ID=...
export OPENPOME_JIRA_OAUTH_CLIENT_SECRET=...
export OPENPOME_JIRA_OAUTH_REDIRECT_URI=http://127.0.0.1:48731/auth/jira/callback
export OPENPOME_JIRA_SMOKE_SCOPE_ID=<optional-scope-id>

pnpm smoke:jira-oauth
```

The script runs `pome auth jira login --listen`, waits for browser approval, verifies stored OAuth auth status, lists scopes, and optionally validates assigned work in the selected scope.

## GitHub OAuth Smoke Test

Use a real GitHub OAuth app with Device Flow enabled:

```bash
export OPENPOME_GITHUB_OAUTH_SMOKE=I_UNDERSTAND_THIS_USES_REAL_GITHUB_OAUTH
export OPENPOME_GITHUB_OAUTH_CLIENT_ID=...
export OPENPOME_GITHUB_OAUTH_SCOPE="repo read:user"

pnpm smoke:github-oauth
```

The script runs `pome auth github login`, waits for browser/device approval, verifies stored GitHub auth status, and runs `pome onboard` against the isolated smoke state.
