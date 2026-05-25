# CLI

The CLI name is `pome`.

The CLI follows one simple developer-facing flow:

```txt
onboard
  -> work
  -> start
  -> next
  -> approve
  -> done
```

## Primary Commands

These are the commands a developer should learn first:

```bash
pome onboard
pome work
pome start <KEY>
pome next
pome approve
pome done
pome demo
pome demo start <KEY>
```

`pome start <KEY>` loads the work item, resolves the likely workspace, creates a task session, creates the initial plan, and prints a task intelligence report.

## Advanced Commands

These remain available for diagnostics, recovery, and deeper control:

```bash
pome doctor
pome init
pome auth ai status
pome auth ai openai
pome auth ai claude
pome auth github login
pome auth github status
pome status
pome plan
pome approve plan
pome reject

pome work-item list
pome work-item show <KEY>
pome work-item scopes
pome work-item scope use <SCOPE_ID>
pome use <SCOPE_ID>

pome workspace scan
pome workspace resolve <KEY>
pome workspace link <KEY> <PATH>
pome workspace list

pome pr draft
pome pr create
pome work-item update-draft
pome work-item post-update

pome jira list
pome jira show <KEY>
```

Jira commands are aliases over the provider-neutral work item operations and should not be the primary product surface.

## First Vertical Slice

Implement first:

```bash
pome onboard
pome work
pome start <KEY>
pome next
pome approve
pome done
```

## UX Rules

- output should be concise and grouped
- show readiness without exposing connector or resolver internals
- show missing context instead of hiding it
- make the next checkpoint obvious
- require approval before file edits, branch creation, pushing, PR creation, or posting updates
- do not expose provider internals in normal command output

## Example Flow

```bash
pome work
pome start SZM-880
pome next
pome approve
pome done
```
