export type CampaignObjective = "awareness" | "conversion" | "retention" | "b2b";
export type CampaignAction = "launch" | "optimize" | "pause" | "test" | "observe";

export interface CampaignAutopilotInput {
  campaignId: string;
  objective: CampaignObjective;
  trendScore: number;
  conversionRate: number;
  revenue: number;
  learningScore: number;
  availableBudget: number;
  inventoryRisk?: boolean;
}

export interface CampaignAutopilotDecision {
  campaignId: string;
  action: CampaignAction;
  priority: "high" | "medium" | "low";
  budgetRecommendation: number;
  reason: string;
  requiresApproval: boolean;
}

export class CampaignAutopilotEngine {
  decide(input: CampaignAutopilotInput): CampaignAutopilotDecision {
    if (!input.campaignId) throw new Error("campaignId is required");
    const trend = Math.min(1, Math.max(0, input.trendScore));
    const learning = Math.min(1, Math.max(0, input.learningScore));
    const conversion = Math.max(0, input.conversionRate);
    const budget = Math.max(0, input.availableBudget);

    if (input.inventoryRisk) {
      return {
        campaignId: input.campaignId,
        action: "optimize",
        priority: "high",
        budgetRecommendation: 0,
        reason: "Inventory risk detected; protect stock before scaling demand.",
        requiresApproval: true,
      };
    }

    if (conversion >= 0.03 && learning >= 0.7) {
      return {
        campaignId: input.campaignId,
        action: "launch",
        priority: "high",
        budgetRecommendation: Number((budget * 0.3).toFixed(2)),
        reason: "Strong conversion and learning signals support controlled scaling.",
        requiresApproval: true,
      };
    }

    if (trend >= 0.75 && conversion < 0.03) {
      return {
        campaignId: input.campaignId,
        action: "test",
        priority: "high",
        budgetRecommendation: Number((budget * 0.1).toFixed(2)),
        reason: "Strong trend but unproven conversion; test creative before scaling.",
        requiresApproval: true,
      };
    }

    if (input.revenue > 0 && learning >= 0.45) {
      return {
        campaignId: input.campaignId,
        action: "optimize",
        priority: "medium",
        budgetRecommendation: Number((budget * 0.15).toFixed(2)),
        reason: "Existing revenue and learning signals justify incremental optimization.",
        requiresApproval: true,
      };
    }

    return {
      campaignId: input.campaignId,
      action: "observe",
      priority: "low",
      budgetRecommendation: 0,
      reason: "Insufficient evidence for a consequential campaign change.",
      requiresApproval: true,
    };
  }
}
