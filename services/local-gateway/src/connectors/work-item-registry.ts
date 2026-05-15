import {
  JiraCloudWorkItemSource,
  createJiraCloudOAuthLogin,
  createJiraCloudSourceFromEnv,
  exchangeJiraCloudOAuthCode,
  refreshJiraCloudOAuthToken,
  type JiraCloudConfig,
  type JiraCloudOAuthExchangeRequest,
  type JiraCloudOAuthLogin,
  type JiraCloudOAuthLoginRequest,
  type JiraCloudOAuthRefreshRequest,
  type JiraCloudOAuthTokenSet
} from "@openpome/connector-jira-cloud";
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
  listAssigned(): Promise<readonly WorkItem[]>;
  getWorkItem(key: string): Promise<WorkItem | undefined>;
}

export interface WorkItemSourceRegistry {
  getActiveSource(env: NodeJS.ProcessEnv): WorkItemSourceAdapter;
  getSourceFromConfig(config: JiraCloudConfig): WorkItemSourceAdapter;
}

export function createDefaultWorkItemSourceRegistry(): WorkItemSourceRegistry {
  return {
    getActiveSource: (env) => createJiraCloudSourceFromEnv(env),
    getSourceFromConfig: (config) => new JiraCloudWorkItemSource(config)
  };
}

export {
  createJiraCloudOAuthLogin,
  exchangeJiraCloudOAuthCode,
  refreshJiraCloudOAuthToken
};
