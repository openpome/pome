export type ApprovalType =
  | "approve_plan"
  | "edit_files"
  | "run_command"
  | "include_sensitive_context"
  | "create_pr"
  | "update_work_item";

export interface ApprovalRequest {
  readonly id: string;
  readonly type: ApprovalType;
  readonly title: string;
  readonly reason: string;
  readonly details: readonly string[];
  readonly status: "pending" | "approved" | "rejected";
}
