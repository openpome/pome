# OpenPome Ownership Roadmap

OpenPome's product direction is not "more CLI commands" and not "another agent framework".

OpenPome is an open-source AI work ownership platform for developers. A developer starts from an assigned work item, and OpenPome owns the path from understanding to delivery while keeping risky actions behind explicit approval.

## Product North Star

Start the task. OpenPome owns the rest.

Ownership means OpenPome progressively performs the responsibilities of:

- engineer: understand code, plan, implement, fix failures
- tech lead: identify risks, dependencies, design tradeoffs, missing context
- QA engineer: select tests, run validation, analyze failures, retry safely
- release coordinator: prepare PRs, updates, release notes, and delivery evidence
- project tracker: keep Jira/current work state synchronized and explain progress

This does not mean uncontrolled autonomy. OpenPome must keep the core safety rule:

```txt
AI thinks and proposes.
OpenPome validates.
Developer approves.
OpenPome writes, tests, creates PRs, and updates Jira.
```

## Simple Outside, Powerful Inside

The main developer command surface must stay small:

```bash
pome setup
pome login
pome work
pome start <KEY>
pome status
pome next
pome approve
pome pause
pome resume
pome done
```

Existing advanced commands can remain for diagnostics and recovery, but they should not become the normal workflow.

Product rule for every new capability:

Can this be used through an existing simple command?

If yes, do not add a new primary command.

Examples:

- repository analysis belongs behind `pome start <KEY>` and `pome next`
- workflow transitions belong behind `pome next`
- patch approval belongs behind `pome approve`
- delivery belongs behind `pome done`
- low-level recovery can stay advanced

## Current Position

OpenPome already has the foundation for the ownership platform:

- CLI and monorepo package boundaries
- Jira assigned-work connector
- Jira API-token auth and OAuth scaffold
- GitHub CLI/API PR foundation
- native GitHub browser auth support
- workspace scan, resolution, and learned links
- AI provider abstraction for manual-copy, OpenAI, Claude API, and Claude CLI
- approval-first execution model
- Jira story refresh before key actions
- AI plan and approval-gated patch loop
- test discovery, approved test execution, and failed-test retry loop
- PR creation and Jira update posting behind explicit commands
- SQLite session snapshots, `pome history`, and restart-safe resume
- corporate error handling, sensitive-file filtering, and no telemetry by default

The remaining product gap is not setup. The gap is stronger work ownership:

```txt
Ticket
  -> Understanding
  -> Planning
  -> Execution
  -> Validation
  -> Delivery
  -> Verification
  -> Done
```

## Capability Gaps To Fill

### 1. Work Item Intelligence

Status: v1 implemented in `0.39.0-alpha.0` for the main `pome start <KEY>` flow. Continue improving it with repository knowledge, prior-session learning, and deeper linked-reference research.

`pome start <KEY>` should produce a strong task intelligence report:

- plain-language summary
- extracted acceptance criteria
- missing requirement questions
- affected repositories
- likely files and why
- linked issues, PRs, and docs
- dependency and integration risks
- test strategy
- delivery checklist

Success: a developer saves 30 minutes before opening the editor.

### 2. Repository Knowledge Engine

OpenPome must understand the repository before coding:

- architecture map
- dependency graph
- package/module boundaries
- service relationships
- build and test command map
- ownership and CODEOWNERS map
- important generated/sensitive files

Storage target:

```txt
.pome/knowledge/
```

Success: OpenPome can explain the repository structure and select relevant context before every task.

Status: v1 implemented in `0.40.0-alpha.0` for the main `pome start <KEY>` flow. OpenPome writes `.pome/knowledge/repository.json`, records package/build/test maps, source/test/config/generated/sensitive path maps, module boundaries, and ownership signals, then reuses that metadata for work item intelligence, AI planning context, bounded patch context, and related-test discovery.

### 3. Persistent Work Manager

A started work item should become a durable work order:

```json
{
  "id": "SCRUM-123",
  "status": "active",
  "phase": "planning",
  "owner": "openpome"
}
```

Success: OpenPome resumes after terminal close or laptop restart and knows the active story, latest Jira sync, approved patch, last test result, PR status, and Jira update status.

