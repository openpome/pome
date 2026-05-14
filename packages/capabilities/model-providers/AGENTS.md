# Model Providers Capability Agent Guide

This package defines provider-neutral AI model contracts.

Allowed:

- model request and response types
- provider metadata contracts
- routing interfaces

Not allowed:

- OpenAI, Anthropic, Ollama, or provider-specific API calls
- storing API keys
- sending code or diffs without approval and redaction

Provider implementations belong under `connectors/model-providers/*`.

