# Work Items Agent Guide

This package is provider-neutral.

Allowed:

- `WorkItem` types
- assigned work logic
- parent/subtask hierarchy handling
- readiness scoring
- missing context detection

Not allowed:

- Jira REST API calls
- Jira Cloud-specific fields leaking into domain types
- GitHub, Linear, or Azure DevOps-specific logic
- UI code

Provider connectors map external data into core `WorkItem` types.

