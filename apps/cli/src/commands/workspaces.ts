import {
  linkWorkspaceToWorkItem,
  listWorkspaces,
  resolveWorkspaceForWorkItem,
  scanWorkspaces
} from "@openpome/local-gateway";
import {
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
      console.error(`Work item not found: ${value}`);
      process.exitCode = 1;
      return true;
    }

    printWorkspaceResolution(result);
    return true;
  }

  if (command === "workspace" && subcommand === "link" && value && extra) {
    const result = await linkWorkspaceToWorkItem(value, extra);

    if (!result) {
      console.error(`Work item not found: ${value}`);
      process.exitCode = 1;
      return true;
    }

    printWorkspaceLink(result);
    return true;
  }

  return false;
};
