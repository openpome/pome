import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  credentialState.available = false;
  credentialState.credential = undefined;
  globalThis.fetch = originalFetch;

  if (originalOpenPomeHome === undefined) {
    delete process.env["OPENPOME_HOME"];
  } else {
    process.env["OPENPOME_HOME"] = originalOpenPomeHome;
  }

  vi.restoreAllMocks();
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
