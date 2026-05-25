import {
  configureModelProvider,
  completeJiraOAuthCode,
  createJiraOAuthLogin,
  getGitHubAuthStatus,
  getJiraAuthStatus,
  getModelProviderStatus,
  listenForJiraOAuthCallback
} from "@openpome/local-gateway";
import {
  printGitHubAuthLoginGuide,
  printGitHubAuthStatus,
  printJiraOAuthCompletion,
  printJiraOAuthLogin,
  printModelProviderAuthResult,
  printModelProviderStatus
} from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleAuthCommand: CommandHandler = async (argv) => {
  const [command, subcommand, value, extra] = argv;

  if (command === "auth" && subcommand === "jira" && value === "status") {
    const status = await getJiraAuthStatus();
    console.log(`Jira auth: ${status.mode}`);
    console.log(`Configured: ${status.configured ? "yes" : "no"}`);
    if (status.expiresAt) {
      console.log(`Expires:    ${status.expiresAt}`);
    }
    if (status.mode === "oauth-3lo") {
      console.log(`Refresh:    ${status.refreshAvailable ? "available" : "not available"}`);
    }
    console.log(status.detail);
    return true;
  }

  if (command === "auth" && subcommand === "jira" && value === "login") {
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
    printGitHubAuthLoginGuide(await getGitHubAuthStatus());
    return true;
  }

  if (command === "auth" && subcommand === "ai" && (!value || value === "status")) {
    printModelProviderStatus(await getModelProviderStatus());
    return true;
  }

  if (command === "auth" && subcommand === "ai" && (value === "openai" || value === "claude" || value === "anthropic" || value === "manual-copy")) {
    const key = value === "manual-copy" ? undefined : await readApiKey(value);
    printModelProviderAuthResult(await configureModelProvider(value, key));
    return true;
  }

  return false;
};

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
