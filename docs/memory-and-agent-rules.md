# Memory and Agent Rules

OpenPome has two kinds of memory. They must stay separate.

## Runtime Memory

Runtime memory records what happened during a user's task session.

Examples:

- task session events
- approval decisions
- learned workspace links
- test command history
- session summaries
- decision log entries

Runtime memory belongs in local persistence, not in `AGENTS.md`.

Do not store:

- full diffs
- full Jira bodies
- source code snapshots
- secrets
- credentials

## Agent Operating Memory

Agent operating memory tells coding agents how to work inside this repository.

Examples:

- root `AGENTS.md`
- scoped package `AGENTS.md`
- architecture rules
- dependency direction
- provider-neutral naming rules
- approval and policy rules

Agent operating memory belongs in repo files, not in runtime session memory.

## Update Rule

When a module gains a new rule or pattern, update the nearest scoped `AGENTS.md` in the same change.

Examples:

- connector pattern changes: update `connectors/AGENTS.md`
- workspace resolution changes: update `packages/domain/workspaces/AGENTS.md`
- policy changes: update `packages/engines/policy-engine/AGENTS.md`
- CLI command conventions change: update `apps/cli/AGENTS.md`

Root `AGENTS.md` changes only for cross-cutting rules.

## No-Loss Documentation Rule

The complete foundation document is kept at `docs/product-foundation.md`.

Shorter docs are operational summaries. If there is doubt, the foundation document is the source of truth until a newer decision is recorded in docs.

