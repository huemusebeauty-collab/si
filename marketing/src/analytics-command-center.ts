export interface AnalyticsMetric {
  key: string;
  value: number;
  previousValue?: number;
  unit?: "INR" | "percent" | "count" | "ratio";
}

export interface AnalyticsSnapshot {
  generatedAt: string;
  revenue: number;
  attributedRevenue: number;
  orders: number;
  conversions: number;
  adSpend: number;
  roas: number;
  conversionRate: number;
  followerGrowth: number;
  topSource?: string;
  alerts: string[];
  metrics: AnalyticsMetric[];
}

export interface AnalyticsInput {
  revenue: number;
  attributedRevenue?: number;
  orders: number;
  conversions: number;
  adSpend?: number;
  clicks?: number;
  followersNow?: number;
  followersPrevious?: number;
  topSource?: string;
}

export class AnalyticsCommandCenter {
  summarize(input: AnalyticsInput): AnalyticsSnapshot {
    const revenue = Math.max(0, input.revenue);
    const attributedRevenue = Math.max(0, input.attributedRevenue ?? revenue);
    const orders = Math.max(0, input.orders);
    const conversions = Math.max(0, input.conversions);
    const adSpend = Math.max(0, input.adSpend ?? 0);
    const clicks = Math.max(0, input.clicks ?? 0);
    const followersNow = Math.max(0, input.followersNow ?? 0);
    const followersPrevious = Math.max(0, input.followersPrevious ?? 0);
    const roas = adSpend > 0 ? attributedRevenue / adSpend : 0;
    const conversionRate = clicks > 0 ? conversions / clicks : 0;
    const followerGrowth = followersPrevious > 0 ? (followersNow - followersPrevious) / followersPrevious : 0;

    const alerts: string[] = [];
    if (adSpend > 0 && roas < 1) alerts.push("Ad spend is not yet returning ₹1 per ₹1 spent.");
    if (clicks > 0 && conversionRate < 0.01) alerts.push("Conversion rate is below 1%; review offer, landing page and creative.");
    if (followersPrevious > 0 && followerGrowth < 0) alerts.push("Follower count is declining; review content relevance and audience fit.");

    return {
      generatedAt: new Date().toISOString(),
      revenue: Number(revenue.toFixed(2)),
      attributedRevenue: Number(attributedRevenue.toFixed(2)),
      orders,
      conversions,
      adSpend: Number(adSpend.toFixed(2)),
      roas: Number(roas.toFixed(3)),
      conversionRate: Number(conversionRate.toFixed(4)),
      followerGrowth: Number(followerGrowth.toFixed(4)),
      topSource: input.topSource,
      alerts,
      metrics: [
        { key: "revenue", value: revenue, unit: "INR" },
        { key: "attributedRevenue", value: attributedRevenue, unit: "INR" },
        { key: "orders", value: orders, unit: "count" },
        { key: "conversions", value: conversions, unit: "count" },
        { key: "adSpend", value: adSpend, unit: "INR" },
        { key: "roas", value: roas, unit: "ratio" },
        { key: "conversionRate", value: conversionRate, unit: "percent" },
        { key: "followerGrowth", value: followerGrowth, unit: "percent" },
      ],
    };
  }
}
