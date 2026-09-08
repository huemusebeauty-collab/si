export type AttributionSource = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp" | "google" | "website" | "creator" | "b2b";

export interface MarketingTouch {
  sessionId: string;
  source: AttributionSource;
  campaignId?: string;
  contentId?: string;
  occurredAt: string;
}

export interface RevenueEvent {
  orderId: string;
  sessionId: string;
  revenue: number;
  discount: number;
  refund: number;
  occurredAt: string;
}

export interface RevenueAttribution {
  source: AttributionSource;
  campaignId?: string;
  attributedRevenue: number;
  orders: number;
  roas?: number;
}

export class RevenueAnalytics {
  private readonly touches: MarketingTouch[] = [];
  private readonly orders: RevenueEvent[] = [];

  recordTouch(touch: MarketingTouch): void {
    this.touches.push(touch);
  }

  recordRevenue(event: RevenueEvent): void {
    this.orders.push(event);
  }

  attribute(): RevenueAttribution[] {
    const grouped = new Map<string, RevenueAttribution>();
    for (const order of this.orders) {
      const touch = [...this.touches]
        .filter((item) => item.sessionId === order.sessionId && new Date(item.occurredAt) <= new Date(order.occurredAt))
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
      if (!touch) continue;
      const key = `${touch.source}:${touch.campaignId ?? "organic"}`;
      const current = grouped.get(key) ?? {
        source: touch.source,
        campaignId: touch.campaignId,
        attributedRevenue: 0,
        orders: 0,
      };
      current.attributedRevenue += Math.max(0, order.revenue - order.refund);
      current.orders += 1;
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  netRevenue(): number {
    return this.orders.reduce((sum, order) => sum + Math.max(0, order.revenue - order.refund), 0);
  }
}
