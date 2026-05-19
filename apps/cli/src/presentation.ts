import type {
  AssignedWorkResult,
  CommandApprovalEvidence,
  ConfigPathResult,
  ConfigResetResult,
  ConfigShowResult,
  DiffSummaryResult,
  DoctorResult,
  ExternalActionGuardResult,
  GitHubAuthStatusResult,
  InitResult,
  JiraBoardListResult,
  JiraBoardUseResult,
  ManualCopyAIContextResult,
  ManualCopyAIPromptResult,
  OAuthCompletionResult,
  OAuthLoginResult,
  PullRequestDraftResult,
  TaskSessionApprovalResult,
  TaskSessionApprovalHistoryResult,
  TaskSessionLifecycleResult,
  TaskSessionPlanResult,
  TaskSessionStartResult,
  TaskSessionStatusResult,
  TaskSessionTimelineResult,
  TestCommandDiscoveryResult,
  TestCommandHistoryResult,
  TestRunEvidence,
  WorkItemScopeListResult,
  WorkItemScopeUseResult,
  WorkItemUpdateDraftResult,
  WorkspaceLinkResult,
  WorkspaceListResult,
  WorkspaceResolveResult,
  WorkspaceScanResult
} from "@openpome/local-gateway";
import type { WorkItem, WorkItemType } from "@openpome/work-items";

export function printHelp(): void {
  console.log([
    "OpenPome CLI",
    "",
    "Usage:",
    "  pome init",
    "  pome doctor",
    "  pome config path",
    "  pome config show",
    "  pome config reset",
    "  pome auth jira status",
    "  pome auth jira login",
    "  pome auth jira login --listen",
    "  pome auth jira callback <CODE>",
    "  pome work-item list",
    "  pome work-item show <KEY>",
    "  pome work-item scopes",
    "  pome work-item scope use <SCOPE_ID>",
    "  pome jira boards",
    "  pome jira board use <BOARD_ID>",
    "  pome workspace scan",
    "  pome workspace list",
    "  pome workspace resolve <KEY>",
    "  pome workspace link <KEY> <PATH>",
    "  pome start <KEY>",
    "  pome status",
    "  pome stop",
    "  pome resume [SESSION_ID]",
    "  pome reset",
    "  pome timeline",
    "  pome approvals",
    "  pome plan",
    "  pome approve plan",
    "  pome ai context",
    "  pome ai prompt",
    "  pome diff",
    "  pome test discover",
    "  pome approve command [COMMAND]",
    "  pome test run [COMMAND]",
    "  pome test history",
    "  pome github auth status",
    "  pome pr draft",
    "  pome pr create",
    "  pome work-item update-draft",
    "  pome work-item post-update",
    "  pome reject [REASON]",
    "  pome jira list",
    "  pome jira show <KEY>",
    "",
    "Jira live mode environment:",
    "  OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net",
    "  OPENPOME_JIRA_EMAIL=you@example.com",
    "  OPENPOME_JIRA_API_TOKEN=...",
    "",
    "Jira OAuth development environment:",
    "  OPENPOME_JIRA_OAUTH_CLIENT_ID=...",
    "  OPENPOME_JIRA_OAUTH_CLIENT_SECRET=...",
    "  OPENPOME_JIRA_OAUTH_REDIRECT_URI=http://127.0.0.1:48731/auth/jira/callback",
    "  Note: OAuth/browser mode is experimental until a real Atlassian app smoke test is completed.",
    "",
    "Workspace scan environment:",
    "  OPENPOME_WORKSPACE_SCAN_PATHS=/path/one:/path/two"
  ].join("\n"));
}

export function printCommandFailure(message: string, nextStep?: string): void {
  console.error(`Error: ${message}`);
  if (nextStep) {
    console.error(`Next: ${nextStep}`);
  }
  process.exitCode = 1;
}

export function printInitResult(result: InitResult): void {
  console.log(result.created ? "Created OpenPome local configuration." : "OpenPome local configuration already exists.");
  console.log(`Home:   ${result.homeDirectory}`);
  console.log(`Config: ${result.configFile}`);
}

export function printConfigPaths(result: ConfigPathResult): void {
  console.log("OpenPome paths");
  console.log(`Home:     ${result.homeDirectory}`);
  console.log(`Config:   ${result.configFile}`);
  console.log(`Workspace index: ${result.workspaceIndexFile}`);
  console.log(`Workspace links: ${result.workspaceLinksFile}`);
  console.log(`Active session:  ${result.activeTaskSessionFile}`);
  console.log(`Session history: ${result.taskSessionHistoryFile}`);
}

