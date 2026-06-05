import { createHash, randomBytes, randomUUID } from "node:crypto";
import { exec, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { mkdir, opendir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
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

export type ModelProviderId = "manual-copy" | "openai" | "anthropic" | "claude-cli";
type ApiKeyModelProviderId = "openai" | "anthropic";

export interface ModelProviderStatus {
  readonly provider: ModelProviderId;
  readonly displayName: string;
  readonly configured: boolean;
  readonly active: boolean;
  readonly detail: string;
}

export interface ModelProviderStatusResult {
  readonly activeProvider: ModelProviderId;
  readonly providers: readonly ModelProviderStatus[];
}

export interface ModelProviderAuthResult {
  readonly provider: ModelProviderId;
  readonly displayName: string;
  readonly configured: boolean;
  readonly configFile: string;
  readonly detail: string;
}

interface ClaudeCliStatus {
  readonly available: boolean;
  readonly path?: string;
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
  readonly testCommandCandidates?: readonly TestCommandCandidate[];
  readonly commandApprovalEvidence?: readonly CommandApprovalEvidence[];
  readonly testRunEvidence?: readonly TestRunEvidence[];
  readonly prDraft?: PullRequestDraft;
  readonly workItemUpdateDraft?: WorkItemUpdateDraft;
  readonly prCreation?: PullRequestCreateResult;
  readonly workItemUpdatePost?: WorkItemUpdatePostResult;
  readonly aiContext?: ManualCopyAIContext;
  readonly diffSummary?: DiffSummary;
  readonly aiPatchProposal?: AIPatchProposal;
}

export type AssistantDecisionAction =
  | "connect_jira"
  | "select_work"
  | "start_work"
  | "create_plan"
  | "approve_plan"
  | "propose_patch"
  | "approve_patch"
  | "discover_tests"
  | "approve_test"
  | "run_tests"
  | "retry_failed_tests"
  | "prepare_completion"
  | "connect_github"
  | "create_pr"
  | "post_work_update"
  | "complete";

export interface AssistantDecision {
  readonly action: AssistantDecisionAction;
  readonly title: string;
  readonly detail: string;
  readonly commands: readonly string[];
  readonly blockers: readonly string[];
  readonly status: TaskSessionStatusResult;
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
  readonly source: "package_json" | "package_manager" | "related_file" | "fallback";
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

export interface PullRequestCreateResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly draft?: PullRequestDraft;
  readonly approval?: ApprovalRequest;
  readonly prUrl?: string;
  readonly provider?: "github-api" | "github-cli";
  readonly branch?: string;
  readonly commitMessage?: string;
  readonly pushed: boolean;
  readonly draftPr: boolean;
  readonly createdAt?: string;
}

export interface PullRequestCreateOptions {
  readonly draft?: boolean;
  readonly baseBranch?: string;
  readonly allowUntested?: boolean;
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

export interface WorkItemUpdatePostResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly workItem?: WorkItem;
  readonly draft?: WorkItemUpdateDraft;
  readonly approval?: ApprovalRequest;
  readonly posted: boolean;
  readonly commentId?: string;
  readonly url?: string;
  readonly postedAt?: string;
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

export interface AIPatchFileChange {
  readonly path: string;
  readonly action: "create" | "update";
  readonly content: string;
}

export interface AIPatchProposal {
  readonly id: string;
  readonly createdAt: string;
  readonly provider: ModelProviderId;
  readonly summary: string;
  readonly files: readonly AIPatchFileChange[];
  readonly risks: readonly string[];
  readonly approval: ApprovalRequest;
  readonly appliedAt?: string;
}

export interface AIPatchProposalResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly proposal?: AIPatchProposal;
  readonly workspacePath?: string;
  readonly nextStep?: string;
}

export interface AIPatchApplyResult {
  readonly active: boolean;
  readonly sessionFile: string;
  readonly session?: AITaskSession;
  readonly proposal?: AIPatchProposal;
  readonly summary?: DiffSummary;
  readonly nextStep?: string;
}

export interface GitHubAuthStatusResult {
  readonly provider: "github";
  readonly cliAvailable: boolean;
  readonly cliAuthenticated: boolean;
  readonly nativeAuthenticated: boolean;
  readonly authenticated: boolean;
  readonly username?: string;
  readonly tokenSource: "openpome" | "github-cli" | "none";
  readonly detail: string;
}

export interface GitHubDeviceLoginResult {
  readonly provider: "github";
  readonly deviceCode: string;
  readonly userCode: string;
  readonly verificationUri: string;
  readonly expiresIn: number;
  readonly expiresAt: string;
  readonly intervalSeconds: number;
  readonly scope: string;
  readonly detail: string;
}

export interface GitHubDeviceCompletionResult {
  readonly provider: "github";
  readonly authenticated: boolean;
  readonly username?: string;
  readonly detail: string;
}

export interface GitHubDeviceCompletionOptions {
  readonly pollDelayMilliseconds?: number;
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
  readonly prCreation?: PullRequestCreateResult;
  readonly workItemUpdatePost?: WorkItemUpdatePostResult;
  readonly aiContext?: ManualCopyAIContext;
  readonly aiPrompt?: string;
  readonly diffSummary?: DiffSummary;
  readonly aiPatchProposal?: AIPatchProposal;
}

interface TaskSessionHistoryIndex {
  readonly indexVersion: 1;
  readonly updatedAt: string;
  readonly sessions: readonly PersistedTaskSession[];
}

interface GitHubOAuthTokenSet {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly scopes: readonly string[];
  readonly createdAt: string;
}

interface GitHubDeviceCodeResponse {
  readonly device_code?: string;
  readonly user_code?: string;
  readonly verification_uri?: string;
  readonly expires_in?: number;
  readonly interval?: number;
  readonly error?: string;
  readonly error_description?: string;
}

interface GitHubDeviceTokenResponse {
  readonly access_token?: string;
  readonly token_type?: string;
  readonly scope?: string;
  readonly error?: string;
  readonly error_description?: string;
}

interface GitHubAuthenticatedUserResponse {
  readonly login?: string;
  readonly id?: number;
  readonly name?: string | null;
}

interface GitHubAuthenticatedUser {
  readonly login: string;
  readonly id?: number;
  readonly name?: string | null;
}

interface GitHubPullRequestResponse {
  readonly html_url?: string;
  readonly number?: number;
}

interface GitHubRepositoryCoordinates {
  readonly owner: string;
  readonly repo: string;
}

type GitHubDevicePollResult =
  | { readonly status: "pending" }
  | { readonly status: "slow_down" }
  | { readonly status: "error"; readonly detail: string }
  | { readonly status: "complete"; readonly token: GitHubOAuthTokenSet };

const jiraOAuthCredentialAccount = "jira-cloud/oauth";
const githubOAuthCredentialAccount = "github/oauth";
const openAiCredentialAccount = "model/openai/api-key";
const anthropicCredentialAccount = "model/anthropic/api-key";
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
    version: "0.37.0-alpha.0"
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

export async function getModelProviderStatus(env: NodeJS.ProcessEnv = process.env): Promise<ModelProviderStatusResult> {
  const paths = getOpenPomePaths();
  const config = await readConfigIfPresent(paths.configFile);
  const activeProvider = normalizeModelProviderId(config?.activeModelProvider ?? defaultConfig.activeModelProvider);
  const [openaiConfigured, anthropicConfigured, claudeCliStatus] = await Promise.all([
    hasModelProviderApiKey("openai", env),
    hasModelProviderApiKey("anthropic", env),
    getClaudeCliStatus()
  ]);

  return {
    activeProvider,
    providers: [
      {
        provider: "manual-copy",
        displayName: "Manual copy",
        configured: true,
        active: activeProvider === "manual-copy",
        detail: "Ready without an API key. OpenPome prepares safe context for a developer-controlled AI session."
      },
      {
        provider: "openai",
        displayName: "OpenAI",
        configured: openaiConfigured,
        active: activeProvider === "openai",
        detail: openaiConfigured
          ? "OpenAI API key is configured."
          : "Set up with `pome auth ai openai`."
      },
      {
        provider: "anthropic",
        displayName: "Claude",
        configured: anthropicConfigured,
        active: activeProvider === "anthropic",
        detail: anthropicConfigured
          ? "Anthropic Claude API key is configured."
          : "Set up with `pome auth ai claude`."
      },
      {
        provider: "claude-cli",
        displayName: "Claude CLI",
        configured: claudeCliStatus.available,
        active: activeProvider === "claude-cli",
        detail: claudeCliStatus.available
          ? `Claude CLI is available${claudeCliStatus.path ? ` at ${claudeCliStatus.path}` : " on PATH"}.`
          : "Set up Claude Code, then run `pome auth ai claude-cli`."
      }
    ]
  };
}

export async function configureModelProvider(
  provider: string,
  apiKey: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): Promise<ModelProviderAuthResult> {
  const providerId = normalizeModelProviderId(provider);
  const paths = getOpenPomePaths();
  const existingConfig = await readConfigIfPresent(paths.configFile);
  const config: OpenPomeConfig = {
    ...defaultConfig,
    ...existingConfig,
    activeModelProvider: providerId
  };

  if (providerId === "claude-cli") {
    const status = await getClaudeCliStatus();
    if (!status.available) {
      throw new Error("Claude CLI is not available on PATH. Install Claude Code and run `claude auth`, then retry `pome auth ai claude-cli`.");
    }
  }

  if (isApiKeyModelProvider(providerId)) {
    const key = apiKey?.trim() || getModelProviderEnvKey(providerId, env);
    if (!key) {
      throw new Error(`${getModelProviderDisplayName(providerId)} API key is required.`);
    }

    const store = createCredentialStore();
    if (!store.isAvailable()) {
      throw new Error(`Credential store is unavailable: ${store.backend}`);
    }

    await setJsonCredential(store, getModelProviderCredentialAccount(providerId), { apiKey: key });
  }

  await writeConfig(paths.configFile, config);

  return {
    provider: providerId,
    displayName: getModelProviderDisplayName(providerId),
    configured: true,
    configFile: paths.configFile,
    detail:
      providerId === "manual-copy"
        ? "Manual-copy AI mode is active."
        : providerId === "claude-cli"
          ? "Claude CLI is connected and active for AI planning and approval-gated patches."
        : `${getModelProviderDisplayName(providerId)} is connected and active for AI planning.`
  };
}

export async function runDoctor(env: NodeJS.ProcessEnv = process.env): Promise<DoctorResult> {
  const paths = getOpenPomePaths();
  const config = await readConfigIfPresent(paths.configFile);
  const jiraSource = await createJiraSource(env);
  const authStatus = jiraSource.getAuthStatus();
  const reachability = await jiraSource.checkReachability();
  const credentialStore = createCredentialStore();
  const modelStatus = await getModelProviderStatus(env);
  const activeModel = modelStatus.providers.find((provider) => provider.active);

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
      detail: authStatus.configured
        ? authStatus.detail
        : "Jira is not connected. Run `pome onboard` to connect Jira, or `pome demo` to try sample work."
    },
    {
      name: "Work item scope",
      status: config?.activeWorkItemScope ? "ok" : "attention",
      detail: config?.activeWorkItemScope
        ? `${config.activeWorkItemScope.displayName} (${config.activeWorkItemScope.kind})`
        : "Run `pome work`; OpenPome will auto-select one scope or show `pome use <SCOPE_ID>`."
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
      status: activeModel?.configured ? "ok" : "attention",
      detail: activeModel?.detail ?? "Run `pome auth ai status` to inspect AI setup."
    },
    {
      name: "Telemetry",
      status: "ok",
      detail: "Disabled by default. OpenPome does not send analytics, prompts, source code, diffs, or crash data."
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
  const now = new Date().toISOString();
  const existingIndex = await readWorkspaceIndexIfPresent(paths.homeDirectory);
  const linkIndex = await readWorkspaceLinkIndexIfPresent(paths.homeDirectory);
  const currentWorkspace = env["OPENPOME_PREFER_CURRENT_WORKSPACE"] === "1" ? await readCurrentGitWorkspace(env, now) : undefined;
  const index = existingIndex ?? (await scanWorkspaces(env));
  const workspaces = currentWorkspace ? upsertWorkspace(index.workspaces, currentWorkspace) : index.workspaces;
  const candidates = rankWorkspaceCandidates({
    workItemKey: workItem.key,
    workItemTitle: workItem.title,
    labels: workItem.labels,
    components: workItem.components,
    linkedCodeUrls: workItem.links?.filter((link) => link.kind === "code").map((link) => link.url),
    workspaces,
    learnedLinks: linkIndex?.links
  });
  const prioritizedCandidates = currentWorkspace
    ? [
        {
          workspace: currentWorkspace,
          confidence: 0.9,
          reasons: ["current repository"]
        },
        ...candidates.filter((candidate) => candidate.workspace.id !== currentWorkspace.id)
      ]
    : candidates;

  return {
    workItem,
    indexFile: getWorkspaceIndexFile(paths.homeDirectory),
    candidates: prioritizedCandidates
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
  const paths = getOpenPomePaths();
  const active = await readActiveTaskSessionIfPresent(paths.homeDirectory);
  if (active) {
    throw new Error(
      `Active task session already exists for ${active.workItem.key}. ` +
        "Run `pome next`, `pome done`, `pome stop`, or `pome reset` before starting another work item."
    );
  }

  const resolution = await resolveWorkspaceForWorkItem(key, env);

  if (!resolution) {
    return undefined;
  }

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
    approvalHistory: persisted.approvalHistory ?? [],
    testCommandCandidates: persisted.testCommandCandidates ?? [],
    commandApprovalEvidence: persisted.commandApprovalEvidence ?? [],
    testRunEvidence: persisted.testRunEvidence ?? [],
    prDraft: persisted.prDraft,
    workItemUpdateDraft: persisted.workItemUpdateDraft,
    prCreation: persisted.prCreation,
    workItemUpdatePost: persisted.workItemUpdatePost,
    aiContext: persisted.aiContext,
    diffSummary: persisted.diffSummary,
    aiPatchProposal: persisted.aiPatchProposal
  };
}

export async function getAssistantDecision(): Promise<AssistantDecision> {
  const status = await getTaskSessionStatus();

  if (!status.active || !status.session || !status.workItem) {
    const jira = await getJiraAuthStatus();
    if (!jira.configured) {
      return buildAssistantDecision(status, "connect_jira", "Connect Jira", "OpenPome needs Jira access before it can show assigned stories.", [
        "pome onboard",
        "pome auth jira login --listen",
        "pome demo"
      ], [jira.detail]);
    }

    return buildAssistantDecision(status, "select_work", "Choose assigned work", "Fetch assigned work and start one story.", [
      "pome work",
      "pome start <KEY>"
    ]);
  }

  if (!status.plan) {
    return buildAssistantDecision(status, "create_plan", "Create implementation plan", "Build a repo-aware implementation plan from the latest Jira story.", [
      "pome plan"
    ]);
  }

  if (status.planApproval?.status !== "approved") {
    return buildAssistantDecision(status, "approve_plan", "Approve the plan", "Review the implementation plan before OpenPome asks AI for file changes.", [
      "pome approve"
    ], collectPlanReadinessWarnings(status));
  }

  if (status.aiPatchProposal && !status.aiPatchProposal.appliedAt) {
    return buildAssistantDecision(status, "approve_patch", "Approve AI patch", "Review the proposed file changes. OpenPome writes files only after approval.", [
      "pome approve"
    ]);
  }

  const latestPatchAppliedAt = status.aiPatchProposal?.appliedAt;
  const latestRunAfterPatch = getLatestTestRunAfterStatus(status, latestPatchAppliedAt);

  if (latestRunAfterPatch?.status === "failed") {
    return buildAssistantDecision(status, "retry_failed_tests", "Repair failed validation", "The latest approved test failed. Ask AI for a focused repair patch using the failed test evidence.", [
      "pome next"
    ]);
  }

  if (!status.aiPatchProposal && !status.diffSummary) {
    const model = await getModelProviderStatus();
    const activeModel = model.providers.find((provider) => provider.active);
    const aiCanProposePatch = activeModel?.provider !== "manual-copy" && Boolean(activeModel?.configured);
    const blockers = aiCanProposePatch ? collectPlanReadinessWarnings(status) : [
      activeModel?.detail ?? "No AI provider is active.",
      "Connect Claude CLI, Claude API, or OpenAI before AI patch proposals.",
      "Run `pome auth ai claude-cli`, `pome auth ai claude`, or `pome auth ai openai`."
    ];
    return buildAssistantDecision(status, "propose_patch", "Ask AI for the smallest safe patch", "OpenPome will collect bounded repo context, ask the active AI provider for changes, and prepare an approval checkpoint.", [
      "pome next",
      "pome auth ai claude-cli"
    ], blockers);
  }

  if (status.aiPatchProposal?.appliedAt && (status.testCommandCandidates?.length ?? 0) === 0) {
    return buildAssistantDecision(status, "discover_tests", "Discover validation commands", "Find the likely test or validation commands for this workspace.", [
      "pome next"
    ]);
  }

  if ((status.testCommandCandidates?.length ?? 0) > 0 && (status.commandApprovalEvidence?.length ?? 0) === 0) {
    return buildAssistantDecision(status, "approve_test", "Approve one validation command", "OpenPome will not run commands until you approve one candidate.", [
      "pome approve"
    ]);
  }

  if (status.aiPatchProposal?.appliedAt && (status.commandApprovalEvidence?.length ?? 0) > 0 && !latestRunAfterPatch) {
    return buildAssistantDecision(status, "run_tests", "Run approved validation", "Run the approved command and store bounded evidence for PR and Jira updates.", [
      "pome next"
    ]);
  }

  if (!status.prDraft || !status.workItemUpdateDraft) {
    return buildAssistantDecision(status, "prepare_completion", "Prepare completion drafts", "Prepare the PR body and Jira update from the approved plan, diff summary, and validation evidence.", [
      "pome done"
    ]);
  }

  if (!status.prCreation) {
    const github = await getGitHubAuthStatus();
    if (!github.authenticated) {
      return buildAssistantDecision(status, "connect_github", "Connect GitHub", "GitHub is needed before OpenPome can create the pull request.", [
        "pome auth github login",
        "pome pr create"
      ], [github.detail]);
    }

    return buildAssistantDecision(status, "create_pr", "Create the pull request", "OpenPome will create the branch/commit/push and open the PR through native GitHub API or GitHub CLI fallback.", [
      "pome pr create"
    ]);
  }

  if (!status.workItemUpdatePost) {
    return buildAssistantDecision(status, "post_work_update", "Post Jira update", "Post the prepared Jira update with PR and validation context.", [
      "pome work-item post-update"
    ]);
  }

  return buildAssistantDecision(status, "complete", "Story handoff ready", "External completion artifacts are created. Review Jira and GitHub for your team's final workflow.", [
    "pome status"
  ]);
}

export async function getTaskSessionTimeline(): Promise<TaskSessionTimelineResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  return {
    active: Boolean(persisted),
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted?.session,
    events: persisted?.events ?? []
  };
}

export async function getTaskSessionApprovalHistory(): Promise<TaskSessionApprovalHistoryResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  return {
    active: Boolean(persisted),
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted?.session,
    approvals: persisted?.approvalHistory ?? []
  };
}

