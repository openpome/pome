import {
  approveAndApplyAIPatchProposal,
  approveTaskSessionPlan,
  createAIPatchProposal,
  createPullRequestDraft,
  createTaskSessionPlan,
  createWorkItemUpdateDraft,
  approveTestCommand,
  discoverTestCommands,
  getAssistantDecision,
  getGitHubAuthStatus,
  getJiraAuthStatus,
  getModelProviderStatus,
  getTaskSessionStatus,
  initOpenPome,
  listAssignedWork,
  listWorkItemScopes,
  runApprovedTestCommand,
  runDoctor,
  startTaskSession,
  useWorkItemScope
} from "@openpome/local-gateway";
import {
  printAssistantDecision,
  printAIPatchApplyResult,
  printAIPatchProposal,
  printActivityTrail,
  printCommandApprovalEvidence,
  printCommandFailure,
  printDemoWorkQueue,
  printDoneSummary,
  printHome,
  printOnboardingGuide,
  printScopeSetup,
  printTaskIntelligenceReport,
  printTaskSessionApproval,
  printTestCommandDiscovery,
  printTestRunEvidence,
  printWorkQueue,
  printWorkSourceSetup,
  printWorkItemScopeSelection,
  printWorkflowBlocked
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleAssistantCommand: CommandHandler = async (argv) => {
  const [command, value] = argv;

  if (!command) {
    printHome(await getAssistantDecision(), await getJiraAuthStatus(), await getGitHubAuthStatus(), await getModelProviderStatus());
    return true;
  }

  if (command === "onboard") {
    printActivityTrail("OpenPome setup", [
      "Checking local configuration",
      "Checking Jira work access",
      "Checking GitHub access",
      "Checking AI provider readiness"
    ]);
    await initOpenPome();
    const jiraAuth = await getJiraAuthStatus();
    if (jiraAuth.configured) {
      await autoSelectSingleScope();
    }
    printOnboardingGuide(await runDoctor(), await getGitHubAuthStatus(), await getModelProviderStatus());
    return true;
  }

  if (command === "demo" && value === "start") {
    const key = argv[2];
    if (!key) {
      printCommandFailure("Missing demo work item key.", "Run `pome demo`, then `pome demo start <KEY>`.");
      return true;
    }

    const demoEnv = { ...process.env, OPENPOME_DEMO: "1", OPENPOME_PREFER_CURRENT_WORKSPACE: "1" };
    const started = await startTaskSession(key, demoEnv);
    if (!started) {
      printCommandFailure(`Demo work item not found: ${key}`, "Run `pome demo` to see sample work.");
      return true;
    }

    const plan = await createTaskSessionPlan();
    printTaskIntelligenceReport(started, plan);
    return true;
  }

  if (command === "demo") {
    const result = await listAssignedWork({ ...process.env, OPENPOME_DEMO: "1" });
    printDemoWorkQueue(result);
    return true;
  }

  if (command === "work") {
    const showAllAssigned = value === "all" || value === "--all";
    printActivityTrail("OpenPome work", [
      "Checking Jira connection"
    ]);
    const auth = await getJiraAuthStatus();
    if (!auth.configured && process.env["OPENPOME_DEMO"] !== "1") {
      printWorkSourceSetup(auth);
      return true;
    }

    printActivityTrail("Assigned work", [
      showAllAssigned ? "Ignoring the selected board filter for this run" : "Selecting the active work scope",
      showAllAssigned ? "Fetching all Jira work assigned to you" : "Fetching assigned work from the selected board or scope"
    ]);
    if (!showAllAssigned) {
      const scopeSetup = await ensureWorkScope();
      if (scopeSetup === "needs-selection") {
        return true;
      }
    }

    const result = await listAssignedWork(process.env, { ignoreActiveScope: showAllAssigned });
    if (result.sourceMode === "mock" && process.env["OPENPOME_DEMO"] !== "1") {
      printWorkSourceSetup(await getJiraAuthStatus());
      return true;
    }

    printWorkQueue(result);
    return true;
  }

  if (command === "use") {
    if (!value) {
      printCommandFailure("Missing work scope id.", "Run `pome work` to see available scopes, then `pome use <SCOPE_ID>`.");
      return true;
    }

    const result = await useWorkItemScope(value);

    if (!result) {
      printCommandFailure(`Work scope not found: ${value}`, "Run `pome work` to see available scopes.");
      return true;
    }

    printWorkItemScopeSelection(result);
    return true;
  }

  if (command === "start" && value) {
    printActivityTrail(`OpenPome start ${value}`, [
      "Checking Jira access"
    ]);
    const auth = await getJiraAuthStatus();
    if (!auth.configured && process.env["OPENPOME_DEMO"] !== "1") {
      printWorkSourceSetup(auth);
      return true;
    }

    printActivityTrail("Task intelligence", [
      "Loading the latest story details",
      "Resolving the local codebase",
      "Creating the task session",
      "Asking the active AI provider for an implementation plan"
    ]);
    let started: Awaited<ReturnType<typeof startTaskSession>>;
    try {
      started = await startTaskSession(value, { ...process.env, OPENPOME_PREFER_CURRENT_WORKSPACE: "1" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Active task session already exists")) {
        printWorkflowBlocked(message, "Run `pome next` to continue, or `pome stop` / `pome reset` to close the active session.");
        return true;
      }

      throw error;
    }

    if (!started) {
      printCommandFailure(`Work item not found: ${value}`, "Run `pome work` to choose assigned work.");
      return true;
    }

    const plan = await createTaskSessionPlan();
    printTaskIntelligenceReport(started, plan);
    return true;
  }

  if (command === "next") {
    printActivityTrail("OpenPome next", [
      "Refreshing the active Jira story",
      "Reading current task session state",
      "Choosing the safest next action"
    ]);
    const status = await getTaskSessionStatus();
    const latestPatchAppliedAt = getLatestAppliedPatchAt(status);
    const latestRunAfterPatch = getLatestTestRunAfter(status, latestPatchAppliedAt);
    if (
      status.active &&
      status.session &&
      status.plan &&
      status.planApproval?.status === "approved" &&
      !status.aiPatchProposal?.appliedAt &&
      status.session.status !== "blocked"
    ) {
      try {
        printActivityTrail("AI patch proposal", [
          "Collecting bounded repository context",
          "Asking the active AI provider for the smallest safe patch",
          "Validating proposed file paths and content",
          "Preparing the developer approval checkpoint"
        ]);
        printAIPatchProposal(await createAIPatchProposal());
      } catch (error) {
        printAssistantDecision(await getAssistantDecision(), error instanceof Error ? error.message : String(error));
      }
      return true;
    }

    if (
      status.active &&
      status.session &&
      status.plan &&
      status.planApproval?.status === "approved" &&
      status.aiPatchProposal?.appliedAt &&
      latestRunAfterPatch?.status === "failed" &&
      status.session.status !== "blocked"
    ) {
      try {
        printActivityTrail("AI test-failure repair", [
          "Reading failed test evidence",
          "Collecting bounded repository context",
          "Asking the active AI provider for a focused fix patch",
          "Preparing the developer approval checkpoint"
        ]);
        printAIPatchProposal(await createAIPatchProposal());
      } catch (error) {
        printAssistantDecision(await getAssistantDecision(), error instanceof Error ? error.message : String(error));
      }
      return true;
    }

    if (status.active && status.aiPatchProposal?.appliedAt && (status.testCommandCandidates?.length ?? 0) === 0) {
      printActivityTrail("Validation discovery", [
        "Inspecting package metadata",
        "Finding likely test or validation commands",
        "Preparing command approval options"
      ]);
      printTestCommandDiscovery(await discoverTestCommands());
      return true;
    }

    if (
      status.active &&
      status.aiPatchProposal?.appliedAt &&
      (status.commandApprovalEvidence?.length ?? 0) > 0 &&
      !latestRunAfterPatch
    ) {
      printActivityTrail("Approved test run", [
        "Loading the approved command",
        "Running the command in the selected workspace",
        "Capturing bounded validation evidence"
      ]);
      const evidence = await runApprovedTestCommand();
      if (evidence) {
        printTestRunEvidence(evidence);
        return true;
      }
    }

    printAssistantDecision(await getAssistantDecision());
    return true;
  }

  if (command === "approve" && !value) {
    printActivityTrail("OpenPome approve", [
      "Refreshing the active Jira story",
      "Reading the current approval checkpoint",
      "Applying only the approved action"
    ]);
    const status = await getTaskSessionStatus();
    if (!status.active) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    if (status.aiPatchProposal && status.aiPatchProposal.approval.status === "pending") {
      printAIPatchApplyResult(await approveAndApplyAIPatchProposal());
      return true;
    }

    if (status.planApproval?.status === "approved" && (status.testCommandCandidates?.length ?? 0) > 0 && (status.commandApprovalEvidence?.length ?? 0) === 0) {
      const evidence = await approveTestCommand();
      if (evidence) {
        printCommandApprovalEvidence(evidence);
        return true;
      }
    }

    if (status.planApproval?.status === "approved") {
      printAssistantDecision(await getAssistantDecision());
      return true;
    }

    const result = await approveTaskSessionPlan();

    if (!result) {
      printCommandFailure("No active task session.", "Run `pome start <KEY>` first.");
      return true;
    }

    printTaskSessionApproval(result);
    return true;
  }

  if (command === "done") {
    printActivityTrail("OpenPome done", [
      "Refreshing the active Jira story",
      "Checking plan approval and validation status",
      "Preparing PR and Jira update drafts"
    ]);
    const status = await getTaskSessionStatus();
    if (!status.active || status.planApproval?.status !== "approved") {
      printAssistantDecision(await getAssistantDecision());
      return true;
    }

    const latestRunAfterPatch = getLatestTestRunAfter(status, getLatestAppliedPatchAt(status));
    if (latestRunAfterPatch?.status === "failed") {
      printAssistantDecision(await getAssistantDecision());
      return true;
    }

    const prDraft = await createPullRequestDraft();
    const updateDraft = await createWorkItemUpdateDraft();
    printDoneSummary(prDraft, updateDraft);
    return true;
  }

  return false;
};

type AssistantStatus = Awaited<ReturnType<typeof getTaskSessionStatus>>;

function getLatestAppliedPatchAt(status: AssistantStatus): string | undefined {
  return status.aiPatchProposal?.appliedAt;
}

function getLatestTestRunAfter(status: AssistantStatus, since: string | undefined): NonNullable<AssistantStatus["testRunEvidence"]>[number] | undefined {
  const runs = status.testRunEvidence ?? [];
  const filtered = since ? runs.filter((run) => run.finishedAt >= since) : runs;
  return filtered[filtered.length - 1];
}

async function ensureWorkScope(): Promise<"ready" | "needs-selection"> {
  const doctor = await runDoctor();
  const scopeCheck = doctor.checks.find((check) => check.name === "Work item scope");
  if (scopeCheck?.status !== "attention") {
    return "ready";
  }

  const selected = await autoSelectSingleScope();
  if (selected) {
    return "ready";
  }

  printScopeSetup(await listWorkItemScopes());
  return "needs-selection";
}

async function autoSelectSingleScope(): Promise<boolean> {
  const scopes = await listWorkItemScopes();
  if (scopes.activeScope || scopes.scopes.length !== 1) {
    return false;
  }

  const scope = scopes.scopes[0];
  if (!scope) {
    return false;
  }

  return Boolean(await useWorkItemScope(scope.scopeId));
}
