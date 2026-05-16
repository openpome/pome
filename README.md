# OpenPome

OpenPome is a work-item-first AI developer workbench.

The first product slice focuses on Jira and GitHub because that solves the initial real workflow. The architecture is not Jira-only or GitHub-only. Jira is the first work item connector, GitHub is the first code host connector, and more services can be added later through the connector model.

The developer starts from an assigned work item, not from a random local repository. OpenPome loads the work item, resolves the correct workspace, creates an AI task session, guides implementation, prepares PR content, drafts work item updates, and keeps the developer in control through explicit approvals.

OpenPome must work in both VPN and non-VPN setups, including mixed environments such as internal Jira with GitHub Cloud or Jira Cloud with GitHub Enterprise.

Current development version: `0.16.0-alpha.0`.

CLI name:

```bash
pome
```

## Product Principle

OpenPome is Jira-first in the MVP user experience and work-item-first in architecture.

That means Jira is the first implementation target, not the product boundary. Core language stays provider-neutral: work item, code host, model provider, communication, document source, workspace, task session, approval, artifact.

Correct flow:

```txt
Assigned work item
  -> Workspace resolution
  -> AI task session
  -> Plan approval
  -> Guided/local execution
  -> Tests and evidence
  -> PR draft
  -> Work item update draft
```

Incorrect flow:

```txt
Current repo
  -> Guess branch
  -> Guess Jira
  -> Ask AI
```

## First Build Target

The first milestone is a CLI-first vertical slice:

```bash
pome init
pome doctor
pome config path
pome config show
pome config reset
pome work-item scopes
pome work-item scope use <SCOPE_ID>
pome jira boards
pome jira board use <BOARD_ID>
pome jira list
pome jira show <KEY>
pome workspace scan
pome workspace resolve <KEY>
pome workspace link <KEY> <PATH>
pome start <KEY>
pome status
pome timeline
pome approvals
pome stop
pome resume
pome reset
pome plan
pome approve plan
pome ai context
pome ai prompt
pome diff
pome test discover
pome approve command [COMMAND]
pome test run [COMMAND]
pome test history
pome github auth status
pome pr draft
pome pr create
pome work-item update-draft
pome work-item post-update
pome reject
```

This proves the main product value before desktop work begins.

## How OpenPome Works

OpenPome keeps the developer workflow centered on the assigned work item:

```txt
Jira work item
  -> local workspace/repo
  -> task session
  -> implementation plan
  -> approval checkpoint
  -> implementation, tests, PR, and work item update
```

The CLI talks to the local gateway package. The gateway reads local config, stores local runtime state, talks to connectors, and keeps provider-specific logic out of the CLI.

Local state is stored under `~/.openpome` by default:

```txt
~/.openpome/config.json
~/.openpome/workspace-index.json
~/.openpome/workspace-links.json
~/.openpome/active-task-session.json
```

You can isolate state for testing:

```bash
OPENPOME_HOME=/tmp/openpome-demo pnpm pome -- doctor
```

## Quick Start

From the repo root:

```bash
pnpm install
pnpm validate
pnpm pome -- init
pnpm pome -- doctor
```

Package install target for public alpha:

```bash
npm install -g @openpome/cli
pome init
pome doctor
```

Try the current mock Jira flow without credentials:

```bash
pnpm pome -- jira boards
pnpm pome -- jira board use 100
pnpm pome -- jira list
pnpm pome -- jira show POME-101
```

Scan and link a workspace:

```bash
pnpm pome -- workspace scan
pnpm pome -- workspace resolve POME-101
pnpm pome -- workspace link POME-101 .
```

Start a task session:

```bash
pnpm pome -- start POME-101
pnpm pome -- plan
pnpm pome -- timeline
pnpm pome -- approvals
pnpm pome -- approve plan
pnpm pome -- ai context
pnpm pome -- diff
pnpm pome -- test discover
pnpm pome -- approve command
pnpm pome -- test run
pnpm pome -- pr draft
pnpm pome -- work-item update-draft
pnpm pome -- status
```

Recover or close a session:

```bash
pnpm pome -- stop
pnpm pome -- resume
pnpm pome -- reset
```

Reject a plan when the scope is wrong:

```bash
pnpm pome -- reject "Need smaller implementation steps before coding"
```

## Authentication

OpenPome supports two Jira auth paths because organizations differ.

API token mode is the simplest for local scripts:

```bash
export OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net
export OPENPOME_JIRA_EMAIL=you@example.com
export OPENPOME_JIRA_API_TOKEN=your-token

pnpm pome -- auth jira status
pnpm pome -- work-item scopes
pnpm pome -- work-item scope use <SCOPE_ID>
pnpm pome -- jira boards
pnpm pome -- jira board use <BOARD_ID>
pnpm pome -- jira list
```

