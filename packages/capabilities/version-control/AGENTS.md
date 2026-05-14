# Version Control Capability Agent Guide

This package defines provider-neutral version-control contracts.

Allowed:

- repository state types
- branch and diff contracts
- version-control interfaces

Not allowed:

- shelling out to git
- GitHub or GitLab API logic
- UI code

Native git implementation belongs under `connectors/version-control/git-native`.

