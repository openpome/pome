#!/usr/bin/env node

import {
  completeJiraOAuthCode,
  createJiraOAuthLogin,
  getJiraAuthStatus,
  initOpenPome,
  listenForJiraOAuthCallback,
  listAssignedWork,
  runDoctor,
  showWorkItem,
  type AssignedWorkResult
} from "@openpome/local-gateway";
import type { WorkItem, WorkItemType } from "@openpome/work-items";

const args = process.argv.slice(2);
const normalizedArgs = args[0] === "--" ? args.slice(1) : args;

try {
  await main(normalizedArgs);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

async function main(argv: readonly string[]): Promise<void> {
  const [command, subcommand, value, extra] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    const result = await initOpenPome();
    console.log(result.created ? "Created OpenPome local configuration." : "OpenPome local configuration already exists.");
    console.log(`Home:   ${result.homeDirectory}`);
    console.log(`Config: ${result.configFile}`);
    return;
  }

  if (command === "doctor") {
    const result = await runDoctor();
    console.log(`OpenPome doctor: ${result.status}`);
    console.log("");

    for (const check of result.checks) {
      const marker = check.status === "ok" ? "ok" : "!";
      console.log(`${marker.padEnd(2)} ${check.name}: ${check.detail}`);
    }

    return;
  }

  if (command === "auth" && subcommand === "jira" && value === "status") {
    const status = await getJiraAuthStatus();
    console.log(`Jira auth: ${status.mode}`);
    console.log(`Configured: ${status.configured ? "yes" : "no"}`);
    console.log(status.detail);
    return;
  }

  if (command === "auth" && subcommand === "jira" && value === "login") {
    if (extra === "--listen") {
      const completion = await listenForJiraOAuthCallback();
      console.log(completion.detail);
      if (completion.siteUrl) {
        console.log(`Site: ${completion.siteUrl}`);
      }
      return;
    }

    const login = createJiraOAuthLogin();
    console.log("Jira OAuth login");
    console.log("");
    console.log(`Redirect URI: ${login.redirectUri}`);
    console.log(`Scopes:       ${login.scopes.join(", ")}`);
    console.log(`State:        ${login.state}`);
    console.log("");
    console.log("Open this URL in your browser:");
    console.log(login.authorizationUrl);
    console.log("");
    console.log(login.nextStep);
    return;
  }

  if (command === "auth" && subcommand === "jira" && value === "callback" && extra) {
    const completion = await completeJiraOAuthCode(extra);
    console.log(completion.detail);
    if (completion.siteUrl) {
      console.log(`Site: ${completion.siteUrl}`);
    }
    return;
  }

  if ((command === "jira" || command === "work-item") && subcommand === "list") {
    printAssignedWork(await listAssignedWork());
    return;
  }

  if ((command === "jira" || command === "work-item") && subcommand === "show" && value) {
    const item = await showWorkItem(value);

    if (!item) {
      console.error(`Work item not found: ${value}`);
      process.exitCode = 1;
      return;
    }

    printWorkItem(item);
    return;
  }

  console.error(`Unknown command: ${argv.join(" ")}`);
  console.error("");
  printHelp();
  process.exitCode = 1;
}

function printHelp(): void {
  console.log([
    "OpenPome CLI",
    "",
    "Usage:",
    "  pome init",
    "  pome doctor",
    "  pome auth jira status",
    "  pome auth jira login",
    "  pome auth jira login --listen",
    "  pome auth jira callback <CODE>",
    "  pome work-item list",
    "  pome work-item show <KEY>",
    "  pome jira list",
    "  pome jira show <KEY>",
    "",
    "Jira live mode environment:",
    "  OPENPOME_JIRA_BASE_URL=https://your-domain.atlassian.net",
    "  OPENPOME_JIRA_EMAIL=you@example.com",
    "  OPENPOME_JIRA_API_TOKEN=...",
    "",
    "Jira OAuth development environment:",
    "  OPENPOME_JIRA_OAUTH_CLIENT_ID=...",
    "  OPENPOME_JIRA_OAUTH_CLIENT_SECRET=...",
    "  OPENPOME_JIRA_OAUTH_REDIRECT_URI=http://127.0.0.1:48731/auth/jira/callback"
  ].join("\n"));
}

function printAssignedWork(result: AssignedWorkResult): void {
  console.log(`Assigned work from ${result.sourceDisplayName} (${result.sourceMode})`);
  console.log("");

  const sections: readonly [WorkItemType, string][] = [
    ["story", "Stories"],
    ["subtask", "Sub-tasks"],
    ["bug", "Bugs"],
    ["task", "Tasks"],
    ["epic", "Epics"]
  ];

  for (const [type, label] of sections) {
    const items = result.groups[type];

    if (items.length === 0) {
      continue;
    }

    console.log(label);

    for (const item of items) {
      const priority = item.priority ? ` · ${item.priority}` : "";
      console.log(`  ${item.key.padEnd(10)} ${item.title}`);
      console.log(`  ${"".padEnd(10)} ${item.status}${priority}`);
    }

    console.log("");
  }
}

function printWorkItem(item: WorkItem): void {
  console.log(`${item.key} ${item.title}`);
  console.log("");
  console.log(`Type:     ${item.type}`);
  console.log(`Status:   ${item.status}`);

  if (item.priority) {
    console.log(`Priority: ${item.priority}`);
  }

  if (item.assignee) {
    console.log(`Assignee: ${item.assignee}`);
  }

  if (item.parentKey) {
    console.log(`Parent:   ${item.parentKey}`);
  }

  if (item.labels?.length) {
    console.log(`Labels:   ${item.labels.join(", ")}`);
  }

  if (item.components?.length) {
    console.log(`Components: ${item.components.join(", ")}`);
  }

  if (item.description) {
    console.log("");
    console.log("Description");
    console.log(item.description);
  }

  if (item.subtasks?.length) {
    console.log("");
    console.log("Subtasks");

    for (const subtask of item.subtasks) {
      console.log(`  ${subtask.key} ${subtask.title} (${subtask.status})`);
    }
  }

  if (item.links?.length) {
    console.log("");
    console.log("Links");

    for (const link of item.links) {
      const title = link.title ? ` - ${link.title}` : "";
      console.log(`  ${link.kind}: ${link.url}${title}`);
    }
  }
}
