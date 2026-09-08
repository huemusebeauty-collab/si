export type TrendSignal = "rising" | "viral" | "stable" | "declining";
export type TrendFormat = "reel" | "short" | "story" | "post" | "carousel" | "pinterest" | "whatsapp";

export interface TrendObservation {
  trendId: string;
  topic: string;
  category?: string;
  signal: TrendSignal;
  velocity: number;
  relevance: number;
  observedAt: string;
  evidence?: string[];
}

export interface ViralOpportunity {
  trendId: string;
  topic: string;
  category?: string;
  score: number;
  recommendedFormats: TrendFormat[];
  recommendedAction: "create_now" | "test" | "observe";
  reason: string;
}

export class TrendRadar {
  private readonly observations: TrendObservation[] = [];

  addObservation(observation: TrendObservation): void {
    this.observations.push({
      ...observation,
      velocity: Math.max(0, observation.velocity),
      relevance: Math.min(1, Math.max(0, observation.relevance)),
    });
  }

  opportunities(limit = 10): ViralOpportunity[] {
    return this.observations
      .map((item) => {
        const signalScore = item.signal === "viral" ? 1 : item.signal === "rising" ? 0.8 : item.signal === "stable" ? 0.45 : 0.1;
        const velocityScore = Math.min(1, item.velocity / 100);
        const score = Math.min(1, signalScore * 0.45 + velocityScore * 0.25 + item.relevance * 0.30);
        const recommendedAction: ViralOpportunity["recommendedAction"] = score >= 0.75 ? "create_now" : score >= 0.45 ? "test" : "observe";
        const recommendedFormats: TrendFormat[] = score >= 0.75 ? ["reel", "short", "story"] : ["post", "carousel"];
        return {
          trendId: item.trendId,
          topic: item.topic,
          category: item.category,
          score: Number(score.toFixed(3)),
          recommendedFormats,
          recommendedAction,
          reason: `Signal ${item.signal}; velocity ${item.velocity}; relevance ${(item.relevance * 100).toFixed(0)}%.`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));
  }
}