### 4. Workflow Engine

Workflow decides. AI executes.

Initial workflow types:

- bugfix
- feature
- hotfix
- refactor
- investigation

Common lifecycle:

```txt
intake -> analyze -> plan -> approve -> implement -> test -> repair -> review -> deliver -> verify -> done
```

Success: every work item follows a predictable, inspectable lifecycle.

### 5. Execution Engine

`pome next` should move work forward one safe step at a time:

- pick the current workflow phase
- choose the next action
- request approval when needed
- execute only approved actions
- retry bounded failures
- move to blocked with useful reasons

Success: the developer does not need to remember internal commands.

### 6. Worker Framework

Workers should arrive after the work manager and workflow engine are stable.

Initial workers:

- research worker
- planning worker
- implementation worker
- testing worker
- review worker
- delivery worker

Important boundary:

Workers are replaceable modules controlled by the work manager. They do not own global product flow.

### 7. Autonomous Coding

OpenPome should apply code changes safely:

```txt
plan -> propose patch -> validate patch -> approve -> apply -> summarize diff
```

Success: simple tickets reach tested local changes without manual copy/paste.

### 8. Autonomous QA

OpenPome should recover from common validation failures:

```txt
run tests -> summarize failure -> infer cause -> propose repair -> approve -> apply -> retry
```

Success: common test failures are repaired without leaving the main workflow.

### 9. Autonomous Delivery

OpenPome should complete delivery steps:

- create branch
- commit approved changes
- push
- create PR
- write PR description
- post Jira progress/completion update
- attach test evidence
- produce release notes when needed

Success: human reviews the PR and communication instead of manually preparing everything.

### 10. Team Memory

OpenPome should learn local team context:

- accepted plans
- rejected patches and reasons
- review feedback
- coding standards
- recurring test failures
- architecture decisions
- release/incident history
- repository-to-work-item patterns

Success: OpenPome gets better for an organization without leaking private source or secrets.

### 11. Multi-Repository Ownership

One work item may touch:

- frontend repo
- backend repo
- infrastructure repo
- content repo
- docs repo

Success: OpenPome coordinates multiple repositories and creates linked PRs when the workflow requires it.

### 12. Goal-Based Planning

Long-term input can be a business goal, not only a Jira ticket:

```txt
Support Australian assessments
```

OpenPome should create the plan, identify repositories, propose work items, implement, validate, deliver, and track completion.

## Sprint Plan

Use short, shippable sprints. Every sprint should end with validation, docs, and a small release or release-ready PR.

### Sprint 1: Alpha Product Cleanup

Goal: make the current alpha easy to understand and install.

Deliverables:

- clean setup guide
- simple command contract in README
- troubleshooting for Jira/GitHub/AI/VPN
- install verification checklist
- demo recording or terminal walkthrough
- release notes and GitHub release hygiene

Acceptance:

- a new developer can install and start in under 10 minutes
- no normal-flow doc forces users into advanced commands

### Sprint 2: End-to-End Demo Flow

Goal: prove the story-to-PR loop in a disposable environment.

Deliverables:

- disposable Jira issue and GitHub repo smoke guide
- scripted external smoke for PR creation and Jira update
- README GIF or short terminal demo
- documented alpha boundaries

Acceptance:

- an external user can understand OpenPome in two minutes
- maintainers can run the full smoke without touching production repos

### Sprint 3: Work Item Intelligence v1

Goal: make `pome start <KEY>` a high-value analysis step.

Deliverables:

- stronger Jira summary and acceptance criteria extraction
- missing context question model
- linked issue/PR/doc summarization
- risk summary
- test strategy generator
- implementation checklist

Acceptance:

- `pome start <KEY>` produces a useful task intelligence report before coding begins

### Sprint 4: Repository Knowledge v1

Goal: give OpenPome durable understanding of the current repository.

Deliverables:

- `.pome/knowledge` schema
- package manager/build/test detection
- source/test/config/generated/sensitive path map
- module/package boundary summary
- CODEOWNERS/ownership summary
- dependency and script map

Acceptance:

- OpenPome can explain the repository structure correctly and reuse that knowledge in planning/context selection

