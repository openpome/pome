# Task Sessions Agent Guide

This package owns the AI task session model and state machine.

Rules:

- sessions start from a selected work item
- session state transitions must be explicit
- approval waits are first-class states
- blocked states must include structured reasons
- do not store full diffs, full Jira bodies, source snapshots, or secrets in session memory

