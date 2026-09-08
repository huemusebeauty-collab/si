import { MarketingApiGateway, MarketingApiResponse } from "./marketing-api-gateway";
import { MarketingIntelligenceInput, MarketingIntelligenceSnapshot } from "./marketing-intelligence-orchestrator";
import { MarketingSecurityLayer, MarketingAction, ApprovalRequest, AuditEvent } from "./marketing-security";
import { MarketingControlPlane, ControlPlaneResult } from "./control-plane";

export class MarketingControlApi {
  private readonly controlPlane: MarketingControlPlane;

  constructor(private readonly gateway = new MarketingApiGateway(), private readonly security = new MarketingSecurityLayer()) {
    this.controlPlane = new MarketingControlPlane(this.security);
  }

  health(): MarketingApiResponse<{ service: string; healthy: boolean }> { return this.gateway.status() as MarketingApiResponse<{ service: string; healthy: boolean }>; }
  evaluate(input: MarketingIntelligenceInput): MarketingApiResponse<MarketingIntelligenceSnapshot> { return this.gateway.evaluate(input); }

  prepareDirectorAction(decision: MarketingIntelligenceSnapshot["decision"]): MarketingApiResponse<ControlPlaneResult> {
    try {
      return { ok: true, data: this.controlPlane.prepareFromDirector(decision), generatedAt: new Date().toISOString() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Control-plane preparation failed", generatedAt: new Date().toISOString() };
    }
  }

  executionBoundary(action: MarketingAction, approvalRequestId?: string): MarketingApiResponse<{ executable: boolean; action: MarketingAction; reason: string }> {
    const executable = this.controlPlane.canExecute(action, approvalRequestId);
    return {
      ok: executable,
      data: { executable, action, reason: executable ? "Action is authorized at the control-plane boundary." : "Action is blocked until the required approval is approved." },
      generatedAt: new Date().toISOString(),
    };
  }

  requestApproval(actionOrBody: MarketingAction | { action: MarketingAction; actor: string; reason: string; target?: string }, actor?: string, reason?: string, target?: string): MarketingApiResponse<ApprovalRequest> {
    const action = typeof actionOrBody === "string" ? actionOrBody : actionOrBody.action;
    const actualActor = typeof actionOrBody === "string" ? actor : actionOrBody.actor;
    const actualReason = typeof actionOrBody === "string" ? reason : actionOrBody.reason;
    const actualTarget = typeof actionOrBody === "string" ? target : actionOrBody.target;
    try { const request = this.security.requestApproval({ requestId: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, action, actor: actualActor!, target: actualTarget, reason: actualReason! }); return { ok: true, data: request, generatedAt: new Date().toISOString() }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Approval request failed", generatedAt: new Date().toISOString() }; }
  }
  requestApprovalFromBody(body: { action: MarketingAction; actor: string; reason: string; target?: string }) { return this.requestApproval(body); }
  decideApproval(requestId: string, decision: "approved" | "rejected", actor: string): MarketingApiResponse<ApprovalRequest> {
    try { const request = this.security.decideApproval(requestId, decision, actor); return { ok: true, data: request, generatedAt: new Date().toISOString() }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Approval decision failed", generatedAt: new Date().toISOString() }; }
  }
  approve(requestId: string, body: { actor?: string }) { return this.decideApproval(requestId, "approved", body.actor ?? "marketing-hq"); }
  reject(requestId: string, body: { actor?: string }) { return this.decideApproval(requestId, "rejected", body.actor ?? "marketing-hq"); }
  approvals(): MarketingApiResponse<ApprovalRequest[]> { return { ok: true, data: this.security.listApprovals(), generatedAt: new Date().toISOString() }; }
  audit(): MarketingApiResponse<AuditEvent[]> { return { ok: true, data: this.security.listAudit(), generatedAt: new Date().toISOString() }; }
}
