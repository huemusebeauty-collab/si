import type { SourceEvidence } from "./contracts";

export type MarketSignal = "HOT" | "RISING" | "STABLE" | "DECLINING" | "UPCOMING";

export interface MarketObservation {
  category: string;
  product?: string;
  price?: number;
  mrp?: number;
  offer?: string;
  signal: MarketSignal;
  confidence: number;
  observedAt: string;
  evidence: SourceEvidence[];
}

export interface MarketInsight {
  topCategories: string[];
  risingProducts: string[];
  pricePressure: string[];
  opportunities: string[];
  generatedAt: string;
}

export class MarketIntelligence {
  private readonly observations: MarketObservation[] = [];

  addObservation(observation: MarketObservation): MarketObservation {
    const normalized = {
      ...observation,
      confidence: Math.max(0, Math.min(1, observation.confidence)),
    };
    this.observations.push(normalized);
    return normalized;
  }

  listObservations(): MarketObservation[] {
    return [...this.observations];
  }

  summarize(): MarketInsight {
    const categoryScores = new Map<string, number>();
    const risingProducts = new Set<string>();
    const pricePressure = new Set<string>();
    const opportunities: string[] = [];

    for (const item of this.observations) {
      const signalWeight = { HOT: 3, RISING: 2, STABLE: 1, DECLINING: -1, UPCOMING: 2.5 }[item.signal];
      categoryScores.set(item.category, (categoryScores.get(item.category) ?? 0) + signalWeight * item.confidence);

      if (item.product && (item.signal === "RISING" || item.signal === "HOT" || item.signal === "UPCOMING")) {
        risingProducts.add(item.product);
      }

      if (item.product && item.mrp && item.price && item.price < item.mrp * 0.85) {
        pricePressure.add(item.product);
      }

      if (item.product && item.signal === "RISING" && item.confidence >= 0.75) {
        opportunities.push(`Review ${item.product} for a Silku campaign`);
      }
    }

    const topCategories = [...categoryScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    return {
      topCategories,
      risingProducts: [...risingProducts].slice(0, 10),
      pricePressure: [...pricePressure].slice(0, 10),
      opportunities: [...new Set(opportunities)].slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
  }
}
