# Jira Smoke Test

Use this checklist before calling Jira API-token auth stable for a public alpha.

## Prerequisites

- Jira Cloud account with access to at least one board.
- One assigned issue in that board.
- API token from Atlassian account settings.
- Network/VPN state matching the target environment.

## Environment

```bash
export OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net
export OPENPOME_JIRA_EMAIL=you@example.com
export OPENPOME_JIRA_API_TOKEN=your-token
```

## Required Checks

```bash
pome init
pome doctor
pome auth jira status
pome work-item scopes
pome work-item scope use <SCOPE_ID>
pome jira list
pome jira show <KEY>
```

From the repo checkout, the same smoke test can be run with:

```bash
export OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net
export OPENPOME_JIRA_EMAIL=you@example.com
export OPENPOME_JIRA_API_TOKEN=your-token
export OPENPOME_JIRA_SMOKE_SCOPE_ID=<SCOPE_ID>
export OPENPOME_JIRA_SMOKE_WORK_ITEM_KEY=<KEY>

pnpm smoke:jira
```

The smoke script reads credentials from environment variables only. It does not write Jira tokens to repo files.

## Expected Result

- `pome auth jira status` reports API-token mode configured.
- `pome doctor` reports Jira reachability as reachable.
- `pome work-item scopes` lists only scopes available to the authenticated user.
- `pome jira list` returns assigned work within the selected scope.
- `pome jira show <KEY>` fetches the selected work item directly.

## Failure Notes

- `401` or `403`: token, email, scopes, or Jira permissions are wrong.
- Network error: confirm VPN, DNS, proxy, and base URL.
- Empty assigned list: confirm the work item is assigned to the authenticated Jira user and is inside the selected board/scope.
- Direct lookup succeeds but list is empty: the issue exists, but it is probably not assigned to the authenticated user or is outside the selected board filter. This is expected privacy-safe alpha behavior.

## Scrum Board Coverage

For the public alpha, validate Jira Cloud Scrum boards first:

- board discovery returns Scrum boards available to the authenticated user
- selected board scope is persisted as a provider-neutral work item scope
- assigned issue listing stays scoped to the selected board
- story, task, bug, epic, and sub-task issue types are grouped correctly when present
- direct issue lookup works for an issue in the selected board

Kanban boards and Jira Data Center should remain future compatibility targets unless they are explicitly included in a smoke-test run.
