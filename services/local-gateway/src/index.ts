import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { mkdir, opendir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { defaultConfig, type OpenPomeConfig, type WorkItemScopeConfig } from "@openpome/configuration";
import { createCredentialStore, getJsonCredential, setJsonCredential } from "@openpome/credentials";
import type { ApprovalRequest } from "@openpome/approvals";
import { groupWorkItemsByType, type WorkItem, type WorkItemType } from "@openpome/work-items";
import type { ImplementationPlan } from "@openpome/execution-plans";
import { buildPlanningPrompt } from "@openpome/prompt-engine";
import type { AITaskSession } from "@openpome/task-sessions";
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
  type JiraCloudConfig,
  type JiraBoard,
  type JiraCloudOAuthTokenSet,
  type WorkItemSourceAdapter
} from "./connectors/work-item-registry.js";

export interface GatewayHealth {
  readonly status: "ok";
  readonly version: string;
}

export interface InitResult {
  readonly created: boolean;
  readonly homeDirectory: string;
  readonly configFile: string;
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

export interface JiraBoardListResult {
  readonly provider: "jira-cloud";
  readonly sourceMode: "live" | "mock";
  readonly activeScope?: WorkItemScopeConfig;
  readonly boards: readonly JiraBoard[];
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

interface PersistedTaskSession {
  readonly version: 1;
  readonly session: AITaskSession;
  readonly workItem: WorkItem;
  readonly workspaceCandidate?: WorkspaceCandidate;
  readonly plan?: ImplementationPlan;
  readonly planningPrompt?: string;
  readonly planApproval?: ApprovalRequest;
}

const jiraOAuthCredentialAccount = "jira-cloud/oauth";
const workspaceIndexFileName = "workspace-index.json";
const workspaceLinksFileName = "workspace-links.json";
const activeTaskSessionFileName = "active-task-session.json";
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
    version: "0.11.0"
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
        : "Run `pome jira boards` and `pome jira board use <BOARD_ID>` to select a Jira scope."
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
  const items = await source.listAssigned();

  return {
    sourceId: source.id,
    sourceDisplayName: source.displayName,
    sourceMode: source.getMode(),
    activeScope: getActiveJiraBoardScope(config),
    groups: groupWorkItemsByType(items)
  };
}

export async function showWorkItem(key: string, env: NodeJS.ProcessEnv = process.env): Promise<WorkItem | undefined> {
  const source = await createJiraSource(env);
  return source.getWorkItem(key);
}

export async function listJiraBoards(env: NodeJS.ProcessEnv = process.env): Promise<JiraBoardListResult> {
  const source = await createJiraSource(env);
  const config = await readConfigIfPresent(getOpenPomePaths().configFile);

  return {
    provider: "jira-cloud",
    sourceMode: source.getMode(),
    activeScope: getActiveJiraBoardScope(config),
    boards: await source.listBoards()
  };
}

export async function useJiraBoard(boardId: string, env: NodeJS.ProcessEnv = process.env): Promise<JiraBoardUseResult | undefined> {
  const normalizedBoardId = boardId.trim();
  if (!normalizedBoardId) {
    throw new Error("Jira board id is required.");
  }

  const source = await createJiraSource(env);
  const board = (await source.listBoards()).find((candidate) => candidate.id === normalizedBoardId);

  if (!board) {
    return undefined;
  }

  const paths = getOpenPomePaths();
  const existingConfig = await readConfigIfPresent(paths.configFile);
  const activeScope: WorkItemScopeConfig = {
    providerId: "jira-cloud",
    kind: "board",
    scopeId: board.id,
    displayName: board.name,
    metadata: compactRecord({
      jiraBoardType: board.type,
      jiraProjectKey: board.projectKey
    })
  };
  const config: OpenPomeConfig = {
    ...defaultConfig,
    ...existingConfig,
    activeWorkItemSource: "jira-cloud",
    activeWorkItemScope: activeScope
  };

  await writeConfig(paths.configFile, config);

  return {
    provider: "jira-cloud",
    activeScope,
    configFile: paths.configFile
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

  await writeActiveTaskSession(paths.homeDirectory, {
    version: 1,
    session,
    workItem: resolution.workItem,
    workspaceCandidate
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
    planApproval: persisted.planApproval
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

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    session,
    plan,
    planningPrompt: prompt
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
    planApproval: approval
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
    planApproval: approval
  });

  return {
    session,
    workItem: persisted.workItem,
    approval,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    nextStep: "Revise the work item context or workspace link, then run `pome plan` again."
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
  const envSource = workItemSourceRegistry.getActiveSource(env);
  const storedOAuth = await refreshStoredJiraOAuthIfNeeded(await readStoredJiraOAuth(), env);

  if (!storedOAuth && !selectedBoardScope) {
    return envSource;
  }

  const jiraConfig: JiraCloudConfig = {
    baseUrl: env["OPENPOME_JIRA_BASE_URL"],
    email: env["OPENPOME_JIRA_EMAIL"],
    apiToken: env["OPENPOME_JIRA_API_TOKEN"],
    boardId: selectedBoardScope?.scopeId ?? env["OPENPOME_JIRA_BOARD_ID"],
    oauthAccessToken: storedOAuth?.accessToken ?? env["OPENPOME_JIRA_OAUTH_ACCESS_TOKEN"],
    oauthRefreshToken: storedOAuth?.refreshToken ?? env["OPENPOME_JIRA_OAUTH_REFRESH_TOKEN"],
    oauthCloudId: storedOAuth?.cloudId ?? env["OPENPOME_JIRA_OAUTH_CLOUD_ID"],
    oauthExpiresAt: storedOAuth?.expiresAt ?? env["OPENPOME_JIRA_OAUTH_EXPIRES_AT"],
    oauthClientId: env["OPENPOME_JIRA_OAUTH_CLIENT_ID"],
    oauthClientSecret: env["OPENPOME_JIRA_OAUTH_CLIENT_SECRET"],
    oauthRedirectUri: env["OPENPOME_JIRA_OAUTH_REDIRECT_URI"],
    fixtureFile: env["OPENPOME_JIRA_FIXTURE_FILE"]
  };

  return workItemSourceRegistry.getSourceFromConfig(jiraConfig);
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

function compactRecord(values: Readonly<Record<string, string | undefined>>): Readonly<Record<string, string>> | undefined {
  const entries = Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
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
