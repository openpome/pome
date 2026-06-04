#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const confirmation = "I_UNDERSTAND_THIS_USES_REAL_GITHUB_OAUTH";
if (process.env.OPENPOME_GITHUB_OAUTH_SMOKE !== confirmation) {
  console.error("Refusing to run GitHub OAuth smoke test.");
  console.error(`Set OPENPOME_GITHUB_OAUTH_SMOKE=${confirmation}`);
  console.error("This script opens the real GitHub browser/device login flow and stores a token in the OS credential store.");
  process.exit(1);
}

if (!process.env.OPENPOME_GITHUB_OAUTH_CLIENT_ID) {
  console.error("Missing required environment: OPENPOME_GITHUB_OAUTH_CLIENT_ID");
  console.error("Use a real GitHub OAuth app with Device Flow enabled. Do not commit client IDs or tokens to the repo.");
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = join(repoRoot, "apps", "cli", "dist", "index.js");
const home = process.env.OPENPOME_HOME ?? (await mkdtemp(join(tmpdir(), "openpome-github-oauth-smoke-")));
const env = {
  ...process.env,
  OPENPOME_HOME: home
};

run(["auth", "github", "login"], repoRoot, env);
run(["auth", "github", "status"], repoRoot, env);
run(["onboard"], repoRoot, env, { allowFailure: true });

console.log(`GitHub OAuth smoke state: ${home}`);

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
