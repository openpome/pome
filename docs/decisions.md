# Decisions

This file records accepted product and architecture decisions after the foundation document. Do not rewrite the foundation document for every decision; append concise decisions here and update operational docs when needed.

## Accepted Defaults

### Product Entry Point

Decision: OpenPome starts from assigned work items.

Reason: the product value is AI ownership of task execution, not generic repo inspection.

### MVP UX

Decision: Jira-first and GitHub-first for the initial implementation slice.

Reason: Jira plus GitHub validates the first real developer workflow: assigned work item to PR-ready output.

Clarification: this does not make OpenPome a Jira-only or GitHub-only product. Jira is the first work item source. GitHub is the first code host.

### Architecture

Decision: work-item-first and provider-neutral.

Reason: Jira and GitHub are first connectors, but the domain model must support Linear, Azure DevOps, GitHub Issues, GitLab, Bitbucket, Confluence, Slack, and future sources.

### Build Order

Decision: CLI first, desktop second.

Reason: the CLI proves the workflow, domain model, gateway behavior, policy checkpoints, and connector contracts before investing in desktop UI.

### AI Provider

Decision: manual-copy provider is the first AI provider.

Reason: it avoids API keys and quota during the first proof while still reducing prompt preparation and context collection.

### Automation Level

Decision: MVP starts at Level 1 with selected Level 2 actions.

Reason: OpenPome should guide and prepare execution before it attempts broad local automation.

### Workspace Model

Decision: dynamic workspace resolution, not hardcoded Jira-project-to-repo mapping.

Reason: real organizations use monorepos, shared services, inconsistent labels, and multi-repo systems.

### Persistence

Decision: local SQLite under `~/.openpome/`.

Reason: task sessions, approvals, timelines, memory hints, and resume state need local durable storage without cloud sync.

### Secrets

Decision: tokens and credentials never live in source or plaintext config.

Reason: OpenPome will handle work systems and code hosts; credential handling must be conservative from the start.

### Network Environments

Decision: support VPN and non-VPN setups from MVP.

Reason: developers often use Jira Data Center, GitHub Enterprise, internal code hosts, or mixed cloud/internal systems. PAT/token-based setup is the MVP default because it works without OAuth callback complexity behind VPN.

### Jira Authentication

Decision: support both token-based and browser-based Jira authentication.

Reason: some developers cannot create Jira API tokens in their organization. OpenPome must support Jira Cloud OAuth 2.0 3LO browser login and Jira Server/Data Center OAuth 1.0a verifier flow in addition to API-token/basic auth.

Implementation note: do not embed OAuth client secrets in the open-source CLI. Use OS keychain for stored secrets and tokens.

### Contribution Flow

Decision: `@iamdotk` is the code owner.

Reason: future development should go through PR review before merging to `main`.

## Open Decisions

- exact TypeScript package manager version
- CLI framework
- SQLite library
- keychain library
- terminal prompt library
- first local gateway transport
- whether desktop uses Tauri or Electron
- first CI matrix
