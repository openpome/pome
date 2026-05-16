#!/usr/bin/env node

import { handleAuthCommand } from "./commands/auth.js";
import { handleCoreCommand } from "./commands/core.js";
import { handleDraftCommand } from "./commands/drafts.js";
import { handleSessionCommand } from "./commands/sessions.js";
import type { CommandHandler } from "./commands/types.js";
import { handleWorkItemCommand } from "./commands/work-items.js";
import { handleWorkspaceCommand } from "./commands/workspaces.js";
import { printCommandFailure, printHelp } from "./presentation.js";

const args = process.argv.slice(2);
const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
const handlers: readonly CommandHandler[] = [
  handleCoreCommand,
  handleAuthCommand,
  handleDraftCommand,
  handleWorkItemCommand,
  handleWorkspaceCommand,
  handleSessionCommand
];

try {
  await main(normalizedArgs);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  printCommandFailure(message, "Re-run with OPENPOME_DEBUG=1 for a stack trace if this looks like a product bug.");
  if (process.env["OPENPOME_DEBUG"] === "1" && error instanceof Error && error.stack) {
    console.error("");
    console.error(error.stack);
  }
}

async function main(argv: readonly string[]): Promise<void> {
  if (!argv[0] || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    return;
  }

  for (const handler of handlers) {
    if (await handler(argv)) {
      return;
    }
  }

  printCommandFailure(`Unknown command: ${argv.join(" ")}`);
  printHelp();
}
