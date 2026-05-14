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
