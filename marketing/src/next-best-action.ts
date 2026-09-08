import type { MarketingDecision, MarketingDirectorContext } from "./marketing-director";

export interface NextBestActionInput extends MarketingDirectorContext {
  learningScore?: number;
  topAttributedSource?: string;
  availableBudget?: number;
}

export interface NextBestAction extends MarketingDecision {
  priority: "critical" | "high" | "medium" | "low";
  owner: "content" | "ads" | "creator" | "b2b" | "retention";
}

export class NextBestActionEngine {
  decide(context: NextBestActionInput): NextBestAction {
    const director = this.directorDecision(context);
    const action = this.normalizeOwner(director.action);
    return {
      ...director,
      priority: context.inventoryRiskProducts?.length ? "high" : director.confidence >= 0.8 ? "high" : "medium",
      owner: action.owner,
    };
  }

  private directorDecision(context: NextBestActionInput): MarketingDecision {
    if (context.inventoryRiskProducts?.length) {
      return {
        action: "protect_inventory",
        reason: "Shift promotion away from inventory-risk products and toward safe-stock products.",
        confidence: 0.9,
        requiresApproval: true,
      };
    }
    if (context.revenueTrend === "down" && context.b2bOpportunities > 0) {
      return {
        action: "prioritize_b2b_conversion",
        reason: "Revenue is down while qualified B2B opportunities are available.",
        confidence: 0.88,
        requiresApproval: true,
      };
    }
    if (context.risingCategories.length > 0) {
      return {
        action: "launch_rising_category_campaign",
        reason: `Promote rising category: ${context.risingCategories[0]}.`,
        confidence: 0.82,
        requiresApproval: true,
      };
    }
    if (context.creatorOpportunities > 0 && context.topProducts.length > 0) {
      return {
        action: "match_creator_to_product",
        reason: `Match creators to top product: ${context.topProducts[0]}.`,
        confidence: 0.79,
        requiresApproval: true,
      };
    }
    return {
      action: "run_low_cost_content_experiment",
      reason: "No stronger signal is available; test content before increasing spend.",
      confidence: Math.max(0.5, context.learningScore ?? 0.55),
      requiresApproval: true,
    };
  }

  private normalizeOwner(action: string): { owner: NextBestAction["owner"] } {
    if (action.includes("b2b")) return { owner: "b2b" };
    if (action.includes("creator")) return { owner: "creator" };
    if (action.includes("inventory")) return { owner: "content" };
    if (action.includes("retention")) return { owner: "retention" };
    return { owner: "content" };
  }
}
