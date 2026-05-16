import { createHash, randomBytes, randomUUID } from "node:crypto";
import { exec, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { mkdir, opendir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { defaultConfig, type OpenPomeConfig, type WorkItemScopeConfig } from "@openpome/configuration";
import { createCredentialStore, getJsonCredential, setJsonCredential } from "@openpome/credentials";
import type { ApprovalRequest } from "@openpome/approvals";
import { groupWorkItemsByType, type WorkItem, type WorkItemType } from "@openpome/work-items";
import type { ImplementationPlan } from "@openpome/execution-plans";
import { buildPlanningPrompt } from "@openpome/prompt-engine";
import type { AITaskSession, TaskSessionEvent, TaskSessionEventType } from "@openpome/task-sessions";
import {
  rankWorkspaceCandidates,
  type LearnedWorkspaceLink,
  type Workspace,
  type WorkspaceCandidate,
  type WorkspaceIndex,
  type WorkspaceLinkIndex
} from "@openpome/workspaces";
import {
  createDefaultWorkItemSourceRegistry,
  createJiraCloudOAuthLogin,
  exchangeJiraCloudOAuthCode,
  refreshJiraCloudOAuthToken,
  type JiraCloudOAuthTokenSet,
  type WorkItemSourceAdapter
} from "./connectors/work-item-registry.js";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface GatewayHealth {
  readonly status: "ok";
  readonly version: string;
}

export interface InitResult {
  readonly created: boolean;
  readonly homeDirectory: string;
  readonly configFile: string;
}

export interface ConfigPathResult {
  readonly homeDirectory: string;
  readonly configFile: string;
  readonly workspaceIndexFile: string;
  readonly workspaceLinksFile: string;
  readonly activeTaskSessionFile: string;
  readonly taskSessionHistoryFile: string;
}

export interface ConfigShowResult {
  readonly exists: boolean;
  readonly configFile: string;
  readonly config: OpenPomeConfig;
}

export interface ConfigResetResult {
  readonly configFile: string;
  readonly config: OpenPomeConfig;
  readonly resetAt: string;
}

export interface DoctorResult {
  readonly status: "ok" | "attention";
  readonly checks: readonly DoctorCheck[];
}

export interface DoctorCheck {
  readonly name: string;
  readonly status: "ok" | "attention";
  readonly detail: string;
}

export interface AssignedWorkResult {
  readonly sourceId: string;
  readonly sourceDisplayName: string;
  readonly sourceMode: "live" | "mock";
  readonly activeScope?: WorkItemScopeConfig;
  readonly groups: Readonly<Record<WorkItemType, readonly WorkItem[]>>;
}

export interface WorkItemScopeListResult {
  readonly sourceId: string;
  readonly sourceDisplayName: string;
  readonly sourceMode: "live" | "mock";
  readonly activeScope?: WorkItemScopeConfig;
  readonly scopes: readonly WorkItemScopeConfig[];
}

export interface WorkItemScopeUseResult {
  readonly sourceId: string;
  readonly sourceDisplayName: string;
  readonly activeScope: WorkItemScopeConfig;
  readonly configFile: string;
}

export interface JiraBoardListResult {
  readonly provider: "jira-cloud";
  readonly sourceMode: "live" | "mock";
  readonly activeScope?: WorkItemScopeConfig;
  readonly boards: readonly WorkItemScopeConfig[];
}

export interface JiraBoardUseResult {
  readonly provider: "jira-cloud";
  readonly activeScope: WorkItemScopeConfig;
  readonly configFile: string;
}

export interface AuthStatusResult {
  readonly provider: "jira-cloud";
  readonly mode: string;
  readonly configured: boolean;
  readonly detail: string;
  readonly expiresAt?: string;
  readonly refreshAvailable?: boolean;
}

export interface OAuthLoginResult {
  readonly provider: "jira-cloud";
  readonly authorizationUrl: string;
  readonly redirectUri: string;
  readonly state: string;
  readonly scopes: readonly string[];
  readonly nextStep: string;
}

export interface OAuthCompletionResult {
  readonly provider: "jira-cloud";
  readonly stored: boolean;
  readonly mode: "oauth-3lo";
  readonly cloudId?: string;
  readonly siteUrl?: string;
  readonly detail: string;
}

export interface WorkspaceScanResult {
  readonly indexFile: string;
  readonly scannedAt: string;
  readonly scanPaths: readonly string[];
  readonly workspaces: readonly Workspace[];
}

export interface WorkspaceListResult {
  readonly indexFile: string;
  readonly scannedAt?: string;
  readonly workspaces: readonly Workspace[];
}

export interface WorkspaceResolveResult {
  readonly workItem: WorkItem;
  readonly indexFile: string;
  readonly candidates: readonly WorkspaceCandidate[];
}

export interface WorkspaceLinkResult {
  readonly workItemKey: string;
  readonly workspace: Workspace;
  readonly link: LearnedWorkspaceLink;
  readonly indexFile: string;
  readonly linksFile: string;
}

export interface TaskSessionStartResult {
  readonly session: AITaskSession;
  readonly workItem: WorkItem;
  readonly workspaceCandidate?: WorkspaceCandidate;
  readonly sessionFile: string;
}

export interface TaskSessionStatusResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly workItem?: WorkItem;
  readonly workspaceCandidate?: WorkspaceCandidate;
  readonly plan?: ImplementationPlan;
  readonly planApproval?: ApprovalRequest;
  readonly events?: readonly TaskSessionEvent[];
  readonly approvalHistory?: readonly ApprovalRequest[];
}

export interface TaskSessionPlanResult {
  readonly session: AITaskSession;
  readonly workItem: WorkItem;
  readonly workspaceCandidate?: WorkspaceCandidate;
  readonly plan: ImplementationPlan;
  readonly prompt: string;
  readonly sessionFile: string;
}

export interface TaskSessionApprovalResult {
  readonly session: AITaskSession;
  readonly workItem: WorkItem;
  readonly approval: ApprovalRequest;
  readonly sessionFile: string;
  readonly nextStep: string;
}

export interface TaskSessionTimelineResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly events: readonly TaskSessionEvent[];
}

export interface TaskSessionApprovalHistoryResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly approvals: readonly ApprovalRequest[];
}

export interface TaskSessionLifecycleResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly historyFile: string;
  readonly session?: AITaskSession;
  readonly message: string;
}

export interface TestCommandCandidate {
  readonly id: string;
  readonly command: string;
  readonly source: "package_json" | "package_manager" | "fallback";
  readonly reason: string;
  readonly cwd?: string;
}

export interface TestCommandDiscoveryResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly workspace?: Workspace;
  readonly candidates: readonly TestCommandCandidate[];
  readonly discoveredAt?: string;
  readonly nextStep: string;
}

export interface CommandApprovalEvidence {
  readonly id: string;
  readonly command: string;
  readonly cwd?: string;
  readonly approvedAt: string;
  readonly approval: ApprovalRequest;
}

export interface TestCommandHistoryResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly evidence: readonly CommandApprovalEvidence[];
  readonly runs: readonly TestRunEvidence[];
}

export interface TestRunEvidence {
  readonly id: string;
  readonly command: string;
  readonly cwd?: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly exitCode: number;
  readonly status: "passed" | "failed";
  readonly stdoutSummary: readonly string[];
  readonly stderrSummary: readonly string[];
  readonly approvalId: string;
}

export interface PullRequestDraft {
  readonly title: string;
  readonly body: string;
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly remoteUrl?: string;
  readonly createdAt: string;
}

export interface PullRequestDraftResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly draft?: PullRequestDraft;
}

export interface WorkItemUpdateDraft {
  readonly body: string;
  readonly createdAt: string;
}

export interface WorkItemUpdateDraftResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly workItem?: WorkItem;
  readonly draft?: WorkItemUpdateDraft;
}

export interface ManualCopyAIContext {
  readonly createdAt: string;
  readonly provider: "manual-copy";
  readonly includesSourceCode: false;
  readonly includesFullDiff: false;
  readonly text: string;
}

export interface ManualCopyAIContextResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly context?: ManualCopyAIContext;
}

export interface ManualCopyAIPromptResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly prompt?: string;
}

export interface DiffFileSummary {
  readonly path: string;
  readonly status: string;
  readonly added?: number;
  readonly deleted?: number;
}

export interface DiffSummary {
  readonly createdAt: string;
  readonly workspacePath?: string;
  readonly branch?: string;
  readonly files: readonly DiffFileSummary[];
  readonly statusLines: readonly string[];
  readonly includesFullDiff: false;
}

export interface DiffSummaryResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly summary?: DiffSummary;
}

export interface GitHubAuthStatusResult {
  readonly provider: "github";
  readonly cliAvailable: boolean;
  readonly authenticated: boolean;
  readonly detail: string;
}

export interface ExternalActionGuardResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly action: "create_pr" | "update_work_item";
  readonly allowed: false;
  readonly detail: string;
  readonly nextStep: string;
}

interface PersistedTaskSession {
  readonly version: 1;
  readonly session: AITaskSession;
  readonly workItem: WorkItem;
  readonly workspaceCandidate?: WorkspaceCandidate;
  readonly plan?: ImplementationPlan;
  readonly planningPrompt?: string;
  readonly planApproval?: ApprovalRequest;
  readonly events?: readonly TaskSessionEvent[];
  readonly approvalHistory?: readonly ApprovalRequest[];
  readonly testCommandCandidates?: readonly TestCommandCandidate[];
  readonly commandApprovalEvidence?: readonly CommandApprovalEvidence[];
  readonly testRunEvidence?: readonly TestRunEvidence[];
  readonly prDraft?: PullRequestDraft;
  readonly workItemUpdateDraft?: WorkItemUpdateDraft;
  readonly aiContext?: ManualCopyAIContext;
  readonly aiPrompt?: string;
  readonly diffSummary?: DiffSummary;
}

