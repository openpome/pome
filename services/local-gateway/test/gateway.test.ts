import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const credentialState = vi.hoisted(() => ({
  available: false,
  credential: undefined as unknown,
  credentials: new Map<string, unknown>()
}));

vi.mock("@openpome/credentials", () => ({
  createCredentialStore: () => ({
    backend: credentialState.available ? "test-keychain" : "unsupported-test",
    isAvailable: () => credentialState.available,
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }),
  getJsonCredential: vi.fn(async (_store, account: string) => credentialState.credentials.get(account) ?? credentialState.credential),
  setJsonCredential: vi.fn(async (_store, account: string, value: unknown) => {
    credentialState.credentials.set(account, value);
    credentialState.credential = value;
  })
}));

const originalFetch = globalThis.fetch;
const originalOpenPomeHome = process.env["OPENPOME_HOME"];
const originalPath = process.env["PATH"];
const jiraEnvironmentKeys = [
  "OPENPOME_JIRA_BASE_URL",
  "OPENPOME_JIRA_EMAIL",
  "OPENPOME_JIRA_API_TOKEN",
  "OPENPOME_JIRA_OAUTH_ACCESS_TOKEN",
  "OPENPOME_JIRA_OAUTH_REFRESH_TOKEN",
  "OPENPOME_JIRA_OAUTH_CLOUD_ID",
  "OPENPOME_JIRA_OAUTH_EXPIRES_AT",
  "OPENPOME_JIRA_OAUTH_CLIENT_ID",
  "OPENPOME_JIRA_OAUTH_CLIENT_SECRET",
  "OPENPOME_JIRA_OAUTH_REDIRECT_URI",
  "OPENPOME_GITHUB_OAUTH_CLIENT_ID",
  "OPENPOME_GITHUB_OAUTH_SCOPE",
  "OPENPOME_DEMO"
] as const;
const tempPaths: string[] = [];

beforeEach(() => {
  clearJiraEnvironment();
});