export function printConfigShow(result: ConfigShowResult): void {
  console.log(result.exists ? "OpenPome config" : "OpenPome config defaults");
  console.log(`Config: ${result.configFile}`);
  console.log("");
  console.log(JSON.stringify(result.config, null, 2));
}

export function printConfigReset(result: ConfigResetResult): void {
  console.log("OpenPome config reset.");
  console.log(`Config: ${result.configFile}`);
  console.log(`Reset:  ${result.resetAt}`);
}

export function printDoctorResult(result: DoctorResult): void {
  console.log(`OpenPome doctor: ${result.status}`);
  console.log("");

  for (const check of result.checks) {
    const marker = check.status === "ok" ? "ok" : "!";
    console.log(`${marker.padEnd(2)} ${check.name}: ${check.detail}`);
  }
}

export function printJiraOAuthLogin(login: OAuthLoginResult): void {
  console.log("Jira OAuth login");
  console.log("Status: experimental until a real Atlassian OAuth app smoke test is completed.");
  console.log("");
  console.log(`Redirect URI: ${login.redirectUri}`);
  console.log(`Scopes:       ${login.scopes.join(", ")}`);
  console.log(`State:        ${login.state}`);
  console.log("");
  console.log("Open this URL in your browser:");
  console.log(login.authorizationUrl);
  console.log("");
  console.log(login.nextStep);
}

export function printJiraOAuthCompletion(completion: OAuthCompletionResult): void {
  console.log(completion.detail);
  if (completion.siteUrl) {
    console.log(`Site: ${completion.siteUrl}`);
  }
}

export function printAssignedWork(result: AssignedWorkResult): void {
  console.log(`Assigned work from ${result.sourceDisplayName} (${result.sourceMode})`);
  if (result.activeScope) {
    console.log(`Scope: ${result.activeScope.displayName} (${result.activeScope.kind})`);
  }
  console.log("");

  const hasAssignedWork = Object.values(result.groups).some((items) => items.length > 0);
  if (!hasAssignedWork) {
    console.log("No assigned work found in the selected scope.");
    console.log("Next: confirm the issue is assigned to you, select the correct board/scope, or run `pome jira show <KEY>` for a known issue.");
    return;
  }

  const sections: readonly [WorkItemType, string][] = [
    ["story", "Stories"],
    ["subtask", "Sub-tasks"],
    ["bug", "Bugs"],
    ["task", "Tasks"],
    ["epic", "Epics"]
  ];

  for (const [type, label] of sections) {
    const items = result.groups[type];

    if (items.length === 0) {
      continue;
    }

    console.log(label);

    for (const item of items) {
      const priority = item.priority ? ` · ${item.priority}` : "";
      console.log(`  ${item.key.padEnd(10)} ${item.title}`);
      console.log(`  ${"".padEnd(10)} ${item.status}${priority}`);
    }

    console.log("");
  }
}

export function printJiraBoards(result: JiraBoardListResult): void {
  console.log(`Jira boards (${result.sourceMode})`);
  if (result.activeScope) {
    console.log(`Active: ${result.activeScope.displayName} (${result.activeScope.scopeId})`);
  }
  console.log("");

  if (result.boards.length === 0) {
    console.log("No Jira boards found for the authenticated user.");
    return;
  }

  for (const board of result.boards) {
    const type = board.metadata?.["jiraBoardType"] ? ` · ${board.metadata["jiraBoardType"]}` : "";
    const project = board.metadata?.["jiraProjectKey"] ? ` · ${board.metadata["jiraProjectKey"]}` : "";
    const activeMarker = result.activeScope?.scopeId === board.scopeId ? "*" : " ";
    console.log(`${activeMarker} ${board.scopeId.padEnd(8)} ${board.displayName}${type}${project}`);
  }

  console.log("");
  console.log("Use `pome jira board use <BOARD_ID>` to select the scope for assigned work.");
}

export function printJiraBoardSelection(result: JiraBoardUseResult): void {
  console.log(`Selected Jira board: ${result.activeScope.displayName} (${result.activeScope.scopeId})`);
  console.log(`Config: ${result.configFile}`);
}