function buildAssistantDecision(
  status: TaskSessionStatusResult,
  action: AssistantDecisionAction,
  title: string,
  detail: string,
  commands: readonly string[],
  blockers: readonly string[] = []
): AssistantDecision {
  return {
    action,
    title,
    detail,
    commands,
    blockers: blockers.filter((blocker) => blocker.trim().length > 0),
    status
  };
}

function collectPlanReadinessWarnings(status: TaskSessionStatusResult): readonly string[] {
  const warnings: string[] = [];
  if (!status.workspaceCandidate?.workspace.path) {
    warnings.push("No workspace is resolved yet. Start from inside the repo or link the work item to a workspace.");
  } else if (status.workspaceCandidate.confidence < 0.5) {
    warnings.push("Workspace confidence is low. OpenPome can continue, but confirm the repo if the plan looks wrong.");
  }

  if (status.plan?.missingInfo.length) {
    warnings.push(...status.plan.missingInfo.map((item) => `Missing context: ${item}`));
  }

  return warnings;
}

function getLatestTestRunAfterStatus(status: TaskSessionStatusResult, since: string | undefined): TestRunEvidence | undefined {
  const runs = status.testRunEvidence ?? [];
  const filtered = since ? runs.filter((run) => run.finishedAt >= since) : runs;
  return filtered[filtered.length - 1];
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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  const prompt = buildPlanningPrompt({
    title: `${persisted.workItem.key} ${persisted.workItem.title}`,
    context: buildPlanningContext(persisted)
  });
  const plan = await buildImplementationPlan(persisted, prompt);
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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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

export async function createAIPatchProposal(): Promise<AIPatchProposalResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      nextStep: "Run `pome start <KEY>` first."
    };
  }

  if (persisted.aiPatchProposal && !persisted.aiPatchProposal.appliedAt) {
    return {
      active: true,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      session: persisted.session,
      proposal: persisted.aiPatchProposal,
      workspacePath: persisted.workspaceCandidate?.workspace.path,
      nextStep: "Review the proposed file changes, then run `pome approve` to apply them."
    };
  }

  if (!persisted.plan) {
    throw new Error("No implementation plan is available. Run `pome plan` first.");
  }

  if (persisted.planApproval?.status !== "approved") {
    throw new Error("The implementation plan is not approved yet. Run `pome approve` first.");
  }

  const workspacePath = persisted.workspaceCandidate?.workspace.path;
  if (!workspacePath) {
    throw new Error("No workspace path is available for AI implementation. Open the repo and run `pome start <KEY>` again, or link it with `pome workspace link <KEY> <PATH>`.");
  }

  const config = await readConfigIfPresent(paths.configFile);
  const provider = normalizeModelProviderId(config?.activeModelProvider ?? defaultConfig.activeModelProvider);
  if (provider === "manual-copy") {
    throw new Error("Manual-copy mode cannot apply code. Run `pome auth ai openai`, `pome auth ai claude`, or `pome auth ai claude-cli` to enable approval-gated AI patches.");
  }

  const createdAt = new Date().toISOString();
  const retryingFailedTest = hasFailedTestAfterLatestAppliedPatch(persisted);
  const fileContext = await collectPatchContextFiles(workspacePath, persisted);
  const prompt = buildStructuredPatchPrompt(persisted, workspacePath, fileContext);
  const response = await completeModelText(provider, prompt);
  const proposalDraft = parseAIPatchProposal(response, persisted, provider, workspacePath, createdAt);
  const approval = createFileEditApproval(
    persisted,
    proposalDraft,
    createdAt,
    retryingFailedTest
      ? "Developer approval is required before OpenPome writes AI-proposed fixes for the failed test."
      : "Developer approval is required before OpenPome writes AI-proposed file changes."
  );
  const proposal: AIPatchProposal = {
    ...proposalDraft,
    approval
  };
  const session: AITaskSession = {
    ...persisted.session,
    status: retryingFailedTest ? "fixing" : "awaiting_approval",
    updatedAt: createdAt
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    session,
    aiPatchProposal: proposal,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "approval_requested", retryingFailedTest ? "AI test-failure fix proposed" : "AI file changes proposed", createdAt, [
        `Provider: ${getModelProviderDisplayName(provider)}`,
        `Files proposed: ${proposal.files.map((file) => file.path).join(", ") || "none"}`,
        ...approval.details
      ], {
        approvalId: approval.id,
        approvalType: approval.type
      })
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session,
    proposal,
    workspacePath,
    nextStep: "Review the proposed file changes, then run `pome approve` to apply them."
  };
}

