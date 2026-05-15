import type { WorkItem, WorkItemLink, WorkItemSource, WorkItemType } from "@openpome/work-items";

export interface JiraCloudConfig {
  readonly baseUrl?: string;
  readonly email?: string;
  readonly apiToken?: string;
  readonly boardId?: string;
  readonly oauthAccessToken?: string;
  readonly oauthRefreshToken?: string;
  readonly oauthCloudId?: string;
  readonly oauthExpiresAt?: string;
  readonly oauthClientId?: string;
  readonly oauthClientSecret?: string;
  readonly oauthRedirectUri?: string;
  readonly fixtureFile?: string;
}

export type JiraCloudAuthMode = "api-token" | "oauth-3lo" | "mock";

export interface JiraCloudAuthStatus {
  readonly mode: JiraCloudAuthMode;
  readonly configured: boolean;
  readonly detail: string;
  readonly expiresAt?: string;
  readonly refreshAvailable?: boolean;
}

export interface JiraCloudOAuthLoginRequest {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes?: readonly string[];
  readonly state: string;
}

export interface JiraCloudOAuthLogin {
  readonly authorizationUrl: string;
  readonly state: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
}

export interface JiraCloudOAuthExchangeRequest {
  readonly code: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

export interface JiraCloudOAuthTokenSet {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresIn?: number;
  readonly expiresAt?: string;
  readonly scope?: string;
  readonly tokenType: string;
  readonly cloudId?: string;
  readonly siteUrl?: string;
  readonly storedAt: string;
}

export interface JiraCloudOAuthRefreshRequest {
  readonly refreshToken: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

export type JiraReachabilityStatus = "reachable" | "unauthorized" | "unreachable";

export interface JiraReachabilityResult {
  readonly status: JiraReachabilityStatus;
  readonly detail: string;
}

export interface JiraBoard {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly projectKey?: string;
  readonly self?: string;
}

interface JiraAuthHeaders {
  readonly headers: Readonly<Record<string, string>>;
  readonly baseUrl: string;
  readonly mode: "api-token" | "oauth-3lo";
}

export const jiraCloudConnector = {
  id: "jira-cloud",
  kind: "work_item_source",
  displayName: "Jira Cloud"
} as const;

export class JiraCloudWorkItemSource implements WorkItemSource {
  readonly id = jiraCloudConnector.id;
  readonly displayName = jiraCloudConnector.displayName;

  constructor(private readonly config: JiraCloudConfig = {}) {}

  async listAssigned(): Promise<readonly WorkItem[]> {
    if (this.hasApiTokenCredentials() || this.hasOAuthTokenCredentials()) {
      return this.fetchAssignedFromJira();
    }

    return getMockAssignedWorkItems(this.config.boardId);
  }

  async listBoards(): Promise<readonly JiraBoard[]> {
    if (this.hasApiTokenCredentials() || this.hasOAuthTokenCredentials()) {
      return this.fetchBoardsFromJira();
    }

    return getMockJiraBoards();
  }

  async getWorkItem(key: string): Promise<WorkItem | undefined> {
    const normalizedKey = key.trim().toUpperCase();

    if (this.hasApiTokenCredentials() || this.hasOAuthTokenCredentials()) {
      return this.fetchWorkItemFromJira(normalizedKey);
    }

    const items = await this.listAssigned();
    return items.find((item) => item.key.toUpperCase() === normalizedKey);
  }

  getMode(): "live" | "mock" {
    return this.hasApiTokenCredentials() || this.hasOAuthTokenCredentials() ? "live" : "mock";
  }

  getAuthStatus(): JiraCloudAuthStatus {
    if (this.hasApiTokenCredentials()) {
      return {
        mode: "api-token",
        configured: true,
        detail: "Jira Cloud API-token/basic auth is configured."
      };
    }

    if (this.hasOAuthConfig()) {
      return {
        mode: "oauth-3lo",
        configured: this.hasOAuthTokenCredentials(),
        detail: this.hasOAuthTokenCredentials()
          ? "Jira Cloud OAuth 2.0 3LO token is stored."
          : "Jira Cloud OAuth 2.0 3LO client is configured, but no token is stored.",
        expiresAt: this.config.oauthExpiresAt,
        refreshAvailable: Boolean(this.config.oauthRefreshToken)
      };
    }

    return {
      mode: "mock",
      configured: false,
      detail: "Jira auth is not configured; using mock work items."
    };
  }

