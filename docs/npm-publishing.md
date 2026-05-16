# npm Publishing

OpenPome uses a multi-package publish strategy for the public alpha.

The CLI is intentionally thin and depends on the local gateway and provider-neutral domain packages. For alpha, publish the runtime package chain in dependency order instead of bundling all code into `@openpome/cli`.

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

## Post-Publish Check

After all packages are published:

```bash
npm view @openpome/cli@alpha version
npm install -g @openpome/cli@alpha
pome help
pome doctor
```

Do not run the global install check before the runtime package chain is published, because `@openpome/cli` resolves `@openpome/local-gateway` and domain packages from the npm registry.
