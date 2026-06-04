# Daily Developer Workflow

OpenPome is built for the normal corporate developer day:

```txt
assigned Jira story
  -> understand the story
  -> find the right local repo
  -> ask AI for a plan
  -> approve the plan
  -> ask AI for a patch
  -> approve file edits
  -> run tests
  -> create PR
  -> update Jira
```

The daily commands stay small:

```bash
pome
pome onboard
pome work
pome start <KEY>
pome approve
pome next
pome approve
pome next
pome done
pome pr create
pome work-item post-update
```

During these commands, OpenPome prints a compact activity trail. Developers can see when it is checking Jira, refreshing the story, resolving the codebase, asking the AI provider, validating a patch, running approved tests, or preparing PR/Jira updates.

## Tool Setup

Run setup once:

```bash
pome onboard
```

OpenPome checks the tools needed for the real workflow:

```txt
Jira    loads assigned stories and posts updates
GitHub  creates branches and pull requests through GitHub CLI
AI      Claude CLI, Claude API, or OpenAI plans and proposes changes
```

Connect one AI provider:

```bash
pome auth ai claude-cli
```

or:

```bash
pome auth ai claude
pome auth ai openai
```

Claude CLI is the simplest path for developers already using Claude Code:

```bash
claude auth
pome auth ai claude-cli
```

## How AI Is Controlled

OpenPome does not let the AI provider freely commit, push, create PRs, or update Jira.

```txt
Claude CLI / OpenAI / Claude API thinks
OpenPome validates
Developer approves
OpenPome writes
OpenPome tests
Developer approves external actions
OpenPome creates the PR and updates Jira
```

This is the intended safety model for company codebases.

## Working A Story

List assigned work:

```bash
pome work
```

Start the story:

```bash
pome start SCRUM-123
```

OpenPome does the background work:

```txt
fetch Jira details
resolve the local repo
collect bounded code context
ask the active AI provider for a plan
print the implementation path
wait for approval
```

Approve the plan:

```bash
pome approve
```

Ask OpenPome to continue:

```bash
pome next
```

When AI proposes file edits, review and approve:

```bash
pome approve
```

OpenPome writes only the approved patch. It does not store full diffs in local state.

Continue until tests and finish drafts are ready:

```bash
pome next
pome done
```

If a test fails, keep the same simple loop:

```bash
pome next
pome approve
pome next
```

OpenPome sends the failed command and bounded output summary to the active AI provider, asks for a focused fix patch, validates the patch, waits for approval, writes the approved files, then reruns the approved test command.

Before important continuation actions, OpenPome refreshes the active Jira story. If the scope or acceptance criteria changed after the session started, OpenPome clears stale AI outputs and asks for a new plan before it proposes or applies more code.

Create the PR and post the Jira update only when ready:

```bash
pome pr create
pome work-item post-update
```

## Recovery

Use these only when the active task needs help:

```bash
pome status
pome stop
pome resume
pome reset
pome doctor
```

Use workspace repair only when OpenPome chooses the wrong repository:

```bash
pome workspace link <KEY> /path/to/repo
```

OpenPome remembers the confirmed link for future similar work.
