export interface LearningObservation {
  source: string;
  campaignId?: string;
  contentId?: string;
  spend: number;
  revenue: number;
  conversions: number;
  impressions: number;
  clicks: number;
  recordedAt: string;
}

export interface LearningInsight {
  key: string;
  score: number;
  recommendation: "scale" | "iterate" | "pause" | "observe";
  reason: string;
}

export class LearningEngine {
  private readonly observations: LearningObservation[] = [];

  record(observation: LearningObservation): void {
    this.observations.push({ ...observation, spend: Math.max(0, observation.spend), revenue: Math.max(0, observation.revenue) });
  }

  learn(): LearningInsight[] {
    const groups = new Map<string, LearningObservation>();
    for (const item of this.observations) {
      const key = `${item.source}:${item.campaignId ?? "organic"}`;
      const current = groups.get(key);
      if (!current) groups.set(key, { ...item });
      else {
        current.spend += item.spend;
        current.revenue += item.revenue;
        current.conversions += item.conversions;
        current.impressions += item.impressions;
        current.clicks += item.clicks;
      }
    }

    return [...groups.entries()].map(([key, item]) => {
      const roas = item.spend > 0 ? item.revenue / item.spend : item.revenue > 0 ? 4 : 0;
      const conversionRate = item.clicks > 0 ? item.conversions / item.clicks : 0;
      const score = Math.min(1, roas / 4 * 0.65 + Math.min(1, conversionRate / 0.05) * 0.35);
      const recommendation: LearningInsight["recommendation"] = roas >= 3 && conversionRate >= 0.03
        ? "scale"
        : roas < 1 || (item.clicks > 100 && conversionRate < 0.01)
          ? "pause"
          : score >= 0.45
            ? "iterate"
            : "observe";
      return { key, score: Number(score.toFixed(3)), recommendation, reason: `ROAS ${roas.toFixed(2)}, conversion rate ${(conversionRate * 100).toFixed(2)}%.` };
    }).sort((a, b) => b.score - a.score);
  }
}
