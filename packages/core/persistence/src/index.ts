import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

type DatabaseSyncConstructor = new (file: string) => DatabaseSyncLike;

interface DatabaseSyncLike {
  exec(sql: string): void;
  prepare(sql: string): StatementSyncLike;
}

interface StatementSyncLike {
  run(...parameters: readonly unknown[]): unknown;
  all(...parameters: readonly unknown[]): readonly unknown[];
  get(...parameters: readonly unknown[]): unknown;
}

export interface LocalPersistenceInfo {
  readonly storageDirectory: string;
  readonly databaseFile: string;
}

export interface SessionSnapshotInput {
  readonly sessionId: string;
  readonly workItemKey: string;
  readonly workItemTitle: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly active: boolean;
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly latestEventTitle?: string;
  readonly latestEventAt?: string;
  readonly latestTestStatus?: "passed" | "failed";
  readonly latestTestCommand?: string;
  readonly latestPatchAppliedAt?: string;
  readonly prUrl?: string;
  readonly jiraCommentId?: string;
  readonly snapshot: unknown;
}

export interface SessionSnapshotRecord extends SessionSnapshotInput {
  readonly storedAt: string;
}

export interface SessionSnapshotStore {
  readonly info: LocalPersistenceInfo;
  upsertSessionSnapshot(input: SessionSnapshotInput): void;
  listSessionSnapshots(limit?: number): readonly SessionSnapshotRecord[];
  getSessionSnapshot(sessionId: string): SessionSnapshotRecord | undefined;
}

export const defaultPersistenceFile = "sessions.sqlite";

export function getLocalPersistenceInfo(storageDirectory: string): LocalPersistenceInfo {
  return {
    storageDirectory,
    databaseFile: join(storageDirectory, defaultPersistenceFile)
  };
}

export function openSessionSnapshotStore(storageDirectory: string): SessionSnapshotStore {
  const info = getLocalPersistenceInfo(storageDirectory);
  mkdirSync(dirname(info.databaseFile), { recursive: true });
  const DatabaseSync = loadDatabaseSync();
  const database = new DatabaseSync(info.databaseFile);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS task_session_snapshots (
      session_id TEXT PRIMARY KEY,
      work_item_key TEXT NOT NULL,
      work_item_title TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      active INTEGER NOT NULL,
      workspace_name TEXT,
      workspace_path TEXT,
      latest_event_title TEXT,
      latest_event_at TEXT,
      latest_test_status TEXT,
      latest_test_command TEXT,
      latest_patch_applied_at TEXT,
      pr_url TEXT,
      jira_comment_id TEXT,
      snapshot_json TEXT NOT NULL,
      stored_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_task_session_snapshots_updated_at
      ON task_session_snapshots(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_task_session_snapshots_work_item_key
      ON task_session_snapshots(work_item_key);
  `);

  return {
    info,
    upsertSessionSnapshot(input) {
      const storedAt = new Date().toISOString();
      database.prepare(`
        INSERT INTO task_session_snapshots (
          session_id,
          work_item_key,
          work_item_title,
          status,
          updated_at,
          active,
          workspace_name,
          workspace_path,
          latest_event_title,
          latest_event_at,
          latest_test_status,
          latest_test_command,
          latest_patch_applied_at,
          pr_url,
          jira_comment_id,
          snapshot_json,
          stored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          work_item_key = excluded.work_item_key,
          work_item_title = excluded.work_item_title,
          status = excluded.status,
          updated_at = excluded.updated_at,
          active = excluded.active,
          workspace_name = excluded.workspace_name,
          workspace_path = excluded.workspace_path,
          latest_event_title = excluded.latest_event_title,
          latest_event_at = excluded.latest_event_at,
          latest_test_status = excluded.latest_test_status,
          latest_test_command = excluded.latest_test_command,
          latest_patch_applied_at = excluded.latest_patch_applied_at,
          pr_url = excluded.pr_url,
          jira_comment_id = excluded.jira_comment_id,
          snapshot_json = excluded.snapshot_json,
          stored_at = excluded.stored_at
      `).run(
        input.sessionId,
        input.workItemKey,
        input.workItemTitle,
        input.status,
        input.updatedAt,
        input.active ? 1 : 0,
        input.workspaceName ?? null,
        input.workspacePath ?? null,
        input.latestEventTitle ?? null,
        input.latestEventAt ?? null,
        input.latestTestStatus ?? null,
        input.latestTestCommand ?? null,
        input.latestPatchAppliedAt ?? null,
        input.prUrl ?? null,
        input.jiraCommentId ?? null,
        JSON.stringify(input.snapshot),
        storedAt
      );
    },
    listSessionSnapshots(limit = 25) {
      return database.prepare(`
        SELECT *
        FROM task_session_snapshots
        ORDER BY active DESC, updated_at DESC
        LIMIT ?
      `).all(Math.max(1, Math.min(limit, 100))).map(mapSessionSnapshotRow);
    },
    getSessionSnapshot(sessionId) {
      const row = database.prepare(`
        SELECT *
        FROM task_session_snapshots
        WHERE session_id = ?
      `).get(sessionId);
      return row ? mapSessionSnapshotRow(row) : undefined;
    }
  };
}

function loadDatabaseSync(): DatabaseSyncConstructor {
  try {
    const sqlite = require("node:sqlite") as { readonly DatabaseSync?: DatabaseSyncConstructor };

    if (typeof sqlite.DatabaseSync === "function") {
      return sqlite.DatabaseSync;
    }
  } catch {
    // Fall through to the explicit product-facing error below.
  }

  throw new Error("SQLite session history requires a Node.js runtime with node:sqlite support. Use Node.js 24 or newer, or continue with JSON fallback state.");
}

function mapSessionSnapshotRow(row: unknown): SessionSnapshotRecord {
  const record = row as Record<string, unknown>;
  return {
    sessionId: requireString(record.session_id),
    workItemKey: requireString(record.work_item_key),
    workItemTitle: requireString(record.work_item_title),
    status: requireString(record.status),
    updatedAt: requireString(record.updated_at),
    active: Boolean(record.active),
    workspaceName: optionalString(record.workspace_name),
    workspacePath: optionalString(record.workspace_path),
    latestEventTitle: optionalString(record.latest_event_title),
    latestEventAt: optionalString(record.latest_event_at),
    latestTestStatus: normalizeTestStatus(record.latest_test_status),
    latestTestCommand: optionalString(record.latest_test_command),
    latestPatchAppliedAt: optionalString(record.latest_patch_applied_at),
    prUrl: optionalString(record.pr_url),
    jiraCommentId: optionalString(record.jira_comment_id),
    snapshot: JSON.parse(requireString(record.snapshot_json)) as unknown,
    storedAt: requireString(record.stored_at)
  };
}

function requireString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeTestStatus(value: unknown): "passed" | "failed" | undefined {
  return value === "passed" || value === "failed" ? value : undefined;
}
