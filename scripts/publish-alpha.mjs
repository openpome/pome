#!/usr/bin/env node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const version = "0.16.0-alpha.0";
const packages = [
  "@openpome/configuration",
  "@openpome/credentials",
  "@openpome/approvals",
  "@openpome/execution-plans",
  "@openpome/task-sessions",
  "@openpome/work-items",
  "@openpome/workspaces",
  "@openpome/prompt-engine",
  "@openpome/connector-jira-cloud",
  "@openpome/local-gateway",
  "@openpome/cli"
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipValidate = args.has("--skip-validate");

let tempDirectory;

try {
  const env = { ...process.env };

  if (env.NODE_AUTH_TOKEN) {
    tempDirectory = await mkdtemp(join(tmpdir(), "openpome-npm-"));
    const npmrc = join(tempDirectory, ".npmrc");
    await writeFile(npmrc, `//registry.npmjs.org/:_authToken=${env.NODE_AUTH_TOKEN}\n`, { mode: 0o600 });
    env.NPM_CONFIG_USERCONFIG = npmrc;
  }

  run("npm", ["whoami"], env);
  run("npm", ["org", "ls", "openpome"], env);

  if (!skipValidate) {
    run("pnpm", ["validate"], env);
  }

  for (const packageName of packages) {
    if (isPublished(packageName, env)) {
      console.log(`skip ${packageName}@${version}: already published`);
      continue;
    }

    const publishArgs = [
      "--filter",
      packageName,
      "publish",
      "--access",
      "public",
      "--tag",
      "alpha",
      "--no-git-checks"
    ];

    if (dryRun) {
      publishArgs.push("--dry-run");
    }

    run("pnpm", publishArgs, env);
  }

  if (!dryRun) {
    run("npm", ["view", "@openpome/cli@alpha", "version"], env);
  }
} finally {
  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function isPublished(packageName, env) {
  const result = spawnSync("npm", ["view", `${packageName}@${version}`, "version"], {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return result.status === 0 && result.stdout.trim() === version;
}

function run(command, args, env) {
  const printable = [command, ...args].join(" ");
  console.log(`$ ${printable}`);
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
