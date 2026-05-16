import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const credentialState = vi.hoisted(() => ({
  available: false,
  credential: undefined as unknown
}));

vi.mock("@openpome/credentials", () => ({
  createCredentialStore: () => ({
    backend: credentialState.available ? "test-keychain" : "unsupported-test",
    isAvailable: () => credentialState.available,
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }),
  getJsonCredential: vi.fn(async () => credentialState.credential),
  setJsonCredential: vi.fn()
}));

const originalFetch = globalThis.fetch;
const originalOpenPomeHome = process.env["OPENPOME_HOME"];
const tempPaths: string[] = [];

afterEach(async () => {
  credentialState.available = false;
  credentialState.credential = undefined;
  globalThis.fetch = originalFetch;

  if (originalOpenPomeHome === undefined) {
    delete process.env["OPENPOME_HOME"];
  } else {
    process.env["OPENPOME_HOME"] = originalOpenPomeHome;
  }

  vi.restoreAllMocks();

  await Promise.all(tempPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("local gateway", () => {
  it("reports mock Jira auth status when no credentials are configured", async () => {
    const { getJiraAuthStatus } = await import("../src/index.js");

    await expect(getJiraAuthStatus({})).resolves.toMatchObject({
      provider: "jira-cloud",
      mode: "mock",
      configured: false
    });
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

  it("doctor reports attention when config and Jira auth are missing", async () => {
    process.env["OPENPOME_HOME"] = "/private/tmp/openpome-gateway-test-missing";
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
          status: "attention"
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

  it("keeps external PR and work item posting disabled behind explicit guards", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;

    const { createPullRequestExternalGuard, postWorkItemUpdateExternalGuard, startTaskSession } = await import("../src/index.js");
    await startTaskSession("POME-101", {});

    await expect(createPullRequestExternalGuard()).resolves.toMatchObject({
      active: true,
      action: "create_pr",
      allowed: false
    });
    await expect(postWorkItemUpdateExternalGuard()).resolves.toMatchObject({
      active: true,
      action: "update_work_item",
      allowed: false
    });
  });

  it("requires a generated plan before approval", async () => {
    const home = await createTempDirectory("openpome-home-");
    process.env["OPENPOME_HOME"] = home;

    const { approveTaskSessionPlan, startTaskSession } = await import("../src/index.js");
    await startTaskSession("POME-101", {});

    await expect(approveTaskSessionPlan()).rejects.toThrow(/Run `pome plan` first/);
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

async function createTempDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempPaths.push(path);
  return path;
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