interface TaskSessionHistoryIndex {
  readonly indexVersion: 1;
  readonly updatedAt: string;
  readonly sessions: readonly PersistedTaskSession[];
}

const jiraOAuthCredentialAccount = "jira-cloud/oauth";
const workspaceIndexFileName = "workspace-index.json";
const workspaceLinksFileName = "workspace-links.json";
const activeTaskSessionFileName = "active-task-session.json";
const taskSessionHistoryFileName = "task-session-history.json";
const workItemSourceRegistry = createDefaultWorkItemSourceRegistry();
const skippedWorkspaceDirectoryNames = new Set([
  ".git",
  ".next",
  ".pnpm",
  ".turbo",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target"
]);
const defaultWorkspaceScanDepth = 4;
const maxWorkspaceScanRepositories = 200;

export function getGatewayHealth(): GatewayHealth {
  return {
    status: "ok",
    version: "0.16.0-alpha.0"
  };
}

export async function initOpenPome(): Promise<InitResult> {
  const paths = getOpenPomePaths();
  await mkdir(paths.homeDirectory, { recursive: true });

  const existingConfig = await readConfigIfPresent(paths.configFile);
  if (existingConfig) {
    return {
      created: false,
      ...paths
    };
  }

  await writeConfig(paths.configFile, defaultConfig);

  return {
    created: true,
    ...paths
  };
}

export async function getConfigPaths(): Promise<ConfigPathResult> {
  const paths = getOpenPomePaths();

  return {
    ...paths,
    workspaceIndexFile: getWorkspaceIndexFile(paths.homeDirectory),
    workspaceLinksFile: getWorkspaceLinksFile(paths.homeDirectory),
    activeTaskSessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    taskSessionHistoryFile: getTaskSessionHistoryFile(paths.homeDirectory)
  };
}

export async function showOpenPomeConfig(): Promise<ConfigShowResult> {
  const paths = getOpenPomePaths();
  const config = await readConfigIfPresent(paths.configFile);

  return {
    exists: Boolean(config),
    configFile: paths.configFile,
    config: config ?? defaultConfig
  };
}

export async function resetOpenPomeConfig(): Promise<ConfigResetResult> {
  const paths = getOpenPomePaths();
  const resetAt = new Date().toISOString();

  await writeConfig(paths.configFile, defaultConfig);

  return {
    configFile: paths.configFile,
    config: defaultConfig,
    resetAt
  };
}

export async function runDoctor(env: NodeJS.ProcessEnv = process.env): Promise<DoctorResult> {
  const paths = getOpenPomePaths();
  const config = await readConfigIfPresent(paths.configFile);
  const jiraSource = await createJiraSource(env);
  const authStatus = jiraSource.getAuthStatus();
  const reachability = await jiraSource.checkReachability();
  const credentialStore = createCredentialStore();

  const checks: DoctorCheck[] = [
    {
      name: "Local data directory",
      status: "ok",
      detail: paths.homeDirectory
    },
    {
      name: "Configuration",
      status: config ? "ok" : "attention",
      detail: config ? paths.configFile : "Run `pome init` to create local configuration."
    },
    {
      name: "Credential store",
      status: credentialStore.isAvailable() ? "ok" : "attention",
      detail: credentialStore.isAvailable()
        ? `${credentialStore.backend} is available.`
        : `${credentialStore.backend} is not available; OAuth token storage will not work.`
    },
    {
      name: "Work item source",
      status: authStatus.configured ? "ok" : "attention",
      detail: authStatus.detail
    },
    {
      name: "Work item scope",
      status: config?.activeWorkItemScope ? "ok" : "attention",
      detail: config?.activeWorkItemScope
        ? `${config.activeWorkItemScope.displayName} (${config.activeWorkItemScope.kind})`
        : "Run `pome work-item scopes` and `pome work-item scope use <SCOPE_ID>` to select a work item scope."
    },
    {
      name: "Jira reachability",
      status: reachability.status === "reachable" ? "ok" : "attention",
      detail: reachability.detail
    },
    {
      name: "Network mode",
      status: "ok",
      detail: "Supports public internet, VPN, and mixed VPN/non-VPN connectors. Reachability checks arrive with live connector commands."
    },
    {
      name: "Model provider",
      status: "ok",
      detail: "manual-copy"
    }
  ];

  return {
    status: checks.every((check) => check.status === "ok") ? "ok" : "attention",
    checks
  };
}

export async function listAssignedWork(env: NodeJS.ProcessEnv = process.env): Promise<AssignedWorkResult> {
  const source = await createJiraSource(env);
  const config = await readConfigIfPresent(getOpenPomePaths().configFile);
  const activeScope = getActiveJiraBoardScope(config);
  const items = await source.listAssigned(activeScope);

  return {
    sourceId: source.id,
    sourceDisplayName: source.displayName,
    sourceMode: source.getMode(),
    activeScope,
    groups: groupWorkItemsByType(items)
  };
}

export async function showWorkItem(key: string, env: NodeJS.ProcessEnv = process.env): Promise<WorkItem | undefined> {
  const source = await createJiraSource(env);
  return source.getWorkItem(key);
}

export async function listWorkItemScopes(env: NodeJS.ProcessEnv = process.env): Promise<WorkItemScopeListResult> {
  const source = await createJiraSource(env);
  const config = await readConfigIfPresent(getOpenPomePaths().configFile);

  return {
    sourceId: source.id,
    sourceDisplayName: source.displayName,
    sourceMode: source.getMode(),
    activeScope: getActiveJiraBoardScope(config),
    scopes: await source.listScopes()
  };
}

export async function useWorkItemScope(scopeId: string, env: NodeJS.ProcessEnv = process.env): Promise<WorkItemScopeUseResult | undefined> {
  const normalizedScopeId = scopeId.trim();
  if (!normalizedScopeId) {
    throw new Error("Work item scope id is required.");
  }

  const source = await createJiraSource(env);
  const scope = (await source.listScopes()).find((candidate) => candidate.scopeId === normalizedScopeId);

  if (!scope) {
    return undefined;
  }

  const paths = getOpenPomePaths();
  const existingConfig = await readConfigIfPresent(paths.configFile);
  const config: OpenPomeConfig = {
    ...defaultConfig,
    ...existingConfig,
    activeWorkItemSource: source.id,
    activeWorkItemScope: scope
  };

  await writeConfig(paths.configFile, config);

  return {
    sourceId: source.id,
    sourceDisplayName: source.displayName,
    activeScope: scope,
    configFile: paths.configFile
  };
}

export async function listJiraBoards(env: NodeJS.ProcessEnv = process.env): Promise<JiraBoardListResult> {
  const result = await listWorkItemScopes(env);

  return {
    provider: "jira-cloud",
    sourceMode: result.sourceMode,
    activeScope: result.activeScope,
    boards: result.scopes.filter((scope) => scope.providerId === "jira-cloud" && scope.kind === "board")
  };
}

export async function useJiraBoard(boardId: string, env: NodeJS.ProcessEnv = process.env): Promise<JiraBoardUseResult | undefined> {
  const result = await useWorkItemScope(boardId, env);

  if (!result || result.activeScope.providerId !== "jira-cloud" || result.activeScope.kind !== "board") {
    return undefined;
  }

  return {
    provider: "jira-cloud",
    activeScope: result.activeScope,
    configFile: result.configFile
  };
}

export async function scanWorkspaces(env: NodeJS.ProcessEnv = process.env): Promise<WorkspaceScanResult> {
  const paths = getOpenPomePaths();
  const config = await readConfigIfPresent(paths.configFile);
  const scanPaths = getWorkspaceScanPaths(config, env);
  const scannedAt = new Date().toISOString();
  const workspaces = await findGitWorkspaces(scanPaths, scannedAt);
  const index: WorkspaceIndex = {
    indexVersion: 1,
    scannedAt,
    scanPaths,
    workspaces
  };

  await mkdir(paths.homeDirectory, { recursive: true });
  await writeFile(getWorkspaceIndexFile(paths.homeDirectory), `${JSON.stringify(index, null, 2)}\n`, "utf8");

  return {
    indexFile: getWorkspaceIndexFile(paths.homeDirectory),
    scannedAt,
    scanPaths,
    workspaces
  };
}

export async function listWorkspaces(): Promise<WorkspaceListResult> {
  const paths = getOpenPomePaths();
  const index = await readWorkspaceIndexIfPresent(paths.homeDirectory);

  return {
    indexFile: getWorkspaceIndexFile(paths.homeDirectory),
    scannedAt: index?.scannedAt,
    workspaces: index?.workspaces ?? []
  };
}

