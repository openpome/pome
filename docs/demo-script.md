# Demo Script

Use this only to show the OpenPome interaction model without connecting real tools.

For real daily work, use Jira/GitHub/AI setup from [Daily Developer Workflow](daily-developer-workflow.md).

## Sample Flow

```bash
OPENPOME_HOME=/tmp/openpome-demo pome
OPENPOME_HOME=/tmp/openpome-demo pome demo
OPENPOME_HOME=/tmp/openpome-demo pome demo start POME-101
OPENPOME_HOME=/tmp/openpome-demo pome approve
OPENPOME_HOME=/tmp/openpome-demo pome next
OPENPOME_HOME=/tmp/openpome-demo pome done
```

## Message

OpenPome starts from assigned work, understands the story, finds the codebase, asks AI for a plan, waits for developer approval, applies approved changes, gathers test evidence, creates the PR, and updates Jira through explicit checkpoints.