export async function approveAndApplyAIPatchProposal(): Promise<AIPatchApplyResult | undefined> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  const proposal = persisted.aiPatchProposal;
  if (!proposal) {
    throw new Error("No AI file changes are waiting for approval. Run `pome next` first.");
  }

  if (proposal.appliedAt) {
    return {
      active: true,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      session: persisted.session,
      proposal,
      summary: persisted.diffSummary,
      nextStep: "Run `pome done` to prepare the PR and Jira update drafts."
    };
  }

  const workspacePath = persisted.workspaceCandidate?.workspace.path;
  if (!workspacePath) {
    throw new Error("No workspace path is available for the active task session.");
  }

  const now = new Date().toISOString();
  const approvedProposal: AIPatchProposal = {
    ...proposal,
    approval: {
      ...proposal.approval,
      status: "approved"
    },
    appliedAt: now
  };

  await applyPatchFiles(workspacePath, approvedProposal.files);
  const summary = await buildDiffSummary(workspacePath, now);
  const session: AITaskSession = {
    ...persisted.session,
    status: "implementing",
    updatedAt: now
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    session,
    aiPatchProposal: approvedProposal,
    diffSummary: summary,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approvedProposal.approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, persisted.workItem.key, "approval_approved", "AI file changes approved and applied", now, [
        `Files applied: ${approvedProposal.files.map((file) => file.path).join(", ")}`,
        `Changed files in git diff: ${summary.files.length}`
      ], {
        approvalId: approvedProposal.approval.id,
        approvalType: approvedProposal.approval.type
      }),
      createSessionEvent(session, persisted.workItem.key, "session_status_changed", "AI patch applied", now, [
        "OpenPome wrote only the approved files and captured a diff summary."
      ], {
        status: session.status
      })
    ])
  });

  return {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session,
    proposal: approvedProposal,
    summary,
    nextStep: "Review the diff, run approved tests, then run `pome done`."
  };
}

export async function discoverTestCommands(): Promise<TestCommandDiscoveryResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const candidates = workspace?.path ? await discoverTestCommandCandidates(workspace.path, persisted) : getFallbackTestCommandCandidates();

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return undefined;
  }

  const candidates = persisted.testCommandCandidates?.length
    ? persisted.testCommandCandidates
    : persisted.workspaceCandidate?.workspace.path
      ? await discoverTestCommandCandidates(persisted.workspaceCandidate.workspace.path, persisted)
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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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
  const storedToken = await readStoredGitHubOAuth();
  if (storedToken?.accessToken) {
    try {
      const user = await fetchGitHubAuthenticatedUser(storedToken.accessToken);
      return {
        provider: "github",
        cliAvailable: await isGitHubCliAvailable(),
        cliAuthenticated: await isGitHubCliAuthenticated(),
        nativeAuthenticated: true,
        authenticated: true,
        username: user.login,
        tokenSource: "openpome",
        detail: `OpenPome GitHub browser login is connected as ${user.login}.`
      };
    } catch (error) {
      const fallback = await getGitHubCliAuthStatus();
      if (fallback.authenticated) {
        return {
          ...fallback,
          detail: `OpenPome GitHub token could not be verified (${summarizeUnknownError(error)}). ${fallback.detail}`
        };
      }

      return {
        ...fallback,
        detail: `OpenPome GitHub token could not be verified (${summarizeUnknownError(error)}). Run \`pome auth github login\` again.`
      };
    }
  }

  return getGitHubCliAuthStatus();
}

export async function createGitHubDeviceLogin(env: NodeJS.ProcessEnv = process.env): Promise<GitHubDeviceLoginResult> {
  const clientId = getGitHubOAuthClientId(env);
  const scope = getGitHubOAuthScope(env);
  const body = new URLSearchParams({
    client_id: clientId,
    scope
  });

  const response = await fetchGitHub("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  }, "start browser login");

  if (!response.ok) {
    throw new Error(await getGitHubStatusGuidance(response, "start browser login"));
  }

  const payload = (await response.json()) as GitHubDeviceCodeResponse;
  if (!payload.device_code || !payload.user_code || !payload.verification_uri) {
    throw new Error("GitHub device login response was incomplete.");
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 900;
  const intervalSeconds = Math.max(1, typeof payload.interval === "number" ? payload.interval : 5);

  return {
    provider: "github",
    deviceCode: payload.device_code,
    userCode: payload.user_code,
    verificationUri: payload.verification_uri,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    intervalSeconds,
    scope,
    detail: "Open the GitHub verification URL, enter the code, then keep this terminal open."
  };
}

export async function completeGitHubDeviceLogin(
  login: GitHubDeviceLoginResult,
  env: NodeJS.ProcessEnv = process.env,
  options: GitHubDeviceCompletionOptions = {}
): Promise<GitHubDeviceCompletionResult> {
  const clientId = getGitHubOAuthClientId(env);
  const deadline = Date.now() + login.expiresIn * 1000;
  let intervalSeconds = login.intervalSeconds;

  while (Date.now() < deadline) {
    await delay(options.pollDelayMilliseconds ?? intervalSeconds * 1000);
    const token = await pollGitHubDeviceAccessToken(clientId, login.deviceCode);

    if (token.status === "pending") {
      continue;
    }

    if (token.status === "slow_down") {
      intervalSeconds += 5;
      continue;
    }

    if (token.status === "error") {
      throw new Error(token.detail);
    }

    const store = createCredentialStore();
    if (!store.isAvailable()) {
      throw new Error(`Credential store is unavailable: ${store.backend}`);
    }

    await setJsonCredential(store, githubOAuthCredentialAccount, token.token);
    const user = await fetchGitHubAuthenticatedUser(token.token.accessToken);

    return {
      provider: "github",
      authenticated: true,
      username: user.login,
      detail: `GitHub browser login completed for ${user.login}.`
    };
  }

  throw new Error("Timed out waiting for GitHub browser login approval.");
}

async function getGitHubCliAuthStatus(): Promise<GitHubAuthStatusResult> {
  try {
    await execFileAsync("gh", ["--version"]);
  } catch {
    return {
      provider: "github",
      cliAvailable: false,
      cliAuthenticated: false,
      nativeAuthenticated: false,
      authenticated: false,
      tokenSource: "none",
      detail: "GitHub CLI is not installed or is not on PATH."
    };
  }

  try {
    await execFileAsync("gh", ["auth", "status", "-h", "github.com"]);
    return {
      provider: "github",
      cliAvailable: true,
      cliAuthenticated: true,
      nativeAuthenticated: false,
      authenticated: true,
      tokenSource: "github-cli",
      detail: "GitHub CLI is authenticated for github.com."
    };
  } catch (error) {
    return {
      provider: "github",
      cliAvailable: true,
      cliAuthenticated: false,
      nativeAuthenticated: false,
      authenticated: false,
      tokenSource: "none",
      detail: summarizeExecError(error) || "GitHub CLI is installed but not authenticated for github.com."
    };
  }
}

export async function createPullRequestDraft(): Promise<PullRequestDraftResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory)
    };
  }

  const now = new Date().toISOString();
  const draft = buildPullRequestDraft(persisted, now, persisted.workspaceCandidate?.workspace.path
    ? await detectPullRequestBaseBranch(persisted.workspaceCandidate.workspace.path)
    : "main");

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

export async function createPullRequest(options: PullRequestCreateOptions = {}): Promise<PullRequestCreateResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      pushed: false,
      draftPr: Boolean(options.draft)
    };
  }

  if (persisted.planApproval?.status !== "approved") {
    throw new Error("Plan approval is required before creating a PR. Run `pome approve` first.");
  }

  const workspacePath = persisted.workspaceCandidate?.workspace.path;
  if (!workspacePath) {
    throw new Error("No workspace path is available for PR creation.");
  }

  if (!persisted.diffSummary) {
    throw new Error("Review the final diff summary before creating a PR. Run `pome diff` first.");
  }

  if (!options.allowUntested && !hasPassedTestEvidence(persisted)) {
    throw new Error("Passed test evidence is required before creating a PR. Run `pome test discover`, `pome approve command`, and `pome test run`, or pass `--allow-untested`.");
  }

  const github = await getGitHubAuthStatus();
  if (!github.authenticated) {
    throw new Error(`${github.detail} Run \`pome auth github login\` first.`);
  }

  const now = new Date().toISOString();
  const baseBranch = options.baseBranch?.trim() || await detectPullRequestBaseBranch(workspacePath);
  const draft = {
    ...(persisted.prDraft ?? buildPullRequestDraft(persisted, now, baseBranch)),
    baseBranch
  };
  const branch = await ensurePullRequestBranch(workspacePath, draft.headBranch);
  const commitMessage = `${persisted.workItem.key}: ${persisted.workItem.title}`;
  const hasChanges = await hasWorkspaceChanges(workspacePath);
  if (!hasChanges) {
    throw new Error("No local changes are available to commit for this PR.");
  }

  await runGitStrict(workspacePath, ["add", "-A"]);
  await runGitStrict(workspacePath, ["commit", "-m", commitMessage]);
  await pushPullRequestBranch(workspacePath, branch);
  const storedGitHubToken = github.tokenSource === "openpome" ? await readStoredGitHubOAuth() : undefined;
  const prProvider = storedGitHubToken?.accessToken ? "github-api" : "github-cli";
  const prUrl = storedGitHubToken?.accessToken
    ? await createGitHubPullRequestWithApi(storedGitHubToken.accessToken, draft, branch, Boolean(options.draft))
    : await createGitHubPullRequestWithCli(workspacePath, draft, branch, Boolean(options.draft));
  const approval = createExternalActionApproval(persisted, "create_pr", now, [
    `Branch: ${branch}`,
    `Commit: ${commitMessage}`,
    `PR: ${prUrl || "created"}`,
    `Provider: ${prProvider}`,
    options.draft ? "Draft PR: yes" : "Draft PR: no"
  ]);
  const result: PullRequestCreateResult = {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    draft,
    approval,
    prUrl: prUrl || undefined,
    provider: prProvider,
    branch,
    commitMessage,
    pushed: true,
    draftPr: Boolean(options.draft),
    createdAt: now
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    prDraft: draft,
    prCreation: result,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "approval_approved", options.draft ? "GitHub draft PR created" : "GitHub PR created", now, [
        `Branch: ${branch}`,
        prUrl ? `PR: ${prUrl}` : `PR created by ${prProvider}`,
        `Provider: ${prProvider}`,
        options.draft ? "Draft PR: yes" : "Draft PR: no"
      ], {
        approvalId: approval.id,
        approvalType: approval.type,
        branch,
        prUrl,
        provider: prProvider
      })
    ])
  });

  return result;
}

export async function createWorkItemUpdateDraft(): Promise<WorkItemUpdateDraftResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

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

export async function postWorkItemUpdate(): Promise<WorkItemUpdatePostResult> {
  const paths = getOpenPomePaths();
  const persisted = await refreshActiveTaskSessionWorkItem(paths.homeDirectory);

  if (!persisted) {
    return {
      active: false,
      sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
      posted: false
    };
  }

  if (persisted.planApproval?.status !== "approved") {
    throw new Error("Plan approval is required before posting a work item update. Run `pome approve` first.");
  }

  const now = new Date().toISOString();
  const draft = persisted.workItemUpdateDraft ?? buildWorkItemUpdateDraft(persisted, now);
  const source = await createJiraSource(process.env);
  if (!source.postUpdate) {
    throw new Error(`Work item source ${source.displayName} does not support posting updates yet.`);
  }

  const posted = await source.postUpdate(persisted.workItem.key, draft.body);
  const approval = createExternalActionApproval(persisted, "update_work_item", now, [
    `Work item: ${persisted.workItem.key}`,
    `Comment: ${posted.commentId ?? "posted"}`,
    posted.self ? `URL: ${posted.self}` : "URL: unavailable"
  ]);
  const result: WorkItemUpdatePostResult = {
    active: true,
    sessionFile: getActiveTaskSessionFile(paths.homeDirectory),
    session: persisted.session,
    workItem: persisted.workItem,
    draft,
    approval,
    posted: true,
    commentId: posted.commentId,
    url: posted.self,
    postedAt: posted.createdAt ?? now
  };

  await writeActiveTaskSession(paths.homeDirectory, {
    ...persisted,
    workItemUpdateDraft: draft,
    workItemUpdatePost: result,
    approvalHistory: appendApprovalHistory(persisted.approvalHistory, approval),
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(persisted.session, persisted.workItem.key, "approval_approved", "Work item update posted", now, [
        `Work item: ${persisted.workItem.key}`,
        posted.commentId ? `Comment: ${posted.commentId}` : "Comment posted"
      ], {
        approvalId: approval.id,
        approvalType: approval.type,
        commentId: posted.commentId ?? ""
      })
    ])
  });

  return result;
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
    nextStep: "Open the authorization URL in a browser, approve access, then run `pome auth jira callback <CODE>` for manual mode."
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

  console.log("Jira browser login");
  console.log("Status: experimental until a real Atlassian OAuth app smoke test is completed.");
  console.log("");
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

