# npm Publishing

OpenPome uses a multi-package publish strategy for the public alpha.

The CLI is intentionally thin and depends on the local gateway and provider-neutral domain packages. For alpha, publish the runtime package chain in dependency order instead of bundling all code into `@openpome/cli`.

Most users install only the CLI:

```bash
npm install -g @openpome/cli@alpha
```

The other `@openpome/*` packages visible on npm are runtime packages consumed by the CLI. Users do not need to install them manually.

## Current Version

All publishable runtime packages are versioned together:

```txt
0.16.0-alpha.0
```

The monorepo root is private and versioned only for development coordination.

## Publishable Runtime Packages

Publish these packages in order:

```bash
pnpm --filter @openpome/configuration publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/credentials publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/approvals publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/execution-plans publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/task-sessions publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/work-items publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/workspaces publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/prompt-engine publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/connector-jira-cloud publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/local-gateway publish --access public --tag alpha --no-git-checks --otp <OTP>
pnpm --filter @openpome/cli publish --access public --tag alpha --no-git-checks --otp <OTP>
```

`pnpm publish` rewrites `workspace:*` dependencies to the concrete package version in the published manifest.

## Preflight

```bash
npm whoami
npm org ls openpome
pnpm validate
pnpm --filter @openpome/cli pack --pack-destination /tmp/openpome-pack
```

Expected:

- `npm whoami` returns the publishing user.
- `npm org ls openpome` shows the user as an owner or member with publish permission.
- `pnpm validate` passes.
- `pnpm pack` includes compiled `dist` files and package metadata only.

## Known Blocker

Publishing currently requires npm 2FA OTP or a granular access token with publish permission. If `npm publish` returns `E403` requiring two-factor authentication, enable npm publish 2FA or create a publish token and retry.

## Token-Based Publish

Do not paste tokens into source files or commit them. Use a local environment variable:

```bash
export NODE_AUTH_TOKEN=your-npm-publish-token
pnpm release:publish-alpha
```

The release script writes the token only to a temporary npm config file outside the repo and deletes it when publishing exits.
During validation, the release script removes `OPENPOME_JIRA_*` values from the validation subprocess so local Jira smoke-test credentials cannot make deterministic tests call live Jira.

Dry run:

```bash
NODE_AUTH_TOKEN=your-npm-publish-token pnpm release:publish-alpha -- --dry-run
```

Skip validation only when validation has already passed in the same checkout:

```bash
NODE_AUTH_TOKEN=your-npm-publish-token pnpm release:publish-alpha -- --skip-validate
```

The script skips packages that are already published at the target version. It also retries the final `npm view @openpome/cli@alpha version` check because the npm registry can briefly return `E404` immediately after a successful publish while the tag becomes readable.

If npm accidentally places the alpha version on the `latest` dist-tag, clean it up with a fresh token:

```bash
NODE_AUTH_TOKEN=your-new-npm-publish-token pnpm release:publish-alpha -- --skip-validate --remove-latest
```

That command keeps the published `alpha` tag and removes only `latest` tags that point to the same alpha version.

If a token has been pasted into a chat, issue tracker, terminal recording, or log, revoke it and create a new granular token before publishing.

## Post-Publish Check

After all packages are published:

```bash
npm view @openpome/cli@alpha version
npm install -g @openpome/cli@alpha
pome help
pome doctor
```

Do not run the global install check before the runtime package chain is published, because `@openpome/cli` resolves `@openpome/local-gateway` and domain packages from the npm registry.

If `npm view @openpome/cli@alpha version` returns `E404` right after a successful publish, wait a few minutes and retry before republishing. A successful publish message followed by a short-lived read failure usually means registry propagation delay, not a missing package.
