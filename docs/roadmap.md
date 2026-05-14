# OpenPome Roadmap

This roadmap is CLI-first, desktop-second. The goal is to prove the work-item-first task session before investing in the desktop surface.

Jira and GitHub are the first connectors for the first real workflow. The product architecture remains connector-neutral so Linear, Azure DevOps, GitLab, Bitbucket, Slack, Confluence, and additional AI providers can be added later.

## Phase 0: Repository Foundation

Goal: make the repo safe for long-running agent development.

Deliverables:

- pnpm TypeScript monorepo
- root and scoped `AGENTS.md`
- Apache 2.0 license
- docs copied from the foundation document
- initial CI
- package boundaries for apps, gateway, domain, capabilities, engines, and connectors

Exit criteria:

- contributors and AI agents can understand the architecture without asking for context
- provider-specific code has a clear home under `connectors/`
- the repo can run `typecheck`, `lint`, and `test` once code exists

## Phase 1: CLI Read-Only Work Item Flow

Goal: a developer can see assigned work from the terminal. Jira Cloud is the first work item source.

Commands:

```bash
pome init
pome doctor
pome work-item list
pome work-item show <KEY>
pome jira list
pome jira show <KEY>
```

Scope:

- Jira Cloud connector
- Jira PAT configuration
- assigned issue list
- grouped output for stories, subtasks, bugs, and tasks
- detail view with description, status, priority, parent, subtasks, links, comments summary, and missing context

Exit criteria:

- `pome jira list` returns assigned issues
- `pome jira show <KEY>` maps Jira into provider-neutral `WorkItem`
- no Jira-specific types leak into domain packages

## Phase 2: Workspace Resolution

Goal: OpenPome can resolve the likely local workspace for a selected work item.

Commands:

```bash
pome workspace scan
pome workspace list
pome workspace resolve <KEY>
pome workspace link <KEY> <PATH>
```

Signals:

- Jira key and project
- labels and components
- linked PRs
- local git remotes
- package names
- branch and commit history
- learned developer confirmations

Exit criteria:

- resolver returns ranked candidates with confidence and reasons
- high confidence can proceed
- low confidence asks the developer
- learned links are hints, not hard rules

## Phase 3: Task Session Core

Goal: selected Jira becomes an AI-owned task session.

Commands:

```bash
pome start <KEY>
pome status
pome plan
pome approve plan
pome reject
```

Scope:

- `AITaskSession` state machine
- session event timeline
- branch suggestion
- missing context detection
- implementation plan generation through manual-copy provider
- approval checkpoint for plan

Exit criteria:

- `pome start <KEY>` loads Jira, resolves workspace, creates a session, and produces the next checkpoint
- session can be resumed from local state
- approval state is explicit and persisted

## Phase 4: Manual-Copy AI Provider

Goal: deliver value without requiring AI API credentials.

Scope:

- provider-neutral model interface
- manual-copy model provider
- generated task understanding prompt
- generated implementation planning prompt
- generated debugging prompt
- generated PR draft prompt
- generated work item update prompt

Exit criteria:

- user can copy a complete context package into Codex, Claude, ChatGPT, or another model
- generated prompts exclude secrets and blocked files
- external AI sharing requires approval when code or diffs are included

## Phase 5: Git and Code Host Draft Flow

Goal: generate PR-ready artifacts from the task session.

Commands:

```bash
pome diff
pome pr draft
pome jira update-draft
pome work-item update-draft
```

Scope:

- native git status/diff integration
- GitHub remote detection as the first code host path
- PR title/body draft
- Jira/work-item update draft
- QA handoff draft

Exit criteria:

- OpenPome can explain changed files and test evidence
- PR body is generated from work item, plan, diff summary, and test results
- work item update draft is generated but not posted automatically

## Phase 6: Safe Local Execution

Goal: add selected Level 2 automation with approval.

Commands:

```bash
pome run
pome test
pome fix
```

Scope:

- test command discovery
- approved command runner
- failure evidence capture
- bounded fix attempts
- blocked state with structured reason

Exit criteria:

- commands that modify state require approval
- retry limits are enforced
- failures produce actionable evidence instead of loops

## Phase 7: Desktop App

Goal: build a desktop surface over the proven CLI and local gateway.

Screens:

- Assigned Work
- Work Item Detail
- AI Task Session
- Plan Approval
- Execution Console
- Completion Review
- Settings

Exit criteria:

- desktop uses the same gateway/domain logic as CLI
- no connector calls from UI
- approvals are visible and explicit

## Post-MVP

Deferred:

- OAuth
- GitHub App support
- Linear, Azure DevOps, GitLab, Bitbucket
- Slack and Confluence
- plugin marketplace
- full Level 3 automation
- multi-workspace sessions
- team dashboards
- cloud sync
