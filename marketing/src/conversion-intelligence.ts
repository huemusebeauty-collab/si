export type FunnelStage = "impression" | "view" | "click" | "product_view" | "add_to_cart" | "checkout" | "purchase";

export interface FunnelEvent {
  source: string;
  campaignId?: string;
  contentId?: string;
  stage: FunnelStage;
  value?: number;
  occurredAt: string;
}

export interface ConversionInsight {
  key: string;
  conversionRate: number;
  revenue: number;
  purchases: number;
  strongestStage: FunnelStage;
  recommendation: "scale" | "fix_funnel" | "test" | "observe";
  reason: string;
}

const STAGES: FunnelStage[] = [
  "impression", "view", "click", "product_view", "add_to_cart", "checkout", "purchase",
];

export class ConversionIntelligenceEngine {
  private readonly events: FunnelEvent[] = [];

  record(event: FunnelEvent): void {
    if (!event.source || !event.stage) throw new Error("source and stage are required");
    this.events.push({ ...event, value: Math.max(0, event.value ?? 0) });
  }

  analyze(): ConversionInsight[] {
    const groups = new Map<string, FunnelEvent[]>();
    for (const event of this.events) {
      const key = `${event.source}:${event.campaignId ?? "organic"}`;
      const list = groups.get(key) ?? [];
      list.push(event);
      groups.set(key, list);
    }

    return [...groups.entries()].map(([key, events]) => {
      const count = (stage: FunnelStage) => events.filter((e) => e.stage === stage).length;
      const purchases = count("purchase");
      const clicks = count("click");
      const conversionRate = clicks > 0 ? purchases / clicks : 0;
      const revenue = events.filter((e) => e.stage === "purchase").reduce((sum, e) => sum + (e.value ?? 0), 0);
      const strongestStage = STAGES.reduce((best, stage) => count(stage) > count(best) ? stage : best, STAGES[0]);
      const hasTraffic = count("view") > 0 || count("impression") > 0;
      const hasClicks = clicks > 0;
      const recommendation: ConversionInsight["recommendation"] = purchases > 0 && conversionRate >= 0.03
        ? "scale"
        : hasTraffic && !hasClicks
          ? "fix_funnel"
          : hasClicks && purchases === 0
            ? "test"
            : "observe";

      return {
        key,
        conversionRate: Number(conversionRate.toFixed(4)),
        revenue: Number(revenue.toFixed(2)),
        purchases,
        strongestStage,
        recommendation,
        reason: `Clicks ${clicks}, purchases ${purchases}, conversion ${(conversionRate * 100).toFixed(2)}%, revenue ₹${revenue.toFixed(2)}.`,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }
}