function normalizeModelProviderId(provider: string | undefined): ModelProviderId {
  switch ((provider ?? "manual-copy").toLowerCase()) {
    case "openai":
      return "openai";
    case "anthropic":
    case "claude":
      return "anthropic";
    case "claude-cli":
    case "claude_code":
    case "claude-code":
      return "claude-cli";
    case "manual":
    case "manual-copy":
      return "manual-copy";
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

function getModelProviderDisplayName(provider: ModelProviderId): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Claude";
    case "claude-cli":
      return "Claude CLI";
    case "manual-copy":
      return "Manual copy";
  }
}

function getModelProviderCredentialAccount(provider: ApiKeyModelProviderId): string {
  return provider === "openai" ? openAiCredentialAccount : anthropicCredentialAccount;
}

function getModelProviderEnvKey(provider: ApiKeyModelProviderId, env: NodeJS.ProcessEnv): string | undefined {
  return provider === "openai" ? env["OPENAI_API_KEY"] : env["ANTHROPIC_API_KEY"];
}

async function hasModelProviderApiKey(provider: ApiKeyModelProviderId, env: NodeJS.ProcessEnv): Promise<boolean> {
  return Boolean(await getModelProviderApiKey(provider, env));
}

async function getModelProviderApiKey(
  provider: ApiKeyModelProviderId,
  env: NodeJS.ProcessEnv = process.env
): Promise<string | undefined> {
  const envKey = getModelProviderEnvKey(provider, env);
  if (envKey) {
    return envKey;
  }

  const store = createCredentialStore();
  if (!store.isAvailable()) {
    return undefined;
  }

  const stored = await getJsonCredential<{ readonly apiKey?: string }>(store, getModelProviderCredentialAccount(provider));
  return stored?.apiKey;
}

function isApiKeyModelProvider(provider: ModelProviderId): provider is ApiKeyModelProviderId {
  return provider === "openai" || provider === "anthropic";
}

async function getClaudeCliStatus(): Promise<ClaudeCliStatus> {
  try {
    const lookupCommand = process.platform === "win32" ? "where claude" : "command -v claude";
    const { stdout } = await execAsync(lookupCommand, {
      timeout: 5_000,
      maxBuffer: 64 * 1024
    });
    const path = stdout.split(/\r?\n/u).map((line) => line.trim()).find(Boolean);
    return {
      available: Boolean(path),
      path
    };
  } catch {
    try {
      await execFileAsync("claude", ["--version"], {
        timeout: 5_000,
        maxBuffer: 64 * 1024
      });
      return {
        available: true
      };
    } catch {
      return {
        available: false
      };
    }
  }
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

async function readStoredGitHubOAuth(): Promise<GitHubOAuthTokenSet | undefined> {
  const store = createCredentialStore();

  if (!store.isAvailable()) {
    return undefined;
  }

  return getJsonCredential<GitHubOAuthTokenSet>(store, githubOAuthCredentialAccount);
}

function getGitHubOAuthClientId(env: NodeJS.ProcessEnv): string {
  const clientId = env["OPENPOME_GITHUB_OAUTH_CLIENT_ID"]?.trim();
  if (!clientId) {
    throw new Error("OPENPOME_GITHUB_OAUTH_CLIENT_ID is required for native GitHub browser login. Without it, use `gh auth login` as the fallback.");
  }

  return clientId;
}

function getGitHubOAuthScope(env: NodeJS.ProcessEnv): string {
  return env["OPENPOME_GITHUB_OAUTH_SCOPE"]?.trim() || "repo read:user";
}

async function isGitHubCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function isGitHubCliAuthenticated(): Promise<boolean> {
  try {
    await execFileAsync("gh", ["auth", "status", "-h", "github.com"]);
    return true;
  } catch {
    return false;
  }
}

async function fetchGitHubAuthenticatedUser(accessToken: string): Promise<GitHubAuthenticatedUser> {
  const response = await fetchGitHub("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  }, "verify authenticated user");

  if (!response.ok) {
    throw new Error(await getGitHubStatusGuidance(response, "verify authenticated user"));
  }

  const payload = (await response.json()) as GitHubAuthenticatedUserResponse;
  if (!payload.login) {
    throw new Error("GitHub user lookup response was incomplete.");
  }

  return {
    login: payload.login,
    id: payload.id,
    name: payload.name
  };
}

async function pollGitHubDeviceAccessToken(clientId: string, deviceCode: string): Promise<GitHubDevicePollResult> {
  const response = await fetchGitHub("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code"
    })
  }, "complete browser login");

  if (!response.ok) {
    return {
      status: "error",
      detail: await getGitHubStatusGuidance(response, "complete browser login")
    };
  }

  const payload = (await response.json()) as GitHubDeviceTokenResponse;
  if (payload.error) {
    if (payload.error === "authorization_pending") {
      return { status: "pending" };
    }

    if (payload.error === "slow_down") {
      return { status: "slow_down" };
    }

    return {
      status: "error",
      detail: payload.error_description || `GitHub device login failed: ${payload.error}`
    };
  }

  if (!payload.access_token) {
    return {
      status: "error",
      detail: "GitHub device token response did not include an access token."
    };
  }

  return {
    status: "complete",
    token: {
      accessToken: payload.access_token,
      tokenType: payload.token_type || "bearer",
      scopes: parseGitHubScopes(payload.scope),
      createdAt: new Date().toISOString()
    }
  };
}

function parseGitHubScopes(scope: string | undefined): readonly string[] {
  return (scope ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

async function fetchGitHub(input: string | URL, init: RequestInit | undefined, action: string): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw new Error(getGitHubNetworkGuidance(action, error));
  }
}