afterEach(async () => {
  credentialState.available = false;
  credentialState.credential = undefined;
  credentialState.credentials.clear();
  globalThis.fetch = originalFetch;
  clearJiraEnvironment();

  if (originalOpenPomeHome === undefined) {
    delete process.env["OPENPOME_HOME"];
  } else {
    process.env["OPENPOME_HOME"] = originalOpenPomeHome;
  }
  if (originalPath === undefined) {
    delete process.env["PATH"];
  } else {
    process.env["PATH"] = originalPath;
  }

  vi.restoreAllMocks();

  await Promise.all(tempPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function clearJiraEnvironment(): void {
  for (const key of jiraEnvironmentKeys) {
    delete process.env[key];
  }
}

describe("local gateway", () => {
  it("reports mock Jira auth status when no credentials are configured", async () => {
    const { getJiraAuthStatus } = await import("../src/index.js");

    await expect(getJiraAuthStatus({})).resolves.toMatchObject({
      provider: "jira-cloud",
      mode: "mock",
      configured: false
    });
  });

  it("recommends the next assistant action from setup through completion", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;
    const {
      approveTaskSessionPlan,
      createTaskSessionPlan,
      getAssistantDecision,
      startTaskSession
    } = await import("../src/index.js");

    await expect(getAssistantDecision()).resolves.toMatchObject({
      action: "connect_jira",
      commands: expect.arrayContaining(["pome onboard"])
    });

    process.env["OPENPOME_DEMO"] = "1";
    await startTaskSession("POME-101", {});
    await expect(getAssistantDecision()).resolves.toMatchObject({
      action: "create_plan",
      commands: ["pome plan"]
    });

    await createTaskSessionPlan();
    await expect(getAssistantDecision()).resolves.toMatchObject({
      action: "approve_plan",
      commands: ["pome approve"]
    });

    await approveTaskSessionPlan();
    await expect(getAssistantDecision()).resolves.toMatchObject({
      action: "propose_patch",
      commands: expect.arrayContaining(["pome next"])
    });
    delete process.env["OPENPOME_DEMO"];
  });

  it("shows and resets local configuration paths", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;
    const { getConfigPaths, resetOpenPomeConfig, showOpenPomeConfig } = await import("../src/index.js");

    await expect(getConfigPaths()).resolves.toMatchObject({
      homeDirectory: home,
      configFile: join(home, "config.json"),
      activeTaskSessionFile: join(home, "active-task-session.json"),
      taskSessionHistoryFile: join(home, "task-session-history.json")
    });

    await expect(showOpenPomeConfig()).resolves.toMatchObject({
      exists: false,
      config: expect.objectContaining({
        configVersion: 1,
        activeModelProvider: "manual-copy"
      })
    });

    await expect(resetOpenPomeConfig()).resolves.toMatchObject({
      configFile: join(home, "config.json"),
      config: expect.objectContaining({
        configVersion: 1
      })
    });
    await expect(showOpenPomeConfig()).resolves.toMatchObject({
      exists: true
    });
  });

  it("reports API-token Jira auth status from env", async () => {
    const { getJiraAuthStatus } = await import("../src/index.js");

    await expect(
      getJiraAuthStatus({
        OPENPOME_JIRA_BASE_URL: "https://example.atlassian.net",
        OPENPOME_JIRA_EMAIL: "dev@example.com",
        OPENPOME_JIRA_API_TOKEN: "token"
      })
    ).resolves.toMatchObject({
      provider: "jira-cloud",
      mode: "api-token",
      configured: true
    });
  });

  it("lists and persists a selected Jira board scope", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;
    const { listAssignedWork, listJiraBoards, listWorkItemScopes, useJiraBoard, useWorkItemScope } = await import("../src/index.js");

    await expect(listWorkItemScopes({})).resolves.toMatchObject({
      sourceId: "jira-cloud",
      sourceDisplayName: "Jira Cloud",
      sourceMode: "mock",
      scopes: expect.arrayContaining([
        expect.objectContaining({
          providerId: "jira-cloud",
          kind: "board",
          scopeId: "100",
          displayName: "OpenPome MVP"
        })
      ])
    });

    await expect(listJiraBoards({})).resolves.toMatchObject({
      provider: "jira-cloud",
      sourceMode: "mock",
      boards: expect.arrayContaining([
        expect.objectContaining({
          providerId: "jira-cloud",
          kind: "board",
          scopeId: "100",
          displayName: "OpenPome MVP"
        })
      ])
    });

    await expect(useWorkItemScope("200", {})).resolves.toMatchObject({
      sourceId: "jira-cloud",
      sourceDisplayName: "Jira Cloud",
      activeScope: expect.objectContaining({
        providerId: "jira-cloud",
        kind: "board",
        scopeId: "200",
        displayName: "OpenPome Connectors"
      })
    });

    const selection = await useJiraBoard("200", {});
    expect(selection).toMatchObject({
      activeScope: expect.objectContaining({
        providerId: "jira-cloud",
        kind: "board",
        scopeId: "200",
        displayName: "OpenPome Connectors"
      })
    });

    const persistedConfig = JSON.parse(await readFile(join(home, "config.json"), "utf8")) as {
      activeWorkItemScope?: { readonly scopeId?: string };
    };
    expect(persistedConfig.activeWorkItemScope?.scopeId).toBe("200");

    await expect(listAssignedWork({})).resolves.toMatchObject({
      activeScope: expect.objectContaining({
        scopeId: "200"
      }),
      groups: expect.objectContaining({
        bug: expect.arrayContaining([
          expect.objectContaining({
            key: "POME-102"
          })
        ])
      })
    });
  });

  it("reports stored OAuth auth status from credential storage", async () => {
    credentialState.available = true;
    credentialState.credential = {
      accessToken: "access",
      refreshToken: "refresh",
      cloudId: "cloud-id",
      expiresAt: "2030-01-01T00:00:00.000Z",
      tokenType: "Bearer",
      storedAt: "2026-01-01T00:00:00.000Z"
    };

    const { getJiraAuthStatus } = await import("../src/index.js");

    await expect(
      getJiraAuthStatus({
        OPENPOME_JIRA_OAUTH_CLIENT_ID: "client",
        OPENPOME_JIRA_OAUTH_REDIRECT_URI: "http://127.0.0.1:48731/auth/jira/callback"
      })
    ).resolves.toMatchObject({
      provider: "jira-cloud",
      mode: "oauth-3lo",
      configured: true,
      expiresAt: "2030-01-01T00:00:00.000Z",
      refreshAvailable: true
    });
  });

  it("connects GitHub through native device login and stores the token", async () => {
    credentialState.available = true;
    globalThis.fetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        device_code: "device-code",
        user_code: "ABCD-1234",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5
      }))
      .mockResolvedValueOnce(jsonResponse({
        access_token: "github-token",
        token_type: "bearer",
        scope: "repo,read:user"
      }))
      .mockResolvedValueOnce(jsonResponse({
        login: "iamdotk",
        id: 123
      }));

    const { completeGitHubDeviceLogin, createGitHubDeviceLogin } = await import("../src/index.js");
    const env = {
      OPENPOME_GITHUB_OAUTH_CLIENT_ID: "github-client",
      OPENPOME_GITHUB_OAUTH_SCOPE: "repo read:user"
    };

    const login = await createGitHubDeviceLogin(env);
    expect(login).toMatchObject({
      provider: "github",
      userCode: "ABCD-1234",
      verificationUri: "https://github.com/login/device",
      scope: "repo read:user"
    });

    await expect(completeGitHubDeviceLogin(login, env, { pollDelayMilliseconds: 0 })).resolves.toMatchObject({
      provider: "github",
      authenticated: true,
      username: "iamdotk"
    });

    expect(credentialState.credentials.get("github/oauth")).toMatchObject({
      accessToken: "github-token",
      scopes: ["repo", "read:user"]
    });
  });

  it("reports stored OpenPome GitHub browser auth before falling back to GitHub CLI", async () => {
    credentialState.available = true;
    credentialState.credentials.set("github/oauth", {
      accessToken: "github-token",
      tokenType: "bearer",
      scopes: ["repo", "read:user"],
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({
      login: "iamdotk",
      id: 123
    }));

    const { getGitHubAuthStatus } = await import("../src/index.js");

    await expect(getGitHubAuthStatus()).resolves.toMatchObject({
      provider: "github",
      nativeAuthenticated: true,
      authenticated: true,
      username: "iamdotk",
      tokenSource: "openpome"
    });
  });

  it("doctor reports attention when config and Jira auth are missing", async () => {
    process.env["OPENPOME_HOME"] = await createTempDirectory("openpome-gateway-test-missing-");
    const { runDoctor } = await import("../src/index.js");

    const result = await runDoctor({});

    expect(result.status).toBe("attention");
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Configuration",
          status: "attention"
        }),
        expect.objectContaining({
          name: "Work item source",
          status: "attention",
          detail: "Jira is not connected. Run `pome onboard` to connect Jira, or `pome demo` to try sample work."
        }),
        expect.objectContaining({
          name: "Jira reachability",
          status: "attention"
        })
      ])
    );
  });

  it("doctor reports reachable Jira with API-token auth", async () => {
    credentialState.available = true;
    process.env["OPENPOME_HOME"] = await createTempDirectory("openpome-gateway-test-api-token-");
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ accountId: "abc" }));

    const { initOpenPome, runDoctor } = await import("../src/index.js");
    await initOpenPome();
    const result = await runDoctor({
      OPENPOME_JIRA_BASE_URL: "https://example.atlassian.net",
      OPENPOME_JIRA_EMAIL: "dev@example.com",
      OPENPOME_JIRA_API_TOKEN: "token"
    });

    expect(result.status).toBe("attention");
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Jira reachability",
          status: "ok"
        }),
        expect.objectContaining({
          name: "Work item scope",
          status: "attention"
        })
      ])
    );
  });

  it("doctor reports unauthorized Jira reachability without throwing", async () => {
    credentialState.available = true;
    process.env["OPENPOME_HOME"] = await createTempDirectory("openpome-gateway-test-unauthorized-");
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ errorMessages: ["Forbidden"] }, 403));

    const { initOpenPome, runDoctor } = await import("../src/index.js");
    await initOpenPome();
    const result = await runDoctor({
      OPENPOME_JIRA_BASE_URL: "https://example.atlassian.net",
      OPENPOME_JIRA_EMAIL: "dev@example.com",
      OPENPOME_JIRA_API_TOKEN: "token"
    });

    expect(result.status).toBe("attention");
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Jira reachability",
          status: "attention",
          detail: expect.stringContaining("403")
        })
      ])
    );
  });

  it("scans, lists, and resolves local Git workspaces", async () => {
    const home = await createTempDirectory("openpome-home-");
    const scanRoot = await createTempDirectory("openpome-scan-");
    const repoPath = join(scanRoot, "pome-service");
    const linkedRepoPath = join(scanRoot, "backend-api");
    await createGitFixture(repoPath, "git@github.com:openpome/pome-service.git", "feature/POME-101-workspace");
    await createGitFixture(linkedRepoPath, "git@github.com:openpome/backend-api.git", "main");
    process.env["OPENPOME_HOME"] = home;

    const { linkWorkspaceToWorkItem, listWorkspaces, resolveWorkspaceForWorkItem, scanWorkspaces } = await import("../src/index.js");
    const scanResult = await scanWorkspaces({
      OPENPOME_WORKSPACE_SCAN_PATHS: scanRoot
    });

    expect(scanResult.workspaces).toHaveLength(2);
    expect(scanResult.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "pome-service",
          path: repoPath,
          currentBranch: "feature/POME-101-workspace",
          remoteUrls: ["git@github.com:openpome/pome-service.git"]
        })
      ])
    );

    await expect(listWorkspaces()).resolves.toMatchObject({
      workspaces: expect.arrayContaining([
        expect.objectContaining({
          name: "pome-service"
        })
      ])
    });

    const resolution = await resolveWorkspaceForWorkItem("POME-101", {
      OPENPOME_WORKSPACE_SCAN_PATHS: scanRoot
    });

    expect(resolution?.candidates[0]).toMatchObject({
      workspace: expect.objectContaining({
        name: "pome-service"
      })
    });
    expect(resolution?.candidates[0]?.confidence).toBeGreaterThanOrEqual(0.45);

    await expect(linkWorkspaceToWorkItem("POME-101", linkedRepoPath)).resolves.toMatchObject({
      workItemKey: "POME-101",
      workspace: expect.objectContaining({
        name: "backend-api"
      }),
      link: expect.objectContaining({
        source: "developer_confirmation",
        confidence: 0.95
      })
    });

    const linkedResolution = await resolveWorkspaceForWorkItem("POME-101", {
      OPENPOME_WORKSPACE_SCAN_PATHS: scanRoot
    });

    expect(linkedResolution?.candidates[0]).toMatchObject({
      workspace: expect.objectContaining({
        name: "backend-api"
      }),
      reasons: expect.arrayContaining(["developer-confirmed workspace link"])
    });
  });

  it("uses repository metadata to improve workspace resolution confidence", async () => {
    const home = await createTempDirectory("openpome-home-");
    const scanRoot = await createTempDirectory("openpome-metadata-scan-");
    const metadataRepoPath = join(scanRoot, "delivery-shell");
    const fallbackRepoPath = join(scanRoot, "random-service");
    await createGitFixture(fallbackRepoPath, "git@github.com:example/random-service.git", "main");
    await createGitFixture(metadataRepoPath, "https://github.com/openpome/pome.git", "feature/POME-101-cli-foundation", {
      packageJson: {
        name: "@company/developer-workbench"
      },
      readme: "# OpenPome CLI\n\nDeveloper workbench for assigned work item planning.",
      codeowners: "apps/cli/ @openpome/cli-team\n",
      recentBranches: ["feature/POME-101-cli-foundation", "bugfix/POME-404-old"],
      headLog: "0000000 1111111 Dev <dev@example.com> 1700000000 +0000\tcommit: POME-101 implement CLI foundation\n"
    });
    process.env["OPENPOME_HOME"] = home;

    const { resolveWorkspaceForWorkItem, scanWorkspaces } = await import("../src/index.js");
    await scanWorkspaces({
      OPENPOME_WORKSPACE_SCAN_PATHS: scanRoot
    });

    const resolution = await resolveWorkspaceForWorkItem("POME-101", {
      OPENPOME_WORKSPACE_SCAN_PATHS: scanRoot
    });

    expect(resolution?.candidates[0]).toMatchObject({
      workspace: expect.objectContaining({
        name: "delivery-shell",
        packageNames: ["@company/developer-workbench"],
        recentCommitRefs: ["POME-101"]
      }),
      reasons: expect.arrayContaining([
        "linked code URL matches workspace remote",
        "current branch references POME-101",
        "recent commit history references POME-101"
      ])
    });
    expect(resolution?.candidates[0]?.confidence).toBeGreaterThanOrEqual(0.8);
  });


  it("links a work item to a Git workspace before a scan exists", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-linked-"), "standalone-service");
    await createGitFixture(repoPath, "git@github.com:openpome/standalone-service.git", "main");
    process.env["OPENPOME_HOME"] = home;

    const { linkWorkspaceToWorkItem, listWorkspaces, resolveWorkspaceForWorkItem } = await import("../src/index.js");
    await expect(linkWorkspaceToWorkItem("POME-101", ".", { INIT_CWD: repoPath })).resolves.toMatchObject({
      workspace: expect.objectContaining({
        name: "standalone-service"
      })
    });

    await expect(listWorkspaces()).resolves.toMatchObject({
      workspaces: [
        expect.objectContaining({
          name: "standalone-service"
        })
      ]
    });

    const resolution = await resolveWorkspaceForWorkItem("POME-101", {});
    expect(resolution?.candidates[0]).toMatchObject({
      workspace: expect.objectContaining({
        name: "standalone-service"
      }),
      reasons: expect.arrayContaining(["developer-confirmed workspace link"])
    });
  });

  it("rejects workspace links to non-Git paths", async () => {
    const home = await createTempDirectory("openpome-home-");
    const plainDirectory = await createTempDirectory("openpome-not-git-");
    process.env["OPENPOME_HOME"] = home;

    const { linkWorkspaceToWorkItem } = await import("../src/index.js");

    await expect(linkWorkspaceToWorkItem("POME-101", plainDirectory)).rejects.toThrow(/not a Git repository/);
  });

  it("starts an active task session and creates a deterministic plan", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-session-"), "session-service");
    await createGitFixture(repoPath, "git@github.com:openpome/session-service.git", "feature/POME-101-session");
    process.env["OPENPOME_HOME"] = home;

    const { createTaskSessionPlan, getTaskSessionStatus, getTaskSessionTimeline, linkWorkspaceToWorkItem, startTaskSession } =
      await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);

    const started = await startTaskSession("POME-101", {});
    expect(started).toMatchObject({
      workItem: expect.objectContaining({
        key: "POME-101"
      }),
      session: expect.objectContaining({
        workItemKey: "POME-101",
        status: "planning",
        automationLevel: 1
      }),
      workspaceCandidate: expect.objectContaining({
        workspace: expect.objectContaining({
          name: "session-service"
        })
      })
    });

    await expect(getTaskSessionStatus()).resolves.toMatchObject({
      active: true,
      session: expect.objectContaining({
        id: started?.session.id,
        status: "planning"
      }),
      events: expect.arrayContaining([
        expect.objectContaining({
          type: "session_started"
        }),
        expect.objectContaining({
          type: "workspace_resolved"
        })
      ])
    });

    await expect(startTaskSession("POME-102", {})).rejects.toThrow(/Active task session already exists/);

    const planResult = await createTaskSessionPlan();
    expect(planResult).toMatchObject({
      session: expect.objectContaining({
        id: started?.session.id,
        status: "awaiting_approval"
      }),
      plan: expect.objectContaining({
        summary: expect.stringContaining("POME-101"),
        commandsToRun: expect.arrayContaining(["pnpm validate"])
      }),
      prompt: expect.stringContaining("Create an implementation plan")
    });

    await expect(getTaskSessionStatus()).resolves.toMatchObject({
      active: true,
      session: expect.objectContaining({
        status: "awaiting_approval"
      }),
      plan: expect.objectContaining({
        summary: expect.stringContaining("POME-101")
      }),
      planApproval: expect.objectContaining({
        status: "pending"
      }),
      events: expect.arrayContaining([
        expect.objectContaining({
          type: "plan_created"
        }),
        expect.objectContaining({
          type: "approval_requested"
        })
      ]),
      approvalHistory: expect.arrayContaining([
        expect.objectContaining({
          status: "pending"
        })
      ])
    });

    await expect(getTaskSessionTimeline()).resolves.toMatchObject({
      active: true,
      events: expect.arrayContaining([
        expect.objectContaining({
          type: "plan_created"
        })
      ])
    });
  });

  it("approves and rejects task session plans", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-approval-"), "approval-service");
    await createGitFixture(repoPath, "git@github.com:openpome/approval-service.git", "feature/POME-101-approval");
    process.env["OPENPOME_HOME"] = home;

    const {
      approveTaskSessionPlan,
      createTaskSessionPlan,
      getTaskSessionApprovalHistory,
      getTaskSessionStatus,
      getTaskSessionTimeline,
      linkWorkspaceToWorkItem,
      rejectTaskSessionPlan,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();

    await expect(approveTaskSessionPlan()).resolves.toMatchObject({
      session: expect.objectContaining({
        status: "implementing"
      }),
      approval: expect.objectContaining({
        type: "approve_plan",
        status: "approved"
      })
    });
    await expect(getTaskSessionStatus()).resolves.toMatchObject({
      active: true,
      planApproval: expect.objectContaining({
        status: "approved"
      }),
      approvalHistory: expect.arrayContaining([
        expect.objectContaining({
          status: "pending"
        }),
        expect.objectContaining({
          status: "approved"
        })
      ])
    });
    await expect(getTaskSessionApprovalHistory()).resolves.toMatchObject({
      active: true,
      approvals: expect.arrayContaining([
        expect.objectContaining({
          status: "approved"
        })
      ])
    });

    await createTaskSessionPlan();
    await expect(rejectTaskSessionPlan("Needs smaller scope.")).resolves.toMatchObject({
      session: expect.objectContaining({
        status: "blocked"
      }),
      approval: expect.objectContaining({
        type: "approve_plan",
        status: "rejected",
        reason: "Needs smaller scope."
      })
    });
    await expect(getTaskSessionTimeline()).resolves.toMatchObject({
      active: true,
      events: expect.arrayContaining([
        expect.objectContaining({
          type: "approval_approved"
        }),
        expect.objectContaining({
          type: "approval_rejected"
        })
      ])
    });
  });

  it("discovers test commands and records approved command evidence", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-tests-"), "testable-service");
    await createGitFixture(repoPath, "git@github.com:openpome/testable-service.git", "feature/POME-101-tests", {
      packageJson: {
        name: "@openpome/testable-service",
        scripts: {
          validate: "pnpm typecheck && pnpm test",
          test: "vitest run",
          lint: "eslint ."
        }
      },
      pnpmLock: true
    });
    process.env["OPENPOME_HOME"] = home;

    const {
      approveTestCommand,
      discoverTestCommands,
      getTestCommandHistory,
      linkWorkspaceToWorkItem,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});

    await expect(discoverTestCommands()).resolves.toMatchObject({
      active: true,
      workspace: expect.objectContaining({
        name: "testable-service"
      }),
      candidates: expect.arrayContaining([
        expect.objectContaining({
          id: "script_validate",
          command: "pnpm validate",
          source: "package_json",
          cwd: repoPath
        }),
        expect.objectContaining({
          id: "script_test",
          command: "pnpm test"
        })
      ])
    });

    await expect(approveTestCommand()).resolves.toMatchObject({
      command: "pnpm validate",
      cwd: repoPath,
      approval: expect.objectContaining({
        type: "run_command",
        status: "approved"
      })
    });

    await expect(getTestCommandHistory()).resolves.toMatchObject({
      active: true,
      evidence: [
        expect.objectContaining({
          command: "pnpm validate",
          approval: expect.objectContaining({
            type: "run_command"
          })
        })
      ]
    });
  });

  it("creates local PR and work item update drafts from the active session", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-drafts-"), "draft-service");
    await createGitFixture(repoPath, "git@github.com:openpome/draft-service.git", "feature/POME-101-draft", {
      packageJson: {
        name: "@openpome/draft-service",
        scripts: {
          validate: "pnpm validate"
        }
      },
      pnpmLock: true
    });
    process.env["OPENPOME_HOME"] = home;

    const {
      approveTaskSessionPlan,
      approveTestCommand,
      createPullRequestDraft,
      createTaskSessionPlan,
      createWorkItemUpdateDraft,
      discoverTestCommands,
      linkWorkspaceToWorkItem,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();
    await approveTaskSessionPlan();
    await discoverTestCommands();
    await approveTestCommand("pnpm validate");

    await expect(createPullRequestDraft()).resolves.toMatchObject({
      active: true,
      draft: expect.objectContaining({
        title: expect.stringContaining("POME-101"),
        baseBranch: "main",
        headBranch: "feature/POME-101-draft",
        remoteUrl: "git@github.com:openpome/draft-service.git",
        body: expect.stringContaining("Approved command: `pnpm validate`")
      })
    });

    await expect(createWorkItemUpdateDraft()).resolves.toMatchObject({
      active: true,
      workItem: expect.objectContaining({
        key: "POME-101"
      }),
      draft: expect.objectContaining({
        body: expect.stringContaining("Plan approval: approved")
      })
    });
  });

  it("creates manual-copy AI context and diff summaries without full code", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-ai-"), "ai-service");
    await createGitFixture(repoPath, "git@github.com:openpome/ai-service.git", "feature/POME-101-ai");
    process.env["OPENPOME_HOME"] = home;

    const {
      createManualCopyAIContext,
      createManualCopyAIPrompt,
      createTaskSessionPlan,
      getDiffSummary,
      linkWorkspaceToWorkItem,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();

    await expect(getDiffSummary()).resolves.toMatchObject({
      active: true,
      summary: expect.objectContaining({
        includesFullDiff: false
      })
    });
    await expect(createManualCopyAIContext()).resolves.toMatchObject({
      active: true,
      context: expect.objectContaining({
        includesSourceCode: false,
        includesFullDiff: false,
        text: expect.stringContaining("POME-101")
      })
    });
    await expect(createManualCopyAIPrompt()).resolves.toMatchObject({
      active: true,
      prompt: expect.stringContaining("OpenPome manual-copy AI context")
    });
  });

  it("proposes and applies AI file changes only after approval", async () => {
    const home = await createTempDirectory("openpome-ai-patch-home-");
    const repoPath = join(await createTempDirectory("openpome-ai-patch-"), "ai-patch-service");
    await createGitFixture(repoPath, "git@github.com:openpome/ai-patch-service.git", "feature/POME-101-ai-patch", {
      readme: "# AI Patch Service\n\nBefore\n"
    });
    process.env["OPENPOME_HOME"] = home;
    credentialState.available = true;

    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({
      output_text: JSON.stringify({
        summary: "Update the README with the requested implementation note.",
        files: [
          {
            path: "README.md",
            action: "update",
            content: "# AI Patch Service\n\nImplemented POME-101.\n"
          }
        ],
        risks: ["README-only implementation in test fixture."]
      })
    }));

    const {
      approveAndApplyAIPatchProposal,
      approveTaskSessionPlan,
      configureModelProvider,
      createAIPatchProposal,
      createTaskSessionPlan,
      linkWorkspaceToWorkItem,
      startTaskSession
    } = await import("../src/index.js");

    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();
    await approveTaskSessionPlan();
    await configureModelProvider("openai", "test-key", {});
    credentialState.credential = { apiKey: "test-key" };

    await expect(createAIPatchProposal()).resolves.toMatchObject({
      active: true,
      proposal: expect.objectContaining({
        provider: "openai",
        approval: expect.objectContaining({
          type: "edit_files",
          status: "pending"
        }),
        files: [
          expect.objectContaining({
            path: "README.md",
            action: "update"
          })
        ]
      })
    });
    await expect(readFile(join(repoPath, "README.md"), "utf8")).resolves.toContain("Before");

    await expect(approveAndApplyAIPatchProposal()).resolves.toMatchObject({
      active: true,
      proposal: expect.objectContaining({
        approval: expect.objectContaining({
          status: "approved"
        }),
        appliedAt: expect.any(String)
      }),
      summary: expect.objectContaining({
        includesFullDiff: false
      })
    });
    await expect(readFile(join(repoPath, "README.md"), "utf8")).resolves.toContain("Implemented POME-101");
  });

  it("asks AI for a focused fix after an approved test run fails", async () => {
    const home = await createTempDirectory("openpome-ai-retry-home-");
    const repoPath = join(await createTempDirectory("openpome-ai-retry-"), "ai-retry-service");
    await createGitFixture(repoPath, "git@github.com:openpome/ai-retry-service.git", "feature/POME-101-ai-retry", {
      readme: "# AI Retry Service\n\nBefore\n",
      packageJson: {
        name: "@openpome/ai-retry-service",
        scripts: {
          validate: "node -e \"console.error('expected 4 got 3'); process.exit(1)\""
        }
      }
    });
    process.env["OPENPOME_HOME"] = home;
    credentialState.available = true;
    const prompts: string[] = [];
    globalThis.fetch = vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { readonly input?: string };
      prompts.push(body.input ?? "");
      return jsonResponse({
        output_text: JSON.stringify({
          summary: prompts.length === 1
            ? "Create the first implementation patch."
            : "Fix the failed validation from the latest test run.",
          files: [
            {
              path: "README.md",
              action: "update",
              content: prompts.length === 1
                ? "# AI Retry Service\n\nImplemented POME-101.\n"
                : "# AI Retry Service\n\nImplemented POME-101.\n\nRetry patch after failed validation.\n"
            }
          ],
          risks: ["README-only implementation in test fixture."]
        })
      });
    });

    const {
      approveAndApplyAIPatchProposal,
      approveTaskSessionPlan,
      approveTestCommand,
      configureModelProvider,
      createAIPatchProposal,
      createTaskSessionPlan,
      discoverTestCommands,
      linkWorkspaceToWorkItem,
      runApprovedTestCommand,
      startTaskSession
    } = await import("../src/index.js");

    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();
    await approveTaskSessionPlan();
    await configureModelProvider("openai", "test-key", {});
    credentialState.credential = { apiKey: "test-key" };

    await createAIPatchProposal();
    await approveAndApplyAIPatchProposal();
    await discoverTestCommands();
    await approveTestCommand("npm run validate");
    await expect(runApprovedTestCommand("npm run validate")).resolves.toMatchObject({
      status: "failed",
      stderrSummary: expect.arrayContaining(["expected 4 got 3"])
    });

    await expect(createAIPatchProposal()).resolves.toMatchObject({
      active: true,
      session: expect.objectContaining({
        status: "fixing"
      }),
      proposal: expect.objectContaining({
        summary: "Fix the failed validation from the latest test run.",
        approval: expect.objectContaining({
          status: "pending"
        })
      })
    });
    expect(prompts[1]).toContain("Recent failed validation after the latest approved patch");
    expect(prompts[1]).toContain("expected 4 got 3");
  });

  it("uses Claude CLI for plans and approval-gated patch proposals", async () => {
    const home = await createTempDirectory("openpome-claude-cli-home-");
    const repoPath = join(await createTempDirectory("openpome-claude-cli-"), "claude-cli-service");
    await createGitFixture(repoPath, "git@github.com:openpome/claude-cli-service.git", "feature/POME-101-claude-cli", {
      readme: "# Claude CLI Service\n\nBefore\n"
    });
    await installFakeClaudeCli();
    process.env["OPENPOME_HOME"] = home;

    const {
      approveTaskSessionPlan,
      configureModelProvider,
      createAIPatchProposal,
      createTaskSessionPlan,
      getModelProviderStatus,
      linkWorkspaceToWorkItem,
      startTaskSession
    } = await import("../src/index.js");

    await expect(getModelProviderStatus()).resolves.toMatchObject({
      providers: expect.arrayContaining([
        expect.objectContaining({
          provider: "claude-cli",
          configured: true
        })
      ])
    });
    await expect(configureModelProvider("claude-cli")).resolves.toMatchObject({
      provider: "claude-cli",
      configured: true
    });

    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await expect(createTaskSessionPlan()).resolves.toMatchObject({
      plan: expect.objectContaining({
        summary: "Claude CLI plan"
      })
    });
    await approveTaskSessionPlan();

    await expect(createAIPatchProposal()).resolves.toMatchObject({
      active: true,
      proposal: expect.objectContaining({
        provider: "claude-cli",
        files: [
          expect.objectContaining({
            path: "README.md",
            action: "update"
          })
        ]
      })
    });
    await expect(readFile(join(repoPath, "README.md"), "utf8")).resolves.toContain("Before");
  });

  it("runs only approved test commands and records run evidence", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-test-run-"), "test-run-service");
    await createGitFixture(repoPath, "git@github.com:openpome/test-run-service.git", "feature/POME-101-test-run", {
      packageJson: {
        name: "@openpome/test-run-service",
        scripts: {
          validate: "node -e \"console.log('ok')\""
        }
      }
    });
    process.env["OPENPOME_HOME"] = home;

    const {
      approveTestCommand,
      discoverTestCommands,
      getTestCommandHistory,
      linkWorkspaceToWorkItem,
      runApprovedTestCommand,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});

    await expect(runApprovedTestCommand()).rejects.toThrow(/No approved command evidence/);
    await discoverTestCommands();
    await approveTestCommand("npm run validate");
    await expect(runApprovedTestCommand("npm run validate")).resolves.toMatchObject({
      command: "npm run validate",
      status: "passed",
      exitCode: 0,
      stdoutSummary: expect.arrayContaining(["ok"])
    });
    await expect(getTestCommandHistory()).resolves.toMatchObject({
      runs: [
        expect.objectContaining({
          command: "npm run validate",
          status: "passed"
        })
      ]
    });
  });

  it("creates GitHub PRs and posts Jira updates through explicit commands", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-external-"), "external-service");
    await createGitFixture(repoPath, "git@github.com:openpome/external-service.git", "main", {
      readme: "# External service\n"
    });
    await installFakeGitHubCommands();
    process.env["OPENPOME_HOME"] = home;
    process.env["OPENPOME_JIRA_BASE_URL"] = "https://example.atlassian.net";
    process.env["OPENPOME_JIRA_EMAIL"] = "dev@example.com";
    process.env["OPENPOME_JIRA_API_TOKEN"] = "token";
    globalThis.fetch = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/comment") && init?.method === "POST") {
        return jsonResponse({
          id: "10001",
          self: "https://example.atlassian.net/rest/api/3/issue/POME-101/comment/10001",
          created: "2026-06-02T10:00:00.000-0500"
        });
      }

      return jsonResponse(jiraIssuePayload());
    });

    const {
      approveTaskSessionPlan,
      createPullRequest,
      createTaskSessionPlan,
      createWorkItemUpdateDraft,
      getDiffSummary,
      linkWorkspaceToWorkItem,
      postWorkItemUpdate,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();
    await approveTaskSessionPlan();
    await createWorkItemUpdateDraft();
    await expect(createPullRequest()).rejects.toThrow(/Run `pome diff` first/);
    await getDiffSummary();
    await expect(createPullRequest()).rejects.toThrow(/Passed test evidence is required/);

    await expect(createPullRequest({ draft: true, baseBranch: "develop", allowUntested: true })).resolves.toMatchObject({
      active: true,
      pushed: true,
      draftPr: true,
      provider: "github-cli",
      branch: expect.stringContaining("openpome/pome-101"),
      draft: expect.objectContaining({
        baseBranch: "develop"
      }),
      prUrl: "https://github.com/openpome/external-service/pull/1",
      approval: expect.objectContaining({
        type: "create_pr",
        status: "approved"
      })
    });

    await expect(postWorkItemUpdate()).resolves.toMatchObject({
      active: true,
      posted: true,
      commentId: "10001",
      approval: expect.objectContaining({
        type: "update_work_item",
        status: "approved"
      })
    });
    expect(
      vi.mocked(globalThis.fetch).mock.calls.some(([input, init]) =>
        String(input).includes("/rest/api/3/issue/POME-101/comment") && init?.method === "POST"
      )
    ).toBe(true);
  });

  it("creates GitHub PRs through the native GitHub API when OpenPome browser auth is stored", async () => {
    credentialState.available = true;
    credentialState.credentials.set("github/oauth", {
      accessToken: "github-token",
      tokenType: "bearer",
      scopes: ["repo", "read:user"],
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-native-pr-"), "native-pr-service");
    await createGitFixture(repoPath, "https://github.com/openpome/native-pr-service.git", "main", {
      readme: "# Native PR service\n"
    });
    await installFakeGitHubCommands();
    process.env["OPENPOME_HOME"] = home;
    process.env["OPENPOME_JIRA_BASE_URL"] = "https://example.atlassian.net";
    process.env["OPENPOME_JIRA_EMAIL"] = "dev@example.com";
    process.env["OPENPOME_JIRA_API_TOKEN"] = "token";
    globalThis.fetch = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url === "https://api.github.com/user") {
        return jsonResponse({
          login: "iamdotk",
          id: 123
        });
      }

      if (url === "https://api.github.com/repos/openpome/native-pr-service/pulls" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { readonly title?: string; readonly base?: string; readonly draft?: boolean };
        expect(body).toMatchObject({
          title: "POME-101: Create OpenPome CLI foundation",
          base: "main",
          draft: false
        });

        return jsonResponse({
          html_url: "https://github.com/openpome/native-pr-service/pull/7",
          number: 7
        }, 201);
      }

      return jsonResponse(jiraIssuePayload());
    });

    const {
      approveTaskSessionPlan,
      createPullRequest,
      createTaskSessionPlan,
      getDiffSummary,
      linkWorkspaceToWorkItem,
      startTaskSession
    } = await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();
    await approveTaskSessionPlan();
    await getDiffSummary();

    await expect(createPullRequest({ allowUntested: true })).resolves.toMatchObject({
      active: true,
      pushed: true,
      provider: "github-api",
      prUrl: "https://github.com/openpome/native-pr-service/pull/7",
      approval: expect.objectContaining({
        type: "create_pr",
        status: "approved",
        details: expect.arrayContaining(["Provider: github-api"])
      })
    });
  });

  it("requires a generated plan before approval", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;

    const { approveTaskSessionPlan, startTaskSession } = await import("../src/index.js");
    await startTaskSession("POME-101", {});

    await expect(approveTaskSessionPlan()).rejects.toThrow(/Run `pome plan` first/);
  });

  it("refreshes active Jira stories and invalidates stale plans when story scope changes", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;

    const { approveTaskSessionPlan, createTaskSessionPlan, getTaskSessionStatus, startTaskSession } = await import("../src/index.js");
    await startTaskSession("POME-101", {});
    await createTaskSessionPlan();
    await approveTaskSessionPlan();

    process.env["OPENPOME_JIRA_BASE_URL"] = "https://example.atlassian.net";
    process.env["OPENPOME_JIRA_EMAIL"] = "dev@example.com";
    process.env["OPENPOME_JIRA_API_TOKEN"] = "token";
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(jiraIssuePayload({
        summary: "Create OpenPome CLI foundation with refreshed acceptance criteria",
        status: "In Progress",
        description: "Updated acceptance criteria from Jira should force a fresh plan."
      }))
    );

    await expect(getTaskSessionStatus()).resolves.toMatchObject({
      active: true,
      session: expect.objectContaining({
        status: "planning"
      }),
      workItem: expect.objectContaining({
        title: "Create OpenPome CLI foundation with refreshed acceptance criteria",
        description: "Updated acceptance criteria from Jira should force a fresh plan."
      }),
      plan: undefined,
      planApproval: undefined,
      events: expect.arrayContaining([
        expect.objectContaining({
          type: "work_item_refreshed",
          title: "Jira story refreshed"
        })
      ])
    });
  });

  it("stops, resumes, and resets active task sessions", async () => {
    const home = await createTempDirectory("openpome-home-");
    const repoPath = join(await createTempDirectory("openpome-lifecycle-"), "lifecycle-service");
    await createGitFixture(repoPath, "git@github.com:openpome/lifecycle-service.git", "feature/POME-101-lifecycle");
    process.env["OPENPOME_HOME"] = home;

    const { getTaskSessionStatus, linkWorkspaceToWorkItem, resetTaskSession, resumeTaskSession, startTaskSession, stopTaskSession } =
      await import("../src/index.js");
    await linkWorkspaceToWorkItem("POME-101", repoPath);
    const started = await startTaskSession("POME-101", {});

    await expect(stopTaskSession()).resolves.toMatchObject({
      active: false,
      session: expect.objectContaining({
        id: started?.session.id,
        status: "completed"
      }),
      historyFile: join(home, "task-session-history.json")
    });
    await expect(getTaskSessionStatus()).resolves.toMatchObject({
      active: false
    });
    await expect(resumeTaskSession()).resolves.toMatchObject({
      active: true,
      session: expect.objectContaining({
        id: started?.session.id,
        status: "planning"
      })
    });
    await expect(resetTaskSession()).resolves.toMatchObject({
      active: false,
      session: expect.objectContaining({
        id: started?.session.id,
        status: "blocked"
      })
    });
  });

  it("reports no active task session before start", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;

    const { createTaskSessionPlan, getTaskSessionStatus } = await import("../src/index.js");

    await expect(getTaskSessionStatus()).resolves.toMatchObject({
      active: false
    });
    await expect(createTaskSessionPlan()).resolves.toBeUndefined();
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function jiraIssuePayload(overrides: {
  readonly summary?: string;
  readonly status?: string;
  readonly description?: string;
} = {}): unknown {
  return {
    key: "POME-101",
    fields: {
      summary: overrides.summary ?? "Create OpenPome CLI foundation",
      status: {
        name: overrides.status ?? "In Progress"
      },
      issuetype: {
        name: "Story",
        subtask: false
      },
      priority: {
        name: "High"
      },
      assignee: {
        displayName: "You"
      },
      description: overrides.description ?? "Build the first CLI commands for init, doctor, and assigned work listing.",
      labels: ["openpome", "cli"],
      components: [
        {
          name: "developer-workbench"
        }
      ],
      parent: undefined,
      subtasks: [],
      issuelinks: []
    }
  };
}

async function createTempDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempPaths.push(path);
  return path;
}