export function printWorkItemScopes(result: WorkItemScopeListResult): void {
  console.log(`Work item scopes from ${result.sourceDisplayName} (${result.sourceMode})`);
  if (result.activeScope) {
    console.log(`Active: ${result.activeScope.displayName} (${result.activeScope.scopeId})`);
  }
  console.log("");

  if (result.scopes.length === 0) {
    console.log("No work item scopes found for the authenticated user.");
    return;
  }

  for (const scope of result.scopes) {
    const activeMarker = result.activeScope?.scopeId === scope.scopeId ? "*" : " ";
    const provider = scope.providerId ? ` · ${scope.providerId}` : "";
    console.log(`${activeMarker} ${scope.scopeId.padEnd(8)} ${scope.displayName} · ${scope.kind}${provider}`);
  }

  console.log("");
  console.log("Use `pome work-item scope use <SCOPE_ID>` to select the scope for assigned work.");
}

export function printWorkItemScopeSelection(result: WorkItemScopeUseResult): void {
  console.log(`Selected work item scope: ${result.activeScope.displayName} (${result.activeScope.scopeId})`);
  console.log(`Source: ${result.sourceDisplayName}`);
  console.log(`Config: ${result.configFile}`);
}

export function printWorkItem(item: WorkItem): void {
  console.log(`${item.key} ${item.title}`);
  console.log("");
  console.log(`Type:     ${item.type}`);
  console.log(`Status:   ${item.status}`);

  if (item.priority) {
    console.log(`Priority: ${item.priority}`);
  }

  if (item.assignee) {
    console.log(`Assignee: ${item.assignee}`);
  }

  if (item.parentKey) {
    console.log(`Parent:   ${item.parentKey}`);
  }

  if (item.labels?.length) {
    console.log(`Labels:   ${item.labels.join(", ")}`);
  }

  if (item.components?.length) {
    console.log(`Components: ${item.components.join(", ")}`);
  }

  if (item.description) {
    console.log("");
    console.log("Description");
    console.log(item.description);
  }

  if (item.subtasks?.length) {
    console.log("");
    console.log("Subtasks");

    for (const subtask of item.subtasks) {
      console.log(`  ${subtask.key} ${subtask.title} (${subtask.status})`);
    }
  }

  if (item.links?.length) {
    console.log("");
    console.log("Links");

    for (const link of item.links) {
      const title = link.title ? ` - ${link.title}` : "";
      console.log(`  ${link.kind}: ${link.url}${title}`);
    }
  }
}

export function printWorkspaceScan(result: WorkspaceScanResult): void {
  console.log(`Workspace scan complete: ${result.workspaces.length} repos`);
  console.log(`Index: ${result.indexFile}`);
  console.log("");
  console.log("Scan paths");

  for (const scanPath of result.scanPaths) {
    console.log(`  ${scanPath}`);
  }

  if (result.workspaces.length === 0) {
    console.log("");
    console.log("No Git workspaces found.");
    return;
  }

  console.log("");
  printWorkspaceRows(result.workspaces);
}

export function printWorkspaceList(result: WorkspaceListResult): void {
  if (!result.scannedAt) {
    console.log("No workspace index found. Run `pome workspace scan` first.");
    console.log(`Index: ${result.indexFile}`);
    return;
  }

  console.log(`Indexed workspaces: ${result.workspaces.length}`);
  console.log(`Scanned: ${result.scannedAt}`);
  console.log(`Index:   ${result.indexFile}`);

  if (result.workspaces.length === 0) {
    return;
  }

  console.log("");
  printWorkspaceRows(result.workspaces);
}

export function printWorkspaceResolution(result: WorkspaceResolveResult): void {
  console.log(`Workspace candidates for ${result.workItem.key}`);
  console.log(`${result.workItem.title}`);
  console.log("");

  if (result.candidates.length === 0) {
    console.log("No matching workspace candidates found.");
    console.log("Run `pome workspace scan` from a parent directory or set OPENPOME_WORKSPACE_SCAN_PATHS.");
    return;
  }

  for (const candidate of result.candidates.slice(0, 5)) {
    const confidence = Math.round(candidate.confidence * 100);
    console.log(`${candidate.workspace.name} (${confidence}%)`);
    if (candidate.workspace.path) {
      console.log(`  Path: ${candidate.workspace.path}`);
    }
    if (candidate.workspace.currentBranch) {
      console.log(`  Branch: ${candidate.workspace.currentBranch}`);
    }
    for (const reason of candidate.reasons) {
      console.log(`  - ${reason}`);
    }
  }
}

