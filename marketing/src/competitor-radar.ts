import type { SourceEvidence } from "./contracts";

export interface CompetitorObservation {
  competitorId: string;
  brand: string;
  product: string;
  category: string;
  mrp?: number;
  sellingPrice?: number;
  discountPercent?: number;
  offer?: string;
  observedAt: string;
  sourceEvidence: SourceEvidence[];
}

export interface CompetitorSnapshot {
  competitorId: string;
  brand: string;
  products: number;
  lowestObservedPrice?: number;
  averageDiscountPercent?: number;
  lastObservedAt?: string;
}

export class CompetitorRadar {
  private readonly observations: CompetitorObservation[] = [];

  addObservation(observation: CompetitorObservation): CompetitorObservation {
    const normalized = {
      ...observation,
      discountPercent:
        observation.discountPercent ??
        (observation.mrp && observation.sellingPrice && observation.mrp > 0
          ? Math.max(0, ((observation.mrp - observation.sellingPrice) / observation.mrp) * 100)
          : undefined),
    };
    this.observations.push(normalized);
    return normalized;
  }

  listObservations(): CompetitorObservation[] {
    return [...this.observations];
  }

  snapshot(): CompetitorSnapshot[] {
    const grouped = new Map<string, CompetitorObservation[]>();
    for (const observation of this.observations) {
      const list = grouped.get(observation.competitorId) ?? [];
      list.push(observation);
      grouped.set(observation.competitorId, list);
    }

    return [...grouped.entries()].map(([competitorId, items]) => {
      const prices = items.flatMap((item) => item.sellingPrice === undefined ? [] : [item.sellingPrice]);
      const discounts = items.flatMap((item) => item.discountPercent === undefined ? [] : [item.discountPercent]);
      const latest = [...items].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
      return {
        competitorId,
        brand: latest.brand,
        products: new Set(items.map((item) => item.product)).size,
        lowestObservedPrice: prices.length ? Math.min(...prices) : undefined,
        averageDiscountPercent: discounts.length
          ? discounts.reduce((sum, value) => sum + value, 0) / discounts.length
          : undefined,
        lastObservedAt: latest.observedAt,
      };
    });
  }
}
