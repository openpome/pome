import {
  createManualCopyAIContext,
  createManualCopyAIPrompt,
  createPullRequestDraft,
  createPullRequestExternalGuard,
  createWorkItemUpdateDraft,
  discoverTestCommands,
  getDiffSummary,
  getGitHubAuthStatus,
  getTestCommandHistory,
  postWorkItemUpdateExternalGuard,
  runApprovedTestCommand
} from "@openpome/local-gateway";
import {
  printCommandFailure,
  printDiffSummary,
  printExternalActionGuard,
  printGitHubAuthStatus,
  printManualCopyAIContext,
  printManualCopyAIPrompt,
  printPullRequestDraft,
  printTestCommandDiscovery,
  printTestCommandHistory,
  printTestRunEvidence,
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

  if (command === "test" && subcommand === "run") {
    const evidence = await runApprovedTestCommand(argv.slice(2).join(" ").trim() || undefined);

    if (!evidence) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printTestRunEvidence(evidence);
    return true;
  }

  if (command === "ai" && subcommand === "context") {
    const result = await createManualCopyAIContext();

    if (!result.active || !result.context) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printManualCopyAIContext(result);
    return true;
  }

  if (command === "ai" && subcommand === "prompt") {
    const result = await createManualCopyAIPrompt();

    if (!result.active || !result.prompt) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printManualCopyAIPrompt(result);
    return true;
  }

  if (command === "diff") {
    const result = await getDiffSummary();

    if (!result.active || !result.summary) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printDiffSummary(result);
    return true;
  }

  if (command === "github" && subcommand === "auth" && argv[2] === "status") {
    printGitHubAuthStatus(await getGitHubAuthStatus());
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

  if (command === "pr" && subcommand === "create") {
    printExternalActionGuard(await createPullRequestExternalGuard());
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

  if (command === "work-item" && subcommand === "post-update") {
    printExternalActionGuard(await postWorkItemUpdateExternalGuard());
    return true;
  }

  return false;
};
