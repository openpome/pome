# Policy Engine Agent Guide

This package owns safety and approval policy.

All destructive or sensitive operations must pass through policy.

Approval required before:

- file edits
- destructive commands
- branch push
- PR creation
- work item update posting
- external AI provider sharing of code or diffs

Never allow:

- secrets
- tokens
- `.env`
- private keys
- full repo upload
- hidden monitoring
- bypassing approval for convenience

