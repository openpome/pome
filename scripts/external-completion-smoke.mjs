#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const confirmation = "I_UNDERSTAND_THIS_CREATES_PR_AND_JIRA_COMMENT";
if (process.env.OPENPOME_EXTERNAL_SMOKE !== confirmation) {
  console.error("Refusing to run external smoke test.");
  console.error(`Set OPENPOME_EXTERNAL_SMOKE=${confirmation}`);
  console.error("This script can create a real GitHub PR and post a real Jira comment.");
  process.exit(1);
}

const requiredEnv = [
  "OPENPOME_JIRA_BASE_URL",
  "OPENPOME_JIRA_EMAIL",
  "OPENPOME_JIRA_API_TOKEN",
  "OPENPOME_SMOKE_WORK_ITEM_KEY",
  "OPENPOME_SMOKE_REPO_PATH"
];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment: ${missing.join(", ")}`);
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = join(repoRoot, "apps", "cli", "dist", "index.js");
const smokeRepo = resolve(process.env.OPENPOME_SMOKE_REPO_PATH);
const workItemKey = process.env.OPENPOME_SMOKE_WORK_ITEM_KEY;
const home = process.env.OPENPOME_HOME ?? (await mkdtemp(join(tmpdir(), "openpome-external-smoke-")));
const env = {
  ...process.env,
  OPENPOME_HOME: home,
  OPENPOME_PREFER_CURRENT_WORKSPACE: "1"
};

run(["onboard"], smokeRepo, env, { allowFailure: true });
run(["work"], smokeRepo, env, { allowFailure: true });
run(["start", workItemKey], smokeRepo, env);
run(["approve"], smokeRepo, env);

await writeFile(
  join(smokeRepo, `.openpome-smoke-${workItemKey.toLowerCase()}.txt`),
  `OpenPome external smoke marker for ${workItemKey}\n${new Date().toISOString()}\n`,
  "utf8"
);

run(["diff"], smokeRepo, env);
run(["done"], smokeRepo, env);

const prArgs = ["pr", "create", "--draft"];
if (process.env.OPENPOME_SMOKE_PR_BASE) {
  prArgs.push("--base", process.env.OPENPOME_SMOKE_PR_BASE);
}
if (process.env.OPENPOME_SMOKE_ALLOW_UNTESTED === "1") {
  prArgs.push("--allow-untested");
}
run(prArgs, smokeRepo, env);
run(["work-item", "post-update"], smokeRepo, env);

console.log(`External smoke state: ${home}`);

function run(args, cwd, envValues, options = {}) {
  const printable = ["pome", ...args].join(" ");
  console.log(`$ ${printable}`);
  const result = spawnSync("node", [cliEntry, ...args], {
    cwd,
    env: envValues,
    stdio: "inherit"
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }
}