  private hasApiTokenCredentials(): boolean {
    return Boolean(this.config.baseUrl && this.config.email && this.config.apiToken);
  }

  private hasOAuthTokenCredentials(): boolean {
    return Boolean(this.config.oauthAccessToken && this.config.oauthCloudId);
  }

  isOAuthAccessTokenExpired(now = new Date()): boolean {
    if (!this.config.oauthExpiresAt) {
      return false;
    }

    return new Date(this.config.oauthExpiresAt).getTime() <= now.getTime();
  }

  private hasOAuthConfig(): boolean {
    return Boolean(this.config.oauthClientId && this.config.oauthRedirectUri);
  }

  private async fetchAssignedFromJira(): Promise<readonly WorkItem[]> {
    const auth = this.getAuthHeaders();
    if (!auth) {
      return getMockAssignedWorkItems(this.config.boardId);
    }

    if (this.config.boardId) {
      return this.fetchAssignedFromBoard(auth, this.config.boardId);
    }

    return this.searchJiraIssues(auth, {
      jql: "assignee = currentUser() ORDER BY updated DESC",
      maxResults: 50,
      maxPages: 4
    });
  }

  private async fetchAssignedFromBoard(auth: JiraAuthHeaders, boardId: string): Promise<readonly WorkItem[]> {
    const issues: JiraIssue[] = [];
    let startAt = 0;
    let page = 0;
    const maxResults = 50;
    const maxPages = 4;

    do {
      const boardIssuesUrl = new URL(`${auth.baseUrl}/rest/agile/1.0/board/${encodeURIComponent(boardId)}/issue`);
      boardIssuesUrl.searchParams.set("jql", "assignee = currentUser() ORDER BY updated DESC");
      boardIssuesUrl.searchParams.set("fields", jiraIssueFields.join(","));
      boardIssuesUrl.searchParams.set("startAt", String(startAt));
      boardIssuesUrl.searchParams.set("maxResults", String(maxResults));

      const response = await fetch(boardIssuesUrl, {
        headers: auth.headers
      });

      await assertJiraResponse(response, `list assigned work for board ${boardId}`, auth.mode);

      const payload = (await response.json()) as JiraBoardIssuesResponse;
      issues.push(...payload.issues);
      startAt += payload.issues.length;
      page += 1;

      if (payload.isLast || payload.issues.length === 0 || startAt >= (payload.total ?? Number.MAX_SAFE_INTEGER)) {
        break;
      }
    } while (page < maxPages);

    return issues.map(mapJiraIssueToWorkItem);
  }

  private async fetchWorkItemFromJira(key: string): Promise<WorkItem | undefined> {
    const auth = this.getAuthHeaders();
    if (!auth) {
      return undefined;
    }

    const issueUrl = new URL(`${auth.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}`);
    issueUrl.searchParams.set("fields", jiraIssueFields.join(","));

    const response = await fetch(issueUrl, {
      headers: auth.headers
    });

    if (response.status === 404) {
      return undefined;
    }

    await assertJiraResponse(response, `load work item ${key}`, auth.mode);

    const issue = (await response.json()) as JiraIssue;
    return mapJiraIssueToWorkItem(issue);
  }

