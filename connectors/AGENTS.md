# Connectors Agent Guide

Connectors implement capability interfaces.

Do:

- isolate provider-specific APIs
- map provider data into domain types
- handle provider-specific auth here
- keep provider quirks behind interfaces

Do not:

- leak provider-specific types into core or domain packages
- import from apps
- import UI code
- store credentials in source or plaintext config

Jira and GitHub are first connectors, not product boundaries.

Jira, GitHub, GitLab, Bitbucket, Linear, Azure DevOps, OpenAI, Anthropic, Slack, Confluence, and similar names belong here, not in core packages.
