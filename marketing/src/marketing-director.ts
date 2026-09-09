import type { MarketingDecision, SourceEvidence } from "./contracts";

export interface WebsiteDirectorOpportunity {
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
  score: number;
  productId?: string;
}

export interface MarketingDirectorContext {
  revenueTrend: "up" | "flat" | "down";
  topProducts: string[];
  risingCategories: string[];
  creatorOpportunities: number;
  b2bOpportunities: number;
  campaignPerformance?: Record<string, number>;
  inventoryRiskProducts?: string[];
  websiteOpportunities?: WebsiteDirectorOpportunity[];
  evidence?: SourceEvidence[];
}

export class MarketingDirector {
  decide(context: MarketingDirectorContext): MarketingDecision {
    const evidence = context.evidence ?? [];

    if (context.inventoryRiskProducts?.length) {
      return {
        action: "Promote products with safe inventory instead of inventory-risk products",
        reason: "Avoid driving demand toward products that may not be fulfillable.",
        confidence: 0.9,
        requiresApproval: false,
        evidence,
      };
    }

    const websiteOpportunity = context.websiteOpportunities?.find((item) => item.priority === "high") ?? context.websiteOpportunities?.[0];
    if (websiteOpportunity) {
      return {
        action: websiteOpportunity.productId ? `${websiteOpportunity.action} for ${websiteOpportunity.productId}` : websiteOpportunity.action,
        reason: websiteOpportunity.reason,
        confidence: Math.min(0.95, Math.max(0.65, websiteOpportunity.score / 100)),
        requiresApproval: true,
        evidence,
      };
    }

    if (context.revenueTrend === "down" && context.b2bOpportunities > 0) {
      return {
        action: "Prioritize qualified B2B opportunities while testing a conversion campaign",
        reason: "Revenue is trending down and qualified business opportunities are available.",
        confidence: 0.82,
        requiresApproval: true,
        evidence,
      };
    }

    if (context.risingCategories.length) {
      return {
        action: `Create a campaign around ${context.risingCategories[0]}`,
        reason: "A rising category provides a timely organic-growth opportunity.",
        confidence: 0.78,
        requiresApproval: true,
        evidence,
      };
    }

    if (context.creatorOpportunities > 0 && context.topProducts.length) {
      return {
        action: `Match creators with ${context.topProducts[0]} and prepare collaboration content`,
        reason: "Relevant creator opportunities and a strong product are available.",
        confidence: 0.74,
        requiresApproval: true,
        evidence,
      };
    }

    return {
      action: "Run a low-cost content experiment on the strongest product",
      reason: "No stronger signal is currently available.",
      confidence: 0.55,
      requiresApproval: true,
      evidence,
    };
  }
}