export async function resolveWorkspaceForWorkItem(
  key: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceResolveResult | undefined> {
  const workItem = await showWorkItem(key, env);

  if (!workItem) {
    return undefined;
  }

  const paths = getOpenPomePaths();
  const existingIndex = await readWorkspaceIndexIfPresent(paths.homeDirectory);
  const linkIndex = await readWorkspaceLinkIndexIfPresent(paths.homeDirectory);
  const index = existingIndex ?? (await scanWorkspaces(env));
  const candidates = rankWorkspaceCandidates({
    workItemKey: workItem.key,
    workItemTitle: workItem.title,
    labels: workItem.labels,
    components: workItem.components,
    linkedCodeUrls: workItem.links?.filter((link) => link.kind === "code").map((link) => link.url),
    workspaces: index.workspaces,
    learnedLinks: linkIndex?.links
  });

  return {
    workItem,
    indexFile: getWorkspaceIndexFile(paths.homeDirectory),
    candidates
  };
}

export async function linkWorkspaceToWorkItem(
  key: string,
  workspacePath: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceLinkResult | undefined> {
  const workItem = await showWorkItem(key, env);

  if (!workItem) {
    return undefined;
  }

  const paths = getOpenPomePaths();
  const now = new Date().toISOString();
  const resolvedWorkspacePath = resolveWorkspacePath(workspacePath, env);

  if (!existsSync(join(resolvedWorkspacePath, ".git"))) {
    throw new Error(`Workspace path is not a Git repository: ${resolvedWorkspacePath}`);
  }

  const workspace = await readGitWorkspace(resolvedWorkspacePath, now);
  const existingIndex = await readWorkspaceIndexIfPresent(paths.homeDirectory);
  const workspaces = upsertWorkspace(existingIndex?.workspaces ?? [], workspace);
  const index: WorkspaceIndex = {
    indexVersion: 1,
    scannedAt: existingIndex?.scannedAt ?? now,
    scanPaths: existingIndex?.scanPaths ?? [],
    workspaces
  };
  const existingLinkIndex = await readWorkspaceLinkIndexIfPresent(paths.homeDirectory);
  const link: LearnedWorkspaceLink = {
    source: "developer_confirmation",
    workItemPattern: workItem.key.toUpperCase(),
    workspaceId: workspace.id,
    confidence: 0.95,
    lastUsedAt: now
  };
  const linkIndex: WorkspaceLinkIndex = {
    indexVersion: 1,
    updatedAt: now,
    links: upsertWorkspaceLink(existingLinkIndex?.links ?? [], link)
  };

  await mkdir(paths.homeDirectory, { recursive: true });
  await writeFile(getWorkspaceIndexFile(paths.homeDirectory), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(getWorkspaceLinksFile(paths.homeDirectory), `${JSON.stringify(linkIndex, null, 2)}\n`, "utf8");

  return {
    workItemKey: workItem.key,
    workspace,
    link,
    indexFile: getWorkspaceIndexFile(paths.homeDirectory),
    linksFile: getWorkspaceLinksFile(paths.homeDirectory)
  };
}

export async function startTaskSession(
  key: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<TaskSessionStartResult | undefined> {
  const resolution = await resolveWorkspaceForWorkItem(key, env);

  if (!resolution) {
    return undefined;
  }

  const paths = getOpenPomePaths();
  const now = new Date().toISOString();
  const workspaceCandidate = resolution.candidates[0];
  const session: AITaskSession = {
    id: `task_${randomUUID()}`,
    workItemKey: resolution.workItem.key,
    status: "planning",
    automationLevel: 1,
    workspaceId: workspaceCandidate?.workspace.id,
    branchName: workspaceCandidate?.workspace.currentBranch,
    createdAt: now,
    updatedAt: now
  };
  const events = createSessionStartEvents(session, resolution.workItem, workspaceCandidate, now);

  await writeActiveTaskSession(paths.homeDirectory, {
    version: 1,
    session,
    workItem: resolution.workItem,
    workspaceCandidate,
    events,
    approvalHistory: []
  });

  return {
    session,
    workItem: resolution.workItem,
    workspaceCandidate,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
  };
}

export async function getTaskSessionStatus(): Promise<TaskSessionStatusResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    workItem: persisted.workItem,
    workspaceCandidate: persisted.workspaceCandidate,
    plan: persisted.plan,
    planApproval: persisted.planApproval,
    events: persisted.events ?? [],
    approvalHistory: persisted.approvalHistory ?? []
  };
}

export async function getTaskSessionTimeline(): Promise<TaskSessionTimelineResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  return {
    active: Boolean(persisted),
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted?.session,
    events: persisted?.events ?? []
  };
}

export async function getTaskSessionApprovalHistory(): Promise<TaskSessionApprovalHistoryResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  return {
    active: Boolean(persisted),
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted?.session,
    approvals: persisted?.approvalHistory ?? []
  };
}

export async function stopTaskSession(): Promise<TaskSessionLifecycleResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
      message: "No active task session to stop."
    };
  }

  const now = new Date().toISOString();
  const session: AITaskSession = {
    ...persisted.session,
    status: "completed",
    updatedAt: now
  };
  const stopped: PersistedTaskSession = {
    ...persisted,
    session,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "session_status_changed", "Session stopped", now, [
        "The active task session was closed by the developer."
      ], {
        status: session.status
      })
    ])
  };

  await archiveTaskSession(paths.homeDirectory, stopped);
  await removeActiveTaskSession(paths.homeDirectory);

  return {
    active: false,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
    session,
    message: "Stopped active task session and archived it locally."
  };
}

export async function resumeTaskSession(sessionId?: string): Promise<TaskSessionLifecycleResult> {
  const paths = getOpenPomePaths();
  const active = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (active) {
    return {
      active: true,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
      session: active.session,
      message: "Active task session is already available."
    };
  }

  const history = await readTaskSessionHistoryIfPresent(paths.homeDirectory);
  const archived = selectArchivedTaskSession(history?.sessions ?? [], sessionId);

  if (!archived) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
      message: sessionId ? `No archived task session found: ${sessionId}` : "No archived task session is available to resume."
    };
  }

  const now = new Date().toISOString();
  const session: AITaskSession = {
    ...archived.session,
    status: archived.session.status === "completed" ? "planning" : archived.session.status,
    updatedAt: now
  };
  const resumed: PersistedTaskSession = {
    ...archived,
    session,
    events: appendSessionEvents(archived.events, [
      createSessionEvent(session, archived.workItem.key, "session_status_changed", "Session resumed", now, [
        "The archived task session was restored as the active session."
      ], {
        status: session.status
      })
    ])
  };

  await writeActiveTaskSession(paths.homeDirectory, resumed);

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
    session,
    message: "Resumed archived task session."
  };
}

export async function resetTaskSession(): Promise<TaskSessionLifecycleResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
      message: "No active task session to reset."
    };
  }

  const now = new Date().toISOString();
  const session: AITaskSession = {
    ...persisted.session,
    status: "blocked",
    updatedAt: now
  };
  const reset: PersistedTaskSession = {
    ...persisted,
    session,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "session_status_changed", "Session reset", now, [
        "The active task session was reset and archived for recovery."
      ], {
        status: session.status
      })
    ])
  };

  await archiveTaskSession(paths.homeDirectory, reset);
  await removeActiveTaskSession(paths.homeDirectory);

  return {
    active: false,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    historyFile: getTaskSessionHistoryFile(paths.homeDirectory),
    session,
    message: "Reset active task session and archived it locally."
  };
}

export async function createTaskSessionPlan(): Promise<TaskSessionPlanResult | undefined> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  const prompt = buildPlanningPrompt({
    title: `${persisted.workItem.key} ${persisted.workItem.title}`,
    context: buildPlanningContext(persisted)
  });
  const plan = buildInitialImplementationPlan(persisted.workItem, persisted.workspaceCandidate);
  const now = new Date().toISOString();
  const session: AITaskSession = {
    ...persisted.session,
    status: "awaiting_approval",
    updatedAt: now
  };
  const approval = createPlanApproval(persisted, "pending", now, "Developer approval is required before implementation begins.");

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    session,
    plan,
    planningPrompt: prompt,
    planApproval: approval,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "plan_created", "Implementation plan created", now, [
        `Plan summary: ${plan.summary}`,
        `Commands proposed: ${plan.commandsToRun.join(", ")}`
      ]),
      createSessionEvent(session, persisted.workItem.key, "approval_requested", "Plan approval requested", now, [
        approval.reason,
        ...approval.details
      ], {
        approvalId: approval.id,
        approvalType: approval.type
      })
    ])
  });

  return {
    session,
    workItem: persisted.workItem,
    workspaceCandidate: persisted.workspaceCandidate,
    plan,
    prompt,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
  };
}

export async function approveTaskSessionPlan(): Promise<TaskSessionApprovalResult | undefined> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  if (!persisted.plan) {
    throw new Error("No plan is available to approve. Run `pome plan` first.");
  }

  const now = new Date().toISOString();
  const approval = createPlanApproval(persisted, "approved", now);
  const session: AITaskSession = {
    ...persisted.session,
    status: "implementing",
    updatedAt: now
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    session,
    planApproval: approval,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "approval_approved", "Plan approved", now, [
        approval.reason,
        ...approval.details
      ], {
        approvalId: approval.id,
        approvalType: approval.type
      }),
      createSessionEvent(session, persisted.workItem.key, "session_status_changed", "Session moved to implementing", now, [
        "The plan is approved. Later implementation actions still need their own checkpoints."
      ], {
        status: session.status
      })
    ])
  });

  return {
    session,
    workItem: persisted.workItem,
    approval,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    nextStep: "Implementation can begin. File edits, commands, branches, pushes, PRs, and work item updates still require explicit checkpoints."
  };
}

export async function rejectTaskSessionPlan(reason = "Plan rejected by developer."): Promise<TaskSessionApprovalResult | undefined> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  if (!persisted.plan) {
    throw new Error("No plan is available to reject. Run `pome plan` first.");
  }

  const now = new Date().toISOString();
  const approval = createPlanApproval(persisted, "rejected", now, reason);
  const session: AITaskSession = {
    ...persisted.session,
    status: "blocked",
    updatedAt: now
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    session,
    planApproval: approval,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "approval_rejected", "Plan rejected", now, [
        approval.reason,
        ...approval.details
      ], {
        approvalId: approval.id,
        approvalType: approval.type
      }),
      createSessionEvent(session, persisted.workItem.key, "session_status_changed", "Session blocked", now, [
        "The plan needs revision before implementation can continue."
      ], {
        status: session.status
      })
    ])
  });

  return {
    session,
    workItem: persisted.workItem,
    approval,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    nextStep: "Revise the work item context or workspace link, then run `pome plan` again."
  };
}

