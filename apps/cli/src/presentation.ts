import type {
  AssignedWorkResult,
  AssistantDecision,
  AIPatchApplyResult,
  AIPatchProposalResult,
  CommandApprovalEvidence,
  ConfigPathResult,
  ConfigResetResult,
  ConfigShowResult,
  DiffSummaryResult,
  DoctorResult,
  GitHubAuthStatusResult,
  GitHubDeviceCompletionResult,
  GitHubDeviceLoginResult,
  InitResult,
  AuthStatusResult,
  JiraApiTokenAuthResult,
  JiraBoardListResult,
  JiraBoardUseResult,
  ManualCopyAIContextResult,
  ManualCopyAIPromptResult,
  ModelProviderAuthResult,
  ModelProviderStatusResult,
  OAuthCompletionResult,
  OAuthLoginResult,
  PullRequestCreateResult,
  PullRequestDraftResult,
  TaskSessionApprovalResult,
  TaskSessionApprovalHistoryResult,
  TaskSessionHistoryListResult,
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
  WorkItemUpdatePostResult,
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
    "Start here:",
    "  pome onboard",
    "  pome work",
    "  pome work all",
    "  pome start <KEY>",
    "  pome next",
    "  pome done",
    "",
    "Main flow:",
    "  pome onboard",
    "  pome work",
    "  pome start <KEY>",
    "  pome next",
    "  pome approve",
    "  pome done",
    "",
    "Try without connecting tools:",
    "  pome demo",
    "  pome demo start <KEY>",
    "",
    "Setup and diagnostics:",
    "  pome init",
    "  pome doctor",
    "  pome config path",
    "  pome config show",
    "  pome config reset",
    "  pome auth jira status",
    "  pome auth jira token",
    "  pome auth jira login",
    "  pome auth jira login --listen",
    "  pome auth jira callback <CODE>",
    "  pome auth github status",
    "  pome auth github login",
    "  pome auth ai status",
    "  pome auth ai openai",
    "  pome auth ai claude",
    "  pome auth ai claude-cli",
    "",
    "Advanced work item commands:",
    "  pome work-item list",
    "  pome work-item show <KEY>",
    "  pome work-item scopes",
    "  pome work-item scope use <SCOPE_ID>",
    "  pome use <SCOPE_ID>",
    "  pome jira boards",
    "  pome jira board use <BOARD_ID>",
    "  pome jira list",
    "  pome jira show <KEY>",
    "",
    "Advanced workspace commands:",
    "  pome workspace scan",
    "  pome workspace list",
    "  pome workspace resolve <KEY>",
    "  pome workspace link <KEY> <PATH>",
    "",
    "Advanced task session commands:",
    "  pome start <KEY>",
    "  pome status",
    "  pome history",
    "  pome timeline",
    "  pome approvals",
    "  pome plan",
    "  pome approve plan",
    "  pome reject [REASON]",
    "",
    "AI context, tests, and drafts:",
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
    "  pome pr create --draft",
    "  pome pr create --base <BRANCH>",
    "  pome pr create --allow-untested",
    "  pome work-item update-draft",
    "  pome work-item post-update",
    "",
    "Session recovery:",
    "  pome stop",
    "  pome resume [SESSION_ID]",
    "  pome reset",
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
    "GitHub browser login environment:",
    "  OPENPOME_GITHUB_OAUTH_CLIENT_ID=...",
    "  OPENPOME_GITHUB_OAUTH_SCOPE=\"repo read:user\"",
    "  Note: without a GitHub OAuth client ID, `pome auth github login` uses the GitHub CLI fallback.",
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

export function printActivityTrail(title: string, steps: readonly string[]): void {
  console.log(title);
  for (const step of steps) {
    console.log(`  ${step}`);
  }
  console.log("");
}

export function printHome(
  decision: AssistantDecision,
  jira: AuthStatusResult,
  github?: GitHubAuthStatusResult,
  model?: ModelProviderStatusResult
): void {
  const modelProvider = model?.providers.find((provider) => provider.active);
  const jiraReady = jira.configured;
  const session = decision.status;

  printOpenPomeBanner();
  console.log("");

  if (session.active && session.workItem && session.session) {
    console.log("Now working");
    console.log(`  ${session.workItem.key.padEnd(10)} ${session.workItem.title}`);
    console.log(`  Phase: ${session.session.status}`);
    if (session.workspaceCandidate?.workspace.name) {
      console.log(`  Codebase: ${session.workspaceCandidate.workspace.name}`);
    }
    if (session.planApproval?.status) {
      console.log(`  Plan: ${session.planApproval.status}`);
    }
    console.log("");
  } else {
    console.log("No active story");
    console.log("  Run `pome work` to pick assigned Jira work.");
    console.log("");
  }

  console.log("Ready");
  printReadinessLine("Jira", jiraReady ? "connected" : "connect required", jiraReady ? "Assigned stories can be loaded." : "Run `pome auth jira token` once.");
  printReadinessLine("GitHub", github?.authenticated ? github.tokenSource : "optional", github?.authenticated ? github.detail : "Needed when creating PRs.");
  printReadinessLine("AI", modelProvider?.displayName ?? "manual-copy", modelProvider?.detail ?? "Ready without an API key.");
  console.log("");
  console.log("Next");
  console.log(`  ${decision.title}`);
  console.log(`  ${decision.detail}`);
  if (decision.blockers.length > 0) {
    console.log("");
    console.log("Needs attention");
    for (const blocker of decision.blockers.slice(0, 3)) {
      console.log(`  - ${blocker}`);
    }
  }
  console.log("");
  console.log("Run");
  for (const command of decision.commands) {
    console.log(`  ${command}`);
  }
  console.log("");
  console.log("Simple flow");
  console.log("  pome onboard -> pome work -> pome start <KEY> -> pome next -> pome approve -> pome done");
}

export function printWorkflowBlocked(message: string, nextStep: string): void {
  console.log("OpenPome needs your decision");
  console.log("");
  console.log(message);
  console.log("");
  console.log("Next");
  console.log(`  ${nextStep}`);
}

export function printAssistantDecision(decision: AssistantDecision, blockedReason?: string): void {
  console.log("OpenPome next");
  console.log("");

  if (decision.status.workItem) {
    console.log(`${decision.status.workItem.key} ${decision.status.workItem.title}`);
    console.log(`Status: ${decision.status.session?.status ?? "not started"}`);
    console.log("");
  }

  if (blockedReason) {
    console.log("AI implementation is not ready");
    console.log(`  ${blockedReason}`);
    console.log("");
  }

  console.log(decision.title);
  console.log(`  ${decision.detail}`);

  if (decision.blockers.length > 0) {
    console.log("");
    console.log("Needs attention");
    for (const blocker of decision.blockers.slice(0, 5)) {
      console.log(`  - ${blocker}`);
    }
  }

  console.log("");
  console.log("Run");
  for (const command of decision.commands) {
    console.log(`  ${command}`);
  }
}

export function printInitResult(result: InitResult): void {
  console.log(result.created ? "OpenPome is initialized." : "OpenPome is already initialized.");
  console.log("");
  console.log("Local files");
  console.log(`  Home:   ${result.homeDirectory}`);
  console.log(`  Config: ${result.configFile}`);
  console.log("");
  console.log("Next steps");
  console.log("  1. Let OpenPome check setup and guide the first run");
  console.log("     pome onboard");
  console.log("");
  console.log("  2. Check setup manually");
  console.log("     pome doctor");
  console.log("");
  console.log("  3. Pick assigned work and start");
  console.log("     pome work");
  console.log("     pome start <KEY>");
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
  console.log("OpenPome doctor");
  console.log(`Status: ${result.status}`);
  console.log("");

  console.log("Checks");
  for (const check of result.checks) {
    const marker = check.status === "ok" ? "[ok]" : "[needs]";
    console.log(`  ${marker.padEnd(7)} ${check.name}`);
    console.log(`          ${check.detail}`);
  }

  const nextSteps = getDoctorNextSteps(result);
  if (nextSteps.length > 0) {
    console.log("");
    console.log("Recommended next step");
    for (const step of nextSteps) {
      console.log(`  ${step}`);
    }
  }

  console.log("");
  console.log("Typical first task flow");
  console.log("  pome onboard");
  console.log("  pome work");
  console.log("  pome start <KEY>");
  console.log("  pome next");
  console.log("  pome approve");
  console.log("  pome done");
}

function getDoctorNextSteps(result: DoctorResult): string[] {
  const checks = new Map(result.checks.map((check) => [check.name, check]));
  const config = checks.get("Configuration");
  const source = checks.get("Work item source");
  const scope = checks.get("Work item scope");
  const reachability = checks.get("Jira reachability");

  if (config?.status === "attention") {
    return ["Run `pome init` to create local configuration, then run `pome doctor` again."];
  }

  if (source?.status === "attention") {
    return [
      "Run `pome onboard` to connect Jira, or `pome demo` to try sample work without connecting tools."
    ];
  }

  if (reachability?.status === "attention") {
    return ["Check Jira URL, credentials, VPN/network access, then run `pome doctor` again."];
  }

  if (scope?.status === "attention") {
    return ["Run `pome work`; OpenPome will auto-select the only available scope or show `pome use <SCOPE_ID>`."];
  }

  return ["Run `pome work` to see assigned work, then `pome start <KEY>`."];
}

export function printOnboardingGuide(
  result: DoctorResult,
  github?: GitHubAuthStatusResult,
  model?: ModelProviderStatusResult,
  assignedWork?: AssignedWorkResult
): void {
  const checks = new Map(result.checks.map((check) => [check.name, check]));
  const workSource = checks.get("Work item source");
  const scope = checks.get("Work item scope");
  const reachability = checks.get("Jira reachability");
  const jiraReady = workSource?.status === "ok" && reachability?.status === "ok";
  const scopeReady = jiraReady && scope?.status === "ok";
  const activeModel = model?.providers.find((provider) => provider.active);
  const allWorkItems = assignedWork ? flattenAssignedWork(assignedWork) : [];
  const workItems = allWorkItems.slice(0, 3);

  printOpenPomeBanner();
  console.log("");
  console.log("Start from a Jira story. OpenPome understands the repo, plans the work, asks approval, tests, and prepares delivery.");
  console.log("");

  console.log("Ready");
  printReadinessLine("Jira", jiraReady ? "connected" : "connect required", jiraReady ? "Assigned stories can be loaded." : "Run `pome auth jira token` once.");
  printReadinessLine("Scope", scopeReady ? "selected" : "automatic", scopeReady ? scope?.detail ?? "Work scope selected." : "OpenPome selects one board automatically or asks only when needed.");
  printReadinessLine("GitHub", github?.authenticated ? "connected" : "optional", github?.authenticated ? github.detail : "Needed only when creating PRs.");
  printReadinessLine("AI", activeModel?.provider === "manual-copy" ? "manual-copy" : "connected", activeModel?.detail ?? "Manual-copy mode is ready.");
  console.log("");

  if (!jiraReady) {
    console.log("Next");
    console.log("  pome auth jira token");
    console.log("");
    console.log("Try the product without connecting tools");
    console.log("  pome demo");
    return;
  }

  if (workItems.length > 0) {
    console.log("Assigned work");
    for (const item of workItems) {
      const priority = item.priority ? ` · ${item.priority}` : "";
      console.log(`  ${item.key.padEnd(10)} ${item.title}`);
      console.log(`             ${item.status}${priority}`);
    }
    if (allWorkItems.length > workItems.length) {
      console.log(`  ...and ${allWorkItems.length - workItems.length} more`);
    }
    console.log("");
    console.log("Start");
    console.log(`  pome start ${workItems[0]?.key ?? "<KEY>"}`);
    console.log("");
    console.log("See all");
    console.log("  pome work");
    return;
  }

  console.log("Assigned work");
  console.log("  No assigned stories found in the selected scope.");
  console.log("");
  console.log("Next");
  console.log("  pome work all");
  console.log("  pome work");
}

function printOpenPomeBanner(): void {
  console.log("  ___  ____  _____ _   _ ____   ___  __  __ _____");
  console.log(" / _ \\|  _ \\| ____| \\ | |  _ \\ / _ \\|  \\/  | ____|");
  console.log("| | | | |_) |  _| |  \\| | |_) | | | | |\\/| |  _|");
  console.log("| |_| |  __/| |___| |\\  |  __/| |_| | |  | | |___");
  console.log(" \\___/|_|   |_____|_| \\_|_|    \\___/|_|  |_|_____|");
  console.log("AI work assistant for developers");
}

function printReadinessLine(name: string, status: string, detail: string): void {
  console.log(`  ${name.padEnd(7)} ${status}`);
  console.log(`          ${detail}`);
}

export function printWorkSourceSetup(status: { readonly mode: string; readonly detail: string }): void {
  console.log("Jira is not connected yet.");
  console.log("");
  console.log(status.mode === "mock" ? "OpenPome needs Jira access before it can show your real assigned work." : status.detail);
  console.log("");
  printJiraSetupGuide();
}

export function printJiraSetupGuide(): void {
  console.log("Connect Jira");
  console.log("  pome auth jira token");
  console.log("");
  console.log("What you need");
  console.log("  1. Your Jira site URL, like https://your-company.atlassian.net");
  console.log("  2. Your Atlassian email");
  console.log("  3. A Jira API token from https://id.atlassian.com/manage-profile/security/api-tokens");
  console.log("");
  console.log("After connection");
  console.log("  pome work");
  console.log("");
  console.log("Browser login");
  console.log("  If your company provides an Atlassian OAuth app, set OPENPOME_JIRA_OAUTH_CLIENT_ID and run:");
  console.log("    pome auth jira login --listen");
  console.log("");
  console.log("Try without connecting tools");
  console.log("  pome demo");
}

export function printJiraApiTokenAuthResult(result: JiraApiTokenAuthResult): void {
  console.log("Jira connected");
  console.log("");
  console.log(`Site:  ${result.baseUrl}`);
  console.log(`Email: ${result.email}`);
  if (result.accountDisplayName || result.accountEmail) {
    console.log(`User:  ${result.accountDisplayName ?? result.accountEmail}`);
  }
  if (typeof result.accessibleBoardCount === "number") {
    console.log(`Boards: ${result.accessibleBoardCount}`);
  }
  console.log("");
  console.log(result.detail);
  if (result.boardAccessDetail) {
    console.log(result.boardAccessDetail);
  }
  console.log("");
  console.log("Next");
  console.log("  pome work");
}

export function printDemoWorkQueue(result: AssignedWorkResult): void {
  console.log("OpenPome demo");
  console.log("");
  console.log("This uses sample work so you can try the flow without connecting Jira.");
  console.log("");
  printWorkQueue(result);
}

export function printGitHubAuthLoginGuide(status: GitHubAuthStatusResult): void {
  console.log("GitHub connection");
  console.log("");
  if (status.authenticated) {
    console.log(status.detail);
    console.log("");
    console.log("Next");
    console.log("  pome work");
    return;
  }

  console.log("OpenPome can use native GitHub browser login when an OAuth client is configured.");
  console.log("");
  console.log("Native browser login:");
  console.log("  export OPENPOME_GITHUB_OAUTH_CLIENT_ID=...");
  console.log("  pome auth github login");
  console.log("");
  console.log("Fallback for alpha:");
  console.log("");
  if (!status.cliAvailable) {
    console.log("Install GitHub CLI first:");
    console.log("  https://cli.github.com/");
    console.log("");
  }
  console.log("Run:");
  console.log("  gh auth login -h github.com -p https -w");
  console.log("");
  console.log("Then verify:");
  console.log("  pome auth github status");
}

export function printGitHubDeviceLogin(login: GitHubDeviceLoginResult): void {
  console.log("GitHub browser login");
  console.log("");
  console.log(login.detail);
  console.log("");
  console.log("Open");
  console.log(`  ${login.verificationUri}`);
  console.log("");
  console.log("Enter code");
  console.log(`  ${login.userCode}`);
  console.log("");
  console.log(`Waiting for approval until ${login.expiresAt}...`);
}

export function printGitHubDeviceCompletion(completion: GitHubDeviceCompletionResult): void {
  console.log("");
  console.log("GitHub connected");
  console.log(`Status: ${completion.authenticated ? "connected" : "not connected"}`);
  if (completion.username) {
    console.log(`User:   ${completion.username}`);
  }
  console.log(`Detail: ${completion.detail}`);
  console.log("");
  console.log("Next");
  console.log("  pome onboard");
  console.log("  pome work");
}

export function printModelProviderStatus(result: ModelProviderStatusResult): void {
  console.log("AI providers");
  console.log("");

  for (const provider of result.providers) {
    const marker = provider.active ? "*" : " ";
    const status = provider.configured ? "connected" : "not connected";
    console.log(`${marker} ${provider.displayName}: ${status}`);
    console.log(`  ${provider.detail}`);
  }

  console.log("");
  console.log("Connect");
  console.log("  pome auth ai openai");
  console.log("  pome auth ai claude");
  console.log("  pome auth ai claude-cli");
}

export function printModelProviderAuthResult(result: ModelProviderAuthResult): void {
  console.log(`${result.displayName} AI: ${result.configured ? "connected" : "not connected"}`);
  console.log(result.detail);
  console.log(`Config: ${result.configFile}`);
  console.log("");
  console.log("Next");
  console.log("  pome start <KEY>");
}

export function printWorkQueue(result: AssignedWorkResult): void {
  const items = flattenAssignedWork(result);

  console.log("Your assigned work");
  if (result.activeScope) {
    console.log(`Scope: ${result.activeScope.displayName}`);
    console.log("Showing Jira issues assigned to you in this scope.");
    console.log("Missing a new story? Run `pome work all` to ignore the scope filter once.");
  } else if (result.ignoredActiveScope) {
    console.log("Scope: all assigned Jira work");
    console.log(`Ignored saved scope for this run: ${result.ignoredActiveScope.displayName}`);
  } else if (result.sourceMode !== "mock") {
    console.log("Scope: all assigned Jira work");
  }
  console.log("");

  if (items.length === 0) {
    console.log("No assigned work found.");
    console.log("");
    console.log("Next");
    console.log("  Confirm the story is assigned to you.");
    console.log(result.activeScope ? "  Run `pome work all` to check assigned work outside this scope." : "  Check Jira status, project permissions, and board filters.");
    return;
  }

  for (const [index, item] of items.entries()) {
    const priority = item.priority ? ` · ${item.priority}` : "";
    console.log(`${String(index + 1).padStart(2)}. ${item.key.padEnd(10)} ${item.title}`);
    console.log(`    ${item.status}${priority}`);
  }

  console.log("");
  console.log("Start");
  console.log(result.sourceMode === "mock" ? "  pome demo start <KEY>" : "  pome start <KEY>");
}

export function printScopeSetup(result: WorkItemScopeListResult): void {
  console.log("I found multiple work scopes.");
  console.log("");
  console.log("Choose where OpenPome should look for your assigned work:");
  console.log("");

  if (result.scopes.length === 0) {
    console.log("No work scopes were found.");
    console.log("");
    console.log("Next");
    console.log("  Check Jira access, board permissions, and VPN/network connection.");
    console.log("  pome doctor");
    return;
  }

  for (const scope of result.scopes) {
    console.log(`  ${scope.scopeId.padEnd(8)} ${scope.displayName}`);
  }

  console.log("");
  console.log("Run");
  console.log(`  pome use ${result.scopes[0]?.scopeId ?? "<SCOPE_ID>"}`);
}

export function printTaskIntelligenceReport(start: TaskSessionStartResult, plan?: TaskSessionPlanResult): void {
  const intelligence = start.intelligence;
  console.log(`${start.workItem.key} - ${start.workItem.title}`);
  console.log("");
  console.log(intelligence.summary);
  console.log("");

  console.log("Story");
  console.log(`  Type:   ${start.workItem.type}`);
  console.log(`  Status: ${start.workItem.status}`);
  if (start.workItem.priority) {
    console.log(`  Risk signal: priority ${start.workItem.priority}`);
  }

  if (start.workspaceCandidate) {
    const reasons = start.workspaceCandidate.reasons.slice(0, 4);
    console.log("Codebase");
    console.log(`  ${start.workspaceCandidate.workspace.name}`);
    if (start.workspaceCandidate.workspace.path) {
      console.log(`  ${start.workspaceCandidate.workspace.path}`);
    }
    if (reasons.length > 0) {
      console.log("");
      console.log("Why this codebase");
      for (const reason of reasons) {
        console.log(`  - ${reason}`);
      }
    }
    if (start.repositoryKnowledge) {
      console.log("");
      printRepositoryKnowledgeSummary(start.repositoryKnowledge);
    }
  } else {
    console.log("Codebase");
    console.log("  I could not find a repo for this story yet.");
    console.log("");
    console.log("Next");
    console.log("  Open a repo and run `pome start <KEY>` again, or run `pome workspace link <KEY> <PATH>` once.");
  }

  printCompactList("Acceptance criteria", intelligence.acceptanceCriteria);
  printCompactList("Questions", intelligence.missingQuestions);
  printFileHintList("Likely files", intelligence.likelyFiles);
  printReferenceList("Linked references", intelligence.linkedReferences);
  printCompactList("Dependencies", intelligence.dependencies);
  printCompactList("Test strategy", intelligence.testStrategy);
  printCompactList("Delivery checklist", intelligence.deliveryChecklist);

  if (plan) {
    console.log("");
    console.log("Plan");
    for (const [index, step] of plan.plan.steps.entries()) {
      console.log(`  ${index + 1}. ${step.title}`);
      if (step.detail) {
        console.log(`     ${step.detail}`);
      }
    }
    printCompactList("Likely files", plan.plan.filesLikelyChanged);
    printCompactList("Checks", plan.plan.commandsToRun);
    printCompactList("Missing context", plan.plan.missingInfo);
    printCompactList("Risk", [...intelligence.risks, ...plan.plan.risks]);
  } else {
    printCompactList("Risk", intelligence.risks);
  }

  console.log("");
  console.log("Next");
  console.log("  pome approve");
  console.log("  pome next");
}

export function printAssistantNext(result: TaskSessionStatusResult, blockedReason?: string): void {
  console.log("OpenPome next");
  console.log("");

  if (!result.active || !result.session || !result.workItem) {
    console.log("No active story.");
    console.log("");
    console.log("Next");
    console.log("  pome work");
    console.log("  pome start <KEY>");
    return;
  }

  console.log(`${result.workItem.key} ${result.workItem.title}`);
  console.log(`Status: ${result.session.status}`);
  console.log("");

  if (blockedReason) {
    console.log("AI implementation is not ready");
    console.log(`  ${blockedReason}`);
    console.log("");
    console.log("Run");
    console.log("  pome auth ai openai");
    console.log("  pome auth ai claude");
    console.log("  pome auth ai claude-cli");
    return;
  }

  const recommendation = getNextRecommendation(result);
  console.log("Recommended action");
  console.log(`  ${recommendation.detail}`);
  console.log("");
  console.log("Run");
  for (const command of recommendation.commands) {
    console.log(`  ${command}`);
  }
}

export function printAIPatchProposal(result: AIPatchProposalResult): void {
  if (!result.active || !result.session || !result.proposal) {
    console.log("No active story.");
    console.log("");
    console.log("Next");
    console.log("  pome work");
    console.log("  pome start <KEY>");
    return;
  }

  console.log(`AI proposed changes for ${result.session.workItemKey}`);
  console.log("");
  console.log(result.proposal.summary);
  console.log("");
  console.log("Files");
  for (const file of result.proposal.files) {
    console.log(`  - ${file.action} ${file.path}`);
  }
  printCompactList("Risk", result.proposal.risks);
  console.log("");
  console.log("Next");
  console.log("  Review the file list above.");
  console.log("  pome approve");
}

export function printAIPatchApplyResult(result: AIPatchApplyResult | undefined): void {
  if (!result?.active || !result.session || !result.proposal) {
    console.log("No active story.");
    console.log("");
    console.log("Next");
    console.log("  pome work");
    console.log("  pome start <KEY>");
    return;
  }

  console.log(`Applied AI changes for ${result.session.workItemKey}`);
  console.log("");
  console.log("Files");
  for (const file of result.proposal.files) {
    console.log(`  - ${file.path}`);
  }

  if (result.summary?.files.length) {
    console.log("");
    console.log("Diff summary");
    for (const file of result.summary.files.slice(0, 10)) {
      const stats = file.added !== undefined || file.deleted !== undefined ? ` +${file.added ?? 0} -${file.deleted ?? 0}` : "";
      console.log(`  - ${file.status} ${file.path}${stats}`);
    }
  }

  console.log("");
  console.log("Next");
  console.log(`  ${result.nextStep ?? "Run `pome test discover`, then `pome done`."}`);
}

export function printDoneSummary(prDraft: PullRequestDraftResult, updateDraft: WorkItemUpdateDraftResult): void {
  if (!prDraft.active || !prDraft.session || !prDraft.draft || !updateDraft.draft) {
    console.log("No active story.");
    console.log("");
    console.log("Next");
    console.log("  pome work");
    console.log("  pome start <KEY>");
    return;
  }

  console.log(`Ready to finish ${prDraft.session.workItemKey}`);
  console.log("");
  console.log("PR draft");
  console.log(`  ${prDraft.draft.title}`);
  console.log("");
  console.log("Jira update draft");
  for (const line of updateDraft.draft.body.split(/\r?\n/).slice(0, 8)) {
    console.log(`  ${line}`);
  }
  console.log("");
  console.log("Next");
  console.log("  Review with `pome pr draft` and `pome work-item update-draft`.");
  console.log("  Create external updates only when ready:");
  console.log("  pome pr create");
  console.log("  pome work-item post-update");
}

export function printJiraOAuthLogin(login: OAuthLoginResult): void {
  console.log("Jira browser login");
  console.log("Status: experimental until a real Atlassian OAuth app smoke test is completed.");
  console.log("");
  console.log("Before running this, configure an Atlassian OAuth 2.0 app:");
  console.log("  OPENPOME_JIRA_OAUTH_CLIENT_ID");
  console.log("  OPENPOME_JIRA_OAUTH_CLIENT_SECRET");
  console.log("  OPENPOME_JIRA_OAUTH_REDIRECT_URI");
  console.log("");
  console.log(`Redirect URI: ${login.redirectUri}`);
  console.log(`Scopes:       ${login.scopes.join(", ")}`);
  console.log(`State:        ${login.state}`);
  console.log("");
  console.log("Open this URL in your browser:");
  console.log(login.authorizationUrl);
  console.log("");
  console.log("Next");
  console.log(`  ${login.nextStep}`);
  console.log("");
  console.log("For the localhost browser flow, run:");
  console.log("  pome auth jira login --listen");
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
  console.log("Use `pome use <SCOPE_ID>` to select the scope for assigned work.");
}

export function printWorkItemScopeSelection(result: WorkItemScopeUseResult): void {
  console.log(`Selected work scope: ${result.activeScope.displayName} (${result.activeScope.scopeId})`);
  console.log(`Source: ${result.sourceDisplayName}`);
  console.log(`Config: ${result.configFile}`);
  console.log("");
  console.log("Next");
  console.log("  pome work");
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
    if (result.repositoryKnowledge) {
      console.log("");
      printRepositoryKnowledgeSummary(result.repositoryKnowledge);
    }
  } else {
    console.log("");
    console.log("Workspace: unresolved");
    console.log("Run `pome workspace resolve <KEY>` or `pome workspace link <KEY> <PATH>`.");
  }

  console.log("");
  printCompactList("Acceptance criteria", result.intelligence.acceptanceCriteria);
  printCompactList("Questions", result.intelligence.missingQuestions);
  printFileHintList("Likely files", result.intelligence.likelyFiles);
  printCompactList("Test strategy", result.intelligence.testStrategy);
  printCompactList("Risk", result.intelligence.risks);

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
  console.log("");
  console.log("What happens next");
  console.log("  1. Run `pome next`.");
  console.log("  2. OpenPome asks the active AI provider for the smallest safe patch.");
  console.log("  3. OpenPome validates the patch path and sensitive-file rules.");
  console.log("  4. You run `pome approve` again before OpenPome writes files.");
  console.log("");
  console.log("Codebase rule");
  console.log("  OpenPome writes only inside the selected codebase for this story.");
  console.log("  If the codebase is wrong, run `pome stop`, move to the correct repo, then start the story again.");
  console.log("");
  console.log("Run");
  console.log("  pome next");
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
  if (result.databaseFile) {
    console.log(`SQLite:  ${result.databaseFile}`);
  }
}

