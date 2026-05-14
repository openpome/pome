# Local Gateway Agent Guide

The local gateway is the control plane.

It coordinates:

- task sessions
- approvals
- policy checks
- events
- connectors
- capabilities

Rules:

- apps call the gateway
- apps do not call connectors directly
- the gateway enforces policy before execution
- the gateway owns session coordination
- provider details stay behind capability interfaces

