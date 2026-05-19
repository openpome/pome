#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const requiredEnv = ["OPENPOME_JIRA_BASE_URL", "OPENPOME_JIRA_EMAIL", "OPENPOME_JIRA_API_TOKEN"];
const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment: ${missing.join(", ")}`);
  console.error("Set Jira smoke-test values in your shell. Do not commit tokens to the repo.");
  process.exit(1);
}

const scopeId = process.env.OPENPOME_JIRA_SMOKE_SCOPE_ID;
const workItemKey = process.env.OPENPOME_JIRA_SMOKE_WORK_ITEM_KEY;
const home = process.env.OPENPOME_HOME ?? (await mkdtemp(join(tmpdir(), "openpome-jira-smoke-")));
const env = {
  ...process.env,
  OPENPOME_HOME: home
};

try {
  run(["init"], env);
  run(["doctor"], env, { allowFailure: true });
  run(["auth", "jira", "status"], env);
  run(["work-item", "scopes"], env);

  if (scopeId) {
    run(["work-item", "scope", "use", scopeId], env);
  } else {
    console.log("skip scope selection: set OPENPOME_JIRA_SMOKE_SCOPE_ID to validate scoped listing");
  }

  run(["jira", "list"], env);

  if (workItemKey) {
    run(["jira", "show", workItemKey], env);
  } else {
    console.log("skip issue lookup: set OPENPOME_JIRA_SMOKE_WORK_ITEM_KEY to validate direct issue fetch");
  }

  console.log(`Jira smoke state: ${home}`);
} finally {
  if (!process.env.OPENPOME_HOME) {
    await rm(home, { recursive: true, force: true });
  }
}

function run(args, env, options = {}) {
  const printable = ["pnpm", "pome", "--", ...args].join(" ");
  console.log(`$ ${printable}`);
  const result = spawnSync("pnpm", ["pome", "--", ...args], {
    env,
    stdio: "inherit"
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }
}
