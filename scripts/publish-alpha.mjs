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
const removeLatest = args.has("--remove-latest");

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
    run("pnpm", ["validate"], createValidationEnvironment(env));
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
    await verifyAlphaInstallTarget(env);
    if (removeLatest) {
      removeLatestTags(env);
    } else {
      warnAboutLatestTags(env);
    }
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

async function verifyAlphaInstallTarget(env) {
  const maxAttempts = 12;
  const delayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runCapture("npm", ["view", "@openpome/cli@alpha", "version"], env);
    if (result.status === 0 && result.stdout.trim() === version) {
      console.log(result.stdout.trim());
      return;
    }

    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (attempt === maxAttempts) {
      console.error(output);
      console.error(
        `Unable to verify @openpome/cli@alpha after ${maxAttempts} attempts. ` +
          "npm registry reads can lag immediately after publish; retry `npm view @openpome/cli@alpha version` before republishing."
      );
      process.exit(result.status || 1);
    }

    console.log(
      `@openpome/cli@alpha is not readable yet, waiting for npm registry propagation ` +
        `(${attempt}/${maxAttempts})...`
    );
    await sleep(delayMs);
  }
}

function warnAboutLatestTags(env) {
  const packagesWithLatestAlpha = packages.filter((packageName) => getDistTag(packageName, "latest", env) === version);
  if (packagesWithLatestAlpha.length === 0) {
    return;
  }

  console.warn("");
  console.warn("warning: these packages also have `latest` pointing at the alpha version:");
  for (const packageName of packagesWithLatestAlpha) {
    console.warn(`- ${packageName}@${version}`);
  }
  console.warn(
    "For alpha-only publishing, rerun with fresh npm auth and `--remove-latest`, " +
      "or remove the tags manually with `npm dist-tag rm <package> latest`."
  );
}

function removeLatestTags(env) {
  for (const packageName of packages) {
    const latestVersion = getDistTag(packageName, "latest", env);
    if (!latestVersion) {
      continue;
    }

    if (latestVersion !== version) {
      console.log(`keep ${packageName} latest: ${latestVersion}`);
      continue;
    }

    run("npm", ["dist-tag", "rm", packageName, "latest"], env);
  }
}

function getDistTag(packageName, tag, env) {
  const result = runCapture("npm", ["dist-tag", "ls", packageName], env);
  if (result.status !== 0) {
    return undefined;
  }

  for (const line of result.stdout.split(/\r?\n/)) {
    const [name, publishedVersion] = line.split(":").map((part) => part.trim());
    if (name === tag && publishedVersion) {
      return publishedVersion;
    }
  }

  return undefined;
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

function runCapture(command, args, env) {
  const printable = [command, ...args].join(" ");
  console.log(`$ ${printable}`);
  return spawnSync(command, args, {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createValidationEnvironment(env) {
  const validationEnv = { ...env };
  for (const key of Object.keys(validationEnv)) {
    if (key.startsWith("OPENPOME_JIRA_")) {
      delete validationEnv[key];
    }
  }

  return validationEnv;
}
