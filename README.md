# OpenPome

OpenPome is a work-item-first AI developer workbench.

The first product slice focuses on Jira and GitHub because that solves the initial real workflow. The architecture is not Jira-only or GitHub-only. Jira is the first work item connector, GitHub is the first code host connector, and more services can be added later through the connector model.

The developer starts from an assigned work item, not from a random local repository. OpenPome loads the work item, resolves the correct workspace, creates an AI task session, guides implementation, prepares PR content, drafts work item updates, and keeps the developer in control through explicit approvals.

OpenPome must work in both VPN and non-VPN setups, including mixed environments such as internal Jira with GitHub Cloud or Jira Cloud with GitHub Enterprise.

Current development version: `0.7.0`.

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
pome jira list
pome jira show <KEY>
pome workspace scan
pome workspace resolve <KEY>
pome workspace link <KEY> <PATH>
pome start <KEY>
pome status
pome plan
```

This proves the main product value before desktop work begins.

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
