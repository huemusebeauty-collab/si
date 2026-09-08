export type GrowthPlatform = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp" | "google" | "website";

export interface GrowthObservation {
  platform: GrowthPlatform;
  followers: number;
  reach: number;
  views: number;
  engagement: number;
  clicks: number;
  conversions: number;
  revenue: number;
  recordedAt: string;
}

export interface GrowthInsight {
  platform: GrowthPlatform;
  growthScore: number;
  engagementRate: number;
  clickRate: number;
  conversionRate: number;
  revenue: number;
  recommendation: "scale" | "improve_content" | "conversion_focus" | "observe";
  reason: string;
}

export class GrowthIntelligenceEngine {
  private readonly observations: GrowthObservation[] = [];

  record(observation: GrowthObservation): void {
    if (observation.followers < 0 || observation.reach < 0 || observation.views < 0 || observation.engagement < 0 || observation.clicks < 0 || observation.conversions < 0 || observation.revenue < 0) {
      throw new Error("Growth metrics cannot be negative");
    }
    this.observations.push({ ...observation });
  }

  analyze(): GrowthInsight[] {
    const groups = new Map<GrowthPlatform, GrowthObservation>();
    for (const item of this.observations) {
      const current = groups.get(item.platform);
      if (!current) groups.set(item.platform, { ...item });
      else {
        current.followers = item.followers;
        current.reach += item.reach;
        current.views += item.views;
        current.engagement += item.engagement;
        current.clicks += item.clicks;
        current.conversions += item.conversions;
        current.revenue += item.revenue;
      }
    }

    return [...groups.entries()].map(([platform, item]) => {
      const engagementRate = item.reach > 0 ? item.engagement / item.reach : 0;
      const clickRate = item.reach > 0 ? item.clicks / item.reach : 0;
      const conversionRate = item.clicks > 0 ? item.conversions / item.clicks : 0;
      const engagementScore = Math.min(1, engagementRate / 0.08);
      const clickScore = Math.min(1, clickRate / 0.03);
      const conversionScore = Math.min(1, conversionRate / 0.05);
      const revenueScore = Math.min(1, item.revenue > 0 ? 1 : 0);
      const growthScore = Number((engagementScore * 0.3 + clickScore * 0.2 + conversionScore * 0.3 + revenueScore * 0.2).toFixed(3));

      const recommendation = conversionRate >= 0.05 && item.revenue > 0
        ? "scale"
        : clickRate >= 0.03 && conversionRate < 0.03
          ? "conversion_focus"
          : engagementRate < 0.02
            ? "improve_content"
            : "observe";

      const reason = recommendation === "scale"
        ? "Strong engagement, conversion and revenue signals."
        : recommendation === "conversion_focus"
          ? "People are clicking, but conversion needs improvement."
          : recommendation === "improve_content"
            ? "Reach is not generating enough engagement yet."
            : "No strong optimization signal yet.";

      return {
        platform,
        growthScore,
        engagementRate: Number((engagementRate * 100).toFixed(2)),
        clickRate: Number((clickRate * 100).toFixed(2)),
        conversionRate: Number((conversionRate * 100).toFixed(2)),
        revenue: Number(item.revenue.toFixed(2)),
        recommendation,
        reason,
      };
    }).sort((a, b) => b.growthScore - a.growthScore);
  }

  bestPlatform(): GrowthInsight | undefined {
    return this.analyze()[0];
  }
}