async function getGitHubStatusGuidance(response: Response, action: string): Promise<string> {
  const body = await safeResponseText(response);
  const detail = body ? ` Detail: ${summarizeProviderBody(body)}` : "";

  if (response.status === 401) {
    return `GitHub ${action} was unauthorized (401). Run \`pome auth github login\` again, or \`gh auth login\` if you use the GitHub CLI fallback.${detail}`;
  }

  if (response.status === 403) {
    return `GitHub ${action} was forbidden (403). Check repository permission, organization SSO, token scopes, branch protection, and whether the token has \`repo\` access.${detail}`;
  }

  if (response.status === 404) {
    return `GitHub ${action} could not find the repository or resource (404). Check the git remote, repository visibility, GitHub Enterprise host, and account access.${detail}`;
  }

  if (response.status === 422) {
    return `GitHub ${action} was rejected (422). Check whether the branch already has an open PR, base/head branch names are valid, and the repo allows PRs.${detail}`;
  }

  if (response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = response.headers.get("x-ratelimit-reset");
    const resetDetail = reset ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toISOString()}.` : "";
    return `GitHub rate limit reached while trying to ${action}.${resetDetail} Wait and retry, or use a token with the right organization access.${detail}`;
  }

  if (response.status >= 500) {
    return `GitHub ${action} failed with ${response.status} ${response.statusText}. GitHub may be unavailable, blocked by a proxy, or unreachable from this network.${detail}`;
  }

  return `GitHub ${action} failed: ${response.status} ${response.statusText}.${detail}`;
}

function getGitHubNetworkGuidance(action: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return [
    `GitHub ${action} could not reach GitHub.`,
    "Check internet access, VPN split tunneling, proxy/firewall rules, corporate certificate trust, and GitHub Enterprise host configuration.",
    "Run `pome auth github status` after fixing network access.",
    `Detail: ${detail}`
  ].join(" ");
}

function summarizeUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    return {
      ...defaultConfig,
      ...(JSON.parse(content) as Partial<OpenPomeConfig>),
      telemetryEnabled: false
    };
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

async function refreshActiveTaskSessionWorkItem(homeDirectory: string): Promise<PersistedTaskSession | undefined> {
  const persisted = await readActiveTaskSessionIfPresent(homeDirectory);

  if (!persisted) {
    return undefined;
  }

  return refreshPersistedTaskSessionWorkItem(homeDirectory, persisted);
}

async function refreshPersistedTaskSessionWorkItem(
  homeDirectory: string,
  persisted: PersistedTaskSession
): Promise<PersistedTaskSession> {
  let latest: WorkItem | undefined;

  try {
    const source = await createJiraSource(process.env);
    latest = await source.getWorkItem(persisted.workItem.key);
  } catch {
    return persisted;
  }

  if (!latest) {
    return persisted;
  }

  const previousFullFingerprint = getWorkItemFullFingerprint(persisted.workItem);
  const latestFullFingerprint = getWorkItemFullFingerprint(latest);
  if (previousFullFingerprint === latestFullFingerprint) {
    return persisted;
  }

  const materialChanged =
    getWorkItemMaterialFingerprint(persisted.workItem) !== getWorkItemMaterialFingerprint(latest);
  const shouldInvalidate = materialChanged && persisted.session.status !== "completed";
  const now = new Date().toISOString();
  const session: AITaskSession = {
    ...persisted.session,
    status: shouldInvalidate ? "planning" : persisted.session.status,
    updatedAt: now
  };
  const refreshDetails = [
    "OpenPome refreshed the active story from Jira before continuing.",
    ...summarizeWorkItemRefreshChanges(persisted.workItem, latest),
    ...(shouldInvalidate
      ? ["Story scope changed, so the current plan and pending AI outputs were reset."]
      : ["Only non-planning fields changed; existing plan state was kept."])
  ];
  const common = {
    version: persisted.version,
    session,
    workItem: latest,
    workspaceCandidate: persisted.workspaceCandidate,
    events: appendSessionEvents(persisted.events, [
      createSessionEvent(session, latest.key, "work_item_refreshed", "Jira story refreshed", now, refreshDetails, {
        materialChanged: String(materialChanged),
        previousStatus: persisted.workItem.status,
        latestStatus: latest.status
      })
    ]),
    approvalHistory: persisted.approvalHistory ?? [],
    prCreation: persisted.prCreation,
    workItemUpdatePost: persisted.workItemUpdatePost
  } satisfies PersistedTaskSession;
  const refreshed: PersistedTaskSession = shouldInvalidate
    ? common
    : {
        ...persisted,
        session,
        workItem: latest,
        events: common.events
      };

  await writeActiveTaskSession(homeDirectory, refreshed);
  return refreshed;
}

function getWorkItemMaterialFingerprint(item: WorkItem): string {
  return stableStringify({
    key: item.key,
    source: item.source,
    type: item.type,
    title: item.title,
    description: item.description ?? "",
    priority: item.priority ?? "",
    iteration: item.iteration ?? "",
    parentKey: item.parentKey ?? "",
    labels: normalizeStringList(item.labels),
    components: normalizeStringList(item.components),
    links: normalizeWorkItemLinks(item.links),
    subtasks: normalizeWorkItemSummaries(item.subtasks)
  });
}

function getWorkItemFullFingerprint(item: WorkItem): string {
  return stableStringify({
    material: JSON.parse(getWorkItemMaterialFingerprint(item)) as unknown,
    status: item.status,
    assignee: item.assignee ?? ""
  });
}

function summarizeWorkItemRefreshChanges(previous: WorkItem, latest: WorkItem): readonly string[] {
  const changes = [
    previous.title !== latest.title ? "Title changed." : undefined,
    (previous.description ?? "") !== (latest.description ?? "") ? "Description or acceptance criteria changed." : undefined,
    previous.status !== latest.status ? `Status changed: ${previous.status} -> ${latest.status}.` : undefined,
    (previous.priority ?? "") !== (latest.priority ?? "") ? `Priority changed: ${previous.priority ?? "none"} -> ${latest.priority ?? "none"}.` : undefined,
    (previous.assignee ?? "") !== (latest.assignee ?? "") ? `Assignee changed: ${previous.assignee ?? "none"} -> ${latest.assignee ?? "none"}.` : undefined,
    stableStringify(normalizeStringList(previous.labels)) !== stableStringify(normalizeStringList(latest.labels)) ? "Labels changed." : undefined,
    stableStringify(normalizeStringList(previous.components)) !== stableStringify(normalizeStringList(latest.components)) ? "Components changed." : undefined,
    stableStringify(normalizeWorkItemLinks(previous.links)) !== stableStringify(normalizeWorkItemLinks(latest.links)) ? "Linked work changed." : undefined,
    stableStringify(normalizeWorkItemSummaries(previous.subtasks)) !== stableStringify(normalizeWorkItemSummaries(latest.subtasks)) ? "Subtasks changed." : undefined
  ].filter((change): change is string => Boolean(change));

  return changes.length ? changes.slice(0, 8) : ["Jira returned updated story metadata."];
}

function normalizeStringList(values: readonly string[] | undefined): readonly string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function normalizeWorkItemLinks(links: WorkItem["links"]): readonly unknown[] {
  return (links ?? [])
    .map((link) => ({
      kind: link.kind,
      url: link.url,
      title: link.title ?? ""
    }))
    .sort((left, right) => `${left.kind}:${left.url}:${left.title}`.localeCompare(`${right.kind}:${right.url}:${right.title}`));
}

function normalizeWorkItemSummaries(summaries: WorkItem["subtasks"]): readonly unknown[] {
  return (summaries ?? [])
    .map((summary) => ({
      key: summary.key,
      type: summary.type,
      title: summary.title,
      status: summary.status
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
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

async function readCurrentGitWorkspace(env: NodeJS.ProcessEnv, scannedAt: string): Promise<Workspace | undefined> {
  const cwd = env["INIT_CWD"] ?? process.cwd();

  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      timeout: 5_000
    });
    const root = stdout.trim();
    if (!root) {
      return undefined;
    }

    return readGitWorkspace(root, scannedAt);
  } catch {
    return undefined;
  }
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
  const missingRequirementSignals = detectMissingRequirementSignals(session.workItem);
  const context = [
    `Work item type: ${session.workItem.type}`,
    `Status: ${session.workItem.status}`,
    session.workItem.priority ? `Priority: ${session.workItem.priority}` : undefined,
    session.workItem.description ? `Description length: ${session.workItem.description.length} characters` : "Description: not provided",
    hasExplicitAcceptanceCriteria(session.workItem)
      ? "Acceptance criteria: detected in work item text"
      : "Acceptance criteria: not explicit; identify missing acceptance criteria before implementation",
    missingRequirementSignals.length ? `Missing requirement signals: ${missingRequirementSignals.join("; ")}` : undefined,
    session.workItem.labels?.length ? `Labels: ${session.workItem.labels.join(", ")}` : undefined,
    session.workItem.components?.length ? `Components: ${session.workItem.components.join(", ")}` : undefined,
    session.workItem.links?.length ? `Linked references: ${session.workItem.links.map((link) => `${link.kind}:${link.title ?? link.url}`).join("; ")}` : undefined,
    session.workItem.subtasks?.length ? `Subtasks: ${session.workItem.subtasks.map((subtask) => `${subtask.key} ${subtask.status} ${subtask.title}`).join("; ")}` : undefined,
    workspace ? `Workspace: ${workspace.name}` : "Workspace: unresolved",
    workspace?.path ? `Workspace path: ${workspace.path}` : undefined,
    session.workspaceCandidate ? `Workspace confidence: ${Math.round(session.workspaceCandidate.confidence * 100)}%` : undefined,
    session.workspaceCandidate?.reasons.length ? `Workspace reasons: ${session.workspaceCandidate.reasons.join("; ")}` : undefined,
    workspace?.packageNames?.length ? `Workspace packages: ${workspace.packageNames.slice(0, 8).join(", ")}` : undefined,
    workspace?.readmeKeywords?.length ? `README signals: ${workspace.readmeKeywords.slice(0, 12).join(", ")}` : undefined,
    workspace?.codeownersKeywords?.length ? `Ownership signals: ${workspace.codeownersKeywords.slice(0, 12).join(", ")}` : undefined,
    workspace?.recentBranches?.length ? `Recent branches: ${workspace.recentBranches.slice(0, 8).join(", ")}` : undefined,
    workspace?.recentCommitRefs?.length ? `Recent work refs: ${workspace.recentCommitRefs.slice(0, 12).join(", ")}` : undefined
  ];

  return context.filter((item): item is string => Boolean(item));
}

function buildInitialImplementationPlan(
  workItem: WorkItem,
  workspaceCandidate: WorkspaceCandidate | undefined
): ImplementationPlan {
  const workspace = workspaceCandidate?.workspace;
  const hasWorkspace = Boolean(workspace?.path);
  const missingRequirementSignals = detectMissingRequirementSignals(workItem);
  const missingInfo = [
    hasWorkspace ? undefined : "No workspace candidate is selected yet.",
    ...missingRequirementSignals
  ].filter((item): item is string => Boolean(item));

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
    commandsToRun: ["pome approve", "pnpm validate"],
    risks: [
      "Workspace resolution may be incomplete until real GitHub and historical session signals are added.",
      "Manual-copy mode uses deterministic planning; connect OpenAI or Claude for AI-assisted planning and patch proposals."
    ],
    missingInfo
  };
}

function hasExplicitAcceptanceCriteria(workItem: WorkItem): boolean {
  const text = [workItem.title, workItem.description].filter(Boolean).join("\n").toLowerCase();
  return /\b(acceptance criteria|acceptance|criteria|given\b.*\bwhen\b.*\bthen|expected result|definition of done|done when|should|expected behavior|success criteria|verify|validation)\b/su.test(text);
}

function detectMissingRequirementSignals(workItem: WorkItem): readonly string[] {
  const text = [workItem.title, workItem.description].filter(Boolean).join("\n").trim();
  const lower = text.toLowerCase();
  const signals: string[] = [];

  if (!workItem.description || workItem.description.trim().length < 40) {
    signals.push("Work item description is short; confirm exact scope before broad edits.");
  }

  if (!hasExplicitAcceptanceCriteria(workItem)) {
    signals.push("Acceptance criteria are not explicit in the work item.");
  }

  if (workItem.type === "bug") {
    const hasExpected = /\b(expected|should happen|desired behavior|correct behavior)\b/u.test(lower);
    const hasActual = /\b(actual|currently|observed|happens now|error|failure|failed)\b/u.test(lower);
    const hasRepro = /\b(steps to reproduce|repro|reproduce|given\b.*\bwhen\b.*\bthen)\b/su.test(lower);
    if (!hasExpected || !hasActual) {
      signals.push("Bug report is missing clear expected vs actual behavior.");
    }
    if (!hasRepro) {
      signals.push("Bug report has no clear reproduction steps.");
    }
  }

  if (!workItem.labels?.length && !workItem.components?.length) {
    signals.push("No labels or components are available to narrow the code area.");
  }

  if (!workItem.links?.some((link) => link.kind === "code" || link.kind === "pull_request" || link.kind === "document")) {
    signals.push("No linked code, pull request, or reference document is attached.");
  }

  return Array.from(new Set(signals)).slice(0, 6);
}

async function buildImplementationPlan(persisted: PersistedTaskSession, prompt: string): Promise<ImplementationPlan> {
  const config = await readConfigIfPresent(getOpenPomePaths().configFile);
  const provider = normalizeModelProviderId(config?.activeModelProvider ?? defaultConfig.activeModelProvider);

  if (provider === "manual-copy") {
    return buildInitialImplementationPlan(persisted.workItem, persisted.workspaceCandidate);
  }

  const response = await completeModelPlan(provider, prompt);

  return parseImplementationPlan(response, persisted.workItem, persisted.workspaceCandidate, provider);
}

async function completeModelPlan(provider: Exclude<ModelProviderId, "manual-copy">, prompt: string): Promise<string> {
  return completeModelText(provider, buildStructuredPlanPrompt(prompt));
}

async function completeModelText(provider: Exclude<ModelProviderId, "manual-copy">, prompt: string): Promise<string> {
  if (provider === "openai" || provider === "anthropic") {
    const apiKey = await getModelProviderApiKey(provider);
    if (!apiKey) {
      throw new Error(`${getModelProviderDisplayName(provider)} is active, but no API key is configured. Run \`pome auth ai ${provider === "anthropic" ? "claude" : provider}\`.`);
    }

    return provider === "openai"
      ? completeOpenAIText(prompt, apiKey)
      : completeAnthropicText(prompt, apiKey);
  }

  return completeClaudeCliText(prompt);
}

async function completeOpenAIText(prompt: string, apiKey: string): Promise<string> {
  const response = await fetchModelProvider("OpenAI", "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env["OPENPOME_OPENAI_MODEL"] ?? "gpt-5",
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(await getModelProviderStatusGuidance("OpenAI", response, "generate a plan or patch"));
  }

  const body = await response.json() as { readonly output_text?: unknown; readonly output?: unknown };
  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const output = Array.isArray(body.output) ? body.output : [];
  return output
    .flatMap((item) => typeof item === "object" && item && "content" in item && Array.isArray(item.content) ? item.content : [])
    .map((content) => typeof content === "object" && content && "text" in content ? String(content.text) : "")
    .filter(Boolean)
    .join("\n");
}

async function completeAnthropicText(prompt: string, apiKey: string): Promise<string> {
  const response = await fetchModelProvider("Claude", "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env["OPENPOME_ANTHROPIC_MODEL"] ?? "claude-sonnet-4-20250514",
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await getModelProviderStatusGuidance("Claude", response, "generate a plan or patch"));
  }

  const body = await response.json() as { readonly content?: unknown };
  const content = Array.isArray(body.content) ? body.content : [];
  return content
    .map((item) => typeof item === "object" && item && "text" in item ? String(item.text) : "")
    .filter(Boolean)
    .join("\n");
}

async function completeClaudeCliText(prompt: string): Promise<string> {
  const status = await getClaudeCliStatus();
  if (!status.available) {
    throw new Error("Claude CLI is not available on PATH. Install Claude Code and run `claude auth`, then retry `pome auth ai claude-cli`.");
  }

  const args = [
    "--print",
    "--output-format",
    "text",
    "--permission-mode",
    "plan",
    "--no-session-persistence",
    "--tools",
    "",
    "--model",
    process.env["OPENPOME_CLAUDE_CLI_MODEL"] ?? "sonnet",
    prompt
  ];

  try {
    const { stdout } = await execFileAsync("claude", args, {
      timeout: modelProviderTimeoutMs,
      maxBuffer: modelProviderMaxBufferBytes
    });
    const text = stdout.trim();
    if (!text) {
      throw new Error("Claude CLI returned an empty response.");
    }
    return text;
  } catch (error) {
    throw new Error(`Claude CLI request failed: ${summarizeExecError(error) || String(error)}`);
  }
}

async function fetchModelProvider(provider: "OpenAI" | "Claude", input: string | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${provider} could not be reached. Check internet/VPN/proxy access, corporate certificate trust, and provider allowlists. Use \`pome auth ai status\` to verify setup. Detail: ${detail}`);
  }
}

