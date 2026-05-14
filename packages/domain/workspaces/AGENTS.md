# Workspaces Agent Guide

This package resolves workspaces dynamically.

Use:

- workspace candidates
- confidence ranking from `0.0` to `1.0`
- local workspace discovery
- learned hints from task memory
- explainable resolution reasons

Do not:

- add static Jira-project-to-repo mapping as the main model
- assume one Jira project equals one repo
- assume one repo equals one workspace
- hide low-confidence resolution from the developer

Every candidate must include confidence and reasons.

