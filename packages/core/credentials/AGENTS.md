# Credentials Agent Guide

This package owns secure credential storage contracts.

Rules:

- never store tokens or secrets in plaintext config
- prefer OS keychain APIs
- fail clearly when a platform backend is not implemented
- do not import provider-specific connector code
- do not log secret values

