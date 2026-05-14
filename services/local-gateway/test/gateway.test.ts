import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
    process.env["OPENPOME_HOME"] = "/private/tmp/openpome-gateway-test-api-token";
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ accountId: "abc" }));

    const { initOpenPome, runDoctor } = await import("../src/index.js");
    await initOpenPome();
    const result = await runDoctor({
      OPENPOME_JIRA_BASE_URL: "https://example.atlassian.net",
      OPENPOME_JIRA_EMAIL: "dev@example.com",
      OPENPOME_JIRA_API_TOKEN: "token"
    });

    expect(result.status).toBe("ok");
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Jira reachability",
          status: "ok"
        })
      ])
    );
  });

  it("doctor reports unauthorized Jira reachability without throwing", async () => {
    credentialState.available = true;
    process.env["OPENPOME_HOME"] = "/private/tmp/openpome-gateway-test-unauthorized";
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

    const { createTaskSessionPlan, getTaskSessionStatus, linkWorkspaceToWorkItem, startTaskSession } = await import("../src/index.js");
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
      })
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

async function createGitFixture(path: string, remoteUrl: string, branch: string): Promise<void> {
  const gitDirectory = join(path, ".git");
  await mkdir(gitDirectory, { recursive: true });
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
}
