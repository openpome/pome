# CLI Agent Guide

The CLI is a thin surface over the local gateway.

Do:

- render data clearly
- collect user input
- forward actions to the gateway
- preserve approval checkpoints
- expose provider-neutral commands first
- keep Jira aliases as convenience wrappers
- keep `src/index.ts` as a thin router
- put command behavior under `src/commands/`
- put formatting and output rendering under `src/presentation.ts`

Do not:

- call connectors directly
- duplicate domain logic
- store business state in CLI code
- skip policy or approval checks

First CLI vertical slice:

```bash
pome init
pome doctor
pome jira list
pome jira show <KEY>
pome workspace scan
pome workspace resolve <KEY>
pome start <KEY>
pome plan
pome approve plan
pome reject
```
