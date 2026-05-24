import {
  approveTaskSessionPlan,
  createPullRequestDraft,
  createTaskSessionPlan,
  createWorkItemUpdateDraft,
  getTaskSessionStatus,
  initOpenPome,
  listAssignedWork,
  runDoctor,
  startTaskSession
} from "@openpome/local-gateway";
import {
  printAssistantNext,
  printCommandFailure,
  printDoneSummary,
  printOnboardingGuide,
  printTaskIntelligenceReport,
  printTaskSessionApproval,
  printWorkQueue
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleAssistantCommand: CommandHandler = async (argv) => {
  const [command, value] = argv;

  if (command === "onboard") {
    await initOpenPome();
    printOnboardingGuide(await runDoctor());
    return true;
  }

  if (command === "work") {
    printWorkQueue(await listAssignedWork());
    return true;
  }

  if (command === "start" && value) {
    const started = await startTaskSession(value);

    if (!started) {
      printCommandFailure(`Work item not found: ${value}`, "Run `pome work` to choose assigned work.");
      return true;
    }

    const plan = await createTaskSessionPlan();
    printTaskIntelligenceReport(started, plan);
    return true;
  }

  if (command === "next") {
    printAssistantNext(await getTaskSessionStatus());
    return true;
  }

  if (command === "approve" && !value) {
    const result = await approveTaskSessionPlan();

    if (!result) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionApproval(result);
    return true;
  }

  if (command === "done") {
    const prDraft = await createPullRequestDraft();
    const updateDraft = await createWorkItemUpdateDraft();
    printDoneSummary(prDraft, updateDraft);
    return true;
  }

  return false;
};