export function printWorkspaceLink(result: WorkspaceLinkResult): void {
  console.log(`Linked ${result.workItemKey} to ${result.workspace.name}`);
  if (result.workspace.path) {
    console.log(`Path:  ${result.workspace.path}`);
  }
  console.log(`Match: ${Math.round(result.link.confidence * 100)}% developer-confirmed`);
  console.log(`Links: ${result.linksFile}`);
}

export function printTaskSessionStart(result: TaskSessionStartResult): void {
  console.log(`Started task session ${result.session.id}`);
  console.log(`${result.workItem.key} ${result.workItem.title}`);
  console.log(`Status: ${result.session.status}`);
  console.log(`File:   ${result.sessionFile}`);

  if (result.workspaceCandidate) {
    console.log("");
    printWorkspaceCandidate(result.workspaceCandidate);
  } else {
    console.log("");
    console.log("Workspace: unresolved");
    console.log("Run `pome workspace resolve <KEY>` or `pome workspace link <KEY> <PATH>`.");
  }

  console.log("");
  console.log("Next: pome plan");
}

export function printTaskSessionStatus(result: TaskSessionStatusResult): void {
  if (!result.active || !result.session || !result.workItem) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Active task session ${result.session.id}`);
  console.log(`${result.workItem.key} ${result.workItem.title}`);
  console.log(`Status: ${result.session.status}`);
  console.log(`Automation: ${result.session.automationLevel}`);
  console.log(`File: ${result.sessionFile}`);

  if (result.workspaceCandidate) {
    console.log("");
    printWorkspaceCandidate(result.workspaceCandidate);
  }

  if (result.plan) {
    console.log("");
    console.log("Plan: ready");
  }

  if (result.planApproval) {
    console.log(`Approval: ${result.planApproval.status}`);
  }

  if (result.events?.length) {
    console.log(`Events: ${result.events.length}`);
  }

  if (result.approvalHistory?.length) {
    console.log(`Approval history: ${result.approvalHistory.length}`);
  }
}

export function printTaskSessionPlan(result: TaskSessionPlanResult): void {
  console.log(`Plan for ${result.workItem.key}`);
  console.log(result.plan.summary);
  console.log("");

  printStringList("Assumptions", result.plan.assumptions);

  if (result.plan.steps.length > 0) {
    console.log("Steps");
    for (const step of result.plan.steps) {
      console.log(`  ${step.id}. ${step.title}`);
      if (step.detail) {
        console.log(`     ${step.detail}`);
      }
    }
    console.log("");
  }

  printStringList("Likely files", result.plan.filesLikelyChanged);
  printStringList("Commands", result.plan.commandsToRun);
  printStringList("Risks", result.plan.risks);
  printStringList("Missing info", result.plan.missingInfo);

  console.log(`Status: ${result.session.status}`);
  console.log("Next: approve the plan before implementation.");
}

export function printTaskSessionApproval(result: TaskSessionApprovalResult): void {
  console.log(`${result.approval.title}: ${result.approval.status}`);
  console.log(`${result.workItem.key} ${result.workItem.title}`);
  console.log(`Status: ${result.session.status}`);
  console.log(`File:   ${result.sessionFile}`);
  console.log("");
  console.log(result.nextStep);
}

export function printTaskSessionLifecycle(result: TaskSessionLifecycleResult): void {
  console.log(result.message);
  console.log(`Active:  ${result.active ? "yes" : "no"}`);
  console.log(`Session: ${result.session?.id ?? "none"}`);
  if (result.session) {
    console.log(`Status:  ${result.session.status}`);
    console.log(`Work:    ${result.session.workItemKey}`);
  }
  console.log(`File:    ${result.sessionFile}`);
  console.log(`History: ${result.historyFile}`);
}

export function printTaskSessionTimeline(result: TaskSessionTimelineResult): void {
  if (!result.active || !result.session) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Timeline for ${result.session.workItemKey}`);
  console.log(`Session: ${result.session.id}`);
  console.log(`File:    ${result.sessionFile}`);
  console.log("");

  if (result.events.length === 0) {
    console.log("No timeline events recorded yet.");
    return;
  }

  for (const event of result.events) {
    console.log(`${event.createdAt} ${event.title}`);
    console.log(`  Type: ${event.type}`);
    for (const detail of event.details) {
      console.log(`  - ${detail}`);
    }
  }
}

