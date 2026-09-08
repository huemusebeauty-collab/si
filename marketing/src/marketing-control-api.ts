import { MarketingApiGateway, MarketingApiResponse } from "./marketing-api-gateway";
import { MarketingIntelligenceInput, MarketingIntelligenceSnapshot } from "./marketing-intelligence-orchestrator";
import { MarketingSecurityLayer, MarketingAction, ApprovalRequest, AuditEvent } from "./marketing-security";

export class MarketingControlApi {
  constructor(private readonly gateway = new MarketingApiGateway(), private readonly security = new MarketingSecurityLayer()) {}
  health(): MarketingApiResponse<{ service: string; healthy: boolean }> { return this.gateway.status() as MarketingApiResponse<{ service: string; healthy: boolean }>; }
  evaluate(input: MarketingIntelligenceInput): MarketingApiResponse<MarketingIntelligenceSnapshot> { return this.gateway.evaluate(input); }
  requestApproval(action: MarketingAction, actor: string, reason: string, target?: string): MarketingApiResponse<ApprovalRequest> {
    try { const request = this.security.requestApproval({ requestId: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, action, actor, target, reason }); return { ok: true, data: request, generatedAt: new Date().toISOString() }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Approval request failed", generatedAt: new Date().toISOString() }; }
  }
  requestApprovalFromBody(body: { action: MarketingAction; actor: string; reason: string; target?: string }) { return this.requestApproval(body.action, body.actor, body.reason, body.target); }
  decideApproval(requestId: string, decision: "approved" | "rejected", actor: string): MarketingApiResponse<ApprovalRequest> {
    try { const request = this.security.decideApproval(requestId, decision, actor); return { ok: true, data: request, generatedAt: new Date().toISOString() }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Approval decision failed", generatedAt: new Date().toISOString() }; }
  }
  approve(requestId: string, body: { actor?: string }) { return this.decideApproval(requestId, "approved", body.actor ?? "marketing-hq"); }
  reject(requestId: string, body: { actor?: string }) { return this.decideApproval(requestId, "rejected", body.actor ?? "marketing-hq"); }
  approvals(): MarketingApiResponse<ApprovalRequest[]> { return { ok: true, data: this.security.listApprovals(), generatedAt: new Date().toISOString() }; }
  audit(): MarketingApiResponse<AuditEvent[]> { return { ok: true, data: this.security.listAudit(), generatedAt: new Date().toISOString() }; }
}
