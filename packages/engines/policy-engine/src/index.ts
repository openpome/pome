export type PolicyDecision = "allow" | "approval_required" | "block";

export interface PolicyCheck {
  readonly action: string;
  readonly target?: string;
}

export interface PolicyResult {
  readonly decision: PolicyDecision;
  readonly reason: string;
}

export function evaluateDefaultPolicy(check: PolicyCheck): PolicyResult {
  const target = check.target?.toLowerCase() ?? "";

  if (target.includes(".env") || target.includes("id_rsa") || target.includes(".pem")) {
    return {
      decision: "block",
      reason: "Sensitive files are blocked by default policy."
    };
  }

  if (["edit_files", "run_command", "create_pr", "update_work_item"].includes(check.action)) {
    return {
      decision: "approval_required",
      reason: "This action requires explicit developer approval."
    };
  }

  return {
    decision: "allow",
    reason: "Allowed by default policy."
  };
}
