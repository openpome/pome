# MVP Scope

The MVP proves one promise:

> A developer picks an assigned work item and OpenPome guides the task toward PR-ready output.

For the MVP, the assigned work item source is Jira and the first code host is GitHub. This is the initial workflow, not the long-term product boundary.

## In Scope

- Jira Cloud connector as the first work item source
- assigned work item list from Jira
- story, subtask, bug, and task grouping
- work item detail view
- workspace discovery and resolution
- AI task session model
- implementation plan generation
- plan approval checkpoint
- manual-copy AI provider
- test command discovery
- local session persistence
- PR draft generation
- work item update draft generation
- safety policy
- CLI equivalent flow
- VPN and non-VPN connector support through PAT/token-based setup and clear reachability checks
- Jira browser auth support for developers who cannot create API tokens

## Out of Scope

- autonomous merge
- auto-posting work item updates without approval
- team or manager dashboard
- developer surveillance
- cloud sync
- full plugin marketplace
- complex multi-agent orchestration
- time tracking
- multi-repo sessions
- real AI provider execution as the default path

## Recommended Defaults

- AI provider: manual-copy
- Jira auth: API-token/basic auth for MVP, with OAuth/browser auth scaffold supported when API tokens are unavailable
- Jira auth hardening: production OAuth packaging and enterprise broker options later
- GitHub auth: PAT for MVP, GitHub App later
- network support: public internet, corporate VPN, and mixed VPN/non-VPN setups
- storage: JSON files are acceptable for early CLI state; the active session JSON may carry the current event timeline and approval history, with a bounded local session history for stop/resume/reset. Migrate to local SQLite under `~/.openpome/` before larger multi-session timelines, memory, retry evidence, and test history.
- automation level: Level 1 guided execution plus selected Level 2 actions
- one session maps to one workspace

## First Milestone

Build this first:

```bash
pome init
pome doctor
pome jira list
pome jira show <KEY>
pome workspace scan
pome workspace resolve <KEY>
pome start <KEY>
pome plan
```

This is the smallest path that proves work-item-first task ownership through the Jira/GitHub first slice.
