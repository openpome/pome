# Changelog

## 0.12.0

- Make the local-gateway work item source adapter scope-neutral with `listScopes()` and `listAssigned(scope)`.
- Add provider-neutral scope CLI aliases: `pome work-item scopes` and `pome work-item scope use <SCOPE_ID>`.
- Keep Jira board commands as aliases over the neutral work item scope flow.

## 0.11.0

- Add workspace metadata scanning for package names, README keywords, CODEOWNERS keywords, branch refs, and recent issue refs from Git logs.
- Improve workspace ranking with linked code URL remote matching and exact work item key signals from branches and recent commits.
- Add gateway test coverage for metadata-assisted workspace resolution.

## 0.10.0

- Add Jira board discovery with `pome jira boards`.
- Add Jira board scope selection with `pome jira board use <BOARD_ID>`.
- Persist selected Jira boards as provider-neutral active work item scopes and use the scope for assigned-work listing.

## 0.9.0

- Split the CLI into a thin router, grouped command handlers, and presentation helpers.
- Add a local-gateway work item source registry boundary before future connectors are added.
- Clarify OAuth, Jira scope selection, and JSON-to-SQLite persistence direction in docs.

## 0.8.0

- Add plan approval and rejection commands: `pome approve plan` and `pome reject`.
- Store plan approval state in the active task session.
- Expand README with app flow, auth setup, workspace examples, linking, and task session usage.

## 0.7.0

- Add task session CLI commands: `pome start <KEY>`, `pome status`, and `pome plan`.
- Persist the active task session under OpenPome home.
- Generate a deterministic first implementation plan and move the session to `awaiting_approval`.

## 0.6.0

- Add `pome workspace link <KEY> <PATH>` for developer-confirmed workspace links.
- Persist learned workspace links under OpenPome home.
- Use learned links to boost `pome workspace resolve <KEY>` with an explainable reason.

## 0.5.0

- Add workspace scan, list, and resolve gateway operations.
- Add `pome workspace scan`, `pome workspace list`, and `pome workspace resolve <KEY>`.
- Persist a local workspace index under OpenPome home and rank workspace candidates with explainable reasons.

## 0.4.1

- Remove deprecated TypeScript `baseUrl` compiler option while preserving path aliases.
- Explicitly include Node.js types in the shared TypeScript config.

## 0.4.0

- Add Vitest gateway-level tests for Jira auth status and doctor behavior.
- Mock credential storage and Jira reachability checks so gateway tests remain deterministic.

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