async function installFakeGitHubCommands(): Promise<void> {
  const binPath = await createTempDirectory("openpome-fake-bin-");
  await writeExecutable(
    join(binPath, "git"),
    [
      "#!/bin/sh",
      "case \"$1 $2\" in",
      "  \"branch --show-current\") echo main; exit 0 ;;",
      "  \"status --porcelain\") echo ' M README.md'; exit 0 ;;",
      "esac",
      "exit 0",
      ""
    ].join("\n")
  );
  await writeExecutable(
    join(binPath, "gh"),
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then echo 'gh version 2.0.0'; exit 0; fi",
      "if [ \"$1\" = \"auth\" ]; then exit 0; fi",
      "if [ \"$1\" = \"pr\" ] && [ \"$2\" = \"create\" ]; then echo 'https://github.com/openpome/external-service/pull/1'; exit 0; fi",
      "exit 1",
      ""
    ].join("\n")
  );
  process.env["PATH"] = `${binPath}:${originalPath ?? ""}`;
}

async function installFakeClaudeCli(): Promise<void> {
  const binPath = await createTempDirectory("openpome-fake-claude-bin-");
  await writeExecutable(
    join(binPath, "claude"),
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then echo 'claude 1.0.0'; exit 0; fi",
      "case \"$*\" in",
      "  *'Allowed JSON shape:'*)",
      "    printf '%s\\n' '{\"summary\":\"Claude CLI patch\",\"files\":[{\"path\":\"README.md\",\"action\":\"update\",\"content\":\"# Claude CLI Service\\\\n\\\\nImplemented through Claude CLI.\\\\n\"}],\"risks\":[\"fake claude cli\"]}'",
      "    exit 0",
      "    ;;",
      "  *)",
      "    printf '%s\\n' '{\"summary\":\"Claude CLI plan\",\"assumptions\":[\"claude cli available\"],\"steps\":[{\"id\":\"1\",\"title\":\"Use Claude CLI\",\"detail\":\"Generate a plan through the local Claude CLI.\"}],\"filesLikelyChanged\":[\"README.md\"],\"commandsToRun\":[\"pome approve\"],\"risks\":[],\"missingInfo\":[]}'",
      "    exit 0",
      "    ;;",
      "esac",
      ""
    ].join("\n")
  );
  process.env["PATH"] = `${binPath}:${originalPath ?? ""}`;
}

