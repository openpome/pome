import {
  approveTaskSessionPlan,
  createTaskSessionPlan,
  getTaskSessionStatus,
  rejectTaskSessionPlan,
  startTaskSession
} from "@openpome/local-gateway";
import {
  printTaskSessionApproval,
  printTaskSessionPlan,
  printTaskSessionStart,
  printTaskSessionStatus
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleSessionCommand: CommandHandler = async (argv) => {
  const [command, subcommand] = argv;

  if (command === "start" && subcommand) {
    const result = await startTaskSession(subcommand);

    if (!result) {
      console.error(`Work item not found: ${subcommand}`);
      process.exitCode = 1;
      return true;
    }

    printTaskSessionStart(result);
    return true;
  }

  if (command === "status") {
    printTaskSessionStatus(await getTaskSessionStatus());
    return true;
  }

  if (command === "plan") {
    const result = await createTaskSessionPlan();

    if (!result) {
      console.log("No active task session. Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionPlan(result);
    return true;
  }

  if (command === "approve" && subcommand === "plan") {
    const result = await approveTaskSessionPlan();

    if (!result) {
      console.log("No active task session. Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionApproval(result);
    return true;
  }

  if (command === "reject") {
    const reason = argv.slice(1).join(" ").trim() || undefined;
    const result = await rejectTaskSessionPlan(reason);

    if (!result) {
      console.log("No active task session. Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionApproval(result);
    return true;
  }

  return false;
};