export function printTaskSessionHistory(result: TaskSessionHistoryListResult): void {
  console.log("Task session history");
  console.log(`SQLite:  ${result.databaseFile}`);
  console.log(`History: ${result.historyFile}`);
  console.log("");

  if (result.sessions.length === 0) {
    console.log("No task sessions recorded yet.");
    console.log("Start with `pome work`, then `pome start <KEY>`.");
    return;
  }

  for (const session of result.sessions) {
    console.log(`${session.active ? "*" : " "} ${session.sessionId}`);
    console.log(`  ${session.workItemKey} ${session.workItemTitle}`);
    console.log(`  Status: ${session.status} · Updated: ${session.updatedAt}`);
    if (session.workspaceName || session.workspacePath) {
      console.log(`  Codebase: ${session.workspaceName ?? "workspace"}${session.workspacePath ? ` (${session.workspacePath})` : ""}`);
    }
    if (session.latestEventTitle) {
      console.log(`  Last event: ${session.latestEventTitle}${session.latestEventAt ? ` at ${session.latestEventAt}` : ""}`);
    }
    if (session.latestTestStatus) {
      console.log(`  Test: ${session.latestTestStatus}${session.latestTestCommand ? ` · ${session.latestTestCommand}` : ""}`);
    }
    if (session.latestPatchAppliedAt) {
      console.log(`  Patch: applied at ${session.latestPatchAppliedAt}`);
    }
    if (session.prUrl) {
      console.log(`  PR: ${session.prUrl}`);
    }
    if (session.jiraCommentId) {
      console.log(`  Jira update: ${session.jiraCommentId}`);
    }
    console.log(`  Resume: pome resume ${session.sessionId}`);
    console.log("");
  }
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
  console.log(`CLI auth:       ${result.cliAuthenticated ? "yes" : "no"}`);
  console.log(`OpenPome auth:  ${result.nativeAuthenticated ? "yes" : "no"}`);
  console.log(`Authenticated:  ${result.authenticated ? "yes" : "no"}`);
  console.log(`Token source:   ${result.tokenSource}`);
  if (result.username) {
    console.log(`User:           ${result.username}`);
  }
  console.log(`Detail:         ${result.detail}`);
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

export function printPullRequestCreateResult(result: PullRequestCreateResult): void {
  if (!result.active || !result.session) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`GitHub PR created for ${result.session.workItemKey}`);
  console.log("");
  console.log(`Branch: ${result.branch ?? "unknown"}`);
  console.log(`Draft:  ${result.draftPr ? "yes" : "no"}`);
  if (result.commitMessage) {
    console.log(`Commit: ${result.commitMessage}`);
  }
  if (result.prUrl) {
    console.log(`PR:     ${result.prUrl}`);
  }
  console.log(`Pushed: ${result.pushed ? "yes" : "no"}`);
  if (result.approval) {
    console.log(`Approval: ${result.approval.id}`);
  }
  console.log("");
  console.log("Next");
  console.log("  pome work-item post-update");
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

export function printWorkItemUpdatePostResult(result: WorkItemUpdatePostResult): void {
  if (!result.active || !result.session) {
    console.log("No active task session.");
    console.log(`File: ${result.sessionFile}`);
    return;
  }

  console.log(`Posted Jira update for ${result.workItem?.key ?? result.session.workItemKey}`);
  if (result.commentId) {
    console.log(`Comment: ${result.commentId}`);
  }
  if (result.url) {
    console.log(`URL:     ${result.url}`);
  }
  if (result.approval) {
    console.log(`Approval: ${result.approval.id}`);
  }
  console.log(`Posted: ${result.posted ? "yes" : "no"}`);
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

function flattenAssignedWork(result: AssignedWorkResult): WorkItem[] {
  const order: readonly WorkItemType[] = ["story", "bug", "task", "subtask", "epic"];
  return order.flatMap((type) => [...result.groups[type]]);
}

function getNextRecommendation(result: TaskSessionStatusResult): { readonly detail: string; readonly commands: readonly string[] } {
  if (!result.plan) {
    return {
      detail: "Create the implementation plan for this work item.",
      commands: ["pome plan"]
    };
  }

  if (result.planApproval?.status !== "approved") {
    return {
      detail: "Review and approve the plan before implementation work continues.",
      commands: ["pome approve"]
    };
  }

  if (result.aiPatchProposal && !result.aiPatchProposal.appliedAt) {
    return {
      detail: "Review and approve the AI-proposed file changes.",
      commands: ["pome approve"]
    };
  }

  if (!result.aiPatchProposal && !result.diffSummary) {
    return {
      detail: "Ask the connected AI provider to propose the smallest safe file changes.",
      commands: ["pome next"]
    };
  }

  if (!result.aiContext && !result.aiPatchProposal) {
    return {
      detail: "Prepare safe AI context for Claude, ChatGPT, Codex, or another model.",
      commands: ["pome ai context"]
    };
  }

  if (!result.diffSummary) {
    return {
      detail: "Capture a diff summary after making the local code changes.",
      commands: ["pome diff"]
    };
  }

  if ((result.testCommandCandidates?.length ?? 0) === 0) {
    return {
      detail: "Discover the most likely validation or test commands for this workspace.",
      commands: ["pome test discover"]
    };
  }

  if ((result.commandApprovalEvidence?.length ?? 0) === 0) {
    return {
      detail: "Approve one discovered test command before OpenPome runs it.",
      commands: ["pome approve"]
    };
  }

  if ((result.testRunEvidence?.length ?? 0) === 0) {
    return {
      detail: "Run the approved test command and store evidence.",
      commands: ["pome next"]
    };
  }

  const latestRunAfterPatch = getLatestTestRunAfter(result, result.aiPatchProposal?.appliedAt);
  if (!latestRunAfterPatch && result.aiPatchProposal?.appliedAt && (result.commandApprovalEvidence?.length ?? 0) > 0) {
    return {
      detail: "Run the approved test command after the latest approved AI changes.",
      commands: ["pome next"]
    };
  }

  if (latestRunAfterPatch?.status === "failed") {
    return {
      detail: "The latest approved test failed. Ask the AI provider for a focused fix patch before finishing.",
      commands: ["pome next"]
    };
  }

  if (!result.prDraft || !result.workItemUpdateDraft) {
    return {
      detail: "Prepare PR and work-item update drafts.",
      commands: ["pome done"]
    };
  }

  if (!result.prCreation) {
    return {
      detail: "Create the GitHub PR when the branch, commit, and PR body are ready.",
      commands: ["pome pr create"]
    };
  }

  if (!result.workItemUpdatePost) {
    return {
      detail: "Post the prepared Jira update when the PR and validation evidence are ready.",
      commands: ["pome work-item post-update"]
    };
  }

  return {
    detail: "External completion artifacts are created. Review Jira and GitHub for final team workflow.",
    commands: ["pome status"]
  };
}

function getLatestTestRunAfter(result: TaskSessionStatusResult, since: string | undefined): NonNullable<TaskSessionStatusResult["testRunEvidence"]>[number] | undefined {
  const runs = result.testRunEvidence ?? [];
  const filtered = since ? runs.filter((run) => run.finishedAt >= since) : runs;
  return filtered[filtered.length - 1];
}

function printCompactList(label: string, values: readonly string[]): void {
  if (values.length === 0) {
    return;
  }

  console.log("");
  console.log(label);
  for (const value of values.slice(0, 5)) {
    console.log(`  - ${value}`);
  }
}

function printFileHintList(label: string, values: NonNullable<TaskSessionStartResult["intelligence"]>["likelyFiles"]): void {
  if (values.length === 0) {
    return;
  }

  console.log("");
  console.log(label);
  for (const value of values.slice(0, 6)) {
    console.log(`  - ${value.path}`);
    console.log(`    ${value.reason}`);
  }
}

function printRepositoryKnowledgeSummary(knowledge: NonNullable<TaskSessionStartResult["repositoryKnowledge"]>): void {
  console.log("Repository knowledge");
  console.log(`  ${knowledge.pathMap.source.length} source · ${knowledge.pathMap.tests.length} tests · ${knowledge.pathMap.config.length} config`);
  if (knowledge.moduleBoundaries.length > 0) {
    console.log(`  Modules: ${knowledge.moduleBoundaries.slice(0, 4).map((boundary) => boundary.path).join(", ")}`);
  }
  if (knowledge.packageMap.validateCommands.length > 0) {
    console.log(`  Validate: ${knowledge.packageMap.validateCommands[0]}`);
  } else if (knowledge.packageMap.testCommands.length > 0) {
    console.log(`  Test: ${knowledge.packageMap.testCommands[0]}`);
  }
}

function printReferenceList(label: string, values: NonNullable<TaskSessionStartResult["intelligence"]>["linkedReferences"]): void {
  if (values.length === 0) {
    return;
  }

  console.log("");
  console.log(label);
  for (const value of values.slice(0, 5)) {
    console.log(`  - ${value.kind}: ${value.title}`);
    console.log(`    ${value.url}`);
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
