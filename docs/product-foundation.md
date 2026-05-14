# OpenPome — Jira-First AI Developer Workbench Scope Document

## Document Purpose

This document defines the corrected product scope for **OpenPome** based on the finalized concept.

The core idea is **not** that the developer opens the app and the app guesses the current repo first.

The correct product flow is:

```txt
Developer opens desktop app / CLI
↓
OpenPome shows Jira issues assigned to the developer
↓
Developer chooses a story, sub-task, bug, or task
↓
Developer clicks Start
↓
AI takes ownership of the task workflow
↓
AI understands the work item, resolves the workspace, plans work, implements, tests, fixes, prepares PR, and drafts work item updates
↓
Developer approves key checkpoints
```

This document should be used as the source of truth before implementation.

---

# 1. Product Name

**OpenPome**

CLI name:

```bash
pome
```

Working description:

> OpenPome is a Jira-first (work-item-first in architecture) AI developer workbench that helps developers pick an assigned work item and lets AI take ownership of the implementation workflow end-to-end, from understanding the ticket to planning, coding, testing, PR preparation, and work item updates, with human approval checkpoints.

---

# 2. Corrected Core Concept

The product starts from **assigned work items**, not from random local workspace detection.

The developer experience should be:

```txt
Open the OpenPome desktop app / CLI
↓
See assigned Jira issues
  - main stories
  - sub-tasks
  - bugs
  - technical tasks
↓
Choose one issue
↓
Click Start
↓
AI takes ownership of execution
```

The product should reduce developer burden by making AI handle the boring and repetitive parts:

- reading Jira,
- understanding requirements,
- identifying missing details,
- resolving the correct workspace,
- creating the branch,
- locating relevant files,
- planning implementation,
- making code changes,
- running tests,
- fixing failures,
- preparing PR summary,
- preparing work item updates,
- preparing QA handoff,
- maintaining task memory.

The developer is still in control, but should not manually prepare everything.

---

# 3. Problem Statement

Developers receive Jira stories, bugs, and sub-tasks every day.

For each task, they must manually:

- read Jira description,
- understand unclear requirements,
- find related main story/sub-tasks,
- identify the correct workspace or repository,
- create branch,
- inspect code,
- ask AI with enough context,
- apply changes,
- run tests,
- debug failures,
- prepare PR,
- update Jira,
- write Slack or standup updates.

AI tools can help, but today the developer still acts as the coordinator.

The developer must manually copy Jira, code context, logs, diffs, acceptance criteria, and previous decisions into AI tools.

This causes:

- wasted time,
- context loss,
- repeated prompting,
- incomplete AI answers,
- unclear Jira interpretation,
- slow PR preparation,
- poor updates,
- reduced productivity.

The core problem:

> Developers need AI to take ownership of Jira task execution, not just answer isolated prompts.

---

# 4. Final Solution

OpenPome should become a **Jira-driven AI execution workbench**.

It shows assigned Jira tasks and lets the developer start an AI-owned work session.

Once a task starts, OpenPome should:

1. read the Jira issue,
2. understand task type,
3. find parent story and sub-tasks,
4. identify missing requirements,
5. resolve the correct workspace using Jira, links, history, local repos, and confidence ranking,
6. inspect workspace and branch state,
7. create or suggest branch,
8. build an implementation plan,
9. ask for approval if needed,
10. execute code changes through an AI coding engine,
11. run configured tests,
12. analyze failures,
13. iterate until passing or blocked,
14. prepare PR title/body,
15. prepare work item update,
16. prepare QA handoff,
17. store task memory.

The developer should mostly do:

```txt
Select Jira → Click Start → Review/approve checkpoints → Merge/submit when ready
```

---

# 5. Product Positioning

OpenPome is not just an AI prompt generator.

OpenPome is not just a dashboard.

OpenPome is not just a local context detector.

OpenPome is:

> A developer productivity workbench where Jira tasks become AI-owned execution sessions.

It bridges:

```txt
Work item → workspace context → AI implementation → tests → PR → work item update
```

---

# 6. Target User

Primary user:

> Software developer assigned Jira tasks in a company environment.

The developer uses:

- Jira,
- GitHub or GitHub Enterprise,
- local Git repos,
- terminal,
- tests,
- PR workflows,
- Codex / Claude / ChatGPT / local LLMs,
- macOS, Linux, or Windows.

The product should support developers who work behind VPN.

---

# 7. Main Product Flow

## Desktop Flow

```txt
┌──────────────────────────────┐
│ Developer opens app          │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ App fetches assigned Jiras    │
│ using developer permissions   │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Developer sees Jira board     │
│ Stories / Subtasks / Bugs     │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Developer clicks Start        │
│ on one Jira                   │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ AI creates task session       │
│ reads Jira + related context  │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ AI plans implementation       │
│ asks approval if needed       │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ AI implements code changes    │
│ in resolved workspace         │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ AI runs tests / checks        │
│ fixes failures if possible    │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ AI prepares PR + Work Item update │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Developer reviews and submits │
└──────────────────────────────┘
```

---

## CLI Flow

The same concept should work from CLI using `pome`.

Primary provider-neutral command:

```bash
pome work-item list
```

MVP Jira alias:

```bash
pome jira list
```

Shows assigned Jira issues.

```txt
Assigned to you

1. SZM-880  MAZE G3 Form 9 content fix        Story
2. LAN-231  Avatar Selenium timeout issue     Bug
3. RAN-109  RAN full flow validation           Sub-task
```

Developer starts one:

```bash
pome start SZM-880
```

Then OpenPome takes ownership:

```txt
Starting AI-owned task session for SZM-880...

✓ Jira issue loaded
✓ Parent story checked
✓ Sub-tasks checked
✓ Workspace resolved: maze-assessment-content
✓ Confidence: 91%
✓ Branch suggested: feature/SZM-880-maze-g3-form9-fix
✓ Context package prepared
✓ Implementation plan generated

Next checkpoint:
Approve implementation plan? [y/N]
```

---

# 8. Main Product Screens

The product screens should support the Jira-first execution model.

## 8.1 Assigned Work

This is the launch screen.

Purpose:

> Show all Jira issues assigned to the developer.

Should show:

- assigned stories,
- assigned sub-tasks,
- assigned bugs,
- assigned technical tasks,
- parent-child relationships,
- priority,
- status,
- due date/sprint,
- blocked state,
- workspace resolution status,
- AI readiness score.

Example:

```txt
Assigned Work

Main Stories
┌────────────────────────────────────────────────────┐
│ SZM-880  MAZE G3 Form 9 content fix                │
│ Priority: High   Sprint: Current   Workspace: ✓    │
│ AI readiness: 82%                                  │
│ [Start] [View]                                     │
└────────────────────────────────────────────────────┘

Sub-tasks
┌────────────────────────────────────────────────────┐
│ RAN-109  Validate RAN full flow                    │
│ Parent: RAN-100   Workspace: lantern-assessment    │
│ AI readiness: 68%                                  │
│ [Start] [View]                                     │
└────────────────────────────────────────────────────┘

Bugs
┌────────────────────────────────────────────────────┐
│ LAN-231  Avatar Selenium timeout issue             │
│ Severity: Medium   Workspace: lantern-assessment   │
│ AI readiness: 74%                                  │
│ [Start] [View]                                     │
└────────────────────────────────────────────────────┘
```

---

## 8.2 Work Item Detail / Start Screen

Purpose:

> Let developer inspect one Jira before giving AI ownership.

Should show:

- Jira title,
- description,
- acceptance criteria,
- comments summary,
- parent story,
- related sub-tasks,
- linked PRs,
- linked docs,
- workspace resolution,
- missing information,
- AI execution readiness,
- Start button.

Example:

```txt
Jira: SZM-880
MAZE G3 Form 9 content fix

Known:
✓ Description available
✓ Workspace resolved (91%)
✓ Acceptance criteria partially available
✓ Related PR found

Missing:
! Validation command
! Rollback note

AI can start with assumptions.

[Start AI Execution]
```

---

## 8.3 AI Task Session

This is the main execution screen after clicking Start.

Purpose:

> Track AI ownership of the task from planning to PR.

Should show stages:

```txt
1. Understand Jira
2. Build plan
3. Prepare branch
4. Implement
5. Run tests
6. Fix failures
7. Prepare PR
8. Draft work item update
9. Ready for review
```

Example:

```txt
AI Task Session — SZM-880

Current stage: Build plan

Plan:
1. Inspect content file for G3 Form 9
2. Retire old item
3. Add corrected _v1 item
4. Run content validation script
5. Prepare PR summary

[Approve Plan] [Edit Plan] [Stop]
```

---

## 8.4 Execution Console

Purpose:

> Show what AI is doing without overwhelming the developer.

Should show:

- current action,
- files being inspected,
- files changed,
- commands run,
- test results,
- blockers,
- approval requests.

Example:

```txt
Execution Console

✓ Loaded Jira SZM-880
✓ Workspace resolved: maze-assessment-content
✓ Confidence: 91%
✓ Created branch feature/SZM-880-maze-g3-form9-fix
✓ Inspected content files
→ Updating corrected item file

Recent command:
npm run validate:content

Status:
Waiting for test result...
```

---

## 8.5 Review & Approval

Purpose:

> Human approval checkpoint before important actions.

Approval checkpoints:

- before implementation begins,
- before editing sensitive files,
- before running destructive commands,
- before posting work item update,
- before creating PR,
- before sending anything to AI provider,
- before including full diff/code snippets.

Example:

```txt
Approval Needed

AI wants to modify:
- content/maze/g3/form9/item6.json
- manifests/form9.json

Reason:
Correct answer key and retire old item.

[Approve] [Reject] [Ask AI to explain]
```

---

## 8.6 PR & Work Item Completion

Purpose:

> Final output after AI completes task.

Should show:

- changed files,
- test results,
- generated PR title/body,
- work item update,
- QA handoff,
- risk checklist,
- ready status.

Example:

```txt
Task Ready for Review

Changed files: 2
Tests: Passed
PR body: Ready
Work item update: Ready
QA handoff: Ready

[Create PR] [Copy PR Body] [Post Work Item Update] [Finish]
```

---

# 9. AI Ownership Flow

AI ownership does not mean uncontrolled automation.

It means:

> AI becomes responsible for driving the task forward, while the developer approves important checkpoints.

## AI ownership lifecycle

```txt
Assigned Jira selected
      ↓
AI reads Jira
      ↓
AI checks parent/subtasks/comments
      ↓
AI resolves workspace
      ↓
AI creates implementation plan
      ↓
Developer approves plan
      ↓
AI creates branch
      ↓
AI modifies files
      ↓
AI runs tests
      ↓
AI fixes failures or asks for help
      ↓
AI prepares PR and work item update
      ↓
Developer reviews final output
```

---

# 10. Automation Levels

OpenPome should support safe automation levels.

## Level 0 — Manual Handoff

AI prepares context and prompts only.

```txt
Developer copies context to Codex/Claude manually.
```

## Level 1 — Guided Execution

AI creates plan and suggests changes.

```txt
Developer applies or approves changes.
```

## Level 2 — Local Execution With Approval

AI edits files and runs commands locally, but asks approval at checkpoints.

```txt
AI modifies files → developer reviews diff → AI runs tests → developer approves PR.
```

## Level 3 — Full Task Automation With Guardrails

AI completes the full task workflow with predefined policies.

```txt
AI implements, tests, prepares PR, drafts work item update.
Developer reviews final output.
```

## MVP recommendation

Start with:

```txt
Level 1 + selected Level 2
```

Do not start with uncontrolled Level 3 automation.

---

# 11. Work-Item-First Data Model

## Work Item

Core type. Provider-neutral. The Jira connector maps a Jira issue into this shape; future Linear, Azure DevOps, GitHub Issues connectors do the same.

```ts
export interface WorkItem {
  key: string;                 // e.g. "SZM-880"
  source: string;              // connector id, e.g. "jira-cloud"
  type: "story" | "subtask" | "bug" | "task" | "epic";
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignee?: string;
  iteration?: string;          // sprint / cycle / milestone
  parentKey?: string;
  subtasks?: WorkItemSummary[];
  comments?: WorkItemComment[];
  labels?: string[];
  components?: string[];
  links?: WorkItemLink[];
}
```

