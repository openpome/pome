import {
  createManualCopyAIContext,
  createManualCopyAIPrompt,
  createPullRequest,
  createPullRequestDraft,
  createWorkItemUpdateDraft,
  discoverTestCommands,
  getDiffSummary,
  getGitHubAuthStatus,
  getTestCommandHistory,
  postWorkItemUpdate,
  runApprovedTestCommand
} from "@openpome/local-gateway";
import type { PullRequestCreateOptions } from "@openpome/local-gateway";
import {
  printCommandFailure,
  printDiffSummary,
  printGitHubAuthStatus,
  printManualCopyAIContext,
  printManualCopyAIPrompt,
  printPullRequestCreateResult,
  printPullRequestDraft,
  printTestCommandDiscovery,
  printTestCommandHistory,
  printTestRunEvidence,
  printWorkItemUpdatePostResult,
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
    const options = parsePullRequestCreateOptions(argv.slice(2));
    if ("error" in options) {
      printCommandFailure(options.error, "Run `pome pr create --draft`, `pome pr create --base <BRANCH>`, or `pome pr create --allow-untested`.");
      return true;
    }

    const result = await createPullRequest(options);
    if (!result.active) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printPullRequestCreateResult(result);
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
    const result = await postWorkItemUpdate();
    if (!result.active) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printWorkItemUpdatePostResult(result);
    return true;
  }

  return false;
};

function parsePullRequestCreateOptions(args: readonly string[]): PullRequestCreateOptions | { readonly error: string } {
  const options: {
    draft?: boolean;
    baseBranch?: string;
    allowUntested?: boolean;
  } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--draft") {
      options.draft = true;
      continue;
    }

    if (arg === "--allow-untested") {
      options.allowUntested = true;
      continue;
    }

    if (arg === "--base") {
      const value = args[index + 1]?.trim();
      if (!value) {
        return { error: "Missing base branch after --base." };
      }

      options.baseBranch = value;
      index += 1;
      continue;
    }

    return { error: `Unknown PR create option: ${arg}` };
  }

  return options;
}
