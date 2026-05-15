import { listAssignedWork, listJiraBoards, showWorkItem, useJiraBoard } from "@openpome/local-gateway";
import { printAssignedWork, printJiraBoardSelection, printJiraBoards, printWorkItem } from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleWorkItemCommand: CommandHandler = async (argv) => {
  const [command, subcommand, value] = argv;

  if ((command === "jira" || command === "work-item") && subcommand === "list") {
    printAssignedWork(await listAssignedWork());
    return true;
  }

  if (command === "jira" && subcommand === "boards") {
    printJiraBoards(await listJiraBoards());
    return true;
  }

  if (command === "jira" && subcommand === "board" && value === "use") {
    const boardId = argv[3];

    if (!boardId) {
      console.error("Usage: pome jira board use <BOARD_ID>");
      process.exitCode = 1;
      return true;
    }

    const result = await useJiraBoard(boardId);

    if (!result) {
      console.error(`Jira board not found: ${boardId}`);
      process.exitCode = 1;
      return true;
    }

    printJiraBoardSelection(result);
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
