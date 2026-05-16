# Public Alpha Launch

This is the launch checklist for the CLI public alpha.

## Install

```bash
npm install -g @openpome/cli@alpha
pome init
pome doctor
```

Until npm publishing is complete, test from the repository:

```bash
pnpm install
pnpm validate
pnpm pome -- init
pnpm pome -- doctor
```

## First-Run Flow

```bash
pome auth jira status
pome work-item scopes
pome work-item scope use <SCOPE_ID>
pome jira list
pome jira show <KEY>
pome workspace scan
pome workspace resolve <KEY>
pome workspace link <KEY> <PATH>
pome start <KEY>
pome plan
pome approve plan
pome ai context
pome diff
pome test discover
pome approve command
pome test run
pome pr draft
pome work-item update-draft
```

## Public Alpha Boundaries

- Jira API-token mode is the recommended auth path.
- Jira OAuth/browser mode is experimental until a real Atlassian OAuth app smoke test is complete.
- `pome pr create` is guarded and does not create an external PR yet.
- `pome work-item post-update` is guarded and does not post to Jira yet.
- Manual-copy AI context excludes source code, secrets, and full diffs.
- Diff summaries exclude full diff contents.

## Release Checks

```bash
pnpm validate
pnpm --filter @openpome/cli pack --pack-destination /tmp/openpome-pack
npm whoami
npm org ls openpome
```

Publishing requires npm 2FA OTP or a granular publish token.

See [npm Publishing](npm-publishing.md) for the package order. OpenPome uses multi-package publishing for alpha; do not run the global npm install check until the runtime package chain is published.