## AI Task Session

```ts
export interface AITaskSession {
  id: string;
  workItemKey: string;
  workspaceId?: string;
  branchName?: string;
  status:
    | "created"
    | "understanding"
    | "planning"
    | "awaiting_approval"
    | "implementing"
    | "testing"
    | "fixing"
    | "preparing_pr"
    | "ready_for_review"
    | "blocked"
    | "completed";
  automationLevel: 0 | 1 | 2 | 3;
  plan?: ImplementationPlan;
  approvals: ApprovalRequest[];
  events: TaskSessionEvent[];
}
```

## Implementation Plan

```ts
export interface ImplementationPlan {
  summary: string;
  assumptions: string[];
  steps: ImplementationStep[];
  filesLikelyChanged: string[];
  commandsToRun: string[];
  risks: string[];
  missingInfo: string[];
}
```

## Approval Request

```ts
export interface ApprovalRequest {
  id: string;
  type:
    | "approve_plan"
    | "edit_files"
    | "run_command"
    | "include_sensitive_context"
    | "create_pr"
    | "update_work_item";
  title: string;
  reason: string;
  details: string[];
  status: "pending" | "approved" | "rejected";
}
```

## AI Readiness Score

A 0–100 score shown on the Assigned Work and Work Item Detail screens that estimates how ready a work item is for AI-owned execution.

```ts
export interface ReadinessScore {
  total: number; // 0-100
  signals: {
    hasDescription: boolean;            // +15
    hasAcceptanceCriteria: boolean;     // +20
    hasParentContext: boolean;          // +10 (parent story available if subtask)
    workspaceResolved: boolean;         // +25 (high-confidence workspace)
    hasLinkedPRs: boolean;              // +10 (historical signal for repo)
    hasTestCommands: boolean;           // +10
    noBlockers: boolean;                // +10 (not blocked by unresolved deps)
  };
  missing: string[];                    // human-readable gaps
}
```

Thresholds (initial):

- `>= 75` → AI can start with minimal confirmation
- `40–74` → AI can start but will ask for clarification on missing items
- `< 40` → developer must provide context first

## Workspace Confidence

The score produced by workspace ranking (see §19.2).

```ts
export interface WorkspaceConfidence {
  workspaceId: string;
  score: number; // 0.0 - 1.0
  reasons: string[]; // explainable signal contributions
}
```

Thresholds (initial):

- `>= 0.80` → auto-proceed
- `0.50 – 0.79` → recommend top candidate, allow one-tap confirm
- `< 0.50` → require explicit developer selection

## Blocked State

When AI cannot proceed, the session moves to `blocked` with a structured reason so the developer knows what is needed.

```ts
export interface BlockedReason {
  kind:
    | "missing_requirement"        // Jira lacks acceptance criteria, etc.
    | "workspace_unresolved"       // no high-confidence workspace
    | "approval_pending"           // waiting on developer action
    | "test_failure_unfixable"    // AI exhausted fix attempts
    | "external_dependency"        // waiting on another ticket/PR
    | "policy_violation"           // requested action denied by policy
    | "provider_unavailable";      // AI/Jira/Git provider error
  message: string;
  suggestedAction?: string;        // e.g., "Add acceptance criteria to SZM-880"
  retryable: boolean;
}
```

## Task Memory

Local, per-developer memory carried across sessions. Hints only — never authoritative.

```ts
export interface TaskMemory {
  workspaceLinks: LearnedWorkspaceLink[]; // see §19.3
  decisions: DecisionLogEntry[];          // approved plans, rejected approaches
  sessionSummaries: SessionSummary[];     // compact outcome per finished session
  testCommandHistory: TestCommandRecord[]; // which commands worked per workspace
  redactionRules: RedactionRule[];         // developer-tuned secret patterns
}

export interface DecisionLogEntry {
  sessionId: string;
  workItemKey: string;
  decision: string;                       // one-line summary
  rationale?: string;
  timestamp: string;
}

export interface SessionSummary {
  sessionId: string;
  workItemKey: string;
  workspaceId: string;
  outcome: "merged" | "abandoned" | "blocked";
  filesChanged: string[];
  finalPrUrl?: string;
  durationMs: number;
}
```

What is **not** stored in memory: full diffs, Jira ticket bodies, source code, secrets. Those live in the live session and are discarded when the session ends.

---

# 12. Workspace Resolution Overview

This section is the short read. The full model is in §19.

Since a task starts from a work item (Jira for MVP), OpenPome must determine which workspace — a Git repo, monorepo package, or service boundary — corresponds to that work item.

The product does this through **workspace resolution**:

```txt
1. Collect signals (work item links, history, local clones, CODEOWNERS, etc.)
2. Rank candidate workspaces with confidence scores
3. If high confidence → proceed
   If low confidence → ask the developer
4. Remember the developer's choice as a learned hint
```

The product does **not** depend on a static project-to-repo table. That model breaks for monorepos, multi-repo features, and shared services. See §19 for the full signal list and ranking flow.

If resolution confidence is low:

```txt
OpenPome cannot confidently resolve a workspace for this work item.

Workspace candidates:
1. lantern-assessment       confidence 58%
2. maze-assessment-content  confidence 42%
3. ran-assessment           confidence 21%

[Use top candidate] [Choose another] [Create new workspace link]
```

Power-user static overrides exist but are explicitly **post-MVP** and live in their own section to keep them out of the main product model. See §19.6.

---

# 13. CLI Scope — Corrected

The CLI should follow the same Jira-first model.

## 13.1 List assigned work

Primary provider-neutral command:

```bash
pome work-item list
```

MVP Jira alias:

```bash
pome jira list
```

Example:

```txt
Assigned to Dhanasekaran

Stories
1. SZM-880  MAZE G3 Form 9 content fix      Ready
2. LAN-222  Avatar animation accessibility  In Progress

Sub-tasks
3. RAN-109  Validate RAN full flow          To Do

Bugs
4. LAN-231  Selenium timeout in Avatar      To Do
```

---

## 13.2 View Jira details

```bash
pome jira show SZM-880
```

Shows:

- description,
- acceptance criteria,
- parent/subtasks,
- comments summary,
- linked PRs,
- resolved workspace,
- missing info,
- AI readiness.

---

## 13.3 Start AI ownership session

```bash
pome start SZM-880
```

Example:

```txt
Starting AI task session: SZM-880

✓ Jira loaded
✓ Parent/subtasks checked
✓ Workspace resolved: maze-assessment-content
✓ Confidence: 91%
✓ Branch suggested: feature/SZM-880-maze-g3-form9-fix
✓ Initial context prepared

AI is building implementation plan...
```

---

## 13.4 Approve plan

```bash
pome approve plan
```

or:

```bash
pome session approve
```

---

## 13.5 Run AI execution

```bash
pome run
```

Meaning:

> Continue the current AI task session until the next checkpoint.

Example:

```txt
Running task session SZM-880...

✓ Created branch
✓ Updated item file
✓ Updated manifest
→ Running npm run validate:content

Checkpoint reached: Review diff
```

---

## 13.6 Show session status

```bash
pome status
```

Example:

```txt
Current session: SZM-880
Stage: testing
Workspace: maze-assessment-content
Branch: feature/SZM-880-maze-g3-form9-fix
Files changed: 2
Tests: running
Next checkpoint: review test result
```

---

## 13.7 Review diff

```bash
pome diff
```

Shows AI-made changes.

---

## 13.8 Run tests

```bash
pome test
```

Runs discovered or learned test commands for the resolved workspace.

---

## 13.9 Prepare PR

```bash
pome pr draft
```

Generates PR title/body.

Future:

```bash
pome pr create
```

Requires approval.

---

## 13.10 Work item update

Primary command (provider-neutral):

```bash
pome work-item update-draft
```

MVP alias (Jira connector convenience):

```bash
pome jira update-draft
```

Generates a work item comment.

Future:

```bash
pome work-item post-update     # primary
pome jira post-update          # MVP alias
```

Requires approval.

---

## 13.11 Complete task

```bash
pome finish
```

Shows final checklist:

```txt
✓ Code changes complete
✓ Tests passed
✓ PR draft ready
✓ Work item update ready
! QA handoff not reviewed
```

---

# 14. Corrected CLI Command Map

Documented primary commands are provider-neutral. MVP also ships connector-specific aliases (`jira ...`) for convenience; these resolve to the same primary commands.

```txt
Work items (primary):
  pome work-item list
  pome work-item show <KEY>
  pome work-item refresh

Work items (MVP aliases):
  pome jira list           → work-item list
  pome jira show <KEY>     → work-item show
  pome jira refresh        → work-item refresh

Task ownership:
  pome start <KEY>
  pome status
  pome run
  pome stop
  pome resume

Approvals:
  pome approve plan
  pome approve diff
  pome approve command
  pome reject

Implementation:
  pome plan
  pome diff
  pome test
  pome fix

Artifact outputs (primary):
  pome pr draft
  pome pr create
  pome work-item update-draft
  pome work-item post-update
  pome qa draft

Artifact outputs (MVP aliases):
  pome jira update-draft   → work-item update-draft
  pome jira post-update    → work-item post-update

Memory:
  pome memory timeline
  pome memory note
  pome memory decisions

Workspace:
  pome workspace scan
  pome workspace resolve <KEY>
  pome workspace link <KEY> <PATH>
  pome workspace list

Setup:
  pome doctor
  pome init
  pome connector test jira
  pome connector test github

Policy:
  pome policy show
  pome policy set automation-level 1
```

---

# 15. Desktop + CLI Shared Flow

```txt
Desktop:
Assigned Work → Start → AI Session → Approvals → PR / Work Item Update

CLI:
pome jira list
pome start KEY
pome run
pome approve
pome pr draft
```

Both should use the same backend gateway and workflow engine.

---

# 16. Architecture

## High-level architecture

```txt
┌──────────────────────────────────────────────┐
│ Surfaces                                     │
│ Desktop App / CLI / VS Code later             │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ OpenPome Local Gateway                   │
│ sessions, approvals, events, permissions       │
└──────────────────────┬───────────────────────┘
                       │
        ┌──────────────┼────────────────┐
        ▼              ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Work Item Engine │ │ Workspace Engine │ │ AI Orchestrator  │
│ assigned items   │ │ resolve/inspect  │ │ plan/code/test   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │              │                │
        └──────────────┼────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ AI Task Session Engine                        │
│ understand → plan → implement → test → PR      │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ Policy + Approval Engine                      │
│ guardrails, redaction, checkpoints             │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ Artifact Engine                              │
│ PR draft / work item update / QA handoff /   │
│ release note / memory                        │
└──────────────────────────────────────────────┘
```

---

# 17. AI Task Session Flow Diagram

```txt
Assigned Jira selected
        │
        ▼
Load Jira details
        │
        ▼
Load parent story + subtasks
        │
        ▼
Analyze requirements
        │
        ├── If unclear → ask developer / generate clarification
        │
        ▼
Resolve workspace
        │
        ├── If unresolved → ask developer to choose workspace
        │
        ▼
Prepare branch
        │
        ▼
Generate implementation plan
        │
        ▼
Developer approval checkpoint
        │
        ▼
AI implements code changes
        │
        ▼
Run tests / validation commands
        │
        ├── If fail → AI investigates and fixes
        │
        ▼
Review diff checkpoint
        │
        ▼
Generate PR draft
        │
        ▼
Generate work item update
        │
        ▼
Developer final review
```

---

# 18. Safety and Approval Model

AI should not act without boundaries.

## Safe by default

AI can automatically:

- read assigned Jira,
- summarize Jira,
- read repo metadata,
- inspect files within resolved workspace,
- create implementation plan,
- generate drafts,
- run safe read-only commands,
- suggest changes.

## Approval required

AI must ask before:

- editing files,
- running install commands,
- running destructive commands,
- creating branches,
- pushing branches,
- creating PRs,
- posting work item updates,
- including full diff/code in external AI provider,
- accessing sensitive files.

## Always blocked

- secrets,
- tokens,
- credentials,
- private keys,
- `.env`,
- full repo upload,
- personal messages,
- hidden monitoring.

## Failure Recovery

