import { ApprovalRequest, AuditEvent, MarketingAction, MarketingSecurityLayer } from "./marketing-security";

export interface ExecutionCheck {
  action: MarketingAction;
  approvalRequestId?: string;
  executable: boolean;
  reason: string;
}

export class MarketingExecutionCenter {
  constructor(private readonly security: MarketingSecurityLayer) {}

  pendingApprovals(): ApprovalRequest[] {
    return this.security.listApprovals().filter((request) => request.decision === "pending");
  }

  check(action: MarketingAction, approvalRequestId?: string): ExecutionCheck {
    const executable = this.security.canExecute(action, approvalRequestId);
    return {
      action,
      approvalRequestId,
      executable,
      reason: executable
        ? "Action is authorized at the execution boundary."
        : "Action is blocked until the required approval is approved.",
    };
  }

  recordExecutionResult(action: MarketingAction, actor: string, target: string | undefined, success: boolean, details: string): AuditEvent {
    return this.security.recordAudit(action, actor, target, `Execution ${success ? "succeeded" : "failed"}: ${details}`);
  }
}
