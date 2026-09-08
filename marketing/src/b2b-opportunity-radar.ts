import type { SourceEvidence } from "./contracts";

export type B2BOpportunityType =
  | "distributor"
  | "wholesaler"
  | "retailer"
  | "bulk_order"
  | "private_label"
  | "retail_expansion"
  | "trade_event";

export type B2BOpportunityStatus = "new" | "qualified" | "contacted" | "interested" | "won" | "closed";

export interface B2BOpportunity {
  opportunityId: string;
  type: B2BOpportunityType;
  businessName: string;
  city: string;
  state: string;
  category: string;
  description: string;
  estimatedValue?: number;
  sourceEvidence: SourceEvidence[];
  confidence: number;
  observedAt: string;
  status: B2BOpportunityStatus;
  publicBusinessContact?: string;
  eventDate?: string;
}

export interface B2BMarketSummary {
  state: string;
  totalOpportunities: number;
  highValueOpportunities: number;
  byType: Record<B2BOpportunityType, number>;
  cities: string[];
  generatedAt: string;
}

export class B2BOpportunityRadar {
  private readonly opportunities = new Map<string, B2BOpportunity>();

  addOpportunity(opportunity: B2BOpportunity): B2BOpportunity {
    const normalized = {
      ...opportunity,
      confidence: Math.max(0, Math.min(1, opportunity.confidence)),
    };
    this.opportunities.set(normalized.opportunityId, normalized);
    return normalized;
  }

  list(state?: string): B2BOpportunity[] {
    return [...this.opportunities.values()].filter(
      (item) => !state || item.state.toLowerCase() === state.toLowerCase(),
    );
  }

  qualify(opportunityId: string): B2BOpportunity | undefined {
    const current = this.opportunities.get(opportunityId);
    if (!current) return undefined;
    const updated = { ...current, status: "qualified" as const };
    this.opportunities.set(opportunityId, updated);
    return updated;
  }

  summary(state = "Rajasthan"): B2BMarketSummary {
    const items = this.list(state);
    const byType = {
      distributor: 0,
      wholesaler: 0,
      retailer: 0,
      bulk_order: 0,
      private_label: 0,
      retail_expansion: 0,
      trade_event: 0,
    } satisfies Record<B2BOpportunityType, number>;

    for (const item of items) byType[item.type] += 1;

    return {
      state,
      totalOpportunities: items.length,
      highValueOpportunities: items.filter((item) => (item.estimatedValue ?? 0) >= 100_000).length,
      byType,
      cities: [...new Set(items.map((item) => item.city))].sort(),
      generatedAt: new Date().toISOString(),
    };
  }
}
