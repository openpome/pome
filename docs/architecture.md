# Architecture

OpenPome uses a control-plane architecture.

```txt
Surfaces
  -> Local Gateway
  -> Domain Engines
  -> Capability Interfaces
  -> Provider Connectors
```

## Dependency Direction

Dependencies move one way:

```txt
apps/*
  -> services/local-gateway
  -> packages/domain/* + packages/engines/*
  -> packages/capabilities/*
  -> connectors/*
```

Rules:

- apps do not call connectors directly
- connectors do not import UI or gateway code
- domain packages stay provider-neutral
- provider-specific logic lives under `connectors/`
- the gateway coordinates sessions, approvals, policy, events, and connectors
- policy is enforced before execution

## Package Families

`apps/`

User surfaces. CLI first, desktop later. Surfaces render data and forward user intent to the local gateway.

`services/local-gateway/`

Local control plane. Owns request routing, session coordination, approvals, service registration, and policy enforcement.

`packages/domain/`

Provider-neutral product model. Contains work items, task sessions, workspaces, execution plans, approvals, artifacts, evidence, and memory.

`packages/capabilities/`

Provider-neutral interfaces for external systems and local execution. Connectors implement these interfaces.

`packages/engines/`

Cross-domain engines such as policy, prompt generation, redaction, and AI orchestration.

`connectors/`

Provider-specific implementations. Jira and GitHub are first connectors. GitLab, Bitbucket, Linear, Azure DevOps, OpenAI, Anthropic, Slack, Confluence, and similar integrations belong here later.

## Naming Rules

Use domain and capability names in core:

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

Provider names belong only in connectors:

```txt
connectors/work-items/jira-cloud
connectors/code-hosts/github-cloud
connectors/model-providers/openai
```

## MVP Repository Shape

The first implementation should use the smaller structure from the foundation document:

```txt
apps/cli
services/local-gateway
packages/core/protocol
packages/core/configuration
packages/core/persistence
packages/domain/work-items
packages/domain/task-sessions
packages/domain/workspaces
packages/domain/execution-plans
packages/domain/approvals
packages/domain/artifacts
packages/capabilities/version-control
packages/capabilities/execution-runtime
packages/capabilities/model-providers
packages/engines/policy-engine
packages/engines/prompt-engine
connectors/work-items/jira-cloud
connectors/version-control/git-native
connectors/model-providers/manual-copy
```
