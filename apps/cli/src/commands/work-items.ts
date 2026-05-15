import { listAssignedWork, listJiraBoards, listWorkItemScopes, showWorkItem, useJiraBoard, useWorkItemScope } from "@openpome/local-gateway";
import {
  printAssignedWork,
  printJiraBoardSelection,
  printJiraBoards,
  printCommandFailure,
  printWorkItem,
  printWorkItemScopeSelection,
  printWorkItemScopes
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleWorkItemCommand: CommandHandler = async (argv) => {
  const [command, subcommand, value] = argv;

  if ((command === "jira" || command === "work-item") && subcommand === "list") {
    printAssignedWork(await listAssignedWork());
    return true;
  }

  if (command === "work-item" && subcommand === "scopes") {
    printWorkItemScopes(await listWorkItemScopes());
    return true;
  }

  if (command === "work-item" && subcommand === "scope" && value === "use") {
    const scopeId = argv[3];

    if (!scopeId) {
      printCommandFailure("Missing work item scope id.", "Usage: pome work-item scope use <SCOPE_ID>");
      return true;
    }

    const result = await useWorkItemScope(scopeId);

    if (!result) {
      printCommandFailure(`Work item scope not found: ${scopeId}`, "Run `pome work-item scopes` to list available scopes.");
      return true;
    }

    printWorkItemScopeSelection(result);
    return true;
  }

  if (command === "jira" && subcommand === "boards") {
    printJiraBoards(await listJiraBoards());
    return true;
  }

  if (command === "jira" && subcommand === "board" && value === "use") {
    const boardId = argv[3];

    if (!boardId) {
      printCommandFailure("Missing Jira board id.", "Usage: pome jira board use <BOARD_ID>");
      return true;
    }

    const result = await useJiraBoard(boardId);

    if (!result) {
      printCommandFailure(`Jira board not found: ${boardId}`, "Run `pome jira boards` to list available boards.");
      return true;
    }

    printJiraBoardSelection(result);
    return true;
  }

  if ((command === "jira" || command === "work-item") && subcommand === "show" && value) {
    const item = await showWorkItem(value);

    if (!item) {
      printCommandFailure(`Work item not found: ${value}`, "Run `pome work-item list` to choose an assigned work item.");
      return true;
    }

    printWorkItem(item);
    return true;
  }

  return false;
};