async function getModelProviderStatusGuidance(
  provider: "OpenAI" | "Claude",
  response: Response,
  action: string
): Promise<string> {
  const body = await safeResponseText(response);
  const detail = body ? ` Detail: ${summarizeProviderBody(body)}` : "";
  const authCommand = provider === "OpenAI" ? "pome auth ai openai" : "pome auth ai claude";

  if (response.status === 401) {
    return `${provider} ${action} was unauthorized (401). Reconnect with \`${authCommand}\` or verify the provider API key in your OS credential store/environment.${detail}`;
  }

  if (response.status === 403) {
    return `${provider} ${action} was forbidden (403). Check organization policy, model access, provider project permissions, and corporate egress rules.${detail}`;
  }

  if (response.status === 404) {
    return `${provider} ${action} could not find the configured model or endpoint (404). Check OPENPOME_${provider === "OpenAI" ? "OPENAI_MODEL" : "ANTHROPIC_MODEL"} and provider access.${detail}`;
  }

  if (response.status === 408 || response.status === 409 || response.status === 429) {
    return `${provider} is busy or rate limited (${response.status}). Wait and retry, or choose a smaller model/context. OpenPome has not written files.${detail}`;
  }

  if (response.status >= 500) {
    return `${provider} failed with ${response.status} ${response.statusText}. Provider service may be unavailable or blocked by your network/proxy. Retry later.${detail}`;
  }

  return `${provider} ${action} failed: ${response.status} ${response.statusText}.${detail}`;
}

function buildStructuredPlanPrompt(prompt: string): string {
  return [
    "You are OpenPome's planning engine.",
    "Plan like a senior developer assistant working from a live corporate work item.",
    "Prefer the smallest repo-aware change that satisfies the work item. Call out unclear scope instead of inventing requirements.",
    "Use workspace metadata, labels, linked references, ownership signals, and recent branch/commit refs to rank likely files.",
    "Suggest targeted validation commands before broad commands when the work item points to a specific component.",
    "Return only compact JSON with this exact shape:",
    "{\"summary\":\"...\",\"assumptions\":[\"...\"],\"steps\":[{\"id\":\"1\",\"title\":\"...\",\"detail\":\"...\"}],\"filesLikelyChanged\":[\"...\"],\"commandsToRun\":[\"...\"],\"risks\":[\"...\"],\"missingInfo\":[\"...\"]}",
    "Rules:",
    "- Do not include source code, full diffs, secrets, or markdown fences.",
    "- Put missing acceptance criteria, missing repro steps, unclear expected behavior, and missing code links in missingInfo.",
    "- Keep filesLikelyChanged to relative paths or package/module hints when exact files are unknown.",
    "- Keep commandsToRun executable from the selected workspace.",
    "",
    prompt
  ].join("\n");
}

function parseImplementationPlan(
  value: string,
  workItem: WorkItem,
  workspaceCandidate: WorkspaceCandidate | undefined,
  provider: ModelProviderId
): ImplementationPlan {
  const fallback = buildInitialImplementationPlan(workItem, workspaceCandidate);
  const json = extractJsonObject(value);

  if (!json) {
    return {
      ...fallback,
      risks: [`${getModelProviderDisplayName(provider)} returned a non-JSON plan; deterministic fallback was used.`, ...fallback.risks]
    };
  }

  try {
    const parsed = JSON.parse(json) as Partial<ImplementationPlan>;
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps
          .map((step, index) => ({
            id: typeof step?.id === "string" ? step.id : String(index + 1),
            title: typeof step?.title === "string" ? step.title : `Step ${index + 1}`,
            detail: typeof step?.detail === "string" ? step.detail : undefined
          }))
          .filter((step) => step.title.trim().length > 0)
      : fallback.steps;

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      assumptions: stringArrayOr(parsed.assumptions, fallback.assumptions),
      steps: steps.length > 0 ? steps : fallback.steps,
      filesLikelyChanged: stringArrayOr(parsed.filesLikelyChanged, fallback.filesLikelyChanged),
      commandsToRun: stringArrayOr(parsed.commandsToRun, fallback.commandsToRun),
      risks: stringArrayOr(parsed.risks, fallback.risks),
      missingInfo: stringArrayOr(parsed.missingInfo, fallback.missingInfo)
    };
  } catch {
    return {
      ...fallback,
      risks: [`${getModelProviderDisplayName(provider)} returned invalid JSON; deterministic fallback was used.`, ...fallback.risks]
    };
  }
}

function extractJsonObject(value: string): string | undefined {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  return start >= 0 && end > start ? value.slice(start, end + 1) : undefined;
}

function stringArrayOr(value: unknown, fallback: readonly string[]): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

interface PatchContextFile {
  readonly path: string;
  readonly content: string;
  readonly truncated: boolean;
  readonly score: number;
  readonly reason: string;
}

type AIPatchProposalDraft = Omit<AIPatchProposal, "approval">;
interface PatchContextCandidate {
  readonly filePath: string;
  readonly score: number;
  readonly reason: string;
}

const maxPatchContextFiles = 12;
const maxPatchContextBytesPerFile = 16 * 1024;
const maxPatchContextTotalBytes = 64 * 1024;
const maxPatchProposalFiles = 8;
const maxPatchProposalBytesPerFile = 256 * 1024;
const modelProviderTimeoutMs = 120_000;
const modelProviderMaxBufferBytes = 2 * 1024 * 1024;
const sensitivePathFragments = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".npmrc",
  ".yarnrc",
  ".pnpmrc",
  ".pypirc",
  ".netrc",
  ".ssh",
  ".aws",
  ".gcp",
  ".azure",
  ".kube",
  ".docker",
  "credentials",
  "credential",
  "secrets",
  "secret",
  "private-key",
  "private_key",
  "id_rsa",
  "id_dsa",
  "id_ed25519",
  ".pem",
  ".key",
  ".crt",
  ".p12",
  ".pfx"
];
const sensitiveContentPatterns: readonly RegExp[] = [
  /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/u,
  /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|OPENPOME_JIRA_API_TOKEN|OPENPOME_GITHUB_TOKEN|GITHUB_TOKEN|NPM_TOKEN)\s*=\s*['"]?[^'"\s]+/iu,
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*['"][^'"]{12,}['"]/iu,
  /\b(?:ghp|github_pat|npm|sk|sk-ant|xox[baprs])-?[A-Za-z0-9_=-]{20,}\b/u
];

async function collectPatchContextFiles(workspacePath: string, session: PersistedTaskSession): Promise<readonly PatchContextFile[]> {
  const candidates: PatchContextCandidate[] = [];
  for (const filePath of session.plan?.filesLikelyChanged ?? []) {
    const normalized = normalizeWorkspaceRelativePath(workspacePath, filePath, "skip");
    if (normalized && normalized !== ".") {
      candidates.push({
        filePath: normalized,
        score: 80,
        reason: "AI plan marked this file as likely impacted."
      });
    }
  }

  candidates.push(
    { filePath: "package.json", score: 24, reason: "Package metadata helps infer scripts, package boundaries, and runtime." },
    { filePath: "README.md", score: 18, reason: "README gives repository purpose and local validation hints." },
    { filePath: "AGENTS.md", score: 18, reason: "Agent instructions constrain safe implementation style." },
    { filePath: "CODEOWNERS", score: 14, reason: "Ownership metadata helps identify relevant domains and review paths." }
  );

  const trackedFiles = await listTrackedWorkspaceFiles(workspacePath);
  const tokens = tokenizePatchSearchText([
    session.workItem.key,
    session.workItem.title,
    session.workItem.description,
    session.plan?.summary,
    ...(session.plan?.steps.map((step) => `${step.title} ${step.detail ?? ""}`) ?? []),
    ...(session.workItem.labels ?? []),
    ...(session.workItem.components ?? []),
    ...(session.workspaceCandidate?.workspace.packageNames ?? []),
    ...(session.workspaceCandidate?.workspace.readmeKeywords ?? [])
  ].filter((value): value is string => Boolean(value)).join(" "));

  const planHints = new Set((session.plan?.filesLikelyChanged ?? [])
    .map((filePath) => normalizeWorkspaceRelativePath(workspacePath, filePath, "skip"))
    .filter((filePath): filePath is string => Boolean(filePath)));
  const rankedTrackedFiles = trackedFiles
    .map((filePath) => ({
      filePath,
      score: scorePatchContextFile(filePath, tokens, planHints),
      reason: describePatchContextReason(filePath, tokens, planHints)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath));

  for (const candidate of rankedTrackedFiles.slice(0, 40)) {
    candidates.push(candidate);
  }

  const selected: PatchContextFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;

  for (const candidate of candidates) {
    if (selected.length >= maxPatchContextFiles || totalBytes >= maxPatchContextTotalBytes) {
      break;
    }

    const relativePath = normalizeWorkspaceRelativePath(workspacePath, candidate.filePath, "skip");
    if (!relativePath || seen.has(relativePath) || isSensitiveWorkspacePath(relativePath)) {
      continue;
    }

    seen.add(relativePath);
    const absolutePath = resolve(workspacePath, relativePath);
    try {
      const content = await readFile(absolutePath, "utf8");
      if (content.includes("\u0000") || containsSensitiveContent(content)) {
        continue;
      }

      const remainingBytes = maxPatchContextTotalBytes - totalBytes;
      const maxBytes = Math.min(maxPatchContextBytesPerFile, remainingBytes);
      const sliced = content.slice(0, maxBytes);
      totalBytes += Buffer.byteLength(sliced, "utf8");
      selected.push({
        path: relativePath,
        content: sliced,
        truncated: Buffer.byteLength(content, "utf8") > Buffer.byteLength(sliced, "utf8"),
        score: candidate.score,
        reason: candidate.reason
      });
    } catch {
      // Missing files from the AI plan are still useful as create candidates, but not as context.
    }
  }

  return selected;
}

async function listTrackedWorkspaceFiles(workspacePath: string): Promise<readonly string[]> {
  const output = await runGit(workspacePath, ["ls-files"]);
  const trackedFiles = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => !isSensitiveWorkspacePath(filePath))
    .slice(0, 1000);

  return trackedFiles.length > 0 ? trackedFiles : listWorkspaceFilesFallback(workspacePath);
}

