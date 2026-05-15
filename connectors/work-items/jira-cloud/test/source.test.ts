import { afterEach, describe, expect, it, vi } from "vitest";
import { JiraCloudWorkItemSource } from "../src/index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("JiraCloudWorkItemSource", () => {
  it("uses mock mode when no auth is configured", async () => {
    const source = new JiraCloudWorkItemSource();

    expect(source.getMode()).toBe("mock");
    expect(source.getAuthStatus()).toMatchObject({
      mode: "mock",
      configured: false
    });

    const items = await source.listAssigned();
    expect(items.map((item) => item.key)).toContain("POME-101");

    const boards = await source.listBoards();
    expect(boards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "100",
          name: "OpenPome MVP"
        })
      ])
    );
  });

  it("detects API-token auth mode", () => {
    const source = new JiraCloudWorkItemSource({
      baseUrl: "https://example.atlassian.net",
      email: "dev@example.com",
      apiToken: "token"
    });

    expect(source.getMode()).toBe("live");
    expect(source.getAuthStatus()).toMatchObject({
      mode: "api-token",
      configured: true
    });
  });

  it("detects OAuth auth mode with refresh metadata", () => {
    const source = new JiraCloudWorkItemSource({
      oauthAccessToken: "access",
      oauthRefreshToken: "refresh",
      oauthCloudId: "cloud-id",
      oauthClientId: "client",
      oauthRedirectUri: "http://127.0.0.1:48731/auth/jira/callback",
      oauthExpiresAt: "2030-01-01T00:00:00.000Z"
    });

    expect(source.getMode()).toBe("live");
    expect(source.getAuthStatus()).toMatchObject({
      mode: "oauth-3lo",
      configured: true,
      expiresAt: "2030-01-01T00:00:00.000Z",
      refreshAvailable: true
    });
  });

  it("paginates assigned Jira issues and maps them into WorkItem objects", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          issues: [jiraIssue("POME-201", "First page story", "Story")],
          nextPageToken: "next-page"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          issues: [jiraIssue("POME-202", "Second page bug", "Bug")]
        })
      );
    globalThis.fetch = fetchMock;

    const source = new JiraCloudWorkItemSource({
      baseUrl: "https://example.atlassian.net",
      email: "dev@example.com",
      apiToken: "token"
    });

    const items = await source.listAssigned();

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      key: "POME-201",
      type: "story",
      title: "First page story",
      status: "To Do"
    });
    expect(items[1]).toMatchObject({
      key: "POME-202",
      type: "bug",
      title: "Second page bug"
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("nextPageToken=next-page");
  });

  it("lists Jira boards from live Agile API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          values: [
            {
              id: 10,
              name: "Delivery Board",
              type: "scrum",
              location: { projectKey: "DEL" }
            }
          ],
          isLast: false
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          values: [
            {
              id: 20,
              name: "Platform Board",
              type: "kanban",
              location: { projectKey: "PLAT" }
            }
          ],
          isLast: true
        })
      );
    globalThis.fetch = fetchMock;

    const source = new JiraCloudWorkItemSource({
      baseUrl: "https://example.atlassian.net",
      email: "dev@example.com",
      apiToken: "token"
    });

    await expect(source.listBoards()).resolves.toEqual([
      expect.objectContaining({
        id: "10",
        name: "Delivery Board",
        type: "scrum",
        projectKey: "DEL"
      }),
      expect.objectContaining({
        id: "20",
        name: "Platform Board",
        type: "kanban",
        projectKey: "PLAT"
      })
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/rest/agile/1.0/board");
  });

  it("uses the selected board endpoint when listing assigned work", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        issues: [jiraIssue("POME-401", "Scoped story", "Story")],
        isLast: true
      })
    );
    globalThis.fetch = fetchMock;

    const source = new JiraCloudWorkItemSource({
      baseUrl: "https://example.atlassian.net",
      email: "dev@example.com",
      apiToken: "token",
      boardId: "10"
    });

    const items = await source.listAssigned();

    expect(items.map((item) => item.key)).toEqual(["POME-401"]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/rest/agile/1.0/board/10/issue");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("assignee");
  });

  it("fetches a live work item directly by key", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse(jiraIssue("POME-301", "Direct issue", "Task")));
    globalThis.fetch = fetchMock;

    const source = new JiraCloudWorkItemSource({
      oauthAccessToken: "access",
      oauthCloudId: "cloud-id"
    });

    const item = await source.getWorkItem(" pome-301 ");

    expect(item).toMatchObject({
      key: "POME-301",
      type: "task",
      title: "Direct issue"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/issue/POME-301");
  });

  it("returns undefined for a missing live work item", async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ errorMessages: ["Issue does not exist"] }, 404));

    const source = new JiraCloudWorkItemSource({
      baseUrl: "https://example.atlassian.net",
      email: "dev@example.com",
      apiToken: "token"
    });

    await expect(source.getWorkItem("POME-404")).resolves.toBeUndefined();
  });

  it("raises a clear unauthorized error for Jira list failures", async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ errorMessages: ["Unauthorized"] }, 401));

    const source = new JiraCloudWorkItemSource({
      baseUrl: "https://example.atlassian.net",
      email: "dev@example.com",
      apiToken: "token"
    });

    await expect(source.listAssigned()).rejects.toThrow(/unauthorized \(401\).*Check Jira base URL, email, API token/);
  });

  it("maps reachability authorization failures without throwing", async () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ errorMessages: ["Forbidden"] }, 403));

    const source = new JiraCloudWorkItemSource({
      oauthAccessToken: "access",
      oauthCloudId: "cloud-id"
    });

    await expect(source.checkReachability()).resolves.toMatchObject({
      status: "unauthorized"
    });
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

function jiraIssue(key: string, summary: string, issueType: string) {
  return {
    key,
    fields: {
      summary,
      status: { name: "To Do" },
      issuetype: { name: issueType, subtask: issueType.toLowerCase() === "sub-task" },
      priority: { name: "Medium" },
      assignee: { displayName: "Developer" },
      description: "Issue description",
      labels: ["openpome"],
      components: [{ name: "cli" }],
      subtasks: [],
      issuelinks: []
    }
  };
}
