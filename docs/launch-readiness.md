# Launch Readiness

This file is the source of truth for alpha readiness checks.

## Resolved Review Items

- Version consistency: all packages and gateway health use `0.17.0-alpha.0`.
- First-run CLI guidance is improved for `pome init`, `pome doctor`, and `pome help`.
- CLI publishability: `@openpome/cli` is `private: false`, has `publishConfig.access=public`, has a `bin` entry, and ships a dist-only file list.
- Help output: `pome help` lists config, session lifecycle, AI context, diff, test, GitHub auth, PR draft/create, and work-item update commands.
- Workspace dependency strategy: OpenPome uses multi-package publishing for alpha. Runtime packages are publishable in dependency order.
- Docs: README, changelog, development state, launch checklist, Jira smoke test, demo script, and npm publishing docs are present.
- Previous npm alpha publishing completed for the runtime package chain, and `@openpome/cli@alpha` currently resolves to `0.16.0-alpha.0`.
- Isolated global install was verified with `npm install -g @openpome/cli@alpha`.
- Real Jira API-token smoke test passed against a Jira Cloud Scrum board with assigned issue lookup.

## Still Required

- Jira OAuth smoke test with a configured Atlassian OAuth app, or keep OAuth labeled experimental.
- Publish `0.17.0-alpha.0` after this onboarding polish lands.
- Remove accidental alpha `latest` npm dist-tags after creating a fresh npm token, so public alpha remains alpha-tagged only.
- Create a GitHub release for `v0.17.0-alpha.0`.
- GitHub PR creation implementation behind explicit approval.
- Jira work-item posting implementation behind explicit approval.

## Release Scripts

- `pnpm release:publish-alpha` publishes the runtime package chain with the `alpha` dist-tag. It reads `NODE_AUTH_TOKEN` from the local shell and does not require tokens in repo files.
- `pnpm release:publish-alpha -- --skip-validate --remove-latest` removes only `latest` tags that point at an alpha version after the alpha publish is complete.
- `pnpm smoke:jira` runs the Jira API-token smoke checklist from environment variables.

If a publish or Jira token is exposed outside a local shell or password manager, revoke it and create a replacement before release work continues.

## Current Safe External Action Behavior

`pome pr create` and `pome work-item post-update` are intentionally guarded in alpha. They report the safe manual path and do not write to GitHub or Jira.
