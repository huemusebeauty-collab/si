import { MarketingAction, MarketingSecurityLayer } from "./marketing-security";

export interface DirectorAction {
  action: MarketingAction;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
  target?: string;
}

export interface ControlPlaneResult {
  status: "approval_required" | "ready" | "blocked";
  action: MarketingAction;
  reason: string;
  confidence: number;
  requiresApproval: boolean;
  approvalRequestId?: string;
}

export class MarketingControlPlane {
  constructor(private readonly security = new MarketingSecurityLayer()) {}

  prepare(action: DirectorAction, actor = "marketing-director"): ControlPlaneResult {
    if (!action.action || !action.reason) {
      throw new Error("Director action and reason are required");
    }

    if (!action.requiresApproval && !this.security.requiresApproval(action.action)) {
      return {
        status: "ready",
        action: action.action,
        reason: action.reason,
        confidence: action.confidence,
        requiresApproval: false,
      };
    }

    const approval = this.security.requestApproval({
      requestId: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action: action.action,
      actor,
      target: action.target,
      reason: action.reason,
    });

    return {
      status: "approval_required",
      action: action.action,
      reason: action.reason,
      confidence: action.confidence,
      requiresApproval: true,
      approvalRequestId: approval.requestId,
    };
  }

  canExecute(action: MarketingAction, approvalRequestId?: string): boolean {
    return this.security.canExecute(action, approvalRequestId);
  }
}
