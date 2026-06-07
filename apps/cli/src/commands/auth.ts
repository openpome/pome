import {
  completeGitHubDeviceLogin,
  configureJiraApiTokenAuth,
  configureModelProvider,
  completeJiraOAuthCode,
  createGitHubDeviceLogin,
  createJiraOAuthLogin,
  getGitHubAuthStatus,
  getJiraAuthStatus,
  getModelProviderStatus,
  listenForJiraOAuthCallback
} from "@openpome/local-gateway";
import {
  printGitHubDeviceCompletion,
  printGitHubDeviceLogin,
  printGitHubAuthLoginGuide,
  printGitHubAuthStatus,
  printJiraApiTokenAuthResult,
  printJiraOAuthCompletion,
  printJiraOAuthLogin,
  printCommandFailure,
  printJiraSetupGuide,
  printModelProviderAuthResult,
  printModelProviderStatus
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleAuthCommand: CommandHandler = async (argv) => {
  const [command, subcommand, value, extra] = argv;

  if (command === "auth" && subcommand === "jira" && value === "status") {
    const status = await getJiraAuthStatus();
    console.log(status.configured ? "Jira is connected" : "Jira is not connected");
    console.log(`Mode: ${status.mode === "mock" ? "none" : status.mode}`);
    if (status.expiresAt) {
      console.log(`Expires:    ${status.expiresAt}`);
    }
    if (status.mode === "oauth-3lo") {
      console.log(`Refresh:    ${status.refreshAvailable ? "available" : "not available"}`);
    }
    console.log(status.detail);
    if (!status.configured) {
      console.log("");
      printJiraSetupGuide();
    }
    return true;
  }

  if (command === "auth" && subcommand === "jira" && value === "token") {
    const credentials = await readJiraApiTokenCredentials();
    try {
      printJiraApiTokenAuthResult(await configureJiraApiTokenAuth(credentials));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      printCommandFailure(
        message,
        "Check the Jira site URL, email, and API token, then run `pome auth jira token` again. OpenPome did not save rejected credentials."
      );
    }
    return true;
  }

  if (command === "auth" && subcommand === "jira" && value === "login") {
    if (!process.env["OPENPOME_JIRA_OAUTH_CLIENT_ID"]) {
      printJiraSetupGuide();
      return true;
    }

    if (extra === "--listen") {
      printJiraOAuthCompletion(await listenForJiraOAuthCallback());
      return true;
    }

    printJiraOAuthLogin(createJiraOAuthLogin());
    return true;
  }

  if (command === "auth" && subcommand === "jira" && value === "callback" && extra) {
    printJiraOAuthCompletion(await completeJiraOAuthCode(extra));
    return true;
  }

  if (command === "auth" && subcommand === "github" && value === "status") {
    printGitHubAuthStatus(await getGitHubAuthStatus());
    return true;
  }

  if (command === "auth" && subcommand === "github" && value === "login") {
    if (process.env["OPENPOME_GITHUB_OAUTH_CLIENT_ID"]) {
      const login = await createGitHubDeviceLogin();
      printGitHubDeviceLogin(login);
      printGitHubDeviceCompletion(await completeGitHubDeviceLogin(login));
      return true;
    }

    printGitHubAuthLoginGuide(await getGitHubAuthStatus());
    return true;
  }

  if (command === "auth" && subcommand === "ai" && (!value || value === "status")) {
    printModelProviderStatus(await getModelProviderStatus());
    return true;
  }

  if (command === "auth" && subcommand === "ai" && (value === "openai" || value === "claude" || value === "anthropic" || value === "claude-cli" || value === "manual-copy")) {
    const key = value === "manual-copy" || value === "claude-cli" ? undefined : await readApiKey(value);
    printModelProviderAuthResult(await configureModelProvider(value, key));
    return true;
  }

  return false;
};

async function readJiraApiTokenCredentials(): Promise<{ readonly baseUrl: string; readonly email: string; readonly apiToken: string }> {
  const envBaseUrl = process.env["OPENPOME_JIRA_BASE_URL"];
  const envEmail = process.env["OPENPOME_JIRA_EMAIL"];
  const envApiToken = process.env["OPENPOME_JIRA_API_TOKEN"];
  if (envBaseUrl && envEmail && envApiToken) {
    return {
      baseUrl: envBaseUrl,
      email: envEmail,
      apiToken: envApiToken
    };
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Jira credentials are required. Run interactively or set OPENPOME_JIRA_BASE_URL, OPENPOME_JIRA_EMAIL, and OPENPOME_JIRA_API_TOKEN.");
  }

  const baseUrl = await readVisibleLine("Jira site URL (for example https://your-company.atlassian.net): ");
  const email = await readVisibleLine("Jira email: ");
  const apiToken = await readHiddenLine("Jira API token: ");
  return { baseUrl, email, apiToken };
}

function readVisibleLine(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let value = "";

    process.stdout.write(prompt);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      value += chunk;
      if (value.includes("\n") || value.includes("\r")) {
        stdin.pause();
        stdin.off("data", onData);
        resolve(value.trim());
      }
    };

    stdin.on("data", onData);
  });
}

async function readApiKey(provider: string): Promise<string | undefined> {
  const envKey = provider === "openai" ? process.env["OPENAI_API_KEY"] : process.env["ANTHROPIC_API_KEY"];
  if (envKey) {
    return envKey;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      provider === "openai"
        ? "OPENAI_API_KEY is required when the terminal is not interactive."
        : "ANTHROPIC_API_KEY is required when the terminal is not interactive."
    );
  }

  return readHiddenLine(`Paste ${provider === "openai" ? "OpenAI" : "Claude"} API key: `);
}

function readHiddenLine(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = "";

    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    const onData = (chunk: string) => {
      if (chunk === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Cancelled."));
        return;
      }

      if (chunk === "\r" || chunk === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(value.trim());
        return;
      }

      if (chunk === "\u007f") {
        value = value.slice(0, -1);
        return;
      }

      value += chunk;
    };

    stdin.on("data", onData);
  });
}