AI must have explicit limits on retries and a clear escalation path. Without these, AI either gives up too early or loops forever.

### Retry limits (defaults)

```txt
Test failure fix attempts:        3
Plan revision attempts:           2
Tool call retries (transient):    2 with exponential backoff
Workspace resolution attempts:    1 (then ask developer)
```

### Escalation path

```txt
AI hits limit
  ↓
Capture failure evidence (last error, last diff, last command)
  ↓
Move session to blocked state with structured BlockedReason
  ↓
Notify developer (desktop toast / CLI prompt)
  ↓
Developer chooses:
  - provide hint and retry
  - approve a different approach
  - take over manually
  - abandon session
```

### When AI must stop immediately

- Policy violation triggered (sensitive file, blocked command)
- Provider rate limit or quota exceeded
- Two consecutive identical failures (likely loop)
- Token/cost ceiling for the session reached
- Developer-set wall-clock timeout exceeded

The session must always exit cleanly — branch preserved, partial changes summarized, no orphaned background work.

---

# 19. Workspace Discovery and Resolution

OpenPome should **not** depend on static Jira-project-to-repository mapping as the core product model.

The corrected approach is:

```txt
Jira task selected
↓
OpenPome resolves the right workspace dynamically
↓
AI verifies confidence
↓
Developer confirms only when confidence is low
↓
OpenPome remembers learned associations as local knowledge
```

This is different from hardcoding:

```txt
Jira project SZM → repo maze-assessment-content
Jira project LAN → repo lantern-assessment
```

That hardcoded mapping is too rigid for an open-source product and does not scale to real companies where:

- one Jira project may touch many repositories,
- one repository may serve many Jira projects,
- components may not be maintained properly,
- teams may use inconsistent labels,
- monorepos may contain many products,
- tasks may span frontend, backend, content, infra, and tests,
- some work may happen outside GitHub,
- future integrations may include Linear, Azure DevOps, GitLab, Bitbucket, Jenkins, Slack, docs, and MCP tools.

---

## 19.1 Correct Concept: Workspace Resolution, Not Hardcoded Mapping

Use the term **workspace resolution**.

A workspace is not just a Git repository. It can include:

```txt
Local repository
Remote repository
Project folder
Monorepo package
Service boundary
Test command profile
PR template
CI workflow
Jira issue context
Related docs
Historical task memory
```

OpenPome should resolve the workspace from multiple signals instead of using a single static mapping.

---

## 19.2 Workspace Resolution Signals

OpenPome can use these signals:

```txt
Jira issue key
Jira project
Jira issue type
Jira labels
Jira components
Jira linked PRs
Jira comments
Parent story
Sub-tasks
Historical completed sessions
Recently used workspaces
Local cloned repositories
Repository remotes
Branch names
Commit messages
Package names
CODEOWNERS
PR templates
CI workflow names
Test command history
Developer confirmation history
```

The system should combine signals and produce confidence.

Example:

```txt
Workspace candidates for SZM-880

1. maze-assessment-content        confidence 91%
   Reasons:
   - linked PR from previous SZM task
   - local workspace exists
   - package contains maze content
   - recent session used this workspace

2. lantern-assessment             confidence 42%
   Reasons:
   - same organization
   - no direct content files found

Recommended workspace:
maze-assessment-content

[Use recommended] [Choose another] [Create new workspace link]
```

---

## 19.3 Learned Workspace Links

OpenPome can remember local learned associations, but these should be treated as **hints**, not hard rules.

Correct local memory model:

```json
{
  "learnedWorkspaceLinks": [
    {
      "source": "developer_confirmation",
      "workItemPattern": "SZM-*",
      "workspaceId": "workspace_maze_content",
      "confidence": 0.91,
      "lastUsedAt": "2026-05-12T10:30:00Z"
    }
  ]
}
```

Hardcoded configuration is **not** the main product path. It is allowed only as a power-user override, described in §19.6.

---

## 19.4 Workspace Resolution Flow

```txt
Developer clicks Start on Jira issue
        │
        ▼
Load Jira issue + parent + subtasks + links
        │
        ▼
Collect workspace signals
        │
        ├── linked PRs
        ├── previous sessions
        ├── local cloned repos
        ├── remote URLs
        ├── branch/commit history
        ├── package/service metadata
        └── developer history
        │
        ▼
Rank workspace candidates
        │
        ▼
Confidence check
        │
        ├── High confidence → proceed
        │
        └── Low confidence → ask developer
        │
        ▼
Create AI task session in resolved workspace
```

---

## 19.5 Future Integration Support

Workspace resolution must support future integrations.

Future sources:

```txt
Jira
Linear
Azure DevOps
GitHub
GitHub Enterprise
GitLab
Bitbucket
Local Git
Monorepos
CI systems
Slack threads
Confluence/docs
MCP tools
Local terminal history
Test runners
Build systems
Package managers
```

The architecture should therefore use capability interfaces like:

```txt
WorkItemSource
CodeHostSource
WorkspaceSource
VersionControlSource
ExecutionEnvironment
PlanningEngine
ModelProvider
ApprovalPolicy
OutputPublisher
```

Provider-specific connectors plug into these interfaces.

---

## 19.6 Advanced Overrides (Post-MVP)

This is a deliberate non-MVP feature. It exists to support power users and enterprise admins who want deterministic, declarative workspace mapping for known projects. **It is not part of the default product model.**

When enabled, a static config file can pin a workspace per work item key pattern:

```json
{
  "advancedOverrides": {
    "workItemPatterns": [
      {
        "match": "SZM-*",
        "workspaceId": "workspace_maze_content",
        "workspacePath": "/Users/dhana/projects/maze-assessment-content",
        "branchPattern": "feature/{workItemKey}-{slug}",
        "testCommands": ["npm test", "npm run validate:content"]
      }
    ]
  }
}
```

Rules:

- Overrides are evaluated **after** dynamic resolution, never instead of it.
- If both produce candidates, the override wins only when confidence diff is < 10%.
- Overrides are scoped per machine (no auto-sync) to avoid leaking team assumptions into individual setups.
- A warning banner appears in the desktop UI when an override is active for a session, so the developer always knows resolution was forced.

This section exists to make the contract explicit: overrides are an escape hatch, not the model.

---

# 20. Repository Structure

The repository structure must support the corrected Jira-first AI ownership model while remaining future-ready for more tools, services, providers, and execution modes.

The structure should be inspired by a control-plane style architecture:

```txt
Surfaces
  ↓
Local Gateway
  ↓
Domain Engines
  ↓
Capability Interfaces
  ↓
Provider Connectors
```

The structure should avoid generic or provider-specific core folder names.

Bad core naming:

```txt
jira/
git/
github/
outputs/
repo-mapping/
```

Better engineering naming:

```txt
work-items/
workspaces/
version-control/
code-hosts/
task-sessions/
execution-plans/
execution-runtime/
approvals/
artifacts/
policy-engine/
```

Provider names such as Jira, GitHub, GitLab, OpenAI, Anthropic, and Ollama should live under `connectors/`, not in core domain packages.

---

## 20.1 Recommended Future-Ready Monorepo Structure

```txt
openpome/
  apps/
    cli/
      src/
        commands/
          work-items/
            list-assigned.ts
            show.ts
            refresh.ts
          sessions/
            start.ts
            status.ts
            run.ts
            pause.ts
            resume.ts
            stop.ts
            finish.ts
          approvals/
            approve.ts
            reject.ts
            list.ts
          execution/
            plan.ts
            diff.ts
            test.ts
            fix.ts
          artifacts/
            draft-pr.ts
            draft-work-item-update.ts
            draft-qa-handoff.ts
          system/
            doctor.ts
            init.ts
            config.ts
        presentation/
          console.ts
          prompts.ts
          tables.ts
          progress.ts
        index.ts
      package.json

    desktop/
      src/
        app/
          App.tsx
          routes.tsx
          providers.tsx
        screens/
          AssignedWorkScreen.tsx
          WorkItemDetailScreen.tsx
          TaskSessionScreen.tsx
          ExecutionConsoleScreen.tsx
          ApprovalQueueScreen.tsx
          CompletionReviewScreen.tsx
          SettingsScreen.tsx
        components/
          WorkItemCard.tsx
          WorkItemGroup.tsx
          ReadinessScore.tsx
          SessionStageTracker.tsx
          ApprovalPanel.tsx
          ExecutionTimeline.tsx
          ArtifactPreview.tsx
          MissingContextPanel.tsx
          WorkspaceCandidateList.tsx
        gateway-client/
          client.ts
          subscriptions.ts
        styles/
          tokens.ts
          global.css
      package.json

  services/
    local-gateway/
      src/
        server.ts
        request-router.ts
        event-stream.ts
        service-registry.ts
        session-coordinator.ts
        approval-coordinator.ts
        capability-runtime.ts
        policy-runtime.ts
        gateway-context.ts
      package.json

    background-worker/
      src/
        worker.ts
        job-runner.ts
        scheduled-sync.ts
      package.json

  packages/
    core/
      kernel/
        src/
          kernel.ts
          dependency-container.ts
          lifecycle.ts
          errors.ts
          index.ts
        package.json

      protocol/
        src/
          requests.ts
          responses.ts
          events.ts
          errors.ts
          identifiers.ts
          index.ts
        package.json

      configuration/
        src/
          config-schema.ts
          config-loader.ts
          workspace-settings.ts
          defaults.ts
          index.ts
        package.json

      persistence/
        src/
          database.ts
          migrations/
          repositories/
            work-item-cache.repository.ts
            task-session.repository.ts
            approval.repository.ts
            workspace-link.repository.ts
            artifact.repository.ts
            memory.repository.ts
          index.ts
        package.json

      event-bus/
        src/
          event-bus.ts
          event-store.ts
          subscriptions.ts
          index.ts
        package.json

      logging/
        src/
          logger.ts
          local-diagnostics.ts
          index.ts
        package.json

    domain/
      work-items/
        src/
          work-item.types.ts
          work-item-source.interface.ts
          assigned-work.service.ts
          work-item-hierarchy.service.ts
          missing-context.service.ts
          readiness-score.service.ts
          index.ts
        package.json

      task-sessions/
        src/
          task-session.types.ts
          task-session.service.ts
          task-session-state-machine.ts
          session-stage.types.ts
          session-event.types.ts
          index.ts
        package.json

      workspaces/
        src/
          workspace.types.ts
          workspace-source.interface.ts
          workspace-discovery.service.ts
          workspace-resolution.service.ts
          workspace-ranking.service.ts
          workspace-link-memory.service.ts
          workspace-confidence.service.ts
          index.ts
        package.json

      execution-plans/
        src/
          execution-plan.types.ts
          planning-engine.interface.ts
          plan-generator.service.ts
          assumption-detector.service.ts
          risk-detector.service.ts
          file-scope-estimator.service.ts
          index.ts
        package.json

      evidence/
        src/
          evidence.types.ts
          evidence-collector.service.ts
          failure-evidence.service.ts
          command-evidence.service.ts
          test-evidence.service.ts
          evidence-summary.service.ts
          index.ts
        package.json

      approvals/
        src/
          approval.types.ts
          approval-policy.service.ts
          approval-request.service.ts
          approval-renderer.service.ts
          index.ts
        package.json

      artifacts/
        src/
          artifact.types.ts
          artifact-generator.interface.ts
          pull-request-artifact.service.ts
          work-item-update-artifact.service.ts
          qa-handoff-artifact.service.ts
          release-note-artifact.service.ts
          quality-check.service.ts
          index.ts
        package.json

      memory/
        src/
          memory.types.ts
          task-memory.service.ts
          decision-log.service.ts
          session-summary.service.ts
          index.ts
        package.json

    capabilities/
      version-control/
        src/
          version-control.interface.ts
          repository-state.types.ts
          branch.types.ts
          diff.types.ts
          commit.types.ts
          index.ts
        package.json

      code-hosts/
        src/
          code-host.interface.ts
          pull-request.types.ts
          repository.types.ts
          review.types.ts
          index.ts
        package.json

      execution-runtime/
        src/
          execution-runtime.interface.ts
          command-runner.types.ts
          file-edit.types.ts
          test-runner.types.ts
          sandbox-policy.types.ts
          index.ts
        package.json

      model-providers/
        src/
          model-provider.interface.ts
          model-request.types.ts
          model-response.types.ts
          model-routing.service.ts
          index.ts
        package.json

      communication/
        src/
          notification-target.interface.ts
          message-draft.types.ts
          publisher.types.ts
          index.ts
        package.json

      document-sources/
        src/
          document-source.interface.ts
          document-reference.types.ts
          index.ts
        package.json

    engines/
      ai-orchestrator/
        src/
          ai-orchestrator.ts
          task-execution-loop.ts
          checkpoint-controller.ts
          tool-call-controller.ts
          index.ts
        package.json

      policy-engine/
        src/
          policy.types.ts
          default-policy.ts
          policy-engine.ts
          sensitive-action-detector.ts
          automation-level.service.ts
          index.ts
        package.json

      redaction-engine/
        src/
          secret-scanner.ts
          redactor.ts
          file-blocklist.ts
          content-classifier.ts
          index.ts
        package.json

      prompt-engine/
        src/
          prompt.types.ts
          task-understanding.prompt.ts
          implementation-plan.prompt.ts
          debug.prompt.ts
          review.prompt.ts
          release.prompt.ts
          jira-clarification.prompt.ts
          index.ts
        package.json

  connectors/
    work-items/
      jira-cloud/
        src/
          client.ts
          auth.ts
          mapper.ts
          source.ts
          index.ts
        package.json

      jira-data-center/
        src/
          client.ts
          auth.ts
          mapper.ts
          source.ts
          index.ts
        package.json

      linear/
        src/
          client.ts
          mapper.ts
          source.ts
          index.ts
        package.json

      azure-devops/
        src/
          client.ts
          mapper.ts
          source.ts
          index.ts
        package.json

    version-control/
      git-native/
        src/
          git-client.ts
          source.ts
          index.ts
        package.json

    code-hosts/
      github-cloud/
        src/
          client.ts
          auth.ts
          source.ts
          index.ts
        package.json

      github-enterprise/
        src/
          client.ts
          auth.ts
          source.ts
          index.ts
        package.json

      gitlab/
        src/
          client.ts
          source.ts
          index.ts
        package.json

      bitbucket/
        src/
          client.ts
          source.ts
          index.ts
        package.json

    execution-runtime/
      local-shell/
        src/
          shell-runner.ts
          command-policy.ts
          source.ts
          index.ts
        package.json

    model-providers/
      manual-copy/
        src/
          provider.ts
          index.ts
        package.json

      openai/
        src/
          provider.ts
          auth.ts
          index.ts
        package.json

      anthropic/
        src/
          provider.ts
          auth.ts
          index.ts
        package.json

      ollama/
        src/
          provider.ts
          index.ts
        package.json

    communication/
      slack/
        src/
          client.ts
          publisher.ts
          index.ts
        package.json

    documents/
      confluence/
        src/
          client.ts
          source.ts
          index.ts
        package.json

  plugins/
    examples/
      custom-work-item-source/
      custom-artifact-generator/
      custom-policy-rule/
      custom-workspace-resolver/

  docs/
    product-scope.md
    architecture.md
    cli.md
    desktop-flow.md
    jira-first-flow.md
    ai-task-session.md
    workspace-resolution.md
    approvals.md
    policy-and-security.md
    connector-sdk.md
    plugin-system.md
    mvp.md
    roadmap.md
    decisions.md

  examples/
    jira-first-basic/
    jira-to-pr-flow/
    selenium-debug-flow/
    content-release-flow/
    multi-repo-task-flow/

  scripts/
    dev.ts
    build.ts
    test.ts
    lint.ts
    release.ts

  .github/
    workflows/
      ci.yml
      release.yml

  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  eslint.config.js
  README.md
```

