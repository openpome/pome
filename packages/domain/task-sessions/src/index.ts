export type AutomationLevel = 0 | 1 | 2 | 3;

export type TaskSessionStatus =
  | "created"
  | "understanding"
  | "planning"
  | "awaiting_approval"
  | "implementing"
  | "testing"
  | "fixing"
  | "preparing_pr"
  | "ready_for_review"
  | "blocked"
  | "completed";

export interface AITaskSession {
  readonly id: string;
  readonly workItemKey: string;
  readonly status: TaskSessionStatus;
  readonly automationLevel: AutomationLevel;
  readonly workspaceId?: string;
  readonly branchName?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type TaskSessionEventType =
  | "session_started"
  | "workspace_resolved"
  | "workspace_unresolved"
  | "plan_created"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "session_status_changed";

export interface TaskSessionEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly workItemKey: string;
  readonly type: TaskSessionEventType;
  readonly title: string;
  readonly details: readonly string[];
  readonly createdAt: string;
  readonly metadata?: Readonly<Record<string, string>>;
}
