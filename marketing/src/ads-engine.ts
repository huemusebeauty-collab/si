export type AdObjective = "awareness" | "traffic" | "conversion" | "retention";
export type AdApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

export interface AdBudgetControl {
  dailyLimit: number;
  totalLimit: number;
  currency: "INR";
}

export interface AdCampaignDraft {
  campaignId: string;
  name: string;
  objective: AdObjective;
  audience: string;
  creativeIds: string[];
  budget: AdBudgetControl;
  approval: AdApprovalStatus;
  createdAt: string;
}

export interface AdRecommendation {
  action: "increase_budget" | "decrease_budget" | "pause" | "test_creative" | "keep_running";
  reason: string;
  confidence: number;
  requiresApproval: true;
}

export class AdsEngine {
  private readonly campaigns = new Map<string, AdCampaignDraft>();

  createDraft(input: Omit<AdCampaignDraft, "approval" | "createdAt">): AdCampaignDraft {
    const draft: AdCampaignDraft = {
      ...input,
      approval: "pending_approval",
      createdAt: new Date().toISOString(),
    };
    this.campaigns.set(draft.campaignId, draft);
    return draft;
  }

  approve(campaignId: string): AdCampaignDraft | undefined {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return undefined;
    const updated = { ...campaign, approval: "approved" as const };
    this.campaigns.set(campaignId, updated);
    return updated;
  }

  reject(campaignId: string): AdCampaignDraft | undefined {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return undefined;
    const updated = { ...campaign, approval: "rejected" as const };
    this.campaigns.set(campaignId, updated);
    return updated;
  }

  recommend(ctr: number, conversionRate: number, roas: number): AdRecommendation {
    if (roas >= 3 && conversionRate >= 0.03) {
      return { action: "increase_budget", reason: "Strong conversion efficiency and ROAS.", confidence: 0.86, requiresApproval: true };
    }
    if (roas < 1 || conversionRate < 0.01) {
      return { action: "pause", reason: "Current performance is below the minimum efficiency threshold.", confidence: 0.84, requiresApproval: true };
    }
    if (ctr < 0.01) {
      return { action: "test_creative", reason: "Low click-through rate suggests the creative needs testing.", confidence: 0.77, requiresApproval: true };
    }
    return { action: "keep_running", reason: "Performance is within the current test range.", confidence: 0.62, requiresApproval: true };
  }
}
