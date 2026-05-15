import type {
  AssignedWorkResult,
  DoctorResult,
  InitResult,
  JiraBoardListResult,
  JiraBoardUseResult,
  OAuthCompletionResult,
  OAuthLoginResult,
  TaskSessionApprovalResult,
  TaskSessionPlanResult,
  TaskSessionStartResult,
  TaskSessionStatusResult,
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
    "  pome auth jira status",
    "  pome auth jira login",
    "  pome auth jira login --listen",
    "  pome auth jira callback <CODE>",
    "  pome work-item list",
    "  pome work-item show <KEY>",
    "  pome jira boards",
    "  pome jira board use <BOARD_ID>",
    "  pome workspace scan",
    "  pome workspace list",
    "  pome workspace resolve <KEY>",
    "  pome workspace link <KEY> <PATH>",
    "  pome start <KEY>",
    "  pome status",
    "  pome plan",
    "  pome approve plan",
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
    "",
    "Workspace scan environment:",
    "  OPENPOME_WORKSPACE_SCAN_PATHS=/path/one:/path/two"
  ].join("\n"));
}

export function printInitResult(result: InitResult): void {
  console.log(result.created ? "Created OpenPome local configuration." : "OpenPome local configuration already exists.");
  console.log(`Home:   ${result.homeDirectory}`);
  console.log(`Config: ${result.configFile}`);
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
    const type = board.type ? ` · ${board.type}` : "";
    const project = board.projectKey ? ` · ${board.projectKey}` : "";
    const activeMarker = result.activeScope?.scopeId === board.id ? "*" : " ";
    console.log(`${activeMarker} ${board.id.padEnd(8)} ${board.name}${type}${project}`);
  }

  console.log("");
  console.log("Use `pome jira board use <BOARD_ID>` to select the scope for assigned work.");
}

export function printJiraBoardSelection(result: JiraBoardUseResult): void {
  console.log(`Selected Jira board: ${result.activeScope.displayName} (${result.activeScope.scopeId})`);
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
