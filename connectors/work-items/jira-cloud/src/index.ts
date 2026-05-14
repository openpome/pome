import type { WorkItem, WorkItemLink, WorkItemSource, WorkItemType } from "@openpome/work-items";

export interface JiraCloudConfig {
  readonly baseUrl?: string;
  readonly email?: string;
  readonly apiToken?: string;
  readonly oauthAccessToken?: string;
  readonly oauthRefreshToken?: string;
  readonly oauthCloudId?: string;
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
  readonly scope?: string;
  readonly tokenType: string;
  readonly cloudId?: string;
  readonly siteUrl?: string;
  readonly storedAt: string;
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

    return getMockAssignedWorkItems();
  }

  async getWorkItem(key: string): Promise<WorkItem | undefined> {
    const normalizedKey = key.toUpperCase();
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
          : "Jira Cloud OAuth 2.0 3LO client is configured, but no token is stored."
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

  private hasOAuthConfig(): boolean {
    return Boolean(this.config.oauthClientId && this.config.oauthRedirectUri);
  }

  private async fetchAssignedFromJira(): Promise<readonly WorkItem[]> {
    if (this.hasOAuthTokenCredentials()) {
      return this.fetchAssignedFromJiraOAuth();
    }

    return this.fetchAssignedFromJiraApiToken();
  }

  private async fetchAssignedFromJiraApiToken(): Promise<readonly WorkItem[]> {
    const baseUrl = this.config.baseUrl;
    const email = this.config.email;
    const apiToken = this.config.apiToken;

    if (!baseUrl || !email || !apiToken) {
      return getMockAssignedWorkItems();
    }

    const url = new URL("/rest/api/3/search/jql", baseUrl);
    url.searchParams.set("jql", "assignee = currentUser() ORDER BY updated DESC");
    url.searchParams.set(
      "fields",
      "summary,status,issuetype,priority,assignee,description,labels,components,parent,subtasks,issuelinks"
    );
    url.searchParams.set("maxResults", "25");

    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Jira request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as JiraSearchResponse;
    return payload.issues.map(mapJiraIssueToWorkItem);
  }

  private async fetchAssignedFromJiraOAuth(): Promise<readonly WorkItem[]> {
    const accessToken = this.config.oauthAccessToken;
    const cloudId = this.config.oauthCloudId;

    if (!accessToken || !cloudId) {
      return getMockAssignedWorkItems();
    }

    const url = new URL(`/ex/jira/${cloudId}/rest/api/3/search/jql`, "https://api.atlassian.com");
    url.searchParams.set("jql", "assignee = currentUser() ORDER BY updated DESC");
    url.searchParams.set(
      "fields",
      "summary,status,issuetype,priority,assignee,description,labels,components,parent,subtasks,issuelinks"
    );
    url.searchParams.set("maxResults", "25");

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Jira OAuth request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as JiraSearchResponse;
    return payload.issues.map(mapJiraIssueToWorkItem);
  }
}

export function createJiraCloudSourceFromEnv(env: NodeJS.ProcessEnv = process.env): JiraCloudWorkItemSource {
  return new JiraCloudWorkItemSource({
    baseUrl: env["OPENPOME_JIRA_BASE_URL"],
    email: env["OPENPOME_JIRA_EMAIL"],
    apiToken: env["OPENPOME_JIRA_API_TOKEN"],
    oauthAccessToken: env["OPENPOME_JIRA_OAUTH_ACCESS_TOKEN"],
    oauthRefreshToken: env["OPENPOME_JIRA_OAUTH_REFRESH_TOKEN"],
    oauthCloudId: env["OPENPOME_JIRA_OAUTH_CLOUD_ID"],
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
    scope: tokenPayload.scope,
    tokenType: tokenPayload.token_type,
    cloudId: accessibleResource?.id,
    siteUrl: accessibleResource?.url,
    storedAt: new Date().toISOString()
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

export function getMockAssignedWorkItems(): readonly WorkItem[] {
  return [
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
}

interface JiraSearchResponse {
  readonly issues: readonly JiraIssue[];
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