Status: implemented in `0.40.0-alpha.0`. Continue improving this with dependency graph depth, language-specific module analysis, and learning from completed sessions.

### Sprint 5: Persistent Work Order v1

Goal: make started work durable and phase-aware.

Deliverables:

- work order model on top of SQLite session snapshots
- active phase tracking
- restart-safe status and resume
- latest Jira sync, approved patch, test, PR, and Jira update summary

Acceptance:

- after terminal or laptop restart, `pome status`, `pome history`, and `pome resume <SESSION_ID>` recover the work accurately

### Sprint 6: Workflow Engine v1

Goal: make the lifecycle deterministic before adding more autonomy.

Deliverables:

- workflow types: bugfix, feature, hotfix, refactor, investigation
- phase state machine
- checkpoint policy per phase
- blocked/failure states
- `pome next` integration

Acceptance:

- every active story has a workflow type, phase, next action, checkpoint requirement, and blocked reason when stuck

### Sprint 7: Execution Engine v1

Goal: let `pome next` move work forward safely.

Deliverables:

- plan step breakdown
- sequential step progress
- retry limits
- command/test action planning
- failure-to-blocked conversion

Acceptance:

- user can move a task through analysis, plan, patch, test, and delivery preparation mostly with `pome next` and `pome approve`

### Sprint 8: Patch Generation v2

Goal: improve patch precision and safety.

Deliverables:

- partial patch/hunk support
- patch rollback metadata
- safer conflict handling
- better impacted-file ranking from history

Acceptance:

- OpenPome can apply small validated hunks instead of replacing full files for every edit

### Sprint 9: Test Runner and Repair v2

Goal: improve QA ownership.

Deliverables:

- relevant-test selection using repository knowledge
- failed-test root-cause classification
- bounded repair retries
- evidence attached to PR/Jira drafts

Acceptance:

- common validation failures are fixed or blocked with a useful explanation

### Sprint 10: Delivery v2

Goal: make `pome done` complete delivery artifacts reliably.

Deliverables:

- stronger PR body
- Jira progress/completion update templates
- release note draft
- review checklist
- delivery evidence summary

Acceptance:

- PR and Jira update are ready for a human review with minimal editing

### Sprint 11: Worker Framework v1

Goal: introduce replaceable workers only after workflows are stable.

Deliverables:

- worker result contract
- worker registry
- research/planning/testing/review worker boundaries
- audit trail for worker outputs

Acceptance:

- a new worker can be added without changing the simple CLI flow

### Sprint 12: Team Memory v1

Goal: make OpenPome improve through repeated team use.

Deliverables:

- accepted/rejected plan memory
- review feedback memory
- repo convention memory
- common failure memory
- privacy and retention controls

Acceptance:

- future plans and file ranking improve from completed local sessions

## First 90 Days

Focus only on these:

1. Alpha product cleanup
2. End-to-end demo flow
3. Work item intelligence v1
4. Repository knowledge v1
5. Persistent work order v1
6. Workflow engine v1

Do not rush into a general autonomous agent framework before these six are stable.

## What Not To Build Yet

Avoid these until the ownership path is proven:

- broad plugin marketplace
- time tracking
- billing or cost dashboards
- multi-agent orchestration as a product surface
- complex analytics
- desktop app before CLI workflow is stable
- many new work item providers before Jira/GitHub is excellent

## Success Metrics

Use practical product metrics:

- new developer reaches `pome work` in under 10 minutes
- `pome start <KEY>` saves 30 minutes of understanding
- 80% of simple bugfixes reach a reviewed local patch
- common test failures produce a useful repair or blocked reason
- PR body and Jira update need less than two minutes of human editing
- developer can resume accurately after laptop restart

## Next Implementation Order

From the current `0.43.0-alpha.0` state, build in this order:

1. publish and smoke `0.43.0-alpha.0`
2. disposable external smoke for real PR plus Jira update
3. Jira OAuth smoke with a real Atlassian app
4. persistent work order model on SQLite snapshots
5. workflow engine v1
6. partial patch support
7. impacted-file learning from completed sessions
8. test repair v2
9. worker framework v1 after workflow stability
