import {
  approveAndApplyAIPatchProposal,
  approveTaskSessionPlan,
  createAIPatchProposal,
  createPullRequestDraft,
  createTaskSessionPlan,
  createWorkItemUpdateDraft,
  approveTestCommand,
  discoverTestCommands,
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
  printAssistantNext,
  printAIPatchApplyResult,
  printAIPatchProposal,
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
    printHome(await getTaskSessionStatus(), await getJiraAuthStatus(), await getGitHubAuthStatus(), await getModelProviderStatus());
    return true;
  }

  if (command === "onboard") {
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
    const auth = await getJiraAuthStatus();
    if (!auth.configured && process.env["OPENPOME_DEMO"] !== "1") {
      printWorkSourceSetup(auth);
      return true;
    }

    const scopeSetup = await ensureWorkScope();
    if (scopeSetup === "needs-selection") {
      return true;
    }

    const result = await listAssignedWork();
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
    const auth = await getJiraAuthStatus();
    if (!auth.configured && process.env["OPENPOME_DEMO"] !== "1") {
      printWorkSourceSetup(auth);
      return true;
    }

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
        printAIPatchProposal(await createAIPatchProposal());
      } catch (error) {
        printAssistantNext(status, error instanceof Error ? error.message : String(error));
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
        printAIPatchProposal(await createAIPatchProposal());
      } catch (error) {
        printAssistantNext(status, error instanceof Error ? error.message : String(error));
      }
      return true;
    }

    if (status.active && status.aiPatchProposal?.appliedAt && (status.testCommandCandidates?.length ?? 0) === 0) {
      printTestCommandDiscovery(await discoverTestCommands());
      return true;
    }

    if (
      status.active &&
      status.aiPatchProposal?.appliedAt &&
      (status.commandApprovalEvidence?.length ?? 0) > 0 &&
      !latestRunAfterPatch
    ) {
      const evidence = await runApprovedTestCommand();
      if (evidence) {
        printTestRunEvidence(evidence);
        return true;
      }
    }

    printAssistantNext(status);
    return true;
  }

  if (command === "approve" && !value) {
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
      printAssistantNext(status);
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
    const status = await getTaskSessionStatus();
    if (!status.active || status.planApproval?.status !== "approved") {
      printAssistantNext(status);
      return true;
    }

    const latestRunAfterPatch = getLatestTestRunAfter(status, getLatestAppliedPatchAt(status));
    if (latestRunAfterPatch?.status === "failed") {
      printAssistantNext(status);
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
