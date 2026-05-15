# Workspace Resolution

OpenPome resolves the workspace after a work item is selected.

It must not use static Jira-project-to-repo mapping as the primary model.

## Definition

A workspace may be:

- local repository
- remote repository
- project folder
- monorepo package
- service boundary
- test command profile
- PR template
- CI workflow
- related docs
- historical task memory

## Resolution Flow

```txt
Load selected work item
  -> collect signals
  -> rank candidate workspaces
  -> produce confidence and reasons
  -> proceed if confidence is high
  -> ask developer if confidence is low
  -> remember developer confirmation as a hint
```

## Signals

Initial signals:

- work item key
- work item project
- issue type
- labels and components
- linked code URLs and PR URLs
- parent and subtasks
- local cloned repositories
- git remotes
- branch names
- commit messages
- package names
- README keywords
- CODEOWNERS keywords
- test command history
- learned developer confirmations

Implemented metadata signals:

- root and first-level package names from `package.json`
- README keywords from the repository root
- CODEOWNERS keywords from root, `.github/`, and `docs/`
- recent local branch names from `.git/refs/heads`
- recent issue refs from `.git/logs/HEAD`
- linked code URLs from the selected work item matched against Git remotes

## Confidence Rules

Initial thresholds:

- `>= 0.80`: proceed automatically
- `0.50 - 0.79`: recommend top candidate and ask for confirmation
- `< 0.50`: require explicit developer selection

Each candidate must include:

- workspace id
- path if local
- confidence score
- explainable reasons

## Learned Links

Learned workspace links are hints only.

They must not become hardcoded assumptions. A learned link can improve confidence, but OpenPome still needs to explain why a workspace was selected.

## Anti-Patterns

Do not add:

```txt
Jira project SZM always means repo maze-assessment-content
Jira project LAN always means repo lantern-assessment
```

This breaks for monorepos, shared services, inconsistent labels, and multi-repo organizations.
