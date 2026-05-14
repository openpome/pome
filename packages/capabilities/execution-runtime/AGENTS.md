# Execution Runtime Capability Agent Guide

This package defines provider-neutral local execution contracts.

Allowed:

- command request and result types
- sandbox policy contracts
- execution runtime interfaces

Not allowed:

- running commands directly
- bypassing policy approval
- storing command output that may contain secrets without redaction

Concrete runtime implementations belong under `connectors/execution-runtime/*`.

