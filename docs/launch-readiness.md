# Launch Readiness

This file is the source of truth for alpha readiness checks.

## Resolved Review Items

- Version consistency: all packages and gateway health use `0.16.0-alpha.0`.
- CLI publishability: `@openpome/cli` is `private: false`, has `publishConfig.access=public`, has a `bin` entry, and ships a dist-only file list.
- Help output: `pome help` lists config, session lifecycle, AI context, diff, test, GitHub auth, PR draft/create, and work-item update commands.
- Workspace dependency strategy: OpenPome uses multi-package publishing for alpha. Runtime packages are publishable in dependency order.
- Docs: README, changelog, development state, launch checklist, Jira smoke test, demo script, and npm publishing docs are present.

## Still Required

- npm publish, blocked on npm publish 2FA or a granular publish token.
- Real Jira API-token smoke test with an OpenPome-accessible Jira account.
- Jira OAuth smoke test with a configured Atlassian OAuth app, or keep OAuth labeled experimental.
- GitHub PR creation implementation behind explicit approval.
- Jira work-item posting implementation behind explicit approval.

## Release Scripts

- `pnpm release:publish-alpha` publishes the runtime package chain with the `alpha` dist-tag. It reads `NODE_AUTH_TOKEN` from the local shell and does not require tokens in repo files.
- `pnpm smoke:jira` runs the Jira API-token smoke checklist from environment variables.

If a publish or Jira token is exposed outside a local shell or password manager, revoke it and create a replacement before release work continues.

## Current Safe External Action Behavior

`pome pr create` and `pome work-item post-update` are intentionally guarded in alpha. They report the safe manual path and do not write to GitHub or Jira.
