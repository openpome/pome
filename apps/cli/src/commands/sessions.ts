import {
  approveTaskSessionPlan,
  approveTestCommand,
  createTaskSessionPlan,
  getTaskSessionApprovalHistory,
  getTaskSessionStatus,
  getTaskSessionTimeline,
  rejectTaskSessionPlan,
  resetTaskSession,
  resumeTaskSession,
  startTaskSession,
  stopTaskSession
} from "@openpome/local-gateway";
import {
  printCommandFailure,
  printCommandApprovalEvidence,
  printTaskSessionApprovalHistory,
  printTaskSessionApproval,
  printTaskSessionLifecycle,
  printTaskSessionPlan,
  printTaskSessionStart,
  printTaskSessionStatus,
  printTaskSessionTimeline
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleSessionCommand: CommandHandler = async (argv) => {
  const [command, subcommand] = argv;

  if (command === "start" && subcommand) {
    const result = await startTaskSession(subcommand);

    if (!result) {
      printCommandFailure(`Work item not found: ${subcommand}`, "Run `pome work-item list` to choose an assigned work item.");
      return true;
    }

    printTaskSessionStart(result);
    return true;
  }

  if (command === "status") {
    printTaskSessionStatus(await getTaskSessionStatus());
    return true;
  }

  if (command === "stop") {
    printTaskSessionLifecycle(await stopTaskSession());
    return true;
  }

  if (command === "resume") {
    printTaskSessionLifecycle(await resumeTaskSession(subcommand));
    return true;
  }

  if (command === "reset") {
    printTaskSessionLifecycle(await resetTaskSession());
    return true;
  }

  if (command === "timeline") {
    printTaskSessionTimeline(await getTaskSessionTimeline());
    return true;
  }

  if (command === "approvals") {
    printTaskSessionApprovalHistory(await getTaskSessionApprovalHistory());
    return true;
  }

  if (command === "plan") {
    const result = await createTaskSessionPlan();

    if (!result) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionPlan(result);
    return true;
  }

  if (command === "approve" && subcommand === "plan") {
    const result = await approveTaskSessionPlan();

    if (!result) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionApproval(result);
    return true;
  }

  if (command === "approve" && subcommand === "command") {
    const evidence = await approveTestCommand(argv.slice(2).join(" ").trim() || undefined);

    if (!evidence) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printCommandApprovalEvidence(evidence);
    return true;
  }

  if (command === "reject") {
    const reason = argv.slice(1).join(" ").trim() || undefined;
    const result = await rejectTaskSessionPlan(reason);

    if (!result) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionApproval(result);
    return true;
  }

  return false;
};
