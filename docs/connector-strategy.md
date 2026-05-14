# Connector Strategy

OpenPome is not a Jira-only or GitHub-only product.

Jira and GitHub are the first implementation slice because they solve the initial concrete problem:

```txt
assigned Jira work item
  -> local workspace
  -> Git/GitHub PR workflow
```

The architecture must stay provider-neutral so later connectors can be added without rewriting the product model.

## First Connectors

MVP:

- work item source: Jira Cloud
- version control: local git
- code host: GitHub Cloud or GitHub Enterprise
- model provider: manual-copy

These connectors validate the end-to-end flow. They do not define the limits of the product.

## Network Environments

OpenPome must support both VPN and non-VPN developer environments.

Common cases:

- Jira Cloud and GitHub Cloud over public internet
- Jira Data Center behind corporate VPN
- GitHub Enterprise behind corporate VPN
- mixed setup, such as Jira behind VPN and GitHub Cloud outside VPN
- local-only workflow where workspace and git are available but remote services are temporarily unreachable

Connector design rules:

- connectors must fail with clear connection/authentication errors
- `pome doctor` must report whether each connector is reachable
- unavailable network must not corrupt local task session state
- PAT/token-based auth is the MVP default because it works for VPN and non-VPN setups without callback URL complexity
- OAuth can come later, but must not be the only path for enterprise/VPN users
- local cached session state may be shown as stale, but must be labeled clearly

Auth design rules:

- support API-token/basic auth when available
- support browser OAuth when API tokens are unavailable
- keep auth implementation inside connectors
- expose setup/status through CLI and gateway
- store credentials and tokens in OS keychain, not plaintext config

## Future Connectors

Work item sources:

- Jira Data Center
- Linear
- Azure DevOps Boards
- GitHub Issues

Code hosts:

- GitHub Enterprise
- GitLab
- Bitbucket
- Azure Repos

Model providers:

- OpenAI
- Anthropic
- Ollama
- other local or hosted LLMs

Documents and communication:

- Confluence
- Slack
- Notion
- Google Docs
- Microsoft Teams

CI and execution:

- GitHub Actions
- Jenkins
- CircleCI
- Buildkite

## Capability Kinds

Provider-specific code must implement provider-neutral capability interfaces:

```txt
WorkItemSource
CodeHostSource
VersionControlSource
ExecutionEnvironment
ModelProvider
DocumentSource
CommunicationPublisher
ApprovalPolicy
ArtifactGenerator
```

Core/domain packages should talk in terms of these capabilities, not provider APIs.

## Naming Rule

Core names:

```txt
work-items
code-hosts
version-control
model-providers
document-sources
communication
workspaces
task-sessions
approvals
artifacts
```

Connector names:

```txt
connectors/work-items/jira-cloud
connectors/work-items/linear
connectors/code-hosts/github-cloud
connectors/code-hosts/gitlab
connectors/model-providers/openai
connectors/communication/slack
```

## Design Rule

If a feature is useful only for the first Jira/GitHub flow, keep the provider-specific part inside the connector and expose a provider-neutral behavior to the rest of the system.

Examples:

- Jira issue becomes `WorkItem`
- GitHub pull request becomes `PullRequest`
- Jira comment update becomes `WorkItemUpdateDraft`
- GitHub repository becomes `CodeRepository`
- Confluence page becomes `DocumentReference`

## Anti-Patterns

Do not:

- name core packages `jira`, `github`, or `repo-mapping`
- put Jira REST fields in domain types
- make apps call Jira or GitHub directly
- assume every work item source has Jira projects, sprints, or issue keys
- assume every code host has GitHub pull request semantics
- assume one Jira project maps to one repository