---

## 20.2 MVP Repository Structure

For MVP, use a smaller structure that still matches the future architecture.

```txt
openpome/
  apps/
    cli/
      src/
        commands/
          work-items/list-assigned.ts
          work-items/show.ts
          sessions/start.ts
          sessions/status.ts
          sessions/run.ts
          approvals/approve.ts
          execution/plan.ts
          artifacts/draft-pr.ts
          artifacts/draft-work-item-update.ts
          system/doctor.ts
        presentation/
          console.ts
          prompts.ts
          tables.ts
        index.ts
      package.json

  services/
    local-gateway/
      src/
        server.ts
        request-router.ts
        session-coordinator.ts
        approval-coordinator.ts
        service-registry.ts
      package.json

  packages/
    core/
      protocol/
        src/
          requests.ts
          responses.ts
          events.ts
          index.ts
        package.json

      configuration/
        src/
          config-loader.ts
          workspace-settings.ts
          index.ts
        package.json

      persistence/
        src/
          database.ts
          task-session.repository.ts
          workspace-link.repository.ts
          memory.repository.ts
          index.ts
        package.json

    domain/
      work-items/
        src/
          work-item.types.ts
          assigned-work.service.ts
          missing-context.service.ts
          readiness-score.service.ts
          index.ts
        package.json

      task-sessions/
        src/
          task-session.types.ts
          task-session.service.ts
          task-session-state-machine.ts
          index.ts
        package.json

      workspaces/
        src/
          workspace.types.ts
          workspace-discovery.service.ts
          workspace-resolution.service.ts
          workspace-ranking.service.ts
          index.ts
        package.json

      execution-plans/
        src/
          execution-plan.types.ts
          plan-generator.service.ts
          risk-detector.service.ts
          index.ts
        package.json

      approvals/
        src/
          approval.types.ts
          approval-request.service.ts
          index.ts
        package.json

      artifacts/
        src/
          pull-request-artifact.service.ts
          work-item-update-artifact.service.ts
          quality-check.service.ts
          index.ts
        package.json

    capabilities/
      version-control/
        src/
          version-control.interface.ts
          repository-state.types.ts
          index.ts
        package.json

      execution-runtime/
        src/
          execution-runtime.interface.ts
          command-runner.types.ts
          index.ts
        package.json

      model-providers/
        src/
          model-provider.interface.ts
          model-routing.service.ts
          index.ts
        package.json

    engines/
      policy-engine/
        src/
          default-policy.ts
          policy-engine.ts
          automation-level.service.ts
          index.ts
        package.json

      prompt-engine/
        src/
          implementation-plan.prompt.ts
          debug.prompt.ts
          release.prompt.ts
          index.ts
        package.json

  connectors/
    work-items/
      jira-cloud/
        src/
          client.ts
          auth.ts
          mapper.ts
          source.ts
          index.ts
        package.json

    version-control/
      git-native/
        src/
          git-client.ts
          source.ts
          index.ts
        package.json

    model-providers/
      manual-copy/
        src/
          provider.ts
          index.ts
        package.json

  docs/
    product-scope.md
    cli.md
    jira-first-flow.md
    workspace-resolution.md
    approvals.md
    mvp.md
    policy-and-security.md

  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
```

This MVP structure supports the current Jira-first scope but does not block future integrations.

---

## 20.3 Why This Structure Fits the Product

Correct product priority:

```txt
1. Assigned work item
2. AI task session
3. Workspace resolution
4. Execution plan
5. Guided/local execution
6. Tests and evidence
7. PR / work item update / QA artifacts
8. Memory and learning
```

This structure avoids the earlier mistake:

```txt
1. Current repo
2. Branch
3. Guess task
```

The selected Jira/work item is the starting point. Workspace resolution happens after task selection.

---

## 20.4 Naming Rules

Use domain and capability names in core packages.

Good names:

```txt
work-items
task-sessions
workspaces
execution-plans
evidence
approvals
artifacts
memory
version-control
code-hosts
execution-runtime
model-providers
policy-engine
redaction-engine
prompt-engine
```

Avoid provider-specific core names:

```txt
jira
github
gitlab
openai
anthropic
```

Provider-specific names belong in connectors:

```txt
connectors/work-items/jira-cloud
connectors/work-items/jira-data-center
connectors/code-hosts/github-enterprise
connectors/model-providers/openai
```

---

## 20.5 Dependency Direction

Dependency flow should be one-way.

```txt
apps/*
  ↓
services/local-gateway
  ↓
packages/domain/* + packages/engines/*
  ↓
packages/capabilities/*
  ↓
connectors/*
```

Rules:

```txt
Apps must not call connectors directly.
Connectors must not know about UI.
Domain packages must not depend on React or terminal UI.
Provider-specific APIs must stay inside connectors.
Policy must be enforced by gateway and engines.
Workspace resolution must be dynamic, not hardcoded.
```

---

## 20.6 Root `package.json` Example

```json
{
  "name": "openpome",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "latest",
    "tsx": "latest",
    "eslint": "latest",
    "prettier": "latest"
  }
}
```

---

## 20.7 `pnpm-workspace.yaml` Example

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/core/*"
  - "packages/domain/*"
  - "packages/capabilities/*"
  - "packages/engines/*"
  - "connectors/*/*"
```

---

## 20.8 AGENTS.md Placement

Each major folder gets a scoped `AGENTS.md` so coding agents (Codex, Claude, Cursor, Copilot) follow local rules. Full content rules are in §21.

```txt
openpome/
  AGENTS.md                   ← root: mission, hard rules, dependency direction
  CLAUDE.md                   ← symlink or copy of AGENTS.md for Claude tools

  apps/
    cli/AGENTS.md
    desktop/AGENTS.md

  services/
    local-gateway/AGENTS.md

  packages/
    domain/
      work-items/AGENTS.md
      workspaces/AGENTS.md
      task-sessions/AGENTS.md
      execution-plans/AGENTS.md
      approvals/AGENTS.md
      artifacts/AGENTS.md

    capabilities/
      version-control/AGENTS.md
      code-hosts/AGENTS.md
      execution-runtime/AGENTS.md
      model-providers/AGENTS.md

    engines/
      ai-orchestrator/AGENTS.md
      policy-engine/AGENTS.md
      redaction-engine/AGENTS.md
      prompt-engine/AGENTS.md

  connectors/AGENTS.md
```

The root file owns hard policy and dependency direction. Scoped files own local workflows. See §21 for content templates.

---

## 20.9 TypeScript Path Alias Example

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@openpome/protocol": ["packages/core/protocol/src"],
      "@openpome/configuration": ["packages/core/configuration/src"],
      "@openpome/persistence": ["packages/core/persistence/src"],
      "@openpome/work-items": ["packages/domain/work-items/src"],
      "@openpome/task-sessions": ["packages/domain/task-sessions/src"],
      "@openpome/workspaces": ["packages/domain/workspaces/src"],
      "@openpome/execution-plans": ["packages/domain/execution-plans/src"],
      "@openpome/evidence": ["packages/domain/evidence/src"],
      "@openpome/approvals": ["packages/domain/approvals/src"],
      "@openpome/artifacts": ["packages/domain/artifacts/src"],
      "@openpome/version-control": ["packages/capabilities/version-control/src"],
      "@openpome/code-hosts": ["packages/capabilities/code-hosts/src"],
      "@openpome/execution-runtime": ["packages/capabilities/execution-runtime/src"],
      "@openpome/model-providers": ["packages/capabilities/model-providers/src"],
      "@openpome/ai-orchestrator": ["packages/engines/ai-orchestrator/src"],
      "@openpome/policy-engine": ["packages/engines/policy-engine/src"],
      "@openpome/prompt-engine": ["packages/engines/prompt-engine/src"]
    }
  }
}
```

---

# 21. Agent Operating Memory

OpenPome supports memory at **two distinct levels**. These must not be confused.

```txt
Runtime memory      → what happened in a user's task session
Agent memory        → how AI coding agents should behave inside this repo
```

`TaskMemory` (§11) is runtime memory. `AGENTS.md` files are agent operating memory. They serve different audiences (end-user product vs. AI contributors) and must stay separate.

## 21.1 Why Agent Operating Memory Is Needed

OpenPome is an AI-native open-source project. Contributors will use Codex, Claude, Cursor, Copilot, and other coding agents to extend it. Without scoped local guidance, agents will make predictable mistakes:

- put provider-specific code in core/domain packages,
- bypass the local gateway,
- call connectors directly from apps,
- ignore approval and policy engines,
- confuse Jira-first UX with work-item-first architecture,
- reintroduce static repo mapping instead of workspace resolution,
- create generic folder names instead of domain/capability names,
- break the one-way dependency direction (§20.5).