OAuth/browser mode is for organizations where developers cannot create API tokens. It is experimental in this public alpha until a real Atlassian OAuth app smoke test is completed:

```bash
export OPENPOME_JIRA_OAUTH_CLIENT_ID=...
export OPENPOME_JIRA_OAUTH_CLIENT_SECRET=...
export OPENPOME_JIRA_OAUTH_REDIRECT_URI=http://127.0.0.1:48731/auth/jira/callback

pnpm pome -- auth jira login --listen
```

Tokens are stored through the OS credential store when available. OpenPome should not store secrets in plaintext project files.

If credentials are missing, OpenPome uses mock Jira work items so the local CLI flow still works.

For real Jira validation before a public release, follow [Jira Smoke Test](docs/jira-smoke-test.md).
For install and launch verification, follow [Public Alpha Launch](docs/public-alpha-launch.md).
For a terminal demo script, use [Demo Script](docs/demo-script.md).

## Jira Scope

OpenPome does not silently scan every Jira issue the token can access. The user first confirms the Jira board scope, then `pome jira list` fetches assigned work inside that selected scope.

```bash
pnpm pome -- work-item scopes
pnpm pome -- work-item scope use 100
pnpm pome -- jira boards
pnpm pome -- jira board use 100
pnpm pome -- jira list
```

The selected scope is stored in `~/.openpome/config.json` as a provider-neutral active work item scope. Jira uses a board today; later connectors can use projects, teams, custom filters, or another scope type without changing the product flow. The `pome jira ...` commands are Jira-friendly aliases over the provider-neutral work item scope flow.

## Workspace Meaning

A workspace is the local code context OpenPome should use for a work item. In the MVP this means a local Git repository, but the product model allows broader workspace definitions later: monorepo package, service boundary, docs folder, test profile, and learned task history.

Examples:

```txt
Work item POME-101
  -> workspace /Users/me/src/openpome/pome

Work item BILLING-42
  -> workspace /Users/me/src/company/billing-service

Work item UI-88
  -> workspace /Users/me/src/company/web-app
```

Workspace commands:

```bash
# Find local Git repos and store them in workspace-index.json.
pnpm pome -- workspace scan

# Show indexed repos.
pnpm pome -- workspace list

# Rank likely repos for a work item.
pnpm pome -- workspace resolve POME-101

# Teach OpenPome the correct repo when the ranking is wrong or incomplete.
pnpm pome -- workspace link POME-101 /path/to/repo
```

You can scan multiple parent directories:

```bash
export OPENPOME_WORKSPACE_SCAN_PATHS=/Users/me/src/company:/Users/me/src/personal
pnpm pome -- workspace scan
```

Linked workspaces are hints, not hardcoded rules. They boost confidence for future resolution while still keeping the decision explainable.

## Task Sessions

A task session is the local working state for one work item.

```bash
pnpm pome -- start POME-101
```

This loads the work item, resolves the best workspace, and writes `active-task-session.json`.

```bash
pnpm pome -- plan
```

This creates the first deterministic implementation plan and moves the session to `awaiting_approval`.

```bash
pnpm pome -- approve plan
```

This records the approval and moves the session to `implementing`. Editing files, running mutating commands, creating PRs, and posting work item updates will still have their own checkpoints as those features are added.

```bash
pnpm pome -- timeline
pnpm pome -- approvals
```

These show the active session event timeline and approval history stored in `active-task-session.json`.

```bash
pnpm pome -- status
```

This shows the active work item, workspace, plan readiness, approval state, and session status.

## Documentation

- [Product foundation](docs/product-foundation.md) keeps the complete original vision document.
- [Roadmap](docs/roadmap.md) splits the product into build phases.
- [MVP scope](docs/mvp.md) defines what ships first and what is intentionally deferred.
- [Architecture](docs/architecture.md) defines package boundaries and dependency direction.
- [Connector strategy](docs/connector-strategy.md) defines how Jira, GitHub, and future services fit.
- [Authentication](docs/authentication.md) defines API-token and browser OAuth paths.
- [CLI](docs/cli.md) defines the first CLI experience.
- [Workspace resolution](docs/workspace-resolution.md) explains how a work item becomes a local workspace.
- [Approvals and policy](docs/approvals-and-policy.md) defines safety rules.
- [Memory and agent rules](docs/memory-and-agent-rules.md) explains runtime memory vs agent operating memory.
- [Decisions](docs/decisions.md) records accepted defaults and future changes.
- [Development state](docs/development-state.md) preserves resume context for future sessions.
- [Changelog](CHANGELOG.md) records versioned development changes.

## Agent Rules

Before changing code, read [AGENTS.md](AGENTS.md) and the nearest scoped `AGENTS.md` in the folder you are editing.
