import {
  createPullRequestDraft,
  createWorkItemUpdateDraft,
  discoverTestCommands,
  getTestCommandHistory
} from "@openpome/local-gateway";
import {
  printCommandFailure,
  printPullRequestDraft,
  printTestCommandDiscovery,
  printTestCommandHistory,
  printWorkItemUpdateDraft
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleDraftCommand: CommandHandler = async (argv) => {
  const [command, subcommand] = argv;

  if (command === "test" && (!subcommand || subcommand === "discover")) {
    printTestCommandDiscovery(await discoverTestCommands());
    return true;
  }

  if (command === "test" && subcommand === "history") {
    printTestCommandHistory(await getTestCommandHistory());
    return true;
  }

  if (command === "pr" && subcommand === "draft") {
    const result = await createPullRequestDraft();

    if (!result.active || !result.draft) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printPullRequestDraft(result);
    return true;
  }

  if (command === "work-item" && subcommand === "update-draft") {
    const result = await createWorkItemUpdateDraft();

    if (!result.active || !result.draft) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printWorkItemUpdateDraft(result);
    return true;
  }

  return false;
};
