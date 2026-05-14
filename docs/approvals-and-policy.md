# Approvals and Policy

OpenPome is AI-owned, not AI-uncontrolled.

The AI drives the workflow, but the developer approves important checkpoints.

## Safe by Default

OpenPome can automatically:

- read assigned work items
- summarize work item context
- read repo metadata
- inspect files inside the resolved workspace
- create implementation plans
- generate drafts
- run safe read-only commands
- suggest changes

## Approval Required

OpenPome must ask before:

- editing files
- running install commands
- running destructive commands
- creating branches
- pushing branches
- creating PRs
- posting work item updates
- sending full diffs or code to an external AI provider
- accessing sensitive files

## Always Blocked

OpenPome must block:

- secrets
- tokens
- credentials
- private keys
- `.env`
- full repo upload
- personal messages
- hidden monitoring

## Retry Limits

Defaults:

```txt
test failure fix attempts: 3
plan revision attempts: 2
transient tool retries: 2
workspace resolution attempts: 1 before asking developer
```

## Blocked State

When OpenPome cannot proceed, it must move the session into a structured blocked state with:

- reason kind
- human-readable message
- suggested next action
- retryable flag
- last evidence if available

## Immediate Stop Conditions

Stop immediately when:

- policy violation is triggered
- provider quota or rate limit is exceeded
- two consecutive identical failures occur
- token or cost ceiling is reached
- developer wall-clock timeout is reached

The session must exit cleanly with branch state preserved and partial work summarized.

