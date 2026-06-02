# Launch Readiness

This file is the source of truth for alpha readiness checks.

## Resolved Review Items

- Version consistency: all packages and gateway health use `0.25.0-alpha.0`.
- First-run CLI guidance is improved for `pome init`, `pome doctor`, and `pome help`.
- Main developer flow is now `pome onboard`, optional `pome use <SCOPE_ID>`, `pome work`, `pome start <KEY>`, `pome next`, `pome approve`, and `pome done`.
- Work scope setup auto-selects when only one scope is available and uses `pome use <SCOPE_ID>` when a developer must choose.
- `pome work` and `pome start <KEY>` require real Jira by default; `pome demo` is the explicit sample-work path.
- `pome onboard` shows simple Jira/GitHub/AI readiness and one next action instead of raw provider internals.
- `pome start <KEY>` prefers the current Git repo automatically when run from inside one.
- `pome auth ai openai` and `pome auth ai claude` connect API keys through the OS credential store.
- Connected OpenAI/Claude providers can generate implementation plans and approval-gated AI file patch proposals.
- Active task sessions are protected from accidental overwrite when starting a new work item.
- `pome done` waits for plan approval before preparing finish drafts.
- Advanced Jira/workspace/session/test/draft commands remain available but are no longer the primary path.
- CLI publishability: `@openpome/cli` is `private: false`, has `publishConfig.access=public`, has a `bin` entry, and ships a dist-only file list.
- Help output: `pome help` lists config, session lifecycle, AI context, diff, test, GitHub auth, PR draft/create, and work-item update commands.
- Workspace dependency strategy: OpenPome uses multi-package publishing for alpha. Runtime packages are publishable in dependency order.
- Docs: README, changelog, development state, launch checklist, Jira smoke test, demo script, and npm publishing docs are present.
- Previous npm alpha publishing completed for the runtime package chain. Check current published tags with `pnpm release:status`.
- Isolated global install was verified with `npm install -g @openpome/cli@alpha`.
- Real Jira API-token smoke test passed against a Jira Cloud Scrum board with assigned issue lookup.

## Still Required

- Jira OAuth smoke test with a configured Atlassian OAuth app, or keep OAuth labeled experimental.
- Publish `0.25.0-alpha.0` after the real PR creation and Jira posting PR lands.
- Sync npm `latest` to `0.25.0-alpha.0` if npm refuses to delete stale alpha `latest` tags, so default installs do not receive old CLI builds.
- Create a GitHub release for `v0.25.0-alpha.0`.
- Real GitHub PR creation and Jira posting are implemented behind explicit CLI commands. Smoke-test them with a disposable repo/Jira issue before public announcement.

## Release Scripts

- `pnpm release:publish-alpha` publishes the runtime package chain with the `alpha` dist-tag. It reads `NODE_AUTH_TOKEN` from the local shell and does not require tokens in repo files.
- `pnpm release:publish-alpha -- --skip-validate --remove-latest` attempts to remove only `latest` tags that point at an alpha version after the alpha publish is complete.
- `pnpm release:publish-alpha -- --skip-validate --sync-latest` points stale alpha `latest` tags at the current alpha when npm refuses to delete `latest`.
- `pnpm release:status` prints the release tags for the actual OpenPome npm package set.
- `pnpm smoke:jira` runs the Jira API-token smoke checklist from environment variables.

If a publish or Jira token is exposed outside a local shell or password manager, revoke it and create a replacement before release work continues.

## Current Safe External Action Behavior

`pome done` prepares local PR and Jira update drafts. External writes happen only through explicit follow-up commands:

```bash
pome pr create
pome work-item post-update
```

Those commands record approval history and then perform the requested external action.
