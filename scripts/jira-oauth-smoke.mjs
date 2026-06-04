#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const confirmation = "I_UNDERSTAND_THIS_USES_REAL_JIRA_OAUTH";
if (process.env.OPENPOME_JIRA_OAUTH_SMOKE !== confirmation) {
  console.error("Refusing to run Jira OAuth smoke test.");
  console.error(`Set OPENPOME_JIRA_OAUTH_SMOKE=${confirmation}`);
  console.error("This script opens the real Jira OAuth browser-login flow and stores tokens in the OS credential store.");
  process.exit(1);
}

const requiredEnv = [
  "OPENPOME_JIRA_OAUTH_CLIENT_ID",
  "OPENPOME_JIRA_OAUTH_CLIENT_SECRET",
  "OPENPOME_JIRA_OAUTH_REDIRECT_URI"
];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment: ${missing.join(", ")}`);
  console.error("Use a real Atlassian OAuth 2.0 3LO app. Do not commit client secrets to the repo.");
  process.exit(1);
}

const scopeId = process.env.OPENPOME_JIRA_SMOKE_SCOPE_ID;
const home = process.env.OPENPOME_HOME ?? (await mkdtemp(join(tmpdir(), "openpome-jira-oauth-smoke-")));
const env = {
  ...process.env,
  OPENPOME_HOME: home
};

try {
  run(["init"], env, { allowFailure: true });
  run(["auth", "jira", "login", "--listen"], env);
  run(["auth", "jira", "status"], env);
  run(["doctor"], env, { allowFailure: true });
  run(["work-item", "scopes"], env);

  if (scopeId) {
    run(["work-item", "scope", "use", scopeId], env);
    run(["work"], env);
  } else {
    console.log("skip scoped work listing: set OPENPOME_JIRA_SMOKE_SCOPE_ID to validate assigned work after OAuth.");
  }

  console.log(`Jira OAuth smoke state: ${home}`);
} finally {
  if (!process.env.OPENPOME_HOME) {
    await rm(home, { recursive: true, force: true });
  }
}

function run(args, envValues, options = {}) {
  const printable = ["pnpm", "pome", "--", ...args].join(" ");
  console.log(`$ ${printable}`);
  const result = spawnSync("pnpm", ["pome", "--", ...args], {
    env: envValues,
    stdio: "inherit"
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }
}
