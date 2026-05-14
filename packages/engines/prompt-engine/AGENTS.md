# Prompt Engine Agent Guide

This package creates provider-neutral prompts and context packages.

Rules:

- prompts must start from work item context
- prompts must include missing information and assumptions
- prompts must not include secrets or blocked files
- prompts that include code or diffs require approval before external sharing
- provider-specific formatting belongs in model provider connectors