The cure is **scoped, file-based agent instructions** — one `AGENTS.md` per major module. The root file owns hard policy; scoped files own local workflows.

## 21.2 Root Agent Memory

```txt
openpome/
  AGENTS.md          ← source of truth
  CLAUDE.md          ← symlink or copy for Claude-based tools
```

The root `AGENTS.md` defines:

```txt
- Project mission
- Hard architecture rules
- Dependency direction
- Security rules
- Naming rules
- Provider-neutral design rules
- Testing expectations
- Documentation expectations
- What agents must not do
```

### Root rules (template content)

```txt
OpenPome is Jira-first in UX, work-item-first in architecture.

Do not make local repo detection the primary entry point.
Do not put Jira-specific logic in core or domain packages.
Do not call connectors directly from apps.
Do not bypass the local gateway.
Do not bypass approval or policy engines.
Use workspace resolution, not hardcoded repo mapping.

Use provider-neutral names in core:
  work-items, workspaces, task-sessions, execution-plans,
  artifacts, capabilities, approvals, evidence, memory.

Provider names belong only under connectors/.

Dependency direction (one-way):
  apps → services/local-gateway → packages/domain + engines
  → packages/capabilities → connectors

Never write secrets, tokens, or .env values into source.
Never send full repository contents to external AI providers.
Approval is required before any destructive or external action.
```

## 21.3 Scoped Agent Memory

Each major module has its own `AGENTS.md`. Scoped files inherit from the root file but add module-specific rules. When a coding agent works inside a subtree, it must read the nearest `AGENTS.md` before making changes.

Placement was shown in §20.8. Content templates follow.

## 21.4 Scoped Templates

### `packages/domain/work-items/AGENTS.md`

```txt
# Work Items Agent Guide

This package is provider-neutral.

Allowed
- WorkItem types and operations
- assigned work logic
- hierarchy handling (parent/subtask)
- readiness score
- missing context detection

Not allowed
- Jira REST API calls
- Jira Cloud-specific fields leaking into core types
- GitHub or Linear-specific logic
- UI code

Use connector interfaces (WorkItemSource) for any provider-specific data.
```

### `packages/domain/workspaces/AGENTS.md`

```txt
# Workspaces Agent Guide

This package resolves workspaces dynamically.

Use
- workspace candidates
- confidence ranking (0.0–1.0)
- local workspace discovery
- learned hints (TaskMemory.workspaceLinks)

Do not
- add static Jira-project-to-repo mapping as the main model
- assume one Jira project equals one repo
- assume one repo equals one workspace

Workspace resolution must be explainable.
Every candidate must include confidence and reasons.
```

### `packages/engines/policy-engine/AGENTS.md`

```txt
# Policy Engine Agent Guide

This package owns safety and approval policy.
All destructive or sensitive operations must pass through this package.

Approval required before
- file edits
- destructive commands
- branch push
- PR creation
- work item update posting
- external AI provider sharing of code or diffs

Never allow
- secrets, tokens, .env, private keys
- full repo upload to any external service
- hidden monitoring
- bypassing approval for any reason
```

### `services/local-gateway/AGENTS.md`

```txt
# Local Gateway Agent Guide

The local gateway is the control plane.

It coordinates
- task sessions
- approvals
- policy checks
- events
- connectors
- capabilities

Apps must call the gateway.
Apps must not call connectors directly.
The gateway must enforce policy before execution.
```

### `connectors/AGENTS.md`

```txt
# Connectors Agent Guide

Every connector implements a capability interface from packages/capabilities.

Do
- map provider data into core types (WorkItem, Workspace, etc.)
- handle provider-specific auth here, not in core
- isolate provider quirks behind the interface

Do not
- leak provider-specific types into core
- import from apps/ or services/
- store credentials anywhere except the OS keychain
```

### `apps/cli/AGENTS.md` and `apps/desktop/AGENTS.md`

```txt
# Surface Agent Guide

Surfaces are thin. They translate user intent into gateway requests.

Do
- render data and collect input
- forward all actions to the local gateway
- preserve approval checkpoints in the UI

Do not
- call connectors directly
- duplicate domain logic
- store business state outside the gateway
```

## 21.5 Agent Memory vs Runtime Memory

```txt
AGENTS.md files       → guidance for coding agents working ON OpenPome
TaskMemory            → records of what happened DURING user sessions
WorkspaceLinks        → learned hints for workspace resolution
DecisionLog           → approved/rejected implementation decisions
```

Do not mix these. Coding agent instructions never appear in runtime memory; user session records never end up in `AGENTS.md`.

## 21.6 Update Rule

When a module gains a new rule, pattern, or constraint, update **that module's** `AGENTS.md` in the same PR.

```txt
New connector pattern added
  → update connectors/AGENTS.md (and connector-specific file if any)

Workspace resolution rule changed
  → update packages/domain/workspaces/AGENTS.md

Approval policy changed
  → update packages/engines/policy-engine/AGENTS.md

CLI command convention changed
  → update apps/cli/AGENTS.md
```

The root `AGENTS.md` is touched only for cross-cutting architectural rules.

## 21.7 Success Criteria

Agent operating memory is working if:

```txt
✓ AI contributors follow architecture without repeated explanation.
✓ Provider-specific code stays inside connectors.
✓ Workspace resolution stays dynamic, never reverts to static mapping.
✓ Policy checks are never bypassed.
✓ CLI and desktop surfaces stay thin.
✓ Domain packages remain provider-neutral.
✓ New contributors understand local rules by reading the nearest AGENTS.md.
```

If AI agents repeatedly violate a rule, the rule's `AGENTS.md` is incomplete — fix the file, not the agent.

---

# 22. MVP Scope

## MVP goal

> Let a developer pick an assigned work item and have OpenPome guide AI through planning, task-session context generation, test guidance, PR draft, and work item update.

## MVP features

```txt
1. Jira login / connector
2. Assigned Jira list
3. Main story / sub-task / bug grouping
4. Jira detail view
5. Start AI task session
6. Workspace resolution
7. Implementation plan generation
8. Approval checkpoint for plan
9. AI task-session context generation
10. Basic local execution or guided execution
11. Test command discovery and run
12. PR draft generation
13. Work item update draft generation
14. Local task memory
15. Safety policy
16. CLI equivalent flow
```

## MVP out of scope

```txt
Full autonomous merge
Auto-posting without approval
Team manager dashboard
Developer surveillance
Cloud sync
Full MCP marketplace
Complex multi-agent orchestration
Time tracking
```

---

# 23. MVP Build Order

```txt
Step 1: Jira connector and assigned issue list
Step 2: Desktop Assigned Work screen
Step 3: CLI jira list and jira show
Step 4: Workspace discovery and resolution
Step 5: Start task session model
Step 6: AI plan generation from Jira context
Step 7: Approval checkpoint system
Step 8: AI task-session context generation
Step 9: Workspace Git/branch/status integration
Step 10: Test command discovery
Step 11: PR draft generation
Step 12: Work item update draft generation
Step 13: Local memory timeline
Step 14: Safe local execution flow
Step 15: Improve AI executor loop
```

---

# 24. Open Decisions for MVP

These are concrete questions the MVP must answer before implementation begins. Each has a recommended default; the developer can revisit during build.

## 24.1 AI Provider Strategy

```txt
Question:  Which AI provider drives the AI Task Session by default?
Default:   Manual-copy connector (Level 0) for first release.
           Anthropic and OpenAI connectors behind opt-in setup.
Why:       Avoids requiring API keys/quota on day one. Lets the product
           prove value purely as a context preparation + workflow tool
           before charging into autonomous execution.
Defer:     Local LLM (Ollama) integration to post-MVP.
```

## 24.2 Authentication

```txt
Jira:      Personal Access Token (PAT) for MVP. OAuth in v2.
           VPN users: token-only path is sufficient.
GitHub:    PAT for MVP. GitHub App support in v2.
Storage:   OS keychain (macOS Keychain, Windows Credential Manager,
           libsecret on Linux). Never plaintext on disk.
Why:       PAT is universally supported on cloud and enterprise installs
           and works behind VPN without callback URLs.
```

## 24.3 Multi-Repo Tasks

```txt
Decision:  Out of MVP scope.
           One AI Task Session = one workspace.
           If a Jira spans multiple repos, developer starts multiple
           sessions linked by the same Jira key.
Defer:     A true multi-workspace session (with cross-repo planning)
           is post-MVP, after single-workspace flow is proven.
```

## 24.4 Cost and Quota Controls

```txt
Per-session ceiling:  Default 200,000 input tokens, configurable.
                      Session blocks when reached; developer can extend.
Per-day ceiling:      Default off (opt-in for organizations).
Display:              Show running token count in execution console.
Why:                  Prevents runaway sessions and surprise bills.
                      Required before any non-manual provider is enabled.
```

## 24.5 Test Command Discovery

```txt
Resolution order:
  1. Workspace override (config or learned)
  2. Detect from package.json scripts (test, lint, typecheck)
  3. Detect from common files (Makefile, pytest.ini, go.mod)
  4. Ask developer at first run; remember choice
Why:       Hardcoding test commands per project fails the workspace
           resolution principle (§19). Discovery + memory is the model.
```

## 24.6 Session Persistence and Resume

```txt
Storage:   SQLite under ~/.openpome/ (per OS conventions).
Contents:  AITaskSession state, ApprovalRequest log, event timeline,
           TaskMemory (see §11).
Not stored: full diffs (live only), Jira bodies (refetched), secrets.
Resume:    `pome resume <session-id>` rehydrates state from
           SQLite, refetches Jira, verifies workspace still exists,
           replays the next pending checkpoint.
```

---

# 25. Product Success Metrics

OpenPome succeeds if:

```txt
Developer can start from assigned Jira in under 10 seconds.
AI creates a useful implementation plan without manual prompt writing.
Developer copy-paste into AI is reduced significantly.
PR draft is generated automatically from task/session context.
Work item update is generated automatically.
Developer can resume an AI task session later.
Workspace resolution improves over time.
AI execution saves real implementation/debugging time.
```

Qualitative goal:

> “I pick a Jira, click Start, and AI drives the task forward while I review important decisions.”

---

# 26. Final Correct Product Statement

OpenPome is a Jira-first AI developer workbench.

The developer opens the desktop app or CLI and sees Jira issues assigned to them, including main stories, sub-tasks, bugs, and technical tasks.

The developer selects a Jira and clicks **Start**.

OpenPome creates an AI-owned task session that reads the work item, understands related context, resolves the correct workspace, creates a plan, executes or guides implementation, runs tests, prepares PR content, drafts work item updates, and stores local task memory.

The developer remains in control through approval checkpoints, but the AI owns the workflow execution.

The product should feel like:

> "I choose my work item, click Start, and AI takes responsibility for moving it toward PR-ready completion."

Not like:

> "I manually collect workspace, branch, logs, diffs, and prompts again."

---

# 27. Desktop UI/UX Design

This appendix defines the minimal desktop UI based on the flows in §7, §8, and §17. Mockups are deliberately low-fidelity (ASCII) so they remain implementation-neutral.

## 27.1 Design Principles

```txt
1. One purpose per screen.       No multi-pane overviews.
2. One primary action visible.   Always bottom-right.
3. Persistent stage tracker.     Five dots during a session.
4. Approvals are explicit.       Cards or modals, never silent.
5. Minimal navigation.           Three items: Assigned · Active · History.
6. No dashboards, no charts.     Linear activity logs only.
```

