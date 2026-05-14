# CLI

The CLI name is `pome`.

The CLI follows the same flow as desktop:

```txt
list assigned work
  -> show work item
  -> start task session
  -> resolve workspace
  -> generate plan
  -> approve checkpoint
  -> run or guide execution
  -> draft PR and work item update
```

## Primary Commands

Provider-neutral commands:

```bash
pome work-item list
pome work-item show <KEY>
pome work-item refresh

pome start <KEY>
pome status
pome plan
pome run
pome stop
pome resume

pome approve plan
pome approve diff
pome approve command
pome reject

pome workspace scan
pome workspace resolve <KEY>
pome workspace link <KEY> <PATH>
pome workspace list

pome pr draft
pome pr create
pome work-item update-draft
pome work-item post-update
pome qa draft

pome doctor
pome init
```

MVP Jira aliases:

```bash
pome jira list
pome jira show <KEY>
pome jira refresh
pome jira update-draft
pome jira post-update
```

Aliases call the same provider-neutral gateway operations.

## First Vertical Slice

Implement first:

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

## UX Rules

- output should be concise and grouped
- show readiness and workspace confidence
- show missing context instead of hiding it
- make the next checkpoint obvious
- require approval before file edits, branch creation, pushing, PR creation, or posting updates
- do not expose provider internals in normal command output

## Example Flow

```bash
pome jira list
pome start SZM-880
pome plan
pome approve plan
pome pr draft
pome jira update-draft
```