async function listWorkspaceFilesFallback(workspacePath: string): Promise<readonly string[]> {
  const collected: string[] = [];
  const queue: string[] = ["."];
  const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo", ".cache", "vendor"]);

  while (queue.length > 0 && collected.length < 1000) {
    const current = queue.shift() ?? ".";
    const absoluteCurrent = resolve(workspacePath, current);
    let directory;
    try {
      directory = await opendir(absoluteCurrent);
    } catch {
      continue;
    }

    for await (const entry of directory) {
      const relativePath = current === "." ? entry.name : `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name) && !isSensitiveWorkspacePath(relativePath)) {
          queue.push(relativePath);
        }
        continue;
      }

      if (entry.isFile() && !isSensitiveWorkspacePath(relativePath)) {
        collected.push(relativePath);
        if (collected.length >= 1000) {
          break;
        }
      }
    }
  }

  return collected;
}

function tokenizePatchSearchText(value: string): readonly string[] {
  return Array.from(new Set(value.toLowerCase().split(/[^a-z0-9]+/u).filter((token) => token.length >= 3))).slice(0, 20);
}

function scorePatchContextFile(
  filePath: string,
  tokens: readonly string[],
  planHints: ReadonlySet<string>
): number {
  const lower = filePath.toLowerCase();
  let score = 0;

  if (planHints.has(filePath)) {
    score += 40;
  }

  for (const token of tokens) {
    if (lower.includes(token)) {
      score += 5;
    }
  }

  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|java|kt|go|rs|rb|php|cs|swift)$/u.test(lower)) {
    score += 4;
  }

  if (/(src|app|lib|packages|services|connectors|components|routes|api)\//u.test(lower)) {
    score += 4;
  }

  if (/(test|spec|__tests__|tests)\b/u.test(lower)) {
    score += 5;
  }

  if (/(readme|package\.json|codeowners|agents\.md|tsconfig|vite|jest|vitest|pytest|gradle|pom\.xml|go\.mod|cargo\.toml)/u.test(lower)) {
    score += 2;
  }

  if (/(dist|build|coverage|node_modules|vendor|generated|\.lock$|lockfile|\.min\.)/u.test(lower)) {
    score -= 16;
  }

  if (/(snapshot|snapshots|fixtures|fixture|mock|mocks)\//u.test(lower)) {
    score -= 2;
  }

  return score;
}

function describePatchContextReason(
  filePath: string,
  tokens: readonly string[],
  planHints: ReadonlySet<string>
): string {
  const lower = filePath.toLowerCase();
  const reasons = [
    planHints.has(filePath) ? "named by the approved plan" : undefined,
    tokens.filter((token) => lower.includes(token)).slice(0, 4).length
      ? `matches task token(s): ${tokens.filter((token) => lower.includes(token)).slice(0, 4).join(", ")}`
      : undefined,
    /(test|spec|__tests__|tests)\b/u.test(lower) ? "is a related validation file" : undefined,
    /(package\.json|tsconfig|vite|jest|vitest|pytest|gradle|pom\.xml|go\.mod|cargo\.toml)/u.test(lower) ? "contains project or test configuration" : undefined,
    /(readme|codeowners|agents\.md)/u.test(lower) ? "contains repository guidance" : undefined,
    /\.(ts|tsx|js|jsx|mjs|cjs|py|java|kt|go|rs|rb|php|cs|swift)$/u.test(lower) ? "is source code in a supported language" : undefined
  ].filter((reason): reason is string => Boolean(reason));

  return reasons.length ? reasons.join("; ") : "ranked from repository metadata and work item text";
}

function buildStructuredPatchPrompt(
  session: PersistedTaskSession,
  workspacePath: string,
  contextFiles: readonly PatchContextFile[]
): string {
  const plan = session.plan;
  const context = contextFiles.map((file) => [
    `FILE: ${file.path}${file.truncated ? " (truncated)" : ""}`,
    `RANK: ${file.score}`,
    `WHY_INCLUDED: ${file.reason}`,
    "```",
    file.content,
    "```"
  ].join("\n")).join("\n\n");
  const failedTestContext = getFailedTestContextAfterLatestPatch(session);
  const missingRequirementSignals = Array.from(new Set([
    ...detectMissingRequirementSignals(session.workItem),
    ...(plan?.missingInfo ?? [])
  ])).slice(0, 8);
  const workspace = session.workspaceCandidate?.workspace;

  return [
    "You are OpenPome's implementation engine.",
    failedTestContext.length
      ? "This is a retry after approved validation failed. Repair only the failure using the evidence below."
      : "This is the first implementation patch for the approved plan.",
    "Return only compact JSON. Do not include markdown fences outside JSON.",
    "Only propose a minimal safe file patch for the approved work item.",
    "Do not include secrets, credentials, generated dependency folders, lockfile rewrites, or unrelated refactors.",
    "Use full replacement file content for each proposed file.",
    "If requirements are unclear, prefer a small diagnostic or guardrail change over a speculative broad rewrite.",
    "Keep existing style, imports, formatting, and public contracts unless the work item clearly requires a change.",
    "Allowed JSON shape:",
    "{\"summary\":\"...\",\"files\":[{\"path\":\"relative/path\",\"action\":\"create|update\",\"content\":\"full file content\"}],\"risks\":[\"...\"]}",
    "",
    "Work item:",
    `- Key: ${session.workItem.key}`,
    `- Type: ${session.workItem.type}`,
    `- Status: ${session.workItem.status}`,
    `- Title: ${session.workItem.title}`,
    session.workItem.description ? `- Description: ${session.workItem.description}` : undefined,
    session.workItem.priority ? `- Priority: ${session.workItem.priority}` : undefined,
    session.workItem.labels?.length ? `- Labels: ${session.workItem.labels.join(", ")}` : undefined,
    session.workItem.components?.length ? `- Components: ${session.workItem.components.join(", ")}` : undefined,
    session.workItem.links?.length ? `- Links: ${session.workItem.links.map((link) => `${link.kind}:${link.title ?? link.url}`).join("; ")}` : undefined,
    "",
    missingRequirementSignals.length ? "Known missing or unclear requirements:" : undefined,
    ...missingRequirementSignals.map((signal) => `- ${signal}`),
    missingRequirementSignals.length ? "" : undefined,
    "Approved plan:",
    plan?.summary ? `- Summary: ${plan.summary}` : "- Summary: unavailable",
    ...(plan?.steps.map((step) => `- ${step.title}${step.detail ? `: ${step.detail}` : ""}`) ?? []),
    plan?.commandsToRun.length ? `- Checks: ${plan.commandsToRun.join(", ")}` : undefined,
    "",
    failedTestContext.length ? "Recent failed validation after the latest approved patch:" : undefined,
    ...failedTestContext,
    failedTestContext.length ? "" : undefined,
    "Workspace:",
    `- Path: ${workspacePath}`,
    workspace?.name ? `- Name: ${workspace.name}` : undefined,
    workspace?.currentBranch ? `- Current branch: ${workspace.currentBranch}` : undefined,
    workspace?.packageNames?.length ? `- Packages: ${workspace.packageNames.slice(0, 8).join(", ")}` : undefined,
    workspace?.readmeKeywords?.length ? `- README signals: ${workspace.readmeKeywords.slice(0, 12).join(", ")}` : undefined,
    workspace?.codeownersKeywords?.length ? `- Ownership signals: ${workspace.codeownersKeywords.slice(0, 12).join(", ")}` : undefined,
    workspace?.recentBranches?.length ? `- Recent branches: ${workspace.recentBranches.slice(0, 8).join(", ")}` : undefined,
    workspace?.recentCommitRefs?.length ? `- Recent work refs: ${workspace.recentCommitRefs.slice(0, 12).join(", ")}` : undefined,
    "",
    "Readable context files:",
    context || "No source files were safely included. You may propose small new files only if the task clearly asks for them."
  ].filter((line): line is string => Boolean(line)).join("\n");
}

function getFailedTestContextAfterLatestPatch(session: PersistedTaskSession): readonly string[] {
  const failedRun = getLatestFailedTestRunAfterLatestPatch(session);
  if (!failedRun) {
    return [];
  }

  return [
    `- Command: ${failedRun.command}`,
    `- Exit code: ${failedRun.exitCode}`,
    failedRun.cwd ? `- Working directory: ${failedRun.cwd}` : undefined,
    ...failedRun.stdoutSummary.map((line) => `- stdout: ${line}`),
    ...failedRun.stderrSummary.map((line) => `- stderr: ${line}`)
  ].filter((line): line is string => Boolean(line)).slice(0, 48);
}

function parseAIPatchProposal(
  value: string,
  session: PersistedTaskSession,
  provider: ModelProviderId,
  workspacePath: string,
  createdAt: string
): AIPatchProposalDraft {
  const json = extractJsonObject(value);
  if (!json) {
    throw new Error(`${getModelProviderDisplayName(provider)} did not return a JSON patch proposal.`);
  }

  let parsed: {
    readonly summary?: unknown;
    readonly files?: unknown;
    readonly risks?: unknown;
  };
  try {
    parsed = JSON.parse(json) as typeof parsed;
  } catch {
    throw new Error(`${getModelProviderDisplayName(provider)} returned invalid JSON for the patch proposal.`);
  }

  if (!Array.isArray(parsed.files)) {
    throw new Error(`${getModelProviderDisplayName(provider)} patch proposal did not include files.`);
  }

  const files = parsed.files
    .slice(0, maxPatchProposalFiles)
    .map((file): AIPatchFileChange | undefined => {
      if (typeof file !== "object" || !file) {
        return undefined;
      }

      const maybe = file as { readonly path?: unknown; readonly action?: unknown; readonly content?: unknown };
      if (typeof maybe.path !== "string" || typeof maybe.content !== "string") {
        return undefined;
      }

      const relativePath = normalizeWorkspaceRelativePath(workspacePath, maybe.path, "throw");
      const action = maybe.action === "create" ? "create" : "update";
      const content = maybe.content;
      if (!relativePath || isSensitiveWorkspacePath(relativePath) || content.includes("\u0000") || containsSensitiveContent(content)) {
        return undefined;
      }

      if (Buffer.byteLength(content, "utf8") > maxPatchProposalBytesPerFile) {
        throw new Error(`AI patch proposal for ${relativePath} is too large.`);
      }

      return {
        path: relativePath,
        action,
        content
      };
    })
    .filter((file): file is AIPatchFileChange => Boolean(file));

  if (files.length === 0) {
    throw new Error(`${getModelProviderDisplayName(provider)} did not propose any safe file changes.`);
  }

  return {
    id: `patch_${createHash("sha256").update(`${session.session.id}:${provider}:${createdAt}`).digest("hex").slice(0, 12)}`,
    createdAt,
    provider,
    summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : `AI patch proposal for ${session.workItem.key}`,
    files,
    risks: stringArrayOr(parsed.risks, [])
  };
}

function normalizeWorkspaceRelativePath(
  workspacePath: string,
  requestedPath: string,
  mode: "skip" | "throw"
): string | undefined {
  const trimmed = requestedPath.trim();
  if (!trimmed) {
    return undefined;
  }

  const absolutePath = isAbsolute(trimmed) ? resolve(trimmed) : resolve(workspacePath, trimmed);
  const relativePath = relative(workspacePath, absolutePath).replace(/\\/gu, "/");
  const invalid = relativePath === "" || relativePath.startsWith("../") || relativePath === ".." || isAbsolute(relativePath);
  if (invalid) {
    if (mode === "throw") {
      throw new Error(`AI patch path is outside the workspace: ${requestedPath}`);
    }

    return undefined;
  }

  return relativePath;
}

function isSensitiveWorkspacePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  if (lower.includes("/.git/") || lower.startsWith(".git/") || lower.includes("/node_modules/") || lower.startsWith("node_modules/")) {
    return true;
  }

  return sensitivePathFragments.some((fragment) => lower === fragment || lower.includes(`/${fragment}`) || lower.endsWith(fragment));
}

function containsSensitiveContent(content: string): boolean {
  return sensitiveContentPatterns.some((pattern) => pattern.test(content));
}

async function applyPatchFiles(workspacePath: string, files: readonly AIPatchFileChange[]): Promise<void> {
  for (const file of files) {
    const relativePath = normalizeWorkspaceRelativePath(workspacePath, file.path, "throw");
    if (!relativePath || isSensitiveWorkspacePath(relativePath)) {
      throw new Error(`Refusing to write unsafe AI patch path: ${file.path}`);
    }

    const absolutePath = resolve(workspacePath, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, "utf8");
  }
}

