#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runtimePackages } from "./release-packages.mjs";

const packages = runtimePackages;
const execFileAsync = promisify(execFile);
const npmReadTimeoutMs = 15_000;

const results = await Promise.all(packages.map((packageName) => getDistTags(packageName)));

for (const result of results) {
  if (!result.ok) {
    console.log(`${result.packageName}: ${result.message}`);
    continue;
  }

  console.log(`${result.packageName}`);
  console.log(`  alpha:  ${result.tags.alpha ?? "-"}`);
  console.log(`  latest: ${result.tags.latest ?? "-"}`);
}

async function getDistTags(packageName) {
  let stdout;
  try {
    const result = await execFileAsync("npm", ["dist-tag", "ls", packageName], {
      encoding: "utf8",
      timeout: npmReadTimeoutMs
    });
    stdout = result.stdout;
  } catch (error) {
    return {
      packageName,
      ok: false,
      message:
        error.name === "TimeoutError" || error.code === "ETIMEDOUT" || error.killed
          ? `npm registry read timed out after ${npmReadTimeoutMs / 1000}s`
          : "not published or not accessible"
    };
  }

  const tags = {};
  for (const line of stdout.split(/\r?\n/)) {
    const [name, version] = line.split(":").map((part) => part.trim());
    if (name && version) {
      tags[name] = version;
    }
  }

  return { packageName, ok: true, tags };
}
