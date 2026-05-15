import { listAssignedWork, showWorkItem } from "@openpome/local-gateway";
import { printAssignedWork, printWorkItem } from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleWorkItemCommand: CommandHandler = async (argv) => {
  const [command, subcommand, value] = argv;

  if ((command === "jira" || command === "work-item") && subcommand === "list") {
    printAssignedWork(await listAssignedWork());
    return true;
  }

  if ((command === "jira" || command === "work-item") && subcommand === "show" && value) {
    const item = await showWorkItem(value);

    if (!item) {
      console.error(`Work item not found: ${value}`);
      process.exitCode = 1;
      return true;
    }

    printWorkItem(item);
    return true;
  }

  return false;
};
