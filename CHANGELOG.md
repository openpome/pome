# Changelog

## 0.3.0

- Add Vitest test foundation.
- Add deterministic Jira Cloud connector tests for auth mode detection, pagination, direct issue lookup, error handling, and reachability mapping.
- Keep live Jira APIs out of CI by mocking `fetch`.

## 0.2.0

- Harden Jira Cloud live list/show behavior with paginated assigned-work search.
- Fetch `pome jira show <KEY>` directly from Jira in live mode.
- Improve Jira error messages for auth, missing issues, rate limits, and network/VPN failures.
- Document Jira OAuth client registration requirements.

## 0.1.0

- Scaffold OpenPome monorepo foundation.
- Add CLI, local gateway, domain, capability, engine, and connector package shells.
- Add Jira Cloud mock flow, API-token live-mode skeleton, OAuth login skeleton, and macOS Keychain token storage.