async function discoverTestCommandCandidates(
  workspacePath: string,
  session?: PersistedTaskSession
): Promise<readonly TestCommandCandidate[]> {
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

  const relatedTestFiles = session ? await findRelatedTestFiles(workspacePath, session) : [];
  const testScript = scripts["test"] ? buildPackageScriptCommand(packageManager, "test") : undefined;
  for (const testFile of relatedTestFiles.slice(0, 5)) {
    candidates.push({
      id: `related_${createHash("sha256").update(testFile).digest("hex").slice(0, 8)}`,
      command: testScript ? `${testScript} -- ${quoteShellArg(testFile)}` : buildLanguageSpecificTestCommand(packageManager, testFile),
      source: "related_file",
      reason: `Related test file matched likely impacted work: ${testFile}.`,
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

async function findRelatedTestFiles(workspacePath: string, session: PersistedTaskSession): Promise<readonly string[]> {
  let trackedFiles: readonly string[] = [];
  try {
    trackedFiles = await listTrackedWorkspaceFiles(workspacePath);
  } catch {
    return [];
  }

  const impactHints = new Set([
    ...(session.plan?.filesLikelyChanged ?? [])
      .map((filePath) => normalizeWorkspaceRelativePath(workspacePath, filePath, "skip"))
      .filter((filePath): filePath is string => Boolean(filePath))
      .flatMap((filePath) => [filePath, basename(filePath).replace(/\.[^.]+$/u, "")]),
    ...tokenizePatchSearchText([
      session.workItem.key,
      session.workItem.title,
      session.workItem.description,
      ...(session.workItem.labels ?? []),
      ...(session.workItem.components ?? []),
      session.plan?.summary
    ].filter((value): value is string => Boolean(value)).join(" "))
  ]);

  return trackedFiles
    .filter((filePath) => isTestLikeFile(filePath))
    .map((filePath) => ({
      filePath,
      score: scoreRelatedTestFile(filePath, impactHints)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .map((candidate) => candidate.filePath);
}

function isTestLikeFile(filePath: string): boolean {
  return /(^|\/)(__tests__|tests?|specs?)\//u.test(filePath.toLowerCase())
    || /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|py|java|kt|go|rs|rb|php|cs)$/u.test(filePath.toLowerCase());
}

function scoreRelatedTestFile(filePath: string, impactHints: ReadonlySet<string>): number {
  const lower = filePath.toLowerCase();
  let score = 0;

  for (const hint of impactHints) {
    const normalized = hint.toLowerCase();
    if (normalized.length >= 3 && lower.includes(normalized)) {
      score += normalized.includes("/") ? 10 : 4;
    }
  }

  if (score === 0) {
    return 0;
  }

  if (/\.(test|spec)\./u.test(lower)) {
    score += 3;
  }

  if (/(__tests__|tests?)\//u.test(lower)) {
    score += 2;
  }

  if (/(snapshot|fixtures|mocks)\//u.test(lower)) {
    score -= 2;
  }

  return score;
}

function buildLanguageSpecificTestCommand(
  packageManager: "pnpm" | "npm" | "yarn" | "bun",
  testFile: string
): string {
  if (/\.(py)$/u.test(testFile)) {
    return `python -m pytest ${quoteShellArg(testFile)}`;
  }

  if (/\.(go)$/u.test(testFile)) {
    return "go test ./...";
  }

  return `${buildPackageScriptCommand(packageManager, "test")} -- ${quoteShellArg(testFile)}`;
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

function quoteShellArg(value: string): string {
  return `'${value.replace(/'/gu, "'\\''")}'`;
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

function createFileEditApproval(
  session: PersistedTaskSession,
  proposal: AIPatchProposalDraft,
  now: string,
  reason: string
): ApprovalRequest {
  return {
    id: `approval_${createHash("sha256").update(`${session.session.id}:edit_files:${proposal.id}`).digest("hex").slice(0, 12)}`,
    type: "edit_files",
    title: `File edit approval for ${session.workItem.key}`,
    reason,
    details: [
      `Session: ${session.session.id}`,
      `Work item: ${session.workItem.key}`,
      `Workspace: ${session.workspaceCandidate?.workspace.name ?? "unresolved"}`,
      `Provider: ${getModelProviderDisplayName(proposal.provider)}`,
      `Files: ${proposal.files.map((file) => `${file.action} ${file.path}`).join(", ")}`,
      `Recorded at: ${now}`
    ],
    status: "pending"
  };
}

function buildPullRequestDraft(session: PersistedTaskSession, createdAt: string, baseBranch = "main"): PullRequestDraft {
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
    baseBranch,
    headBranch: selectPullRequestBranchName(session),
    remoteUrl: workspace?.remoteUrls[0],
    createdAt
  };
}

function selectPullRequestBranchName(session: PersistedTaskSession): string {
  const currentBranch = session.session.branchName?.trim();
  if (currentBranch && !["main", "master", "develop", "development"].includes(currentBranch)) {
    return currentBranch;
  }

  const slug = session.workItem.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 48);
  return `openpome/${session.workItem.key.toLowerCase()}${slug ? `-${slug}` : ""}`;
}

async function ensurePullRequestBranch(workspacePath: string, branch: string): Promise<string> {
  const currentBranch = (await runGit(workspacePath, ["branch", "--show-current"])).trim();
  if (currentBranch !== branch) {
    await runGitStrict(workspacePath, ["checkout", "-B", branch]);
  }

  return branch;
}

async function pushPullRequestBranch(workspacePath: string, branch: string): Promise<void> {
  try {
    await runGitStrict(workspacePath, ["push", "-u", "origin", branch]);
  } catch (error) {
    throw new Error(getGitHubCliGuidance("push pull request branch", error));
  }
}

async function createGitHubPullRequestWithCli(
  workspacePath: string,
  draft: PullRequestDraft,
  branch: string,
  draftPr: boolean
): Promise<string> {
  const ghArgs = [
    "pr",
    "create",
    "--title",
    draft.title,
    "--body",
    draft.body,
    "--base",
    draft.baseBranch,
    "--head",
    branch
  ];
  if (draftPr) {
    ghArgs.push("--draft");
  }

  try {
    return (await execFileStrict("gh", ghArgs, workspacePath)).trim();
  } catch (error) {
    throw new Error(getGitHubCliGuidance("create pull request", error));
  }
}

async function createGitHubPullRequestWithApi(
  accessToken: string,
  draft: PullRequestDraft,
  branch: string,
  draftPr: boolean
): Promise<string> {
  const repository = parseGitHubRepositoryCoordinates(draft.remoteUrl);
  if (!repository) {
    throw new Error("Unable to determine GitHub owner/repo from the workspace remote URL.");
  }

  const response = await fetchGitHub(`${getGitHubApiBaseUrl()}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      title: draft.title,
      body: draft.body,
      head: branch,
      base: draft.baseBranch,
      draft: draftPr
    })
  }, "create pull request");

  if (!response.ok) {
    throw new Error(await getGitHubStatusGuidance(response, "create pull request"));
  }

  const payload = (await response.json()) as GitHubPullRequestResponse;
  return payload.html_url ?? `https://github.com/${repository.owner}/${repository.repo}/pull/${payload.number ?? ""}`;
}

function getGitHubCliGuidance(action: string, error: unknown): string {
  const detail = summarizeExecError(error) ?? String(error);
  return [
    `GitHub ${action} failed.`,
    "Check repository write permission, organization SSO authorization, branch protection, remote URL, and whether your token/SSH key can push to origin.",
    "Run `pome auth github status` and `git remote -v` to verify the account and repository.",
    `Detail: ${detail}`
  ].join(" ");
}

function parseGitHubRepositoryCoordinates(remoteUrl: string | undefined): GitHubRepositoryCoordinates | undefined {
  if (!remoteUrl) {
    return undefined;
  }

  const trimmed = remoteUrl.trim().replace(/\.git$/u, "");
  const sshMatch = /^git@github\.com:([^/]+)\/(.+)$/u.exec(trimmed);
  if (sshMatch?.[1] && sshMatch[2]) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2]
    };
  }

  const sshUrlMatch = /^ssh:\/\/git@github\.com\/([^/]+)\/(.+)$/u.exec(trimmed);
  if (sshUrlMatch?.[1] && sshUrlMatch[2]) {
    return {
      owner: sshUrlMatch[1],
      repo: sshUrlMatch[2]
    };
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname !== "github.com") {
      return undefined;
    }

    const [owner, repo] = url.pathname.replace(/^\/+/u, "").split("/");
    if (!owner || !repo) {
      return undefined;
    }

    return {
      owner,
      repo
    };
  } catch {
    return undefined;
  }
}

function getGitHubApiBaseUrl(): string {
  return process.env["OPENPOME_GITHUB_API_BASE_URL"]?.replace(/\/+$/u, "") || "https://api.github.com";
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim().slice(0, 1000);
  } catch {
    return "";
  }
}

function summarizeProviderBody(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      readonly message?: unknown;
      readonly error?: unknown;
      readonly errors?: unknown;
      readonly documentation_url?: unknown;
    };
    const errorObject = typeof parsed.error === "object" && parsed.error
      ? parsed.error as { readonly message?: unknown; readonly type?: unknown; readonly code?: unknown }
      : undefined;
    const messages = [
      typeof parsed.message === "string" ? parsed.message : undefined,
      typeof parsed.error === "string" ? parsed.error : undefined,
      typeof errorObject?.message === "string" ? errorObject.message : undefined,
      typeof errorObject?.type === "string" ? `type=${errorObject.type}` : undefined,
      typeof errorObject?.code === "string" ? `code=${errorObject.code}` : undefined,
      typeof parsed.documentation_url === "string" ? parsed.documentation_url : undefined
    ].filter((item): item is string => Boolean(item));
    if (messages.length) {
      return messages.join("; ").slice(0, 500);
    }
  } catch {
    // Fall through to plain-text summary.
  }

  return trimmed.replace(/\s+/gu, " ").slice(0, 500);
}

async function hasWorkspaceChanges(workspacePath: string): Promise<boolean> {
  const output = await runGit(workspacePath, ["status", "--porcelain"]);
  return output.trim().length > 0;
}

async function detectPullRequestBaseBranch(workspacePath: string): Promise<string> {
  const originHead = (await runGit(workspacePath, ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"])).trim();
  if (originHead.startsWith("origin/")) {
    return originHead.slice("origin/".length);
  }

  const remoteDefault = await runGit(workspacePath, ["remote", "show", "origin"]);
  const headLine = remoteDefault
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.startsWith("HEAD branch:"));
  const headBranch = headLine?.replace("HEAD branch:", "").trim();
  return headBranch || "main";
}

function hasPassedTestEvidence(session: PersistedTaskSession): boolean {
  const latestRunAfterPatch = getLatestTestRunAfterLatestPatch(session);
  return latestRunAfterPatch?.status === "passed" || (!session.aiPatchProposal?.appliedAt && (session.testRunEvidence ?? []).some((run) => run.status === "passed"));
}

function hasFailedTestAfterLatestAppliedPatch(session: PersistedTaskSession): boolean {
  return Boolean(getLatestFailedTestRunAfterLatestPatch(session));
}

function getLatestFailedTestRunAfterLatestPatch(session: PersistedTaskSession): TestRunEvidence | undefined {
  const latestRun = getLatestTestRunAfterLatestPatch(session);
  return latestRun?.status === "failed" ? latestRun : undefined;
}

function getLatestTestRunAfterLatestPatch(session: PersistedTaskSession): TestRunEvidence | undefined {
  const appliedAt = session.aiPatchProposal?.appliedAt;
  const runs = session.testRunEvidence ?? [];
  const filtered = appliedAt ? runs.filter((run) => run.finishedAt >= appliedAt) : runs;
  return filtered[filtered.length - 1];
}

async function runGitStrict(cwd: string, args: readonly string[]): Promise<string> {
  return execFileStrict("git", args, cwd);
}

async function execFileStrict(command: string, args: readonly string[], cwd: string): Promise<string> {
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      timeout: 2 * 60 * 1000,
      maxBuffer: 1024 * 1024,
      windowsHide: true
    });
    return result.stdout;
  } catch (error) {
    const detail = summarizeExecError(error);
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `: ${detail}` : "."}`);
  }
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

function createExternalActionApproval(
  session: PersistedTaskSession,
  type: "create_pr" | "update_work_item",
  now: string,
  details: readonly string[]
): ApprovalRequest {
  return {
    id: `approval_${createHash("sha256").update(`${session.session.id}:${type}:${now}`).digest("hex").slice(0, 12)}`,
    type,
    title: type === "create_pr" ? `PR creation approval for ${session.workItem.key}` : `Work item update approval for ${session.workItem.key}`,
    reason:
      type === "create_pr"
        ? "Developer explicitly requested OpenPome to create the GitHub pull request."
        : "Developer explicitly requested OpenPome to post the work item update.",
    details: [
      `Session: ${session.session.id}`,
      `Work item: ${session.workItem.key}`,
      `Workspace: ${session.workspaceCandidate?.workspace.name ?? "unresolved"}`,
      ...details,
      `Recorded at: ${now}`
    ],
    status: "approved"
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
