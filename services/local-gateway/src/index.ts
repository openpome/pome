import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { defaultConfig, type OpenPomeConfig } from "@openpome/configuration";
import { createCredentialStore, getJsonCredential, setJsonCredential } from "@openpome/credentials";
import {
  JiraCloudWorkItemSource,
  createJiraCloudOAuthLogin,
  createJiraCloudSourceFromEnv,
  exchangeJiraCloudOAuthCode,
  refreshJiraCloudOAuthToken,
  type JiraCloudConfig,
  type JiraCloudOAuthTokenSet
} from "@openpome/connector-jira-cloud";
import { groupWorkItemsByType, type WorkItem, type WorkItemType } from "@openpome/work-items";

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
  readonly groups: Readonly<Record<WorkItemType, readonly WorkItem[]>>;
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

const jiraOAuthCredentialAccount = "jira-cloud/oauth";

export function getGatewayHealth(): GatewayHealth {
  return {
    status: "ok",
    version: "0.4.1"
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

  await writeFile(paths.configFile, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");

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
  const items = await source.listAssigned();

  return {
    sourceId: source.id,
    sourceDisplayName: source.displayName,
    sourceMode: source.getMode(),
    groups: groupWorkItemsByType(items)
  };
}

export async function showWorkItem(key: string, env: NodeJS.ProcessEnv = process.env): Promise<WorkItem | undefined> {
  const source = await createJiraSource(env);
  return source.getWorkItem(key);
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

async function createJiraSource(env: NodeJS.ProcessEnv): Promise<JiraCloudWorkItemSource> {
  const envSource = createJiraCloudSourceFromEnv(env);
  const storedOAuth = await refreshStoredJiraOAuthIfNeeded(await readStoredJiraOAuth(), env);

  if (!storedOAuth) {
    return envSource;
  }

  const config: JiraCloudConfig = {
    baseUrl: env["OPENPOME_JIRA_BASE_URL"],
    email: env["OPENPOME_JIRA_EMAIL"],
    apiToken: env["OPENPOME_JIRA_API_TOKEN"],
    oauthAccessToken: storedOAuth.accessToken,
    oauthRefreshToken: storedOAuth.refreshToken,
    oauthCloudId: storedOAuth.cloudId,
    oauthExpiresAt: storedOAuth.expiresAt,
    oauthClientId: env["OPENPOME_JIRA_OAUTH_CLIENT_ID"],
    oauthClientSecret: env["OPENPOME_JIRA_OAUTH_CLIENT_SECRET"],
    oauthRedirectUri: env["OPENPOME_JIRA_OAUTH_REDIRECT_URI"]
  };

  return new JiraCloudWorkItemSource(config);
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