export async function discoverTestCommands(): Promise<TestCommandDiscoveryResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      candidates: [],
      nextStep: "Run `pome start <KEY>` first."
    };
  }

  const workspace = persisted.workspaceCandidate?.workspace;
  const discoveredAt = new Date().toISOString();
  const candidates = workspace?.path ? await discoverTestCommandCandidates(workspace.path) : getFallbackTestCommandCandidates();

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    testCommandCandidates: candidates,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "approval_requested", "Test command candidates discovered", discoveredAt, [
        `Candidates: ${candidates.map((candidate) => candidate.command).join(", ")}`,
        "Approve a command before running it in a later execution phase."
      ])
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    workspace,
    candidates,
    discoveredAt,
    nextStep: "Review commands, then run `pome approve command [COMMAND]` to record approval evidence."
  };
}

export async function approveTestCommand(command?: string): Promise<CommandApprovalEvidence | undefined> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  const candidates = persisted.testCommandCandidates?.length
    ? persisted.testCommandCandidates
    : persisted.workspaceCandidate?.workspace.path
      ? await discoverTestCommandCandidates(persisted.workspaceCandidate.workspace.path)
      : getFallbackTestCommandCandidates();
  const selected = selectTestCommandCandidate(candidates, command);

  if (!selected) {
    throw new Error(command ? `Test command was not discovered: ${command}` : "No test command candidate is available.");
  }

  const now = new Date().toISOString();
  const approval = createCommandApproval(persisted, selected, now);
  const evidence: CommandApprovalEvidence = {
    id: `evidence_${createHash("sha256").update(`${persisted.session.id}:${selected.command}:${now}`).digest("hex").slice(0, 12)}`,
    command: selected.command,
    cwd: selected.cwd,
    approvedAt: now,
    approval
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    testCommandCandidates: candidates,
    commandApprovalEvidence: [...(persisted.commandApprovalEvidence ?? []), evidence],
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "approval_approved", "Command approved", now, [
        `Command: ${selected.command}`,
        selected.cwd ? `Working directory: ${selected.cwd}` : "Working directory: unresolved",
        "This records approval evidence only; command execution is a later explicit step."
      ], {
        approvalId: approval.id,
        approvalType: approval.type,
        command: selected.command
      })
    ])
  });

  return evidence;
}

export async function getTestCommandHistory(): Promise<TestCommandHistoryResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  return {
    active: Boolean(persisted),
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted?.session,
    evidence: persisted?.commandApprovalEvidence ?? [],
    runs: persisted?.testRunEvidence ?? []
  };
}

export async function runApprovedTestCommand(command?: string): Promise<TestRunEvidence | undefined> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  const approvalEvidence = selectCommandApprovalEvidence(persisted.commandApprovalEvidence ?? [], command);
  if (!approvalEvidence) {
    throw new Error("No approved command evidence found. Run `pome test discover` and `pome approve command [COMMAND]` first.");
  }

  const startedAt = new Date().toISOString();
  const result = await executeApprovedCommand(approvalEvidence.command, approvalEvidence.cwd);
  const finishedAt = new Date().toISOString();
  const run: TestRunEvidence = {
    id: `testrun_${createHash("sha256").update(`${persisted.session.id}:${approvalEvidence.command}:${startedAt}`).digest("hex").slice(0, 12)}`,
    command: approvalEvidence.command,
    cwd: approvalEvidence.cwd,
    startedAt,
    finishedAt,
    exitCode: result.exitCode,
    status: result.exitCode === 0 ? "passed" : "failed",
    stdoutSummary: summarizeCommandOutput(result.stdout),
    stderrSummary: summarizeCommandOutput(result.stderr),
    approvalId: approvalEvidence.approval.id
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    testRunEvidence: [...(persisted.testRunEvidence ?? []), run],
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "session_status_changed", "Approved test command completed", finishedAt, [
        `Command: ${run.command}`,
        `Exit code: ${run.exitCode}`,
        `Status: ${run.status}`
      ], {
        command: run.command,
        exitCode: String(run.exitCode),
        approvalId: run.approvalId
      })
    ])
  });

  return run;
}

export async function createManualCopyAIContext(): Promise<ManualCopyAIContextResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  const createdAt = new Date().toISOString();
  const context: ManualCopyAIContext = {
    createdAt,
    provider: "manual-copy",
    includesSourceCode: false,
    includesFullDiff: false,
    text: buildManualCopyAIContextText(persisted, createdAt)
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    aiContext: context,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "session_status_changed", "Manual-copy AI context prepared", createdAt, [
        "Context excludes source code, secrets, and full diffs.",
        "Developer must review before copying into an external AI provider."
      ])
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    context
  };
}

export async function createManualCopyAIPrompt(): Promise<ManualCopyAIPromptResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  const createdAt = new Date().toISOString();
  const context = buildManualCopyAIContextText(persisted, createdAt);
  const prompt = [
    "You are helping with an OpenPome task session.",
    "Use the work item, workspace, plan, approval, diff summary, and validation evidence below.",
    "Do not assume access to full source code unless the developer explicitly provides it.",
    "Return a concise implementation approach, risks, and the next safest command or file inspection to perform.",
    "",
    context
  ].join("\n");

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    aiPrompt: prompt,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "session_status_changed", "Manual-copy AI prompt prepared", createdAt, [
        "Prompt excludes source code, secrets, and full diffs.",
        "Developer must review before copying into an external AI provider."
      ])
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    prompt
  };
}

export async function getDiffSummary(): Promise<DiffSummaryResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  const workspace = persisted.workspaceCandidate?.workspace;
  if (!workspace?.path) {
    throw new Error("No workspace path is available for the active task session.");
  }

  const createdAt = new Date().toISOString();
  const summary = await buildDiffSummary(workspace.path, createdAt);

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    diffSummary: summary,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "session_status_changed", "Diff summary captured", createdAt, [
        `Files changed: ${summary.files.length}`,
        "Summary excludes full diff contents."
      ])
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    summary
  };
}

export async function getGitHubAuthStatus(): Promise<GitHubAuthStatusResult> {
  try {
    await execFileAsync("gh", ["--version"]);
  } catch {
    return {
      provider: "github",
      cliAvailable: false,
      authenticated: false,
      detail: "GitHub CLI is not installed or is not on PATH."
    };
  }

  try {
    await execFileAsync("gh", ["auth", "status", "-h", "github.com"]);
    return {
      provider: "github",
      cliAvailable: true,
      authenticated: true,
      detail: "GitHub CLI is authenticated for github.com."
    };
  } catch (error) {
    return {
      provider: "github",
      cliAvailable: true,
      authenticated: false,
      detail: summarizeExecError(error) || "GitHub CLI is installed but not authenticated for github.com."
    };
  }
}

export async function createPullRequestExternalGuard(): Promise<ExternalActionGuardResult> {
  return createExternalActionGuard("create_pr");
}

export async function postWorkItemUpdateExternalGuard(): Promise<ExternalActionGuardResult> {
  return createExternalActionGuard("update_work_item");
}

export async function createPullRequestDraft(): Promise<PullRequestDraftResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  const now = new Date().toISOString();
  const draft = buildPullRequestDraft(persisted, now);

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    prDraft: draft,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "session_status_changed", "PR draft prepared", now, [
        `Title: ${draft.title}`,
        `Head branch: ${draft.headBranch}`,
        `Base branch: ${draft.baseBranch}`
      ])
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    draft
  };
}

export async function createWorkItemUpdateDraft(): Promise<WorkItemUpdateDraftResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  const now = new Date().toISOString();
  const draft = buildWorkItemUpdateDraft(persisted, now);

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    workItemUpdateDraft: draft,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "session_status_changed", "Work item update draft prepared", now, [
        `Work item: ${persisted.workItem.key}`,
        "Draft is local only and has not been posted."
      ])
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    workItem: persisted.workItem,
    draft
  };
}

export async function getJiraAuthStatus(env: NodeJS.ProcessEnv = process.env): Promise<AuthStatusResult> {
  const source = await createJiraSource(env);
  const status = source.getAuthStatus();

  return {
    provider: "jira-cloud",
    ...status
  };
}

export function createJiraOAuthLogin(env: NodeJS.ProcessEnv = process.env): OAuthLoginResult {
  const clientId = env["OPENPOME_JIRA_OAUTH_CLIENT_ID"];
  const redirectUri = env["OPENPOME_JIRA_OAUTH_REDIRECT_URI"] ?? "http://127.0.0.1:48731/auth/jira/callback";

  if (!clientId) {
    throw new Error("OPENPOME_JIRA_OAUTH_CLIENT_ID is required for Jira OAuth login.");
  }

  const login = createJiraCloudOAuthLogin({
    clientId,
    redirectUri,
    state: randomBytes(24).toString("hex")
  });

  return {
    provider: "jira-cloud",
    ...login,
    nextStep: "Open the authorization URL in a browser, approve access, then run `pome auth jira callback <CODE>` if you are using manual mode."
  };
}

