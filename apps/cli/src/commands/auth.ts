import {
  completeJiraOAuthCode,
  createJiraOAuthLogin,
  getJiraAuthStatus,
  listenForJiraOAuthCallback
} from "@openpome/local-gateway";
import { printJiraOAuthCompletion, printJiraOAuthLogin } from "../presentation.js";
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

  return false;
};
