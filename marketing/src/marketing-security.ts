import type { MarketingPersistence } from "./marketing-persistence";

export type MarketingAction =
  | "publish_content"
  | "send_message"
  | "reply_comment"
  | "launch_ads"
  | "change_budget"
  | "contact_creator"
  | "b2b_outreach";

export type ApprovalDecision = "approved" | "pending" | "rejected";

export interface ApprovalRequest {
  requestId: string;
  action: MarketingAction;
  actor: string;
  target?: string;
  reason: string;
  createdAt: string;
  decision: ApprovalDecision;
  decidedAt?: string;
  decidedBy?: string;
}

export interface AuditEvent {
  eventId: string;
  action: MarketingAction | "approval" | "security_alert";
  actor: string;
  target?: string;
  details: string;
  occurredAt: string;
}

const SENSITIVE_ACTIONS = new Set<MarketingAction>([
  "send_message",
  "reply_comment",
  "launch_ads",
  "change_budget",
  "contact_creator",
  "b2b_outreach",
]);

export class MarketingSecurityLayer {
  private readonly approvals: ApprovalRequest[] = [];
  private readonly audit: AuditEvent[] = [];

  constructor(private readonly persistence?: MarketingPersistence) {}

  async hydrate(): Promise<void> {
    if (!this.persistence) return;
    const [approvals, audit] = await Promise.all([
      this.persistence.loadApprovals(),
      this.persistence.loadAudit(),
    ]);
    this.approvals.splice(0, this.approvals.length, ...approvals);
    this.audit.splice(0, this.audit.length, ...audit);
  }

  requiresApproval(action: MarketingAction): boolean {
    return SENSITIVE_ACTIONS.has(action);
  }

  requestApproval(input: Omit<ApprovalRequest, "createdAt" | "decision">): ApprovalRequest {
    if (!input.requestId || !input.actor || !input.action || !input.reason) {
      throw new Error("requestId, actor, action and reason are required");
    }
    const request: ApprovalRequest = {
      ...input,
      createdAt: new Date().toISOString(),
      decision: "pending",
    };
    this.approvals.push(request);
    this.recordAudit("approval", input.actor, input.target, `Approval requested for ${input.action}.`);
    if (this.persistence) void this.persistence.saveApproval(request).catch((error) => console.error("[marketing-persistence] approval save failed", error));
    return request;
  }

  decideApproval(requestId: string, decision: Exclude<ApprovalDecision, "pending">, actor: string): ApprovalRequest {
    const request = this.approvals.find((item) => item.requestId === requestId);
    if (!request) throw new Error("approval request not found");
    if (request.decision !== "pending") throw new Error("approval request already decided");
    if (!actor) throw new Error("approval decision actor is required");
    request.decision = decision;
    request.decidedAt = new Date().toISOString();
    request.decidedBy = actor;
    this.recordAudit("approval", actor, request.target, `Approval ${decision} for ${request.action}.`);
    if (this.persistence) void this.persistence.saveApproval(request).catch((error) => console.error("[marketing-persistence] approval update failed", error));
    return request;
  }

  canExecute(action: MarketingAction, requestId?: string): boolean {
    if (!this.requiresApproval(action)) return true;
    if (!requestId) return false;
    return this.approvals.some((item) => item.requestId === requestId && item.action === action && item.decision === "approved");
  }

  recordAudit(action: AuditEvent["action"], actor: string, target: string | undefined, details: string): void {
    const event: AuditEvent = {
      eventId: `audit_${Date.now()}_${this.audit.length + 1}`,
      action,
      actor,
      target,
      details,
      occurredAt: new Date().toISOString(),
    };
    this.audit.push(event);
    if (this.persistence) void this.persistence.saveAudit(event).catch((error) => console.error("[marketing-persistence] audit save failed", error));
  }

  listApprovals(): ApprovalRequest[] {
    return [...this.approvals];
  }

  listAudit(): AuditEvent[] {
    return [...this.audit];
  }
}