export async function completeJiraOAuthCode(code: string, env: NodeJS.ProcessEnv = process.env): Promise<OAuthCompletionResult> {
  const clientId = env["OPENPOME_JIRA_OAUTH_CLIENT_ID"];
  const clientSecret = env["OPENPOME_JIRA_OAUTH_CLIENT_SECRET"];
  const redirectUri = env["OPENPOME_JIRA_OAUTH_REDIRECT_URI"] ?? "http://127.0.0.1:48731/auth/jira/callback";

  if (!clientId || !clientSecret) {
    throw new Error("OPENPOME_JIRA_OAUTH_CLIENT_ID and OPENPOME_JIRA_OAUTH_CLIENT_SECRET are required to complete Jira OAuth.");
  }

  const tokenSet = await exchangeJiraCloudOAuthCode({
    code,
    clientId,
    clientSecret,
    redirectUri
  });

  if (!tokenSet.cloudId) {
    throw new Error("Jira OAuth completed, but no accessible Jira site was returned.");
  }

  const store = createCredentialStore();

  if (!store.isAvailable()) {
    throw new Error(`Credential store is unavailable: ${store.backend}`);
  }

  await setJsonCredential(store, jiraOAuthCredentialAccount, tokenSet);

  return {
    provider: "jira-cloud",
    stored: true,
    mode: "oauth-3lo",
    cloudId: tokenSet.cloudId,
    siteUrl: tokenSet.siteUrl,
    detail: "Jira OAuth token stored in OS keychain."
  };
}

export async function listenForJiraOAuthCallback(env: NodeJS.ProcessEnv = process.env): Promise<OAuthCompletionResult> {
  const login = createJiraOAuthLogin(env);
  const redirectUri = new URL(login.redirectUri);

  if (redirectUri.hostname !== "127.0.0.1" && redirectUri.hostname !== "localhost") {
    throw new Error("OAuth callback listener only supports localhost redirect URIs.");
  }

  const port = Number(redirectUri.port || "80");
  const pathname = redirectUri.pathname;

  console.log("Open this URL in your browser:");
  console.log(login.authorizationUrl);
  console.log("");
  console.log(`Waiting for Jira OAuth callback on ${login.redirectUri}`);

  return new Promise<OAuthCompletionResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for Jira OAuth callback."));
    }, 5 * 60 * 1000);

    const server = createServer((request, response) => {
      void (async () => {
        try {
          const requestUrl = new URL(request.url ?? "/", login.redirectUri);

          if (requestUrl.pathname !== pathname) {
            response.writeHead(404);
            response.end("Not found");
            return;
          }

          const state = requestUrl.searchParams.get("state");
          const code = requestUrl.searchParams.get("code");
          const error = requestUrl.searchParams.get("error");

          if (error) {
            throw new Error(`Jira OAuth failed: ${error}`);
          }

          if (state !== login.state) {
            throw new Error("Jira OAuth state mismatch.");
          }

          if (!code) {
            throw new Error("Jira OAuth callback did not include a code.");
          }

          const completion = await completeJiraOAuthCode(code, env);
          response.writeHead(200, { "Content-Type": "text/plain" });
          response.end("OpenPome Jira login complete. You can close this browser tab.");
          clearTimeout(timeout);
          server.close();
          resolve(completion);
        } catch (error) {
          response.writeHead(400, { "Content-Type": "text/plain" });
          response.end(error instanceof Error ? error.message : String(error));
          clearTimeout(timeout);
          server.close();
          reject(error);
        }
      })();
    });

    server.listen(port, "127.0.0.1");
  });
}

async function createJiraSource(env: NodeJS.ProcessEnv): Promise<WorkItemSourceAdapter> {
  const paths = getOpenPomePaths();
  const localConfig = await readConfigIfPresent(paths.configFile);
  const selectedBoardScope = getActiveJiraBoardScope(localConfig);
  const storedOAuth = await refreshStoredJiraOAuthIfNeeded(await readStoredJiraOAuth(), env);
  return workItemSourceRegistry.getActiveSource(env, {
    activeScope: selectedBoardScope,
    connectorCredentials: storedOAuth ? { [jiraOAuthCredentialAccount]: storedOAuth } : undefined
  });
}

function getActiveJiraBoardScope(config: OpenPomeConfig | undefined): WorkItemScopeConfig | undefined {
  if (config?.activeWorkItemScope?.providerId !== "jira-cloud" || config.activeWorkItemScope.kind !== "board") {
    return undefined;
  }

  return config.activeWorkItemScope;
}

async function readStoredJiraOAuth(): Promise<JiraCloudOAuthTokenSet | undefined> {
  const store = createCredentialStore();

  if (!store.isAvailable()) {
    return undefined;
  }

  return getJsonCredential<JiraCloudOAuthTokenSet>(store, jiraOAuthCredentialAccount);
}

async function refreshStoredJiraOAuthIfNeeded(
  tokenSet: JiraCloudOAuthTokenSet | undefined,
  env: NodeJS.ProcessEnv
): Promise<JiraCloudOAuthTokenSet | undefined> {
  if (!tokenSet || !shouldRefreshOAuthToken(tokenSet)) {
    return tokenSet;
  }

  const clientId = env["OPENPOME_JIRA_OAUTH_CLIENT_ID"];
  const clientSecret = env["OPENPOME_JIRA_OAUTH_CLIENT_SECRET"];

  if (!tokenSet.refreshToken || !clientId || !clientSecret) {
    return tokenSet;
  }

  const refreshed = await refreshJiraCloudOAuthToken({
    refreshToken: tokenSet.refreshToken,
    clientId,
    clientSecret
  });

  const merged: JiraCloudOAuthTokenSet = {
    ...refreshed,
    cloudId: refreshed.cloudId ?? tokenSet.cloudId,
    siteUrl: refreshed.siteUrl ?? tokenSet.siteUrl
  };

  const store = createCredentialStore();
  if (store.isAvailable()) {
    await setJsonCredential(store, jiraOAuthCredentialAccount, merged);
  }

  return merged;
}

function shouldRefreshOAuthToken(tokenSet: JiraCloudOAuthTokenSet, now = new Date()): boolean {
  if (!tokenSet.expiresAt) {
    return false;
  }

  const refreshWindowMs = 5 * 60 * 1000;
  return new Date(tokenSet.expiresAt).getTime() - now.getTime() <= refreshWindowMs;
}

function getOpenPomePaths(): Pick<InitResult, "homeDirectory" | "configFile"> {
  const homeDirectory = process.env["OPENPOME_HOME"] ?? join(homedir(), ".openpome");
  return {
    homeDirectory,
    configFile: join(homeDirectory, "config.json")
  };
}

async function readConfigIfPresent(configFile: string): Promise<OpenPomeConfig | undefined> {
  try {
    const content = await readFile(configFile, "utf8");
    return JSON.parse(content) as OpenPomeConfig;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function writeConfig(configFile: string, config: OpenPomeConfig): Promise<void> {
  await mkdir(dirname(configFile), { recursive: true });
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function getWorkspaceIndexFile(homeDirectory: string): string {
  return join(homeDirectory, workspaceIndexFileName);
}

function getWorkspaceLinksFile(homeDirectory: string): string {
  return join(homeDirectory, workspaceLinksFileName);
}

function getActiveTaskSessionFile(homeDirectory: string): string {
  return join(homeDirectory, activeTaskSessionFileName);
}

function getTaskSessionHistoryFile(homeDirectory: string): string {
  return join(homeDirectory, taskSessionHistoryFileName);
}

function getWorkspaceScanPaths(config: OpenPomeConfig | undefined, env: NodeJS.ProcessEnv): readonly string[] {
  const envScanPaths = env["OPENPOME_WORKSPACE_SCAN_PATHS"]
    ?.split(delimiter)
    .map((path) => path.trim())
    .filter(Boolean);
  const configuredPaths = config?.workspaceScanPaths.filter(Boolean) ?? [];
  const scanPaths = envScanPaths?.length ? envScanPaths : configuredPaths;

  if (scanPaths.length > 0) {
    return uniqueResolvedPaths(scanPaths);
  }

  return uniqueResolvedPaths([env["INIT_CWD"] ?? process.cwd()]);
}

async function findGitWorkspaces(scanPaths: readonly string[], scannedAt: string): Promise<readonly Workspace[]> {
  const workspaces: Workspace[] = [];
  const seenPaths = new Set<string>();

  for (const scanPath of scanPaths) {
    await collectGitWorkspaces(resolve(scanPath), 0, scannedAt, seenPaths, workspaces);

    if (workspaces.length >= maxWorkspaceScanRepositories) {
      break;
    }
  }

  return workspaces.sort((left, right) => (left.path ?? left.name).localeCompare(right.path ?? right.name));
}

async function collectGitWorkspaces(
  directory: string,
  depth: number,
  scannedAt: string,
  seenPaths: Set<string>,
  workspaces: Workspace[]
): Promise<void> {
  if (workspaces.length >= maxWorkspaceScanRepositories || depth > defaultWorkspaceScanDepth || !existsSync(directory)) {
    return;
  }

  if (seenPaths.has(directory)) {
    return;
  }

  seenPaths.add(directory);

  if (existsSync(join(directory, ".git"))) {
    workspaces.push(await readGitWorkspace(directory, scannedAt));
    return;
  }

  let entries;
  try {
    const dir = await opendir(directory);
    entries = dir;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "EACCES")) {
      return;
    }

    throw error;
  }

  for await (const entry of entries) {
    if (!entry.isDirectory() || skippedWorkspaceDirectoryNames.has(entry.name)) {
      continue;
    }

    await collectGitWorkspaces(join(directory, entry.name), depth + 1, scannedAt, seenPaths, workspaces);

    if (workspaces.length >= maxWorkspaceScanRepositories) {
      return;
    }
  }
}

async function readGitWorkspace(directory: string, scannedAt: string): Promise<Workspace> {
  const gitDirectory = await resolveGitDirectory(directory);
  const [currentBranch, remoteUrls, packageNames, readmeKeywords, codeownersKeywords, recentBranches, recentCommitRefs] =
    await Promise.all([
      readCurrentGitBranch(gitDirectory),
      readGitRemoteUrls(gitDirectory),
      readWorkspacePackageNames(directory),
      readWorkspaceReadmeKeywords(directory),
      readWorkspaceCodeownersKeywords(directory),
      readRecentGitBranches(gitDirectory),
      readRecentGitCommitRefs(gitDirectory)
    ]);

  return {
    id: createWorkspaceId(directory),
    name: basename(directory),
    path: directory,
    remoteUrls,
    currentBranch,
    packageNames,
    readmeKeywords,
    codeownersKeywords,
    recentBranches,
    recentCommitRefs,
    lastScannedAt: scannedAt
  };
}

async function resolveGitDirectory(directory: string): Promise<string> {
  const dotGitPath = join(directory, ".git");

  try {
    const content = await readFile(dotGitPath, "utf8");
    const gitDir = content.match(/^gitdir:\s*(.+)$/u)?.[1]?.trim();

    if (gitDir) {
      return resolve(directory, gitDir);
    }
  } catch {
    return dotGitPath;
  }

  return dotGitPath;
}

async function readCurrentGitBranch(gitDirectory: string): Promise<string | undefined> {
  try {
    const head = (await readFile(join(gitDirectory, "HEAD"), "utf8")).trim();
    const branchPrefix = "ref: refs/heads/";
    return head.startsWith(branchPrefix) ? head.slice(branchPrefix.length) : undefined;
  } catch {
    return undefined;
  }
}

async function readGitRemoteUrls(gitDirectory: string): Promise<readonly string[]> {
  try {
    const config = await readFile(join(gitDirectory, "config"), "utf8");
    const urls = [...config.matchAll(/^\s*url\s*=\s*(.+)$/gmu)].map((match) => match[1]?.trim()).filter(Boolean);
    return [...new Set(urls as string[])];
  } catch {
    return [];
  }
}

async function readWorkspacePackageNames(directory: string): Promise<readonly string[]> {
  const packageFiles = [
    join(directory, "package.json"),
    join(directory, "packages"),
    join(directory, "apps"),
    join(directory, "services")
  ];
  const names: string[] = [];

  const rootName = await readPackageName(join(directory, "package.json"));
  if (rootName) {
    names.push(rootName);
  }

  for (const childDirectory of packageFiles.slice(1)) {
    names.push(...(await readPackageNamesFromChildren(childDirectory)));
  }

  return uniqueStrings(names).slice(0, 40);
}

async function readPackageNamesFromChildren(directory: string): Promise<readonly string[]> {
  try {
    const dir = await opendir(directory);
    const names: string[] = [];

    for await (const entry of dir) {
      if (!entry.isDirectory() || skippedWorkspaceDirectoryNames.has(entry.name)) {
        continue;
      }

      const packageName = await readPackageName(join(directory, entry.name, "package.json"));
      if (packageName) {
        names.push(packageName);
      }
    }

    return names;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "EACCES")) {
      return [];
    }

    throw error;
  }
}