async function writeExecutable(path: string, content: string): Promise<void> {
  await writeFile(path, content, "utf8");
  await chmod(path, 0o755);
}

interface GitFixtureOptions {
  readonly packageJson?: Readonly<Record<string, unknown>>;
  readonly pnpmLock?: boolean;
  readonly readme?: string;
  readonly codeowners?: string;
  readonly recentBranches?: readonly string[];
  readonly headLog?: string;
}

async function createGitFixture(path: string, remoteUrl: string, branch: string, options: GitFixtureOptions = {}): Promise<void> {
  const gitDirectory = join(path, ".git");
  await mkdir(gitDirectory, { recursive: true });
  await mkdir(join(gitDirectory, "refs", "heads"), { recursive: true });
  await writeFile(join(gitDirectory, "HEAD"), `ref: refs/heads/${branch}\n`, "utf8");
  await writeFile(
    join(gitDirectory, "config"),
    [
      "[core]",
      "\trepositoryformatversion = 0",
      "[remote \"origin\"]",
      `\turl = ${remoteUrl}`,
      "\tfetch = +refs/heads/*:refs/remotes/origin/*",
      ""
    ].join("\n"),
    "utf8"
  );

  for (const branchName of [branch, ...(options.recentBranches ?? [])]) {
    const branchFile = join(gitDirectory, "refs", "heads", ...branchName.split("/"));
    await mkdir(join(branchFile, ".."), { recursive: true });
    await writeFile(branchFile, "1111111111111111111111111111111111111111\n", "utf8");
  }

  if (options.headLog) {
    await mkdir(join(gitDirectory, "logs"), { recursive: true });
    await writeFile(join(gitDirectory, "logs", "HEAD"), options.headLog, "utf8");
  }

  if (options.packageJson) {
    await writeFile(join(path, "package.json"), `${JSON.stringify(options.packageJson, null, 2)}\n`, "utf8");
  }

  if (options.pnpmLock) {
    await writeFile(join(path, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
  }

  if (options.readme) {
    await writeFile(join(path, "README.md"), options.readme, "utf8");
  }

  if (options.codeowners) {
    await mkdir(join(path, ".github"), { recursive: true });
    await writeFile(join(path, ".github", "CODEOWNERS"), options.codeowners, "utf8");
  }
}
