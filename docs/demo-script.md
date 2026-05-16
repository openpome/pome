# Demo Script

Use this terminal sequence for the first public alpha demo.

## Mock Jira Demo

```bash
OPENPOME_HOME=/tmp/openpome-demo pome init
OPENPOME_HOME=/tmp/openpome-demo pome doctor
OPENPOME_HOME=/tmp/openpome-demo pome jira boards
OPENPOME_HOME=/tmp/openpome-demo pome jira board use 100
OPENPOME_HOME=/tmp/openpome-demo pome jira list
OPENPOME_HOME=/tmp/openpome-demo pome workspace link POME-101 .
OPENPOME_HOME=/tmp/openpome-demo pome start POME-101
OPENPOME_HOME=/tmp/openpome-demo pome plan
OPENPOME_HOME=/tmp/openpome-demo pome approve plan
OPENPOME_HOME=/tmp/openpome-demo pome ai context
OPENPOME_HOME=/tmp/openpome-demo pome diff
OPENPOME_HOME=/tmp/openpome-demo pome test discover
OPENPOME_HOME=/tmp/openpome-demo pome approve command
OPENPOME_HOME=/tmp/openpome-demo pome test history
OPENPOME_HOME=/tmp/openpome-demo pome pr draft
OPENPOME_HOME=/tmp/openpome-demo pome work-item update-draft
```

## Message

OpenPome starts from assigned work, resolves the local workspace, creates a task session, prepares a plan, records approvals, gathers evidence, and drafts PR/work-item updates while leaving external actions under developer control.
