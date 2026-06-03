# OpenPome CLI

Work-item-first AI developer workbench CLI.

```bash
npm install -g @openpome/cli@alpha
pome
pome onboard
pome work
```

OpenPome starts from assigned work, resolves the right workspace, creates a task session, generates a plan, and records approval checkpoints.

Primary flow:

```bash
pome
pome onboard
pome work
pome start <KEY>
pome next
pome approve
pome done
```

AI setup:

```bash
pome auth ai openai
pome auth ai claude
pome auth ai claude-cli
```

Most users install only this CLI package. Other `@openpome/*` packages are runtime dependencies installed automatically by npm.
