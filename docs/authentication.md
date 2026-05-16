# Authentication

OpenPome supports multiple authentication paths because real developer environments differ.

The MVP starts with Jira and GitHub, but authentication must stay connector-based so future services can use their own auth model.

## Jira Auth Modes

OpenPome should support these Jira modes:

```txt
1. Jira Cloud API token / Basic auth
2. Jira Cloud OAuth 2.0 3LO browser login
3. Jira Data Center / Server OAuth 1.0a browser verifier flow
```

## Jira Cloud API Token

Use when the developer can create an Atlassian API token.

Environment variables for early development:

```bash
OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net
OPENPOME_JIRA_EMAIL=you@example.com
OPENPOME_JIRA_API_TOKEN=...
```

Production storage:

```txt
OS keychain only.
Never plaintext config.
```

## Token Refresh

Stored Jira Cloud OAuth tokens refresh automatically when they are within five minutes of expiry and these values are available:

```bash
OPENPOME_JIRA_OAUTH_CLIENT_ID=...
OPENPOME_JIRA_OAUTH_CLIENT_SECRET=...
```

If a refresh token is unavailable or the client credentials are missing, OpenPome keeps the existing token and `pome doctor` reports reachability/auth errors instead of deleting local state.

## Reachability Checks

`pome doctor` reports Jira reachability separately from configuration.

Possible meanings:

```txt
reachable     -> credentials worked and Jira responded
unauthorized  -> Jira responded with 401/403; token may be expired or insufficient
unreachable   -> network, VPN, DNS, base URL, or missing auth prevented a check
```

## Jira Cloud OAuth 2.0 3LO

Use when the organization does not allow developers to create API tokens or prefers user-consent OAuth.

Status: experimental in the public alpha until OpenPome completes a real smoke test with a configured Atlassian OAuth app. API-token mode is the recommended path for the first public alpha.

### OAuth Client Registration

For local development and enterprise use, OpenPome expects the developer or organization to provide an Atlassian OAuth 2.0 3LO app configuration.

Required app settings:

```txt
Callback URL:
  http://127.0.0.1:48731/auth/jira/callback

Scopes:
  read:jira-work
  read:jira-user
  offline_access
```

Local environment:

```bash
OPENPOME_JIRA_OAUTH_CLIENT_ID=...
OPENPOME_JIRA_OAUTH_CLIENT_SECRET=...
OPENPOME_JIRA_OAUTH_REDIRECT_URI=http://127.0.0.1:48731/auth/jira/callback
```

Rules:

- Do not commit client secrets.
- Do not embed a shared OAuth client secret in the open-source CLI.
- An official packaged OpenPome app may later use an OpenPome-owned OAuth app or auth broker.
- Enterprise users may configure their own Atlassian OAuth app.
- The localhost callback listener binds only to `127.0.0.1`.

Flow:

```txt
pome auth jira login
  -> CLI prints Atlassian authorization URL
  -> Developer opens URL in browser
  -> Developer can paste code back with pome auth jira callback <CODE>
```

Local callback flow:

```txt
pome auth jira login --listen
  -> OpenPome starts a localhost callback listener
  -> OpenPome prints Atlassian authorization URL
  -> Developer grants access
  -> Atlassian redirects to localhost callback with code
  -> OpenPome exchanges code for access token
  -> OpenPome calls accessible-resources to choose cloud site
  -> token is stored in OS keychain
```

Fallback when a localhost callback cannot be used:

```txt
pome auth jira login --manual
  -> CLI prints authorization URL
  -> Developer opens it in browser
  -> Browser redirects to configured URL
  -> Developer pastes the code into terminal
```

Important implementation constraint:

```txt
Do not embed OAuth client secrets in the open-source CLI.
```

Supported deployment options:

- user or organization provides OAuth client ID/secret through secure setup
- OpenPome later provides an official auth broker for hosted distribution
- enterprise admins configure their own OAuth app

## Live Jira List/Show Behavior

Live Jira mode uses Jira search pagination for assigned work and direct issue lookup for `pome jira show <KEY>`.

`pome jira list`:

```txt
JQL: assignee = currentUser() ORDER BY updated DESC
Page size: 50
Page limit: 4 initial pages
```

`pome jira show <KEY>`:

```txt
Fetches the issue directly instead of only searching the assigned-work list.
```

Error handling distinguishes:

```txt
401/403 -> auth, scope, or permission issue
404     -> issue/site not found
429     -> Jira rate limit
other   -> Jira/network/VPN issue with status detail
```

## Jira Data Center / Server OAuth 1.0a

Use when Jira is self-hosted and API tokens are unavailable.

Flow:

```txt
pome auth jira login --data-center
  -> request temporary token
  -> print/open Jira authorization URL
  -> developer approves in browser
  -> browser shows verifier
  -> developer pastes verifier into terminal
  -> OpenPome exchanges verifier for access token
```

This usually requires an application link / OAuth consumer configured by an admin.

## VPN and Mixed Networks

Auth flows must work in:

- public internet only
- corporate VPN only
- mixed setup, such as Jira behind VPN and GitHub Cloud outside VPN

Rules:

- `pome doctor` must distinguish missing credentials from unreachable network.
- network failure must not corrupt local session state.
- cached auth status may be shown as stale, but must be labeled.
- OAuth callback listeners must bind to localhost only.

## Sources

- Atlassian Jira Cloud OAuth 2.0 3LO docs: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
- Atlassian OAuth auth-code docs: https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/
- Atlassian Jira Cloud app security overview: https://developer.atlassian.com/cloud/jira/platform/security-overview/
- Atlassian Jira Server/Data Center OAuth 1.0a docs: https://developer.atlassian.com/server/jira/platform/oauth/
