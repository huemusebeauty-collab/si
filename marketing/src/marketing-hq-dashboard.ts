import { MarketingIntelligenceSnapshot } from "./marketing-intelligence-orchestrator";
import { ApprovalRequest, AuditEvent } from "./marketing-security";

export interface MarketingHqDashboardData {
  generatedAt: string;
  headline: string;
  decision: MarketingIntelligenceSnapshot["decision"];
  nextBestAction: MarketingIntelligenceSnapshot["nextBestAction"];
  analytics: MarketingIntelligenceSnapshot["analytics"];
  learningInsights: MarketingIntelligenceSnapshot["learningInsights"];
  conversionInsights: MarketingIntelligenceSnapshot["conversionInsights"];
  pendingApprovals: ApprovalRequest[];
  recentAudit: AuditEvent[];
}

export class MarketingHqDashboard {
  build(
    snapshot: MarketingIntelligenceSnapshot,
    approvals: ApprovalRequest[] = [],
    audit: AuditEvent[] = [],
  ): MarketingHqDashboardData {
    const pendingApprovals = approvals.filter((item) => item.decision === "pending");
    const recentAudit = audit.slice(-20).reverse();
    const headline = snapshot.analytics.revenue > 0
      ? `Silku marketing revenue ₹${snapshot.analytics.revenue.toFixed(2)} | ROAS ${snapshot.analytics.roas.toFixed(2)}`
      : "Silku marketing intelligence is collecting performance signals.";

    return {
      generatedAt: new Date().toISOString(),
      headline,
      decision: snapshot.decision,
      nextBestAction: snapshot.nextBestAction,
      analytics: snapshot.analytics,
      learningInsights: snapshot.learningInsights,
      conversionInsights: snapshot.conversionInsights,
      pendingApprovals,
      recentAudit,
    };
  }
}
