import {
  linkWorkspaceToWorkItem,
  listWorkspaces,
  resolveWorkspaceForWorkItem,
  scanWorkspaces
} from "@openpome/local-gateway";
import {
  printCommandFailure,
  printWorkspaceLink,
  printWorkspaceList,
  printWorkspaceResolution,
  printWorkspaceScan
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleWorkspaceCommand: CommandHandler = async (argv) => {
  const [command, subcommand, value, extra] = argv;

  if (command === "workspace" && subcommand === "scan") {
    printWorkspaceScan(await scanWorkspaces());
    return true;
  }

  if (command === "workspace" && subcommand === "list") {
    printWorkspaceList(await listWorkspaces());
    return true;
  }

  if (command === "workspace" && subcommand === "resolve" && value) {
    const result = await resolveWorkspaceForWorkItem(value);

    if (!result) {
      printCommandFailure(`Work item not found: ${value}`, "Run `pome work-item list` to choose an assigned work item.");
      return true;
    }

    printWorkspaceResolution(result);
    return true;
  }

  if (command === "workspace" && subcommand === "link" && value && extra) {
    const result = await linkWorkspaceToWorkItem(value, extra);

    if (!result) {
      printCommandFailure(`Work item not found: ${value}`, "Run `pome work-item list` to choose an assigned work item.");
      return true;
    }

    printWorkspaceLink(result);
    return true;
  }

  return false;
};
