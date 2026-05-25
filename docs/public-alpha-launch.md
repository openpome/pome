# Public Alpha Launch

This is the launch checklist for the CLI public alpha.

## Install

```bash
npm install -g @openpome/cli@alpha
pome onboard
pome work
```

Most users install only `@openpome/cli@alpha`. The other `@openpome/*` npm packages are runtime dependencies installed automatically.

For local development, test from the repository:

```bash
pnpm install
pnpm validate
pnpm pome -- onboard
pnpm pome -- work
```

## First-Run Flow

```bash
pome onboard
pome work
pome start <KEY>
pome next
pome approve
pome done
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

Convenience commands:

```bash
pnpm smoke:jira
NODE_AUTH_TOKEN=your-npm-publish-token pnpm release:publish-alpha
NODE_AUTH_TOKEN=your-new-npm-publish-token pnpm release:publish-alpha -- --skip-validate --remove-latest
NODE_AUTH_TOKEN=your-new-npm-publish-token pnpm release:publish-alpha -- --skip-validate --sync-latest
pnpm release:status
```