export function printTaskSessionApprovalHistory(result: TaskSessionApprovalHistoryResult): void {
  if (!result.active || !result.session) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Approval history for ${result.session.workItemKey}`);
  console.log(`Session: ${result.session.id}`);
  console.log("");

  if (result.approvals.length === 0) {
    console.log("No approvals recorded yet.");
    return;
  }

  for (const approval of result.approvals) {
    console.log(`${approval.title}: ${approval.status}`);
    console.log(`  Type: ${approval.type}`);
    console.log(`  Reason: ${approval.reason}`);
    for (const detail of approval.details) {
      console.log(`  - ${detail}`);
    }
  }
}

export function printTestCommandDiscovery(result: TestCommandDiscoveryResult): void {
  if (!result.active || !result.session) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    console.log(result.nextStep);
    return;
  }

  console.log(`Test command candidates for ${result.session.workItemKey}`);
  console.log(`Session: ${result.session.id}`);
  if (result.workspace?.path) {
    console.log(`Workspace: ${result.workspace.path}`);
  }
  console.log(`Discovered: ${result.discoveredAt}`);
  console.log("");

  if (result.candidates.length === 0) {
    console.log("No test command candidates found.");
    console.log(result.nextStep);
    return;
  }

  for (const candidate of result.candidates) {
    console.log(`${candidate.id}`);
    console.log(`  Command: ${candidate.command}`);
    console.log(`  Source:  ${candidate.source}`);
    console.log(`  Reason:  ${candidate.reason}`);
    if (candidate.cwd) {
      console.log(`  Cwd:     ${candidate.cwd}`);
    }
  }

  console.log("");
  console.log(result.nextStep);
}

export function printCommandApprovalEvidence(evidence: CommandApprovalEvidence): void {
  console.log("Command approval recorded.");
  console.log(`Evidence: ${evidence.id}`);
  console.log(`Command:  ${evidence.command}`);
  if (evidence.cwd) {
    console.log(`Cwd:      ${evidence.cwd}`);
  }
  console.log(`Approved: ${evidence.approvedAt}`);
  console.log(`Approval: ${evidence.approval.id}`);
  console.log("");
  console.log("This records approval evidence only; OpenPome did not run the command.");
}

export function printTestCommandHistory(result: TestCommandHistoryResult): void {
  if (!result.active || !result.session) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Approved command evidence for ${result.session.workItemKey}`);
  console.log(`Session: ${result.session.id}`);
  console.log("");

  if (result.evidence.length === 0) {
    console.log("No approved command evidence recorded yet.");
    return;
  }

  for (const evidence of result.evidence) {
    console.log(`${evidence.approvedAt} ${evidence.command}`);
    console.log(`  Evidence: ${evidence.id}`);
    console.log(`  Approval: ${evidence.approval.id}`);
    if (evidence.cwd) {
      console.log(`  Cwd:      ${evidence.cwd}`);
    }
  }

  if (result.runs.length > 0) {
    console.log("");
    console.log("Test runs");
    for (const run of result.runs) {
      console.log(`${run.finishedAt} ${run.command}: ${run.status} (exit ${run.exitCode})`);
      console.log(`  Evidence: ${run.id}`);
      console.log(`  Approval: ${run.approvalId}`);
    }
  }
}

export function printTestRunEvidence(evidence: TestRunEvidence): void {
  console.log(`Test command ${evidence.status}: ${evidence.command}`);
  console.log(`Evidence: ${evidence.id}`);
  console.log(`Approval: ${evidence.approvalId}`);
  console.log(`Exit:     ${evidence.exitCode}`);
  if (evidence.cwd) {
    console.log(`Cwd:      ${evidence.cwd}`);
  }
  console.log(`Started:  ${evidence.startedAt}`);
  console.log(`Finished: ${evidence.finishedAt}`);
  printStringList("Stdout summary", evidence.stdoutSummary);
  printStringList("Stderr summary", evidence.stderrSummary);
}

