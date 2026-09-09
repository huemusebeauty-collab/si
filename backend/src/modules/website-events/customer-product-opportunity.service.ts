import { Injectable } from "@nestjs/common";
import { ProductConversionMetric, ProductConversionService } from "./product-conversion.service";
import { CustomerJourneyService } from "./customer-journey.service";
import { WebsiteChangeIntelligenceService, WebsiteChangeSignal } from "./website-change-intelligence.service";

export type CustomerProductOpportunity = {
  productId: string;
  score: number;
  priority: "high" | "medium" | "low";
  opportunity: "conversion" | "demand" | "journey" | "protect" | "monitor";
  reason: string;
  recommendedAction: "improve_product_page" | "promote_product" | "reduce_checkout_friction" | "protect_inventory" | "monitor";
  evidence: {
    productConversion?: ProductConversionMetric;
    websiteSignals: WebsiteChangeSignal[];
    journeyDropoff: CustomerJourneyService extends never ? never : Array<{
      from: string;
      to: string;
      sessions: number;
      conversionRate: number;
    }>;
  };
};

@Injectable()
export class CustomerProductOpportunityService {
  constructor(
    private readonly products: ProductConversionService,
    private readonly changes: WebsiteChangeIntelligenceService,
    private readonly journeys: CustomerJourneyService,
  ) {}

  async getOpportunities(days = 30): Promise<CustomerProductOpportunity[]> {
    const safeDays = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
    const [products, websiteChanges, journey] = await Promise.all([
      this.products.getProductConversion(safeDays),
      this.changes.getChanges(Math.min(safeDays, 30)),
      this.journeys.getJourney(safeDays),
    ]);

    const signals = websiteChanges.signals;
    const purchaseSignal = signals.find((signal) => signal.metric === "purchases");
    const cartSignal = signals.find((signal) => signal.metric === "add_to_carts");
    const checkoutDrop = journey.stageDropoff.find((drop) => drop.from === "begin_checkout" && drop.to === "purchase");

    return products
      .map((product) => {
        let score = 25;
        let opportunity: CustomerProductOpportunity["opportunity"] = "monitor";
        let recommendedAction: CustomerProductOpportunity["recommendedAction"] = "monitor";
        let reason = "Product has no strong negative or positive signal yet.";

        if (product.opportunity === "high_view_low_cart") {
          score += 50;
          opportunity = "conversion";
          recommendedAction = "improve_product_page";
          reason = `High product interest but only ${(product.viewToCartRate * 100).toFixed(1)}% view-to-cart conversion.`;
        } else if (product.opportunity === "high_cart_low_purchase") {
          score += 55;
          opportunity = "journey";
          recommendedAction = "reduce_checkout_friction";
          reason = `Customers add this product to cart but only ${(product.cartToPurchaseRate * 100).toFixed(1)}% of carts reach purchase.`;
        } else if (product.opportunity === "healthy" && (purchaseSignal?.direction === "up" || cartSignal?.direction === "up")) {
          score += 35;
          opportunity = "demand";
          recommendedAction = "promote_product";
          reason = "Healthy product conversion is aligned with rising website demand signals.";
        }

        if (checkoutDrop && checkoutDrop.conversionRate < 50 && product.carts >= 5) {
          score += 10;
          if (opportunity === "monitor") {
            opportunity = "journey";
            recommendedAction = "reduce_checkout_friction";
            reason = `Checkout-to-purchase conversion is ${checkoutDrop.conversionRate}%, indicating journey friction.`;
          }
        }

        const priority: CustomerProductOpportunity["priority"] = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
        return {
          productId: product.productId,
          score: Math.min(score, 100),
          priority,
          opportunity,
          reason,
          recommendedAction,
          evidence: {
            productConversion: product,
            websiteSignals: signals,
            journeyDropoff: journey.stageDropoff,
          },
        };
      })
      .filter((item) => item.priority !== "low" || item.evidence.productConversion?.views >= 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