## 27.2 Navigation Model

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ OpenPome                                              ⚙   ◑     │
├────────┬─────────────────────────────────────────────────────────────┤
│        │                                                              │
│ ASSIGN │    [main content area]                                       │
│ ACTIVE │                                                              │
│ HIST.  │                                                              │
│        │                                                              │
└────────┴─────────────────────────────────────────────────────────────┘
```

- **Assigned**: default screen, list of work items.
- **Active**: present only when a session is in progress.
- **History**: completed sessions and decision log.
- **⚙ (top-right)**: opens Settings (Connectors, AI, Workspaces, Policy, About).

The cog is intentionally separate from the sidebar. Settings is a global concern accessible from anywhere, not a primary workflow surface.

## 27.3 Screen — Assigned Work

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ OpenPome                                              ⚙   ◑     │
├────────┬─────────────────────────────────────────────────────────────┤
│        │ Assigned to you                              🔍              │
│ ASSIGN │                                                              │
│ ACTIVE │ ── Stories ────────────────────────────────────────────     │
│ HIST.  │                                                              │
│        │  SZM-880   MAZE G3 Form 9 content fix          [Start ▸]    │
│        │            High · Sprint · 82% ready · Workspace ✓          │
│        │                                                              │
│        │  LAN-222   Avatar animation accessibility       [Start ▸]    │
│        │            Medium · In progress · 64% ready                  │
│        │                                                              │
│        │ ── Sub-tasks ──────────────────────────────────────────     │
│        │                                                              │
│        │  RAN-109   Validate RAN full flow               [Start ▸]    │
│        │            To do · 68% ready · Workspace ⚠                  │
│        │                                                              │
│        │ ── Bugs ───────────────────────────────────────────────     │
│        │                                                              │
│        │  LAN-231   Selenium timeout in Avatar           [Start ▸]    │
│        │            Medium · 74% ready · Workspace ✓                 │
└────────┴─────────────────────────────────────────────────────────────┘
```

One row per work item. The only metrics shown are AI readiness (§11) and workspace resolution status (✓ resolved, ⚠ ambiguous).

## 27.4 Screen — Work Item Detail / Start

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back                                                                │
│                                                                       │
│  SZM-880                                                              │
│  MAZE G3 Form 9 content fix                                           │
│  Story · High · Current sprint                                        │
│                                                                       │
│  ──────────────────────────────────────────────────────────────       │
│                                                                       │
│  Description                                                          │
│  Item 6 in Form 9 has incorrect answer key. Retire current item       │
│  and add corrected _v1 version.                                       │
│                                                                       │
│  Workspace   maze-assessment-content   91%             [change]       │
│  Branch      feature/SZM-880-maze-g3-form9-fix     suggested          │
│                                                                       │
│  ──────────────────────────────────────────────────────────────       │
│                                                                       │
│  Ready                          Missing                               │
│  • Description                  • Validation command                  │
│  • Acceptance criteria          • Rollback note                       │
│  • Linked PR                                                          │
│  • Workspace resolved                                                 │
│                                                                       │
│  AI will start with assumptions for missing items.                    │
│                                                                       │
│                                            [ Start AI Execution ▸ ]   │
└──────────────────────────────────────────────────────────────────────┘
```

Ready/Missing reflects the `ReadinessScore` signals (§11).

## 27.5 Screen — AI Task Session (running)

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880   MAZE G3 Form 9 content fix                       ⏸ Pause   │
│                                                                       │
│  ✓ Understand   ✓ Plan   ● Implement   ○ Test   ○ Review              │
│  ────────────────────────────────────────────────────────────────     │
│                                                                       │
│  Activity                                                             │
│  ✓ Loaded SZM-880 + parent context                                    │
│  ✓ Resolved workspace · maze-assessment-content (91%)                 │
│  ✓ Created branch feature/SZM-880-maze-g3-form9-fix                   │
│  ✓ Plan approved                                                      │
│  → Editing content/maze/g3/form9/item6.json                           │
│    Editing manifests/form9.json                                       │
│                                                                       │
│  ──────────────────────────────────────────────────────────────       │
│                                                                       │
│  Tokens   18,420 / 200,000        Elapsed   2m 14s                    │
│                                                                       │
│                                       [ View Plan ]      [ Stop ]     │
└──────────────────────────────────────────────────────────────────────┘
```

Stage tracker matches §9 AI ownership lifecycle stages. Cost meter enforces §24.4 ceiling.

## 27.6 Screen — Plan Approval

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880   Implementation plan                                         │
│                                                                       │
│  Summary                                                              │
│  Retire item6 in Form 9 and replace with corrected _v1.               │
│                                                                       │
│  Steps                                                                │
│  1. Inspect content/maze/g3/form9/item6.json                          │
│  2. Mark item retired in manifest                                     │
│  3. Add item6_v1.json with corrected key                              │
│  4. Update manifests/form9.json                                       │
│  5. Run npm run validate:content                                      │
│                                                                       │
│  Files likely changed          Risks                                  │
│  • item6.json                  • Manifest order matters               │
│  • item6_v1.json (new)         • CDN cache may need bump              │
│  • form9.json                                                         │
│                                                                       │
│  Assumptions                                                          │
│  • Validation command = npm run validate:content                      │
│  • Preserve item6.json on branch as rollback                          │
│                                                                       │
│  [ Edit Plan ]   [ Reject ]                       [ Approve Plan ▸ ]  │
└──────────────────────────────────────────────────────────────────────┘
```

Maps 1:1 to `ImplementationPlan` (§11).

## 27.7 Screen — Inline Approval (file edits / commands)

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880                                                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Approval needed                                              │     │
│  │ ────────────────                                             │     │
│  │ AI wants to modify 2 files:                                  │     │
│  │  • content/maze/g3/form9/item6.json                          │     │
│  │  • manifests/form9.json                                      │     │
│  │                                                              │     │
│  │ Reason                                                       │     │
│  │ Retire item with incorrect key, add corrected _v1.           │     │
│  │                                                              │     │
│  │ [ View diff ]                                                │     │
│  │                                                              │     │
│  │          [ Reject ]   [ Ask AI ]        [ Approve ▸ ]        │     │
│  └─────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

Triggered by any `ApprovalRequest` (§11) of type `edit_files`, `run_command`, `include_sensitive_context`, `create_pr`, or `update_work_item`.

## 27.8 Screen — Completion / Ready for Review

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880   Ready for review                                            │
│                                                                       │
│  ✓ Understand   ✓ Plan   ✓ Implement   ✓ Test   ● Review              │
│  ────────────────────────────────────────────────────────────────     │
│                                                                       │
│  ✓ 2 files changed                                                    │
│  ✓ Tests passed   npm run validate:content                            │
│  ✓ PR draft ready                                                     │
│  ✓ Work item update ready                                             │
│  ! QA handoff not yet reviewed                                        │
│                                                                       │
│  PR title                                                             │
│  SZM-880: Fix MAZE G3 Form 9 item6 answer key                         │
│                                                                       │
│  PR body                [ Preview ]                                   │
│  Work item comment      [ Preview ]                                   │
│  QA handoff             [ Preview ]                                   │
│                                                                       │
│         [ Create PR ]   [ Post Work Item Update ]   [ Finish ▸ ]      │
└──────────────────────────────────────────────────────────────────────┘
```

Artifacts here are produced by the Artifact Engine (§16): `PullRequestArtifact`, `WorkItemUpdateArtifact`, `QAHandoffArtifact`.

## 27.9 Screen — Workspace Ambiguous (low confidence)

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880   Choose workspace                                            │
│                                                                       │
│  OpenPome could not confidently resolve a workspace.             │
│                                                                       │
│  ○ maze-assessment-content   58%   Recent SZM session                 │
│  ○ lantern-assessment        42%   Same organization                  │
│  ○ ran-assessment            21%   Branch name match                  │
│                                                                       │
│  [ Add new workspace link ]                                           │
│                                                                       │
│                                  [ Cancel ]   [ Use selected ▸ ]      │
└──────────────────────────────────────────────────────────────────────┘
```

Appears when `WorkspaceConfidence.score < 0.50` (§11). Developer selection is captured as a learned link (§19.3).

## 27.10 Screen — Blocked State

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880   Blocked  ⚠                                                  │
│                                                                       │
│  Tests failed 3 times.                                                │
│  Last failure: validate:content expected v1 marker.                   │
│                                                                       │
│  Suggested action                                                     │
│  Confirm validation command, or provide expected manifest format.     │
│                                                                       │
│  [ Provide hint ]   [ Take over ]   [ Try different approach ]        │
└──────────────────────────────────────────────────────────────────────┘
```

Triggered by `BlockedReason` (§11). Follows the failure recovery escalation path in §18.

## 27.11 Diff View

Approval requests link to `[View diff]`. This is that screen. The diff is the most-used decision surface for any code change — it deserves a first-class design.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back to session       SZM-880 · 2 files changed         ⌘↵ Approve │
│                                                                       │
│  content/maze/g3/form9/item6.json                              +3 -2  │
│  manifests/form9.json                                          +1 -0  │
│  ────────────────────────────────────────────────────────────────    │
│                                                                       │
│   content/maze/g3/form9/item6.json                                    │
│                                                                       │
│    12  │  "answerKey": "B",                                           │
│    13  │  "retired": false,                                           │
│        │- "version": "v0"                                             │
│        │+ "retired": true,                                            │
│        │+ "supersededBy": "item6_v1",                                 │
│        │+ "version": "v0"                                             │
│    14  │ }                                                            │
│                                                                       │
│   manifests/form9.json                                                │
│                                                                       │
│    34  │    "item6",                                                  │
│        │+   "item6_v1",                                               │
│    35  │    "item7"                                                   │
│                                                                       │
│  ────────────────────────────────────────────────────────────────    │
│                                                                       │
│  Reason:  Retire item with incorrect key, add corrected _v1.          │
│                                                                       │
│  [ Reject ]   [ Ask AI to revise ]              [ Approve changes ▸ ] │
└──────────────────────────────────────────────────────────────────────┘
```

Behaviors:

- Files listed top-left; click to jump. Default view shows all hunks expanded.
- `j` / `k` scrolls hunk-by-hunk. `⌘↵` approves. `Esc` returns to session.
- "Ask AI to revise" opens an inline prompt (§27.13) pre-filled with the file path.
- Large diffs (>200 lines per file) collapse with `[Expand]` per hunk.

---

## 27.12 History

The sidebar's `HIST.` item opens this screen. It surfaces resumable sessions, decisions, and learned hints — without these being visible, `TaskMemory` is invisible work.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ History                                                  🔍 Search    │
│                                                                       │
│  SESSIONS   DECISIONS   LEARNED LINKS                                 │
│  ──────                                                               │
│                                                                       │
│  Today                                                                │
│   ✓ SZM-880   Fix Form 9 item6              Merged · 14m · 2 files    │
│   ⚠ LAN-231   Selenium timeout              Blocked · waiting on hint │
│                                                                       │
│  Yesterday                                                            │
│   ✓ SZM-877   Add Form 8 item7              Merged · 22m · 3 files    │
│   ✗ RAN-104   Validate flow                 Abandoned                 │
│                                                                       │
│  Last 7 days                                                          │
│   ✓ LAN-218   Avatar a11y fix               Merged · 8m  · 1 file     │
│   ✓ SZM-870   Manifest rebuild              Merged · 31m · 6 files    │
│                                                                       │
│  ────────────────────────────────────────────────────────────────    │
│                                                                       │
│   Row actions:  [Open]  [Resume]  [Copy PR link]  [Forget]            │
└──────────────────────────────────────────────────────────────────────┘
```

Three tabs:

- **Sessions** — list of `SessionSummary` (§11), grouped by date, with outcome.
- **Decisions** — `DecisionLogEntry` log: approved plans, rejected approaches.
- **Learned Links** — `LearnedWorkspaceLink[]` with usage counts (mirrors Settings → Workspaces; shown here as audit, editable there).

Blocked sessions appear inline with a one-tap **Resume** action.

---

## 27.13 Ask AI Inline

Mid-session, the developer must be able to talk to AI without leaving the session. This is the difference between a workflow runner and an assistant.

The session screen (§27.5) gains a thin input strip at the bottom:

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ SZM-880   MAZE G3 Form 9 content fix                       ⏸ Pause   │
│                                                                       │
│  ✓ Understand   ✓ Plan   ● Implement   ○ Test   ○ Review              │
│  ────────────────────────────────────────────────────────────────     │
│                                                                       │
│  Activity                                                             │
│  ✓ Created branch feature/SZM-880-...                                 │
│  → Editing content/maze/g3/form9/item6.json                           │
│                                                                       │
│  ── AI thinking ───────────────────────────────────────────────       │
│   Checking manifest order before adding item6_v1...                   │
│                                                                       │
│  ──────────────────────────────────────────────────────────────       │
│                                                                       │
│  Tokens   18,420 / 200,000        Elapsed   2m 14s                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Ask, redirect, or add a constraint...                  ⌘↵   │     │
│  └─────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

