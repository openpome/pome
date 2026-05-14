# OpenPome Agent Guide

OpenPome is work-item-first in architecture.

The MVP user experience starts with Jira and GitHub to solve the first concrete workflow. Do not treat Jira or GitHub as permanent product limits. They are first connectors.

Do not make local repo detection the primary entry point. The primary product flow is:

```txt
work item -> workspace resolution -> AI task session -> approvals -> artifacts
```

## Hard Rules

- Do not put Jira-specific logic in core or domain packages.
- Do not make GitHub-specific behavior part of core or domain packages.
- Do not design APIs that only work for Jira or GitHub if a provider-neutral capability is possible.
- Do not call connectors directly from apps.
- Do not bypass the local gateway.
- Do not bypass approval or policy engines.
- Use workspace resolution, not hardcoded repo mapping.
- Keep domain packages provider-neutral.
- Keep provider-specific APIs under `connectors/`.
- Never write secrets, tokens, or `.env` values into source.
- Never send full repository contents to external AI providers.
- Approval is required before destructive or external actions.
- Connectors must support VPN and non-VPN environments; do not assume every service is reachable on the public internet.
- Jira connector work must support both API-token/basic auth and browser OAuth; do not assume developers can create API tokens.

## Dependency Direction

Dependencies move one way:

```txt
apps
  -> services/local-gateway
  -> packages/domain + packages/engines
  -> packages/capabilities
  -> connectors
```

## Naming

Use provider-neutral names in core:

```txt
work-items
workspaces
task-sessions
execution-plans
approvals
artifacts
evidence
memory
version-control
code-hosts
execution-runtime
model-providers
policy-engine
prompt-engine
redaction-engine
```

Provider names belong under `connectors/`.

First connectors:

```txt
work item source: Jira
code host: GitHub
version control: local git
model provider: manual-copy
```

Future connectors should fit the same capability model, for example Linear, Azure DevOps, GitLab, Bitbucket, Confluence, Slack, OpenAI, Anthropic, and Ollama.

## Network Support

OpenPome must work in public internet, corporate VPN, and mixed network setups.

Connector code should produce clear reachability/authentication errors and must not corrupt local session state when a remote service is unavailable.

## Resume Context

Before continuing development after a terminal restart, read `docs/development-state.md`.

## Before Editing

Read this file and the nearest scoped `AGENTS.md`.

If a rule changes, update the relevant scoped `AGENTS.md` in the same change.