async function readPackageName(packageFile: string): Promise<string | undefined> {
  try {
    const content = await readFile(packageFile, "utf8");
    const packageJson = JSON.parse(content) as { readonly name?: unknown };
    return typeof packageJson.name === "string" ? packageJson.name : undefined;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    if (error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
}

async function readPackageScripts(packageFile: string): Promise<Readonly<Record<string, string>>> {
  try {
    const content = await readFile(packageFile, "utf8");
    const packageJson = JSON.parse(content) as { readonly scripts?: unknown };
    if (!packageJson.scripts || typeof packageJson.scripts !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(packageJson.scripts as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }

    if (error instanceof SyntaxError) {
      return {};
    }

    throw error;
  }
}

async function readWorkspaceReadmeKeywords(directory: string): Promise<readonly string[]> {
  const readmeFiles = ["README.md", "README.txt", "readme.md"];
  const keywords: string[] = [];

  for (const fileName of readmeFiles) {
    const content = await readOptionalTextFile(join(directory, fileName), 16_000);
    if (content) {
      keywords.push(...tokenizeForWorkspaceMetadata(content));
      break;
    }
  }

  return uniqueStrings(keywords).slice(0, 80);
}

async function readWorkspaceCodeownersKeywords(directory: string): Promise<readonly string[]> {
  const codeownersFiles = [join(directory, ".github", "CODEOWNERS"), join(directory, "CODEOWNERS"), join(directory, "docs", "CODEOWNERS")];
  const keywords: string[] = [];

  for (const file of codeownersFiles) {
    const content = await readOptionalTextFile(file, 16_000);
    if (content) {
      keywords.push(...tokenizeForWorkspaceMetadata(content));
    }
  }

  return uniqueStrings(keywords).slice(0, 80);
}

async function readOptionalTextFile(file: string, maxCharacters: number): Promise<string | undefined> {
  try {
    return (await readFile(file, "utf8")).slice(0, maxCharacters);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "EACCES")) {
      return undefined;
    }

    throw error;
  }
}

async function readRecentGitBranches(gitDirectory: string): Promise<readonly string[]> {
  const refsDirectory = join(gitDirectory, "refs", "heads");
  const branches: string[] = [];

  await collectGitBranchRefs(refsDirectory, "", branches);
  return uniqueStrings(branches).slice(0, 50);
}

async function collectGitBranchRefs(directory: string, prefix: string, branches: string[]): Promise<void> {
  try {
    const dir = await opendir(directory);

    for await (const entry of dir) {
      const branchName = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await collectGitBranchRefs(join(directory, entry.name), branchName, branches);
      } else if (entry.isFile()) {
        branches.push(branchName);
      }
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "EACCES")) {
      return;
    }

    throw error;
  }
}

async function readRecentGitCommitRefs(gitDirectory: string): Promise<readonly string[]> {
  const content = await readOptionalTextFile(join(gitDirectory, "logs", "HEAD"), 64_000);
  if (!content) {
    return [];
  }

  const issueRefs = [...content.matchAll(/\b[A-Z][A-Z0-9]+-\d+\b/gu)].map((match) => match[0]);
  return uniqueStrings(issueRefs).slice(0, 50);
}

function tokenizeForWorkspaceMetadata(value: string): readonly string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9@/_-]+/u)
    .map((token) => token.trim().replace(/^@/u, ""))
    .filter((token) => token.length >= 3);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(Boolean))];
}

function createSessionStartEvents(
  session: AITaskSession,
  workItem: WorkItem,
  workspaceCandidate: WorkspaceCandidate | undefined,
  now: string
): readonly TaskSessionEvent[] {
  const events = [
    createSessionEvent(session, workItem.key, "session_started", "Task session started", now, [
      `${workItem.key} ${workItem.title}`,
      `Automation level: ${session.automationLevel}`
    ], {
      status: session.status
    })
  ];

  if (!workspaceCandidate) {
    return [
      ...events,
      createSessionEvent(session, workItem.key, "workspace_unresolved", "Workspace unresolved", now, [
        "No workspace candidate was selected for this task session."
      ])
    ];
  }

  return [
    ...events,
    createSessionEvent(session, workItem.key, "workspace_resolved", "Workspace candidate selected", now, [
      `Workspace: ${workspaceCandidate.workspace.name}`,
      `Confidence: ${Math.round(workspaceCandidate.confidence * 100)}%`,
      ...workspaceCandidate.reasons
    ], {
      workspaceId: workspaceCandidate.workspace.id,
      confidence: String(workspaceCandidate.confidence)
    })
  ];
}

function createSessionEvent(
  session: AITaskSession,
  workItemKey: string,
  type: TaskSessionEventType,
  title: string,
  createdAt: string,
  details: readonly string[],
  metadata?: Readonly<Record<string, string>>
): TaskSessionEvent {
  const hash = createHash("sha256")
    .update(`${session.id}:${type}:${createdAt}:${title}`)
    .digest("hex")
    .slice(0, 12);

  return {
    id: `event_${hash}`,
    sessionId: session.id,
    workItemKey,
    type,
    title,
    details,
    createdAt,
    metadata
  };
}

function appendSessionEvents(
  existing: readonly TaskSessionEvent[] | undefined,
  events: readonly TaskSessionEvent[]
): readonly TaskSessionEvent[] {
  return [...(existing ?? []), ...events];
}

function appendApprovalHistory(
  existing: readonly ApprovalRequest[] | undefined,
  approval: ApprovalRequest
): readonly ApprovalRequest[] {
  return [...(existing ?? []), approval];
}

function createWorkspaceId(path: string): string {
  const hash = createHash("sha256").update(path).digest("hex").slice(0, 12);
  return `${basename(path).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "")}-${hash}`;
}