Three behaviors the input supports:

```txt
Ask         "what does the validate:content script check?"
            → AI answers inline, session continues.

Redirect    "skip the manifest update for now"
            → AI revises plan; new ApprovalRequest may be raised.

Constrain   "do not touch item5"
            → Constraint added to session policy for this run.
```

The input also accepts slash commands:

```txt
/plan       show current plan
/diff       open diff view (§27.11)
/blockers   list current blockers
/cost       show token usage breakdown
```

This is the **only** chat-like surface in the product. There is no global chat panel — conversation lives inside a session and is scoped to it.

---

## 27.14 Command Palette and Keyboard Shortcuts

Open with `⌘K` (`Ctrl+K` on Linux/Windows) from any screen.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│   ⌘K  >  __________________________________________________________  │
│                                                                       │
│   ── Work items ───────────────────────────────────────────────       │
│      SZM-880   Fix Form 9 item6                            Open       │
│      LAN-231   Selenium timeout                            Open       │
│      RAN-109   Validate full flow                          Open       │
│                                                                       │
│   ── Sessions ─────────────────────────────────────────────────       │
│      SZM-880   in progress                                Resume      │
│                                                                       │
│   ── Actions ──────────────────────────────────────────────────       │
│      Approve current step                                  ⌘↵         │
│      View diff                                             ⌘D         │
│      Stop session                                          ⌘.         │
│      Open settings                                         ⌘,         │
│                                                                       │
│   ── Navigation ───────────────────────────────────────────────       │
│      Assigned Work                                         ⌘1         │
│      Active Session                                        ⌘2         │
│      History                                               ⌘3         │
└──────────────────────────────────────────────────────────────────────┘
```

### Global keyboard map

```txt
⌘K          Command palette
⌘1 / ⌘2 / ⌘3   Assigned / Active / History
⌘,          Settings
⌘D          View diff (during session)
⌘↵          Approve current step / submit input
⌘.          Stop session
Esc         Close modal / return to session
j / k       Navigate lists and hunks
?           Show shortcut overlay
```

Every primary button shows its shortcut on hover (`Approve   ⌘↵`). Power users never have to reach for the mouse during an approval chain.

---

## 27.15 Active Session Footer

When a session is running and the developer navigates to Settings, History, or another work item, the session must remain visible. A thin footer pinned to the bottom of every screen shows the live state.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ [current screen content]                                              │
│                                                                       │
│                                                                       │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ ● SZM-880   Implement   2m 14s   18.4k tokens         [Open ▸]       │
└──────────────────────────────────────────────────────────────────────┘
```

States:

```txt
●  running        green dot, current stage shown
⏸  paused         amber, last stage shown
⚠  blocked        red, blocker reason truncated
⏳ awaiting       blue, "approval needed" + jump action
✓  ready          green check, "ready for review" + jump action
```

Click anywhere on the footer to return to the session. If an approval is pending, the footer pulses gently and the global title bar updates with a `(1)` badge — but no noisy notification banners.

When there is no active session, the footer is hidden entirely.

---

## 27.16 First-Run Onboarding

### Why this exists

The desktop app has nothing to show until at least one **work item source** is connected. Without Jira (or Linear or another connector), the Assigned Work screen is empty. So the first launch must walk the user through:

```txt
1. Connect a work item source     (required)
2. Connect a code host            (optional, needed for PR creation)
3. Choose an AI provider          (default: manual copy — no key needed)
4. Choose an automation level     (default: Level 1)
5. Land on Assigned Work
```

The same flow is re-entrant from `Settings → Connectors` whenever the user adds a new connector.

### Screen — Welcome

```txt
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│                        Welcome to OpenPome                       │
│                                                                       │
│       A Jira-first AI developer workbench.                            │
│       Pick a work item, click Start, let AI drive the workflow.       │
│                                                                       │
│       What you'll need:                                               │
│        • A Jira account                  (required for MVP)           │
│        • A GitHub account                (optional, for PRs)          │
│        • An AI provider or willingness to copy/paste prompts          │
│                                                                       │
│       Setup takes about 2 minutes.                                    │
│                                                                       │
│                                       [ Skip ]            [ Begin ▸ ] │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen — Connect Work Item Source

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Setup · Step 1 of 4                                                   │
│                                                                       │
│  Connect a work item source                                           │
│                                                                       │
│  ● Jira Cloud                                                         │
│  ○ Jira Data Center                                                   │
│  ○ Linear                       (post-MVP)                            │
│  ○ Azure DevOps                 (post-MVP)                            │
│                                                                       │
│  ──────────────────────────────────────────────────────────────       │
│                                                                       │
│  Site URL       https://____________.atlassian.net                    │
│  Email          [_________________________________]                   │
│  API token      [••••••••••••••••••••••••••••••]   How to create?    │
│                                                                       │
│  Stored in OS keychain. Never written to disk in plaintext.           │
│                                                                       │
│                                  [ Test connection ]   [ Continue ▸ ] │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen — Connect Code Host (optional)

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Setup · Step 2 of 4                                                   │
│                                                                       │
│  Connect a code host (optional)                                       │
│                                                                       │
│  OpenPome can plan, edit, and test code without this.            │
│  A code host is needed only to create pull requests automatically.    │
│                                                                       │
│  ○ GitHub Cloud           [ Sign in with GitHub ]                     │
│  ○ GitHub Enterprise      Host URL [______________]   [ Connect ]    │
│  ○ GitLab                 (post-MVP)                                  │
│  ○ Bitbucket              (post-MVP)                                  │
│                                                                       │
│                                  [ Skip ]              [ Continue ▸ ] │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen — Choose AI Provider

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Setup · Step 3 of 4                                                   │
│                                                                       │
│  Choose AI provider                                                   │
│                                                                       │
│  ● Manual copy                                                        │
│    No API key. OpenPome prepares the prompt and context;         │
│    you paste it into ChatGPT/Claude/Codex.  Best for first session.   │
│                                                                       │
│  ○ Anthropic              Model: claude-opus-4-7    [ Add API key ]   │
│  ○ OpenAI                 Model: gpt-5              [ Add API key ]   │
│  ○ Ollama (local)         Status: not detected      [ Detect ]        │
│                                                                       │
│                                  [ Back ]             [ Continue ▸ ]  │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen — Automation Level

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Setup · Step 4 of 4                                                   │
│                                                                       │
│  Choose automation level                                              │
│                                                                       │
│  ○ Level 0 · Manual handoff                                           │
│    AI prepares context only. You do all execution.                    │
│                                                                       │
│  ● Level 1 · Guided execution      (recommended)                      │
│    AI proposes plan and changes. You approve each step.               │
│                                                                       │
│  ○ Level 2 · Local execution with approval                            │
│    AI edits files and runs tests. You approve at checkpoints.         │
│                                                                       │
│  ○ Level 3 · Full automation       (not recommended yet)              │
│    AI completes the task. You only review the final output.           │
│                                                                       │
│  You can change this any time in Settings → Policy.                   │
│                                                                       │
│                                  [ Back ]             [ Finish ▸ ]    │
└──────────────────────────────────────────────────────────────────────┘
```

### Screen — Setup Complete

```txt
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│                          ✓ Setup complete                             │
│                                                                       │
│       Connections                                                     │
│        ✓ Jira Cloud           dkathiresan@amplify.com                 │
│        ✓ GitHub Cloud         dhanasekarank                           │
│        • AI provider          Manual copy                             │
│        • Automation level     Level 1 (Guided)                        │
│                                                                       │
│       Fetching your assigned work...                                  │
│                                                                       │
│                                                  [ Open Assigned ▸ ]  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 27.17 Settings

Accessible via the ⚙ icon top-right. Five tabs.

### Layout

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back to work                                              Settings  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  CONNECTORS   AI   WORKSPACES   POLICY   ABOUT                        │
│  ──────────                                                           │
│                                                                       │
│  [tab content]                                                        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Tab — Connectors

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Settings · Connectors                                                 │
│                                                                       │
│  Work item sources                                                    │
│  ─────────────────                                                    │
│   ✓ Jira Cloud           dkathiresan@amplify.com      [Test] [Remove] │
│   + Add another work item source...                                   │
│                                                                       │
│  Code hosts                                                           │
│  ──────────                                                           │
│   ✓ GitHub Cloud         dhanasekarank                [Test] [Remove] │
│   ⚠ GitHub Enterprise    Token expired                [Reconnect]     │
│   + Add another code host...                                          │
│                                                                       │
│  AI providers                                                         │
│  ────────────                                                         │
│   ● Manual copy          (always available, no setup)                 │
│   ○ Anthropic            Not connected                [Add key]       │
│   ○ OpenAI               Not connected                [Add key]       │
│   ○ Ollama (local)       Not detected                 [Detect]        │
│                                                                       │
│  Communication           (optional)                                   │
│  ──────────────                                                       │
│   ○ Slack                Not connected                [Connect]       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

This is the **only** screen where provider names (Jira, GitHub, Slack) appear as primary labels. Everywhere else the product uses domain language (work item, code host, communication).

### Tab — AI

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Settings · AI                                                         │
│                                                                       │
│  Active provider              [ Manual copy            ▾ ]            │
│  Model                        [ —                      ▾ ]            │
│                                                                       │
│  Token ceiling per session    [ 200,000 ]                             │
│  Daily token ceiling          [ Off                    ▾ ]            │
│  Show running cost in console [ ☑ ]                                   │
│                                                                       │
│  Redaction                                                            │
│  Block these patterns before sending to AI providers:                 │
│   • API_KEY, SECRET, TOKEN, PASSWORD     (built-in)                   │
│   • .env, id_rsa, *.pem, *.p12           (built-in)                   │
│   + Add custom pattern...                                             │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Tab — Workspaces

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Settings · Workspaces                                                 │
│                                                                       │
│  Scan paths                                                           │
│  OpenPome looks for workspaces in these paths.                   │
│   • /Users/dhana/projects               [Rescan]   [Remove]           │
│   + Add path...                                                       │
│                                                                       │
│  Learned workspace links                                              │
│  ─────────────────────────                                            │
│   SZM-*    →   maze-assessment-content    used 12 times   [Forget]    │
│   LAN-*    →   lantern-assessment         used 7 times    [Forget]    │
│   RAN-*    →   ran-assessment             used 3 times    [Forget]    │
│                                                                       │
│  Advanced overrides (post-MVP, see §19.6)                             │
│  No overrides configured.                          [Open config file] │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Tab — Policy

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Settings · Policy                                                     │
│                                                                       │
│  Automation level                                                     │
│   ○ Level 0  Manual handoff                                           │
│   ● Level 1  Guided execution                                         │
│   ○ Level 2  Local execution with approval                            │
│   ○ Level 3  Full automation                                          │
│                                                                       │
│  Always require approval for                                          │
│   ☑ File edits         ☑ Run commands       ☑ Create branches         │
│   ☑ Push branches      ☑ Create PRs         ☑ Post work item updates  │
│                                                                       │
│  Failure recovery                                                     │
│   Max test-fix retries          [ 3 ]                                 │
│   Max plan revisions            [ 2 ]                                 │
│   Session wall-clock timeout    [ 30 min      ▾ ]                     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Tab — About

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Settings · About                                                      │
│                                                                       │
│  OpenPome   v0.1.0                                               │
│                                                                       │
│  Local data                                                           │
│   Storage path     ~/.openpome/                                  │
│   Database         sessions.sqlite  (4.2 MB)                          │
│   Sessions         12 stored                                          │
│                                                                       │
│  [ Open log folder ]   [ Run diagnostics ]   [ Export anonymized log ]│
│                                                                       │
│  Privacy                                                              │
│  No telemetry by default. All data stays on this device.              │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 27.18 Connector State Visible in the Main UI

Connector problems must surface without forcing the user into Settings.

### Banner — work item source disconnected

Shown on the Assigned Work screen if the primary work item source is offline or unauthorized.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ ⚠ Jira connection expired. Some items may be stale.    [ Reconnect ] │
└──────────────────────────────────────────────────────────────────────┘
```

