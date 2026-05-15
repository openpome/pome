import {
  JiraCloudWorkItemSource,
  createJiraCloudOAuthLogin,
  exchangeJiraCloudOAuthCode,
  refreshJiraCloudOAuthToken,
  type JiraCloudConfig,
  type JiraCloudOAuthExchangeRequest,
  type JiraCloudOAuthLogin,
  type JiraCloudOAuthLoginRequest,
  type JiraCloudOAuthRefreshRequest,
  type JiraCloudOAuthTokenSet
} from "@openpome/connector-jira-cloud";
import type { WorkItemScopeConfig } from "@openpome/configuration";
import type { WorkItem } from "@openpome/work-items";

export type {
  JiraCloudConfig,
  JiraCloudOAuthExchangeRequest,
  JiraCloudOAuthLogin,
  JiraCloudOAuthLoginRequest,
  JiraCloudOAuthRefreshRequest,
  JiraCloudOAuthTokenSet
};

export interface WorkItemSourceAuthStatus {
  readonly mode: string;
  readonly configured: boolean;
  readonly detail: string;
  readonly expiresAt?: string;
  readonly refreshAvailable?: boolean;
}

export interface WorkItemSourceReachability {
  readonly status: string;
  readonly detail: string;
}

export interface WorkItemSourceAdapter {
  readonly id: string;
  readonly displayName: string;
  getMode(): "live" | "mock";
  getAuthStatus(): WorkItemSourceAuthStatus;
  checkReachability(): Promise<WorkItemSourceReachability>;
  listScopes(): Promise<readonly WorkItemScopeConfig[]>;
  listAssigned(scope?: WorkItemScopeConfig): Promise<readonly WorkItem[]>;
  getWorkItem(key: string): Promise<WorkItem | undefined>;
}

export interface WorkItemSourceRegistryOptions {
  readonly activeScope?: WorkItemScopeConfig;
  readonly connectorCredentials?: Readonly<Record<string, unknown>>;
}

export interface WorkItemSourceRegistry {
  getActiveSource(env: NodeJS.ProcessEnv, options?: WorkItemSourceRegistryOptions): WorkItemSourceAdapter;
  getSourceFromProviderConfig(providerId: string, config: unknown): WorkItemSourceAdapter;
}

export function createDefaultWorkItemSourceRegistry(): WorkItemSourceRegistry {
  return {
    getActiveSource: (env, options) => createJiraCloudAdapter(createJiraCloudConfig(env, options)),
    getSourceFromProviderConfig: (providerId, config) => {
      if (providerId !== "jira-cloud") {
        throw new Error(`Unsupported work item source provider: ${providerId}`);
      }

      return createJiraCloudAdapter(config as JiraCloudConfig);
    }
  };
}

function createJiraCloudAdapter(config: JiraCloudConfig): WorkItemSourceAdapter {
  return new JiraCloudWorkItemSourceAdapter(config);
}

function createJiraCloudConfig(env: NodeJS.ProcessEnv, options: WorkItemSourceRegistryOptions | undefined): JiraCloudConfig {
  const oauthTokenSet = options?.connectorCredentials?.["jira-cloud/oauth"] as JiraCloudOAuthTokenSet | undefined;

  return {
    baseUrl: env["OPENPOME_JIRA_BASE_URL"],
    email: env["OPENPOME_JIRA_EMAIL"],
    apiToken: env["OPENPOME_JIRA_API_TOKEN"],
    boardId: options?.activeScope?.providerId === "jira-cloud" && options.activeScope.kind === "board"
      ? options.activeScope.scopeId
      : env["OPENPOME_JIRA_BOARD_ID"],
    oauthAccessToken: oauthTokenSet?.accessToken ?? env["OPENPOME_JIRA_OAUTH_ACCESS_TOKEN"],
    oauthRefreshToken: oauthTokenSet?.refreshToken ?? env["OPENPOME_JIRA_OAUTH_REFRESH_TOKEN"],
    oauthCloudId: oauthTokenSet?.cloudId ?? env["OPENPOME_JIRA_OAUTH_CLOUD_ID"],
    oauthExpiresAt: oauthTokenSet?.expiresAt ?? env["OPENPOME_JIRA_OAUTH_EXPIRES_AT"],
    oauthClientId: env["OPENPOME_JIRA_OAUTH_CLIENT_ID"],
    oauthClientSecret: env["OPENPOME_JIRA_OAUTH_CLIENT_SECRET"],
    oauthRedirectUri: env["OPENPOME_JIRA_OAUTH_REDIRECT_URI"],
    fixtureFile: env["OPENPOME_JIRA_FIXTURE_FILE"]
  };
}

class JiraCloudWorkItemSourceAdapter implements WorkItemSourceAdapter {
  readonly id = "jira-cloud";
  readonly displayName = "Jira Cloud";

  constructor(private readonly config: JiraCloudConfig) {}

  getMode(): "live" | "mock" {
    return this.createSource().getMode();
  }

  getAuthStatus(): WorkItemSourceAuthStatus {
    return this.createSource().getAuthStatus();
  }

  checkReachability(): Promise<WorkItemSourceReachability> {
    return this.createSource().checkReachability();
  }

  async listScopes(): Promise<readonly WorkItemScopeConfig[]> {
    const boards = await this.createSource().listBoards();
    return boards.map((board) => ({
      providerId: this.id,
      kind: "board",
      scopeId: board.id,
      displayName: board.name,
      metadata: compactRecord({
        jiraBoardType: board.type,
        jiraProjectKey: board.projectKey
      })
    }));
  }

  listAssigned(scope?: WorkItemScopeConfig): Promise<readonly WorkItem[]> {
    return this.createSource(scope).listAssigned();
  }

  getWorkItem(key: string): Promise<WorkItem | undefined> {
    return this.createSource().getWorkItem(key);
  }

  private createSource(scope?: WorkItemScopeConfig): JiraCloudWorkItemSource {
    return new JiraCloudWorkItemSource({
      ...this.config,
      boardId: scope?.providerId === this.id && scope.kind === "board" ? scope.scopeId : this.config.boardId
    });
  }
}

function compactRecord(values: Readonly<Record<string, string | undefined>>): Readonly<Record<string, string>> | undefined {
  const entries = Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export {
  createJiraCloudOAuthLogin,
  exchangeJiraCloudOAuthCode,
  refreshJiraCloudOAuthToken
};