  private async searchJiraIssues(
    auth: JiraAuthHeaders,
    options: { readonly jql: string; readonly maxResults: number; readonly maxPages: number }
  ): Promise<readonly WorkItem[]> {
    const issues: JiraIssue[] = [];
    let nextPageToken: string | undefined;
    let page = 0;

    do {
      const searchUrl = new URL(`${auth.baseUrl}/rest/api/3/search/jql`);
      searchUrl.searchParams.set("jql", options.jql);
      searchUrl.searchParams.set("fields", jiraIssueFields.join(","));
      searchUrl.searchParams.set("maxResults", String(options.maxResults));
      if (nextPageToken) {
        searchUrl.searchParams.set("nextPageToken", nextPageToken);
      }

      const response = await fetch(searchUrl, {
        headers: auth.headers
      });

      await assertJiraResponse(response, "list assigned work", auth.mode);

      const payload = (await response.json()) as JiraSearchResponse;
      issues.push(...payload.issues);
      nextPageToken = payload.nextPageToken;
      page += 1;
    } while (nextPageToken && page < options.maxPages);

    return issues.map(mapJiraIssueToWorkItem);
  }

  async checkReachability(): Promise<JiraReachabilityResult> {
    try {
      if (this.hasOAuthTokenCredentials()) {
        return this.checkOAuthReachability();
      }

      if (this.hasApiTokenCredentials()) {
        return this.checkApiTokenReachability();
      }

      return {
        status: "unreachable",
        detail: "Jira auth is not configured; live reachability was not checked."
      };
    } catch (error) {
      return {
        status: "unreachable",
        detail: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async fetchBoardsFromJira(): Promise<readonly JiraBoard[]> {
    const auth = this.getAuthHeaders();
    if (!auth) {
      return getMockJiraBoards();
    }

    const boards: JiraBoard[] = [];
    let startAt = 0;
    let page = 0;
    const maxResults = 50;
    const maxPages = 4;

    do {
      const boardUrl = new URL(`${auth.baseUrl}/rest/agile/1.0/board`);
      boardUrl.searchParams.set("startAt", String(startAt));
      boardUrl.searchParams.set("maxResults", String(maxResults));

      const response = await fetch(boardUrl, {
        headers: auth.headers
      });

      await assertJiraResponse(response, "list Jira boards", auth.mode);

      const payload = (await response.json()) as JiraBoardListResponse;
      boards.push(...payload.values.map(mapJiraBoard));
      startAt += payload.values.length;
      page += 1;

      if (payload.isLast || payload.values.length === 0 || startAt >= (payload.total ?? Number.MAX_SAFE_INTEGER)) {
        break;
      }
    } while (page < maxPages);

    return boards;
  }

  private async checkApiTokenReachability(): Promise<JiraReachabilityResult> {
    const auth = this.getAuthHeaders();
    if (!auth || auth.mode !== "api-token") {
      return {
        status: "unreachable",
        detail: "Jira API-token auth is incomplete."
      };
    }

    const url = new URL(`${auth.baseUrl}/rest/api/3/myself`);
    const response = await fetch(url, {
      headers: auth.headers
    });

    return mapReachabilityResponse(response, "Jira Cloud API-token auth is reachable.");
  }

  private async checkOAuthReachability(): Promise<JiraReachabilityResult> {
    const auth = this.getAuthHeaders();
    if (!auth || auth.mode !== "oauth-3lo") {
      return {
        status: "unreachable",
        detail: "Jira OAuth auth is incomplete."
      };
    }

    const url = new URL(`${auth.baseUrl}/rest/api/3/myself`);
    const response = await fetch(url, {
      headers: auth.headers
    });

    return mapReachabilityResponse(response, "Jira Cloud OAuth auth is reachable.");
  }

  private getAuthHeaders(): JiraAuthHeaders | undefined {
    if (this.hasOAuthTokenCredentials()) {
      return {
        mode: "oauth-3lo",
        baseUrl: `https://api.atlassian.com/ex/jira/${this.config.oauthCloudId}`,
        headers: {
          "Authorization": `Bearer ${this.config.oauthAccessToken}`,
          "Accept": "application/json"
        }
      };
    }

    if (this.hasApiTokenCredentials()) {
      return {
        mode: "api-token",
        baseUrl: this.config.baseUrl ?? "",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64")}`,
          "Accept": "application/json"
        }
      };
    }

    return undefined;
  }
}

export function createJiraCloudSourceFromEnv(env: NodeJS.ProcessEnv = process.env): JiraCloudWorkItemSource {
  return new JiraCloudWorkItemSource({
    baseUrl: env["OPENPOME_JIRA_BASE_URL"],
    email: env["OPENPOME_JIRA_EMAIL"],
    apiToken: env["OPENPOME_JIRA_API_TOKEN"],
    boardId: env["OPENPOME_JIRA_BOARD_ID"],
    oauthAccessToken: env["OPENPOME_JIRA_OAUTH_ACCESS_TOKEN"],
    oauthRefreshToken: env["OPENPOME_JIRA_OAUTH_REFRESH_TOKEN"],
    oauthCloudId: env["OPENPOME_JIRA_OAUTH_CLOUD_ID"],
    oauthExpiresAt: env["OPENPOME_JIRA_OAUTH_EXPIRES_AT"],
    oauthClientId: env["OPENPOME_JIRA_OAUTH_CLIENT_ID"],
    oauthClientSecret: env["OPENPOME_JIRA_OAUTH_CLIENT_SECRET"],
    oauthRedirectUri: env["OPENPOME_JIRA_OAUTH_REDIRECT_URI"],
    fixtureFile: env["OPENPOME_JIRA_FIXTURE_FILE"]
  });
}

export async function exchangeJiraCloudOAuthCode(request: JiraCloudOAuthExchangeRequest): Promise<JiraCloudOAuthTokenSet> {
  const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: request.clientId,
      client_secret: request.clientSecret,
      code: request.code,
      redirect_uri: request.redirectUri
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Jira OAuth token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenPayload = (await tokenResponse.json()) as JiraOAuthTokenResponse;
  const accessibleResource = await getFirstAccessibleJiraResource(tokenPayload.access_token);

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    expiresIn: tokenPayload.expires_in,
    expiresAt: getExpiresAt(tokenPayload.expires_in),
    scope: tokenPayload.scope,
    tokenType: tokenPayload.token_type,
    cloudId: accessibleResource?.id,
    siteUrl: accessibleResource?.url,
    storedAt: new Date().toISOString()
  };
}

export async function refreshJiraCloudOAuthToken(request: JiraCloudOAuthRefreshRequest): Promise<JiraCloudOAuthTokenSet> {
  const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: request.clientId,
      client_secret: request.clientSecret,
      refresh_token: request.refreshToken
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Jira OAuth token refresh failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenPayload = (await tokenResponse.json()) as JiraOAuthTokenResponse;
  const accessibleResource = await getFirstAccessibleJiraResource(tokenPayload.access_token);

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token ?? request.refreshToken,
    expiresIn: tokenPayload.expires_in,
    expiresAt: getExpiresAt(tokenPayload.expires_in),
    scope: tokenPayload.scope,
    tokenType: tokenPayload.token_type,
    cloudId: accessibleResource?.id,
    siteUrl: accessibleResource?.url,
    storedAt: new Date().toISOString()
  };
}

function getExpiresAt(expiresInSeconds: number | undefined): string | undefined {
  if (!expiresInSeconds) {
    return undefined;
  }

  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function mapReachabilityResponse(response: Response, successDetail: string): JiraReachabilityResult {
  if (response.ok) {
    return {
      status: "reachable",
      detail: successDetail
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      status: "unauthorized",
      detail: `Jira responded with ${response.status} ${response.statusText}.`
    };
  }

  return {
    status: "unreachable",
    detail: `Jira responded with ${response.status} ${response.statusText}.`
  };
}

interface JiraOAuthTokenResponse {
  readonly access_token: string;
  readonly refresh_token?: string;
  readonly expires_in?: number;
  readonly scope?: string;
  readonly token_type: string;
}

interface JiraAccessibleResource {
  readonly id: string;
  readonly url: string;
  readonly name?: string;
  readonly scopes?: readonly string[];
  readonly avatarUrl?: string;
}

async function getFirstAccessibleJiraResource(accessToken: string): Promise<JiraAccessibleResource | undefined> {
  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Jira accessible resources request failed: ${response.status} ${response.statusText}`);
  }

  const resources = (await response.json()) as readonly JiraAccessibleResource[];
  return resources[0];
}

export function createJiraCloudOAuthLogin(request: JiraCloudOAuthLoginRequest): JiraCloudOAuthLogin {
  const scopes = request.scopes ?? ["read:jira-work", "read:jira-user", "offline_access"];
  const url = new URL("https://auth.atlassian.com/authorize");
  url.searchParams.set("audience", "api.atlassian.com");
  url.searchParams.set("client_id", request.clientId);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("redirect_uri", request.redirectUri);
  url.searchParams.set("state", request.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("prompt", "consent");

  return {
    authorizationUrl: url.toString(),
    state: request.state,
    redirectUri: request.redirectUri,
    scopes
  };
}

export function getMockAssignedWorkItems(boardId?: string): readonly WorkItem[] {
  const items: readonly WorkItem[] = [
    {
      key: "POME-101",
      source: "jira-cloud",
      type: "story",
      title: "Create OpenPome CLI foundation",
      status: "In Progress",
      priority: "High",
      assignee: "You",
      iteration: "MVP Phase 1",
      description: "Build the first CLI commands for init, doctor, and assigned work listing.",
      labels: ["openpome", "cli"],
      components: ["developer-workbench"],
      links: [
        {
          kind: "code",
          url: "https://github.com/openpome/pome",
          title: "OpenPome repository"
        }
      ]
    },
    {
      key: "POME-102",
      source: "jira-cloud",
      type: "bug",
      title: "Show clear connector error when VPN service is unreachable",
      status: "To Do",
      priority: "Medium",
      assignee: "You",
      iteration: "MVP Phase 1",
      description: "Doctor should distinguish missing credentials, unreachable network, and expired credentials.",
      labels: ["vpn", "connectors"],
      components: ["local-gateway"]
    },
    {
      key: "POME-103",
      source: "jira-cloud",
      type: "subtask",
      title: "Map Jira issue fields into provider-neutral WorkItem",
      status: "To Do",
      priority: "Medium",
      assignee: "You",
      parentKey: "POME-101",
      labels: ["jira", "work-items"],
      components: ["connectors"]
    }
  ];

  if (boardId === "200") {
    return items.filter((item) => item.components?.includes("local-gateway") || item.components?.includes("connectors"));
  }

  return items;
}

export function getMockJiraBoards(): readonly JiraBoard[] {
  return [
    {
      id: "100",
      name: "OpenPome MVP",
      type: "scrum",
      projectKey: "POME"
    },
    {
      id: "200",
      name: "OpenPome Connectors",
      type: "kanban",
      projectKey: "POME"
    }
  ];
}

interface JiraSearchResponse {
  readonly issues: readonly JiraIssue[];
  readonly nextPageToken?: string;
}

interface JiraBoardListResponse {
  readonly values: readonly JiraBoardPayload[];
  readonly isLast?: boolean;
  readonly total?: number;
}

interface JiraBoardIssuesResponse {
  readonly issues: readonly JiraIssue[];
  readonly isLast?: boolean;
  readonly total?: number;
}

interface JiraBoardPayload {
  readonly id: number | string;
  readonly name: string;
  readonly type?: string;
  readonly self?: string;
  readonly location?: {
    readonly projectKey?: string;
  };
}

interface JiraIssue {
  readonly key: string;
  readonly fields: {
    readonly summary?: string;
    readonly status?: { readonly name?: string };
    readonly issuetype?: { readonly name?: string; readonly subtask?: boolean };
    readonly priority?: { readonly name?: string };
    readonly assignee?: { readonly displayName?: string; readonly emailAddress?: string };
    readonly description?: unknown;
    readonly labels?: readonly string[];
    readonly components?: readonly { readonly name?: string }[];
    readonly parent?: { readonly key?: string };
    readonly subtasks?: readonly { readonly key: string; readonly fields?: { readonly summary?: string; readonly status?: { readonly name?: string }; readonly issuetype?: { readonly name?: string } } }[];
    readonly issuelinks?: readonly JiraIssueLink[];
  };
}

interface JiraIssueLink {
  readonly outwardIssue?: { readonly key: string; readonly fields?: { readonly summary?: string } };
  readonly inwardIssue?: { readonly key: string; readonly fields?: { readonly summary?: string } };
}

function mapJiraIssueToWorkItem(issue: JiraIssue): WorkItem {
  const issueType = issue.fields.issuetype?.name ?? "task";

  return {
    key: issue.key,
    source: "jira-cloud",
    type: mapJiraIssueType(issueType, issue.fields.issuetype?.subtask ?? false),
    title: issue.fields.summary ?? issue.key,
    status: issue.fields.status?.name ?? "Unknown",
    description: stringifyDescription(issue.fields.description),
    priority: issue.fields.priority?.name,
    assignee: issue.fields.assignee?.displayName ?? issue.fields.assignee?.emailAddress,
    parentKey: issue.fields.parent?.key,
    labels: issue.fields.labels ?? [],
    components: issue.fields.components?.map((component) => component.name ?? "").filter(Boolean) ?? [],
    links: issue.fields.issuelinks?.flatMap(mapJiraIssueLink) ?? [],
    subtasks:
      issue.fields.subtasks?.map((subtask) => ({
        key: subtask.key,
        type: mapJiraIssueType(subtask.fields?.issuetype?.name ?? "subtask", true),
        title: subtask.fields?.summary ?? subtask.key,
        status: subtask.fields?.status?.name ?? "Unknown"
      })) ?? []
  };
}

function mapJiraBoard(board: JiraBoardPayload): JiraBoard {
  return {
    id: String(board.id),
    name: board.name,
    type: board.type,
    projectKey: board.location?.projectKey,
    self: board.self
  };
}

function mapJiraIssueType(issueType: string, isSubtask: boolean): WorkItemType {
  const normalized = issueType.toLowerCase();

  if (isSubtask || normalized.includes("sub-task") || normalized.includes("subtask")) {
    return "subtask";
  }

  if (normalized.includes("bug")) {
    return "bug";
  }

  if (normalized.includes("story")) {
    return "story";
  }

  if (normalized.includes("epic")) {
    return "epic";
  }

  return "task";
}

function stringifyDescription(description: unknown): string | undefined {
  if (!description) {
    return undefined;
  }

  if (typeof description === "string") {
    return description;
  }

  return JSON.stringify(description);
}

function mapJiraIssueLink(link: JiraIssueLink): readonly WorkItemLink[] {
  const linkedIssue = link.outwardIssue ?? link.inwardIssue;

  if (!linkedIssue) {
    return [];
  }

  return [
    {
      kind: "related_work_item",
      url: linkedIssue.key,
      title: linkedIssue.fields?.summary
    }
  ];
}

const jiraIssueFields = [
  "summary",
  "status",
  "issuetype",
  "priority",
  "assignee",
  "description",
  "labels",
  "components",
  "parent",
  "subtasks",
  "issuelinks"
] as const;

async function assertJiraResponse(response: Response, action: string, mode: "api-token" | "oauth-3lo"): Promise<void> {
  if (response.ok) {
    return;
  }

  const detail = await readJiraErrorDetail(response);
  const authHint =
    mode === "oauth-3lo"
      ? "Check OAuth token, scopes, accessible Jira site, and VPN/network access."
      : "Check Jira base URL, email, API token, and VPN/network access.";

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Jira ${action} was unauthorized (${response.status}). ${authHint}${detail}`);
  }

  if (response.status === 404) {
    throw new Error(`Jira ${action} was not found (${response.status}). Check the issue key or Jira site.${detail}`);
  }

  if (response.status === 429) {
    throw new Error(`Jira ${action} was rate limited (429). Retry later.${detail}`);
  }

  throw new Error(`Jira ${action} failed: ${response.status} ${response.statusText}.${detail}`);
}

async function readJiraErrorDetail(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { readonly errorMessages?: readonly string[]; readonly errors?: Readonly<Record<string, string>> };
    const messages = [
      ...(payload.errorMessages ?? []),
      ...Object.entries(payload.errors ?? {}).map(([field, message]) => `${field}: ${message}`)
    ];

    return messages.length ? ` Detail: ${messages.join("; ")}` : "";
  } catch {
    return "";
  }
}