async function readWorkspaceIndexIfPresent(homeDirectory: string): Promise<WorkspaceIndex | undefined> {
  try {
    const content = await readFile(getWorkspaceIndexFile(homeDirectory), "utf8");
    return JSON.parse(content) as WorkspaceIndex;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function uniqueResolvedPaths(paths: readonly string[]): readonly string[] {
  return [...new Set(paths.map((path) => resolve(path)))];
}

function resolveWorkspacePath(workspacePath: string, env: NodeJS.ProcessEnv): string {
  if (isAbsolute(workspacePath)) {
    return resolve(workspacePath);
  }

  return resolve(env["INIT_CWD"] ?? process.cwd(), workspacePath);
}

async function readWorkspaceLinkIndexIfPresent(homeDirectory: string): Promise<WorkspaceLinkIndex | undefined> {
  try {
    const content = await readFile(getWorkspaceLinksFile(homeDirectory), "utf8");
    return JSON.parse(content) as WorkspaceLinkIndex;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function upsertWorkspace(workspaces: readonly Workspace[], workspace: Workspace): readonly Workspace[] {
  const filtered = workspaces.filter((candidate) => candidate.id !== workspace.id);
  return [...filtered, workspace].sort((left, right) => (left.path ?? left.name).localeCompare(right.path ?? right.name));
}

function upsertWorkspaceLink(
  links: readonly LearnedWorkspaceLink[],
  link: LearnedWorkspaceLink
): readonly LearnedWorkspaceLink[] {
  const filtered = links.filter(
    (candidate) => candidate.workItemPattern.toUpperCase() !== link.workItemPattern.toUpperCase()
  );
  return [...filtered, link].sort((left, right) => left.workItemPattern.localeCompare(right.workItemPattern));
}

async function readActiveTaskSessionIfPresent(homeDirectory: string): Promise<PersistedTaskSession | undefined> {
  try {
    const content = await readFile(getActiveTaskSessionFile(homeDirectory), "utf8");
    return JSON.parse(content) as PersistedTaskSession;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function writeActiveTaskSession(homeDirectory: string, session: PersistedTaskSession): Promise<void> {
  await mkdir(homeDirectory, { recursive: true });
  await writeFile(getActiveTaskSessionFile(homeDirectory), `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

async function removeActiveTaskSession(homeDirectory: string): Promise<void> {
  await rm(getActiveTaskSessionFile(homeDirectory), { force: true });
}

async function readTaskSessionHistoryIfPresent(homeDirectory: string): Promise<TaskSessionHistoryIndex | undefined> {
  try {
    const content = await readFile(getTaskSessionHistoryFile(homeDirectory), "utf8");
    return JSON.parse(content) as TaskSessionHistoryIndex;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function archiveTaskSession(homeDirectory: string, session: PersistedTaskSession): Promise<void> {
  const existing = await readTaskSessionHistoryIfPresent(homeDirectory);
  const updatedAt = new Date().toISOString();
  const sessions = [session, ...(existing?.sessions.filter((candidate) => candidate.session.id !== session.session.id) ?? [])].slice(0, 25);
  const history: TaskSessionHistoryIndex = {
    indexVersion: 1,
    updatedAt,
    sessions
  };

  await mkdir(homeDirectory, { recursive: true });
  await writeFile(getTaskSessionHistoryFile(homeDirectory), `${JSON.stringify(history, null, 2)}\n`, "utf8");
}

function selectArchivedTaskSession(
  sessions: readonly PersistedTaskSession[],
  sessionId: string | undefined
): PersistedTaskSession | undefined {
  if (sessionId) {
    return sessions.find((session) => session.session.id === sessionId);
  }

  return sessions[0];
}

function buildPlanningContext(session: PersistedTaskSession): readonly string[] {
  const workspace = session.workspaceCandidate?.workspace;
  const context = [
    `Work item type: ${session.workItem.type}`,
    `Status: ${session.workItem.status}`,
    session.workItem.priority ? `Priority: ${session.workItem.priority}` : undefined,
    session.workItem.labels?.length ? `Labels: ${session.workItem.labels.join(", ")}` : undefined,
    session.workItem.components?.length ? `Components: ${session.workItem.components.join(", ")}` : undefined,
    workspace ? `Workspace: ${workspace.name}` : "Workspace: unresolved",
    workspace?.path ? `Workspace path: ${workspace.path}` : undefined,
    session.workspaceCandidate ? `Workspace confidence: ${Math.round(session.workspaceCandidate.confidence * 100)}%` : undefined,
    session.workspaceCandidate?.reasons.length ? `Workspace reasons: ${session.workspaceCandidate.reasons.join("; ")}` : undefined
  ];

  return context.filter((item): item is string => Boolean(item));
}

function buildInitialImplementationPlan(
  workItem: WorkItem,
  workspaceCandidate: WorkspaceCandidate | undefined
): ImplementationPlan {
  const workspace = workspaceCandidate?.workspace;
  const hasWorkspace = Boolean(workspace?.path);

  return {
    summary: `Prepare implementation for ${workItem.key}: ${workItem.title}`,
    assumptions: [
      "Use the selected work item as the source of truth for scope.",
      hasWorkspace
        ? `Use workspace ${workspace?.name} as the initial code context.`
        : "Workspace is unresolved, so confirm or link a workspace before implementation.",
      "Require explicit approval before editing files, running mutating commands, creating branches, pushing, or opening PRs."
    ],
    steps: [
      {
        id: "understand",
        title: "Review work item context",
        detail: "Read the title, description, labels, components, parent, subtasks, and linked references."
      },
      {
        id: "inspect-workspace",
        title: hasWorkspace ? "Inspect selected workspace" : "Resolve workspace",
        detail: hasWorkspace
          ? `Inspect ${workspace?.path} for relevant modules, tests, ownership files, and contribution rules.`
          : "Run workspace scan/resolve or link the correct workspace manually."
      },
      {
        id: "draft-change",
        title: "Draft implementation approach",
        detail: "Identify the smallest safe change set and the tests needed to validate it."
      },
      {
        id: "approval",
        title: "Request approval checkpoint",
        detail: "Ask the developer to approve the plan before implementation begins."
      }
    ],
    filesLikelyChanged: hasWorkspace ? [workspace?.path ?? ""] : [],
    commandsToRun: ["pome approve plan", "pnpm validate"],
    risks: [
      "Workspace resolution may be incomplete until real GitHub and historical session signals are added.",
      "The first plan is deterministic; model-provider assisted planning will be added later."
    ],
    missingInfo: hasWorkspace ? [] : ["No workspace candidate is selected yet."]
  };
}

async function discoverTestCommandCandidates(workspacePath: string): Promise<readonly TestCommandCandidate[]> {
  const scripts = await readPackageScripts(join(workspacePath, "package.json"));
  const packageManager = detectPackageManager(workspacePath);
  const candidates: TestCommandCandidate[] = [];

  for (const scriptName of ["validate", "test", "typecheck", "lint"]) {
    if (!scripts[scriptName]) {
      continue;
    }

    candidates.push({
      id: `script_${scriptName}`,
      command: buildPackageScriptCommand(packageManager, scriptName),
      source: "package_json",
      reason: `Detected package.json script "${scriptName}".`,
      cwd: workspacePath
    });
  }

  if (candidates.length > 0) {
    return candidates;
  }

  if (Object.keys(scripts).length > 0) {
    return [
      {
        id: "script_first_available",
        command: buildPackageScriptCommand(packageManager, Object.keys(scripts)[0] ?? "test"),
        source: "package_json",
        reason: "No standard test script was found; using the first available package.json script.",
        cwd: workspacePath
      }
    ];
  }

  return getFallbackTestCommandCandidates(workspacePath);
}

function detectPackageManager(workspacePath: string): "pnpm" | "npm" | "yarn" | "bun" {
  if (existsSync(join(workspacePath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (existsSync(join(workspacePath, "yarn.lock"))) {
    return "yarn";
  }

  if (existsSync(join(workspacePath, "bun.lockb")) || existsSync(join(workspacePath, "bun.lock"))) {
    return "bun";
  }

  return "npm";
}

function buildPackageScriptCommand(packageManager: "pnpm" | "npm" | "yarn" | "bun", scriptName: string): string {
  if (packageManager === "npm") {
    return scriptName === "test" ? "npm test" : `npm run ${scriptName}`;
  }

  if (packageManager === "yarn") {
    return `yarn ${scriptName}`;
  }

  if (packageManager === "bun") {
    return `bun run ${scriptName}`;
  }

  return `pnpm ${scriptName}`;
}

function getFallbackTestCommandCandidates(cwd?: string): readonly TestCommandCandidate[] {
  return [
    {
      id: "fallback_validate",
      command: "pnpm validate",
      source: "fallback",
      reason: "Fallback command for OpenPome-style TypeScript workspaces.",
      cwd
    }
  ];
}

function selectTestCommandCandidate(
  candidates: readonly TestCommandCandidate[],
  command: string | undefined
): TestCommandCandidate | undefined {
  if (!command) {
    return candidates[0];
  }

  const normalized = command.trim();
  return candidates.find((candidate) => candidate.command === normalized || candidate.id === normalized);
}

function createCommandApproval(
  session: PersistedTaskSession,
  candidate: TestCommandCandidate,
  now: string
): ApprovalRequest {
  return {
    id: `approval_${createHash("sha256").update(`${session.session.id}:run_command:${candidate.command}:${now}`).digest("hex").slice(0, 12)}`,
    type: "run_command",
    title: `Command approval for ${session.workItem.key}`,
    reason: "Developer approved this command candidate as test evidence for the task session.",
    details: [
      `Session: ${session.session.id}`,
      `Work item: ${session.workItem.key}`,
      `Command: ${candidate.command}`,
      `Working directory: ${candidate.cwd ?? "unresolved"}`,
      `Recorded at: ${now}`
    ],
    status: "approved"
  };
}

function buildPullRequestDraft(session: PersistedTaskSession, createdAt: string): PullRequestDraft {
  const workItem = session.workItem;
  const workspace = session.workspaceCandidate?.workspace;
  const title = `${workItem.key}: ${workItem.title}`;
  const testEvidence = session.commandApprovalEvidence?.map((evidence) => `- Approved command: \`${evidence.command}\``) ?? [];
  const body = [
    `## Summary`,
    `- ${session.plan?.summary ?? `Prepare implementation for ${workItem.key}`}`,
    `- Work item: ${workItem.key}`,
    workspace ? `- Workspace: ${workspace.name}` : "- Workspace: unresolved",
    "",
    "## Plan",
    ...(session.plan?.steps.map((step) => `- ${step.title}${step.detail ? `: ${step.detail}` : ""}`) ?? ["- No plan generated yet."]),
    "",
    "## Validation",
    ...(testEvidence.length ? testEvidence : ["- No approved test command evidence recorded yet."]),
    "",
    "## Approval",
    `- Plan approval: ${session.planApproval?.status ?? "not recorded"}`,
    "- Creating or publishing this PR still requires an explicit approval checkpoint."
  ].join("\n");

  return {
    title,
    body,
    baseBranch: "main",
    headBranch: session.session.branchName ?? `openpome/${workItem.key.toLowerCase()}`,
    remoteUrl: workspace?.remoteUrls[0],
    createdAt
  };
}

function buildWorkItemUpdateDraft(session: PersistedTaskSession, createdAt: string): WorkItemUpdateDraft {
  const lines = [
    `OpenPome update for ${session.workItem.key}`,
    "",
    `Status: ${session.session.status}`,
    session.workspaceCandidate?.workspace.name ? `Workspace: ${session.workspaceCandidate.workspace.name}` : "Workspace: unresolved",
    session.plan?.summary ? `Plan: ${session.plan.summary}` : "Plan: not generated",
    session.planApproval ? `Plan approval: ${session.planApproval.status}` : "Plan approval: not recorded",
    "",
    "Validation evidence:",
    ...(session.commandApprovalEvidence?.length
      ? session.commandApprovalEvidence.map((evidence) => `- Approved command: ${evidence.command}`)
      : ["- No approved test command evidence recorded yet."]),
    "",
    `Drafted locally at ${createdAt}. This update has not been posted.`
  ];

  return {
    body: lines.join("\n"),
    createdAt
  };
}

function selectCommandApprovalEvidence(
  approvals: readonly CommandApprovalEvidence[],
  command: string | undefined
): CommandApprovalEvidence | undefined {
  if (!command) {
    return approvals[approvals.length - 1];
  }

  const normalized = command.trim();
  return approvals.find((approval) => approval.command === normalized || approval.id === normalized || approval.approval.id === normalized);
}

async function executeApprovedCommand(command: string, cwd: string | undefined): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  try {
    const result = await execAsync(command, {
      cwd,
      timeout: 2 * 60 * 1000,
      maxBuffer: 1024 * 1024,
      windowsHide: true
    });
    return {
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    const maybeError = error as {
      readonly code?: unknown;
      readonly stdout?: unknown;
      readonly stderr?: unknown;
    };
    return {
      exitCode: typeof maybeError.code === "number" ? maybeError.code : 1,
      stdout: typeof maybeError.stdout === "string" ? maybeError.stdout : "",
      stderr: typeof maybeError.stderr === "string" ? maybeError.stderr : error instanceof Error ? error.message : String(error)
    };
  }
}

function summarizeCommandOutput(output: string): readonly string[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-20);
}

function buildManualCopyAIContextText(session: PersistedTaskSession, createdAt: string): string {
  const workspace = session.workspaceCandidate?.workspace;
  const lines = [
    `OpenPome manual-copy AI context`,
    `Created: ${createdAt}`,
    "",
    "Safety:",
    "- This context excludes source code, secrets, and full diffs.",
    "- Ask before requesting full files, full diffs, external network calls, or mutating commands.",
    "",
    "Work item:",
    `- Key: ${session.workItem.key}`,
    `- Type: ${session.workItem.type}`,
    `- Status: ${session.workItem.status}`,
    `- Title: ${session.workItem.title}`,
    session.workItem.priority ? `- Priority: ${session.workItem.priority}` : undefined,
    session.workItem.labels?.length ? `- Labels: ${session.workItem.labels.join(", ")}` : undefined,
    session.workItem.components?.length ? `- Components: ${session.workItem.components.join(", ")}` : undefined,
    "",
    "Workspace:",
    workspace ? `- Name: ${workspace.name}` : "- Name: unresolved",
    workspace?.path ? `- Path: ${workspace.path}` : undefined,
    session.workspaceCandidate ? `- Confidence: ${Math.round(session.workspaceCandidate.confidence * 100)}%` : undefined,
    session.workspaceCandidate?.reasons.length ? `- Reasons: ${session.workspaceCandidate.reasons.join("; ")}` : undefined,
    "",
    "Session:",
    `- Id: ${session.session.id}`,
    `- Status: ${session.session.status}`,
    `- Automation level: ${session.session.automationLevel}`,
    "",
    "Plan:",
    session.plan?.summary ? `- Summary: ${session.plan.summary}` : "- Not generated",
    ...(session.plan?.steps.map((step) => `- ${step.id}: ${step.title}${step.detail ? ` - ${step.detail}` : ""}`) ?? []),
    "",
    "Approvals:",
    session.planApproval ? `- Plan approval: ${session.planApproval.status}` : "- Plan approval: not recorded",
    ...(session.commandApprovalEvidence?.map((evidence) => `- Command approved: ${evidence.command}`) ?? []),
    "",
    "Validation:",
    ...(session.testRunEvidence?.map((run) => `- ${run.command}: ${run.status} (exit ${run.exitCode})`) ?? [
      "- No test run evidence recorded yet."
    ]),
    "",
    "Diff summary:",
    ...(session.diffSummary?.files.map((file) => `- ${file.status} ${file.path} +${file.added ?? 0} -${file.deleted ?? 0}`) ?? [
      "- No diff summary captured yet."
    ])
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

async function buildDiffSummary(workspacePath: string, createdAt: string): Promise<DiffSummary> {
  const [branch, status, nameStatus, numstat] = await Promise.all([
    runGit(workspacePath, ["branch", "--show-current"]),
    runGit(workspacePath, ["status", "--short"]),
    runGit(workspacePath, ["diff", "--name-status", "HEAD"]),
    runGit(workspacePath, ["diff", "--numstat", "HEAD"])
  ]);
  const files = mergeDiffFiles(parseNameStatus(nameStatus), parseNumstat(numstat));

  return {
    createdAt,
    workspacePath,
    branch: branch.trim() || undefined,
    files,
    statusLines: status.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean),
    includesFullDiff: false
  };
}

async function runGit(cwd: string, args: readonly string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      timeout: 30_000,
      maxBuffer: 512 * 1024,
      windowsHide: true
    });
    return result.stdout;
  } catch {
    return "";
  }
}

function parseNameStatus(output: string): readonly DiffFileSummary[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status = "?", ...pathParts] = line.split(/\s+/u);
      return {
        status,
        path: pathParts.join(" ")
      };
    })
    .filter((file) => file.path);
}