export function printManualCopyAIContext(result: ManualCopyAIContextResult): void {
  if (!result.active || !result.session || !result.context) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Manual-copy AI context for ${result.session.workItemKey}`);
  console.log(`Created: ${result.context.createdAt}`);
  console.log("Includes source code: no");
  console.log("Includes full diff:   no");
  console.log("");
  console.log(result.context.text);
}

export function printManualCopyAIPrompt(result: ManualCopyAIPromptResult): void {
  if (!result.active || !result.session || !result.prompt) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Manual-copy AI prompt for ${result.session.workItemKey}`);
  console.log("");
  console.log(result.prompt);
}

export function printDiffSummary(result: DiffSummaryResult): void {
  if (!result.active || !result.session || !result.summary) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Diff summary for ${result.session.workItemKey}`);
  if (result.summary.workspacePath) {
    console.log(`Workspace: ${result.summary.workspacePath}`);
  }
  if (result.summary.branch) {
    console.log(`Branch:    ${result.summary.branch}`);
  }
  console.log(`Created:   ${result.summary.createdAt}`);
  console.log("Full diff: no");
  console.log("");

  if (result.summary.files.length === 0) {
    console.log("No tracked diff files found.");
  } else {
    for (const file of result.summary.files) {
      const added = file.added === undefined ? "?" : String(file.added);
      const deleted = file.deleted === undefined ? "?" : String(file.deleted);
      console.log(`${file.status.padEnd(3)} ${file.path} (+${added} -${deleted})`);
    }
  }

  printStringList("Git status", result.summary.statusLines);
}

export function printGitHubAuthStatus(result: GitHubAuthStatusResult): void {
  console.log("GitHub auth status");
  console.log(`CLI available:  ${result.cliAvailable ? "yes" : "no"}`);
  console.log(`Authenticated:  ${result.authenticated ? "yes" : "no"}`);
  console.log(`Detail:         ${result.detail}`);
}

export function printExternalActionGuard(result: ExternalActionGuardResult): void {
  const label = result.action === "create_pr" ? "PR creation" : "Work item update posting";
  console.log(`${label}: disabled`);
  if (result.session) {
    console.log(`Session: ${result.session.id}`);
    console.log(`Work:    ${result.session.workItemKey}`);
  }
  console.log(`File:    ${result.sessionFile}`);
  console.log("");
  console.log(result.detail);
  console.log(`Next: ${result.nextStep}`);
}

export function printPullRequestDraft(result: PullRequestDraftResult): void {
  if (!result.active || !result.session || !result.draft) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`PR draft for ${result.session.workItemKey}`);
  console.log(`Title: ${result.draft.title}`);
  console.log(`Base:  ${result.draft.baseBranch}`);
  console.log(`Head:  ${result.draft.headBranch}`);
  if (result.draft.remoteUrl) {
    console.log(`Remote: ${result.draft.remoteUrl}`);
  }
  console.log(`Created: ${result.draft.createdAt}`);
  console.log("");
  console.log(result.draft.body);
}

export function printWorkItemUpdateDraft(result: WorkItemUpdateDraftResult): void {
  if (!result.active || !result.session || !result.draft) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Work item update draft for ${result.workItem?.key ?? result.session.workItemKey}`);
  console.log(`Created: ${result.draft.createdAt}`);
  console.log("");
  console.log(result.draft.body);
}

function printWorkspaceRows(workspaces: WorkspaceScanResult["workspaces"]): void {
  for (const workspace of workspaces) {
    const branch = workspace.currentBranch ? ` · ${workspace.currentBranch}` : "";
    console.log(`  ${workspace.name}${branch}`);
    if (workspace.path) {
      console.log(`  ${"".padEnd(2)}${workspace.path}`);
    }
    if (workspace.remoteUrls[0]) {
      console.log(`  ${"".padEnd(2)}${workspace.remoteUrls[0]}`);
    }
  }
}

function printWorkspaceCandidate(candidate: WorkspaceResolveResult["candidates"][number]): void {
  console.log(`Workspace: ${candidate.workspace.name} (${Math.round(candidate.confidence * 100)}%)`);
  if (candidate.workspace.path) {
    console.log(`Path: ${candidate.workspace.path}`);
  }
  if (candidate.workspace.currentBranch) {
    console.log(`Branch: ${candidate.workspace.currentBranch}`);
  }
  for (const reason of candidate.reasons) {
    console.log(`- ${reason}`);
  }
}

function printStringList(label: string, values: readonly string[]): void {
  if (values.length === 0) {
    return;
  }

  console.log(label);
  for (const value of values) {
    console.log(`  - ${value}`);
  }
  console.log("");
}