### Inline — code host missing on Completion screen

If a PR draft is ready but no code host is connected, the Create PR button is disabled with a tooltip:

```txt
[ Create PR ]   ⚠ Connect a code host in Settings to enable.
```

### Inline — AI quota warning during a session

If `tokenCeilingPerSession` reaches 80%, the active session shows:

```txt
⚠ 162,400 / 200,000 tokens used. Approaching session ceiling.  [Extend]
```

### Empty state — no connectors at all

If the user skips onboarding, the Assigned Work screen is not blank — it explains the next step:

```txt
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│       No work items yet.                                              │
│                                                                       │
│       Connect a work item source to see your assigned work.           │
│                                                                       │
│                                          [ Open Settings → Connectors ]│
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 27.19 Connector and Settings Data Types

These types support the onboarding and settings screens above.

```ts
export interface ConnectorRegistration {
  id: string;                              // "jira-cloud", "github-cloud"
  kind: "work_item_source" | "code_host" | "model_provider" | "communication";
  displayName: string;
  status: "connected" | "disconnected" | "expired" | "error";
  account?: string;                        // user-facing account identifier
  lastVerifiedAt?: string;
  errorMessage?: string;
}

export interface AIProviderConfig {
  providerId: string;                      // "manual-copy" | "anthropic" | "openai" | "ollama"
  modelId?: string;
  tokenCeilingPerSession: number;          // default 200_000
  dailyTokenCeiling?: number;              // optional
  showRunningCost: boolean;
  redactionPatterns: string[];
}

export interface AutomationPolicy {
  level: 0 | 1 | 2 | 3;                    // see §10
  requireApprovalFor: ApprovalRequest["type"][];
  maxTestFixRetries: number;               // default 3
  maxPlanRevisions: number;                // default 2
  sessionTimeoutMs: number;                // default 30 * 60 * 1000
}

export interface WorkspaceScanConfig {
  scanPaths: string[];
  learnedLinks: LearnedWorkspaceLink[];    // see §19.3
  overridesEnabled: boolean;               // false by default
}
```

Tokens, keys, and credentials are **never** stored in these structures. They live in the OS keychain and are referenced by handle (`account` field). This keeps the entire settings store safe to back up or inspect.

---

## 27.20 What's Deliberately Not in the Design

```txt
✗ Dashboards, charts, analytics.
✗ Team views, surveillance, time tracking.
✗ Multi-pane "IDE-like" layouts (IDE is for code; this is for orchestration).
✗ Notification badges everywhere.
✗ Provider-specific visual branding in core screens (Jira logo, GitHub octocat).
  Provider branding only appears in Settings → Connectors.
```

## 27.21 Mapping UI to Domain Types

```txt
Screen 27.3  Assigned Work        → WorkItem[] + ReadinessScore + WorkspaceConfidence
Screen 27.4  Work Item Detail     → WorkItem + WorkspaceConfidence
Screen 27.5  AI Task Session      → AITaskSession (state machine)
Screen 27.6  Plan Approval        → ImplementationPlan + ApprovalRequest
Screen 27.7  Inline Approval      → ApprovalRequest
Screen 27.8  Completion           → Artifact[] (PR, work item update, QA)
Screen 27.9  Workspace Ambiguous  → WorkspaceConfidence[]
Screen 27.10 Blocked              → BlockedReason
Screen 27.11 Diff View            → ApprovalRequest + file diff payload
Screen 27.12 History              → SessionSummary[] + DecisionLogEntry[] +
                                    LearnedWorkspaceLink[]
Screen 27.13 Ask AI Inline        → AITaskSession (input event stream)
Screen 27.14 Command Palette      → cross-cutting (work items + sessions + actions)
Screen 27.15 Active Session Footer→ AITaskSession.status
Screen 27.16 Onboarding           → ConnectorRegistration + AIProviderConfig +
                                    AutomationPolicy
Screen 27.17 Settings             → ConnectorRegistration[] + AIProviderConfig +
                                    WorkspaceScanConfig + AutomationPolicy
Screen 27.18 Connector banners    → ConnectorRegistration.status
```

Every screen maps to a single core type. No screen invents UI state outside the domain model.

---

## 27.22 Theme, Density, and Motion

These are visual defaults, not concept work. Listed here so they don't get reinvented per screen.

### Theme

```txt
Light and dark themes are both required at first release.
Default follows OS preference; user can override in Settings → About.
No third theme variants (high-contrast, sepia) at MVP — accessibility
of the two core themes is the higher priority.
```

### Density

```txt
One density only at MVP: comfortable.
Compact mode can come later, but a single density keeps the design
language consistent while it's still being learned.
```

### Motion

```txt
Use motion sparingly and purposefully:
  ✓ Stage tracker dot transitions    150ms ease-out
  ✓ Approval card slide-in            120ms ease-out
  ✓ Footer pulse when approval ready  1s loop, very subtle
  ✗ No bouncing, sliding, parallax, or "delight" animations.
```

### Typography

```txt
UI:    system font stack (San Francisco / Segoe UI / Inter fallback)
Code:  monospace stack (SF Mono / Cascadia Code / JetBrains Mono fallback)
       used in Diff View, Activity log, Plan steps, CLI command examples.
```

### Color usage

```txt
Status colors mean only what their semantics say:
  green   ✓ done, ready, merged
  amber   ⚠ attention, paused, expired token
  red     ✗ blocked, rejected, policy violation
  blue    ● running, in progress
No decorative color. No "brand accents" inside core surfaces.
```

These rules are enforced at the design-token level, not per screen.

---

# 28. Operations and Licensing

Items required to ship the product as open source, separate from product scope. Each subsection is a short opinionated default — all can be revisited before launch, but the project should not start without them.

## 28.1 License

**Default: Apache License 2.0.**

Why:

```txt
✓ Permissive — broad commercial and personal use allowed.
✓ Explicit patent grant — important for an AI-native project where
  contributors may carry patent risk.
✓ Standard for developer tooling (VS Code, Kubernetes, Cursor).
```

Repository root must contain:

```txt
LICENSE          ← Apache 2.0 text
NOTICE           ← attribution for bundled third-party code
```

Every `package.json` must declare:

```json
{ "license": "Apache-2.0" }
```

Connector and plugin licenses must be compatible with Apache 2.0 (MIT, BSD, Apache 2.0 are fine). GPL or AGPL components require a separate decision and cannot be added without explicit approval.

## 28.2 Plugin Contract

The `plugins/` folder (§20.1) is for community extensions. The MVP plugin contract is minimal but explicit — so the folder is not aspirational.

### What a plugin is

A TypeScript or JavaScript package that exports an implementation of one capability interface from `packages/capabilities/`. The plugin declares its capability in `package.json`:

```json
{
  "name": "@openpome/plugin-linear",
  "version": "0.1.0",
  "openpome": {
    "capability": "work_item_source",
    "displayName": "Linear",
    "minGatewayVersion": "0.1.0"
  }
}
```

### Discovery

At startup the local gateway scans, in order:

```txt
1. <repo>/plugins/                   workspace-local plugins (for development)
2. ~/.openpome/plugins/         user-installed plugins
3. node_modules/@openpome/plugin-*  npm-installed plugins
```

Each directory containing a valid `package.json` with `pome.capability` is loaded.

### Lifecycle interface

```ts
export interface OpenPomePlugin<K extends CapabilityKind> {
  manifest: PluginManifest;
  initialize(ctx: GatewayContext): Promise<CapabilityImplementation<K>>;
  shutdown(): Promise<void>;
}
```

Plugins receive a constrained `GatewayContext` — they can log, read configuration, and use registered capabilities, but cannot reach into other plugins or bypass policy.

### Out of MVP scope

```txt
✗ Plugin marketplace / registry
✗ Process-level sandboxing (plugins run in-process; trust is on the user)
✗ Signed plugin verification
✗ Hot reload
```

These are tracked separately and must be in place before any "plugin marketplace" claim.

## 28.3 Telemetry and Crash Reporting

OpenPome follows a strict opt-in model.

### Default (always)

```txt
✓ No telemetry. No analytics. No remote logging.
✓ All data stays on the device.
```

### Opt-in — Anonymous Usage Metrics

A toggle in Settings → About sends only:

```txt
- Anonymous install ID (random UUID, regenerated on opt-out)
- App version
- Counters: sessions started, completed, blocked
- AI provider category: manual-copy / anthropic / openai / ollama / other
- Error categories (no messages, no stack frames)
```

What is **never** sent, even when opted in:

```txt
✗ Work item IDs, titles, descriptions, comments
✗ Workspace paths, repo names, branch names
✗ File paths, diffs, code, commit messages
✗ AI prompts or responses
✗ Email addresses, account identifiers, tokens
```

### Opt-in — Crash Reports

Separate toggle. Sends a sanitized crash dump on unexpected exits.

```txt
- File paths reduced to anonymous handles
  (/Users/x/projects/maze/...  →  <workspace>/<file>)
- All session content stripped; only stack frames + version retained
- First submission shows the exact payload before sending
```

### Self-hosting

Telemetry and crash report endpoints are configurable in the build config so forks and corporate users can point to their own collectors. The project organization runs the defaults.

## 28.4 Distribution and Updates

MVP distribution targets:

```txt
Desktop:
  macOS    .dmg, signed and notarized       → GitHub Releases
  Windows  .msi, signed (EV cert)           → GitHub Releases
  Linux    .AppImage and .deb, unsigned     → GitHub Releases
                                              (signing post-MVP)

CLI:
  npm                                       → @openpome/cli
  Homebrew                                  → openpome/tap/pome
```

### Auto-update channels

```txt
Stable   default; tagged releases only
Beta     opt-in; release candidates
Local    dev builds; no auto-update
```

Updates download in the background and apply on next launch. **Never mid-session.** Uses platform-standard mechanisms (Squirrel.Mac, Squirrel.Windows, manual prompt for Linux).

## 28.5 Testing Strategy

A project that claims to be AI-maintainable must demonstrate it. Four layers:

```txt
Unit          packages/*           domain logic, state machines, type guards
                                   Target: every transition in the
                                   task-session-state-machine

Integration   services/local-gateway   end-to-end request flows with
                                       fake connectors and a mock AI provider

Contract      connectors/*         every connector passes the same
                                   capability-interface contract suite

UI            apps/desktop         approval flow, command palette,
                                   navigation; Playwright against the
                                   real gateway with mocks
```

### Conventions

```txt
- Every domain package has its own test folder.
- AI orchestrator tests use a deterministic mock model provider.
- `pome doctor` runs the local health check.
- CI runs all four layers on every PR.
```

### Explicitly not tested in CI

```txt
- Real AI provider behavior (rate-limited, non-deterministic)
- Real Jira / GitHub APIs

These are covered by manual smoke tests on release branches against
sandbox accounts. Release cannot ship without smoke-test sign-off.
```

## 28.6 Data Migration

Local state lives in `~/.openpome/sessions.sqlite` (§24.6). Schema changes must never lose user data.

### Rules

```txt
- Migrations live in packages/core/persistence/migrations/
- Each migration is forward-only and idempotent.
- Migrations run on first launch after upgrade, before any UI is shown.
- A failed migration rolls back and offers:
    [ Open log ]   [ Restore from backup ]   [ Factory reset ]
```

### Backup

On first launch after upgrade, the existing `sessions.sqlite` is copied to:

```txt
~/.openpome/backups/sessions.sqlite.bak-<old-version>-<timestamp>
```

Backups older than 30 days are pruned automatically. The user can configure retention in Settings → About.

### Versioning

```txt
- The database has a schema_version table.
- The app refuses to start if the database version is newer than
  the app version (no silent downgrades).
- On version mismatch, the user sees:

  ┌──────────────────────────────────────────────────────────────┐
  │ This data was created by a newer version of OpenPome.   │
  │ Install the latest version or restore an older backup.       │
  │                          [ Open Releases ]   [ Restore... ]  │
  └──────────────────────────────────────────────────────────────┘
```

---

This concludes the scope document. The remaining concerns (multi-account, offline mode, internationalization, accessibility beyond keyboard navigation, team features) are explicitly post-MVP and tracked in the roadmap, not here.