function parseNumstat(output: string): ReadonlyMap<string, Pick<DiffFileSummary, "added" | "deleted">> {
  const entries = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): readonly [string, Pick<DiffFileSummary, "added" | "deleted">] | undefined => {
      const [added, deleted, ...pathParts] = line.split(/\s+/u);
      const path = pathParts.join(" ");
      if (!path) {
        return undefined;
      }

      return [
        path,
        {
          added: Number.isFinite(Number(added)) ? Number(added) : undefined,
          deleted: Number.isFinite(Number(deleted)) ? Number(deleted) : undefined
        }
      ];
    })
    .filter((entry): entry is readonly [string, Pick<DiffFileSummary, "added" | "deleted">] => Boolean(entry));

  return new Map(entries);
}

function mergeDiffFiles(
  nameStatus: readonly DiffFileSummary[],
  numstat: ReadonlyMap<string, Pick<DiffFileSummary, "added" | "deleted">>
): readonly DiffFileSummary[] {
  const files = nameStatus.map((file) => ({
    ...file,
    ...numstat.get(file.path)
  }));
  const seen = new Set(files.map((file) => file.path));
  for (const [path, counts] of numstat.entries()) {
    if (!seen.has(path)) {
      files.push({
        path,
        status: "M",
        ...counts
      });
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function summarizeExecError(error: unknown): string | undefined {
  const maybeError = error as { readonly stderr?: unknown; readonly stdout?: unknown; readonly message?: unknown };
  const stderr = typeof maybeError.stderr === "string" ? summarizeCommandOutput(maybeError.stderr).join(" ") : "";
  const stdout = typeof maybeError.stdout === "string" ? summarizeCommandOutput(maybeError.stdout).join(" ") : "";
  const message = typeof maybeError.message === "string" ? maybeError.message : "";
  return stderr || stdout || message || undefined;
}

async function createExternalActionGuard(action: "create_pr" | "update_work_item"): Promise<ExternalActionGuardResult> {
  const paths = getOpenPomePaths();
  const persisted = await readActiveTaskSessionIfPresent(paths.homeDirectory);

  return {
    active: Boolean(persisted),
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted?.session,
    action,
    allowed: false,
    detail:
      action === "create_pr"
        ? "PR creation is not enabled in this alpha. Use `pome pr draft` and create the PR manually."
        : "Work item update posting is not enabled in this alpha. Use `pome work-item update-draft` and post manually.",
    nextStep:
      action === "create_pr"
        ? "Run `pome pr draft`, review the body, then create the PR yourself."
        : "Run `pome work-item update-draft`, review the body, then post the comment yourself."
  };
}

function createPlanApproval(
  session: PersistedTaskSession,
  status: ApprovalRequest["status"],
  now: string,
  reason = "Developer reviewed the implementation plan."
): ApprovalRequest {
  return {
    id: `approval_${createHash("sha256").update(`${session.session.id}:approve_plan`).digest("hex").slice(0, 12)}`,
    type: "approve_plan",
    title: `Plan approval for ${session.workItem.key}`,
    reason,
    details: [
      `Session: ${session.session.id}`,
      `Work item: ${session.workItem.key}`,
      `Workspace: ${session.workspaceCandidate?.workspace.name ?? "unresolved"}`,
      `Recorded at: ${now}`
    ],
    status
  };
}
