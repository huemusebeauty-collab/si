export type AudienceSegment = "new_customer" | "engaged_visitor" | "cart_abandoner" | "repeat_customer" | "high_value" | "b2b_buyer";
export type AudienceChannel = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp" | "google" | "website";

export interface CustomerSignal {
  customerId: string;
  orders: number;
  totalRevenue: number;
  productViews: number;
  cartAdds: number;
  checkoutStarts: number;
  daysSinceLastOrder?: number;
  b2b?: boolean;
}

export interface AudienceRecommendation {
  customerId: string;
  segment: AudienceSegment;
  products: string[];
  channels: AudienceChannel[];
  objective: "conversion" | "retention" | "b2b";
  priority: "high" | "medium" | "low";
  reason: string;
}

export class AudienceIntelligenceEngine {
  classify(signal: CustomerSignal, products: string[] = []): AudienceRecommendation {
    if (!signal.customerId) throw new Error("customerId is required");
    const revenue = Math.max(0, signal.totalRevenue);
    const orders = Math.max(0, signal.orders);
    const views = Math.max(0, signal.productViews);
    const carts = Math.max(0, signal.cartAdds);

    if (signal.b2b) {
      return {
        customerId: signal.customerId,
        segment: "b2b_buyer",
        products,
        channels: ["whatsapp", "facebook", "website"],
        objective: "b2b",
        priority: "high",
        reason: "B2B signal detected; prioritize direct, relationship-led conversion.",
      };
    }
    if (orders >= 3 || revenue >= 10000) {
      return {
        customerId: signal.customerId,
        segment: "high_value",
        products,
        channels: ["whatsapp", "instagram", "website"],
        objective: "retention",
        priority: "high",
        reason: "Strong purchase value; focus on retention and repeat purchase.",
      };
    }
    if (orders >= 1) {
      return {
        customerId: signal.customerId,
        segment: "repeat_customer",
        products,
        channels: ["whatsapp", "instagram", "website"],
        objective: "retention",
        priority: "medium",
        reason: "Existing customer; recommend relevant replenishment or complementary products.",
      };
    }
    if (signal.checkoutStarts > 0 && carts > 0) {
      return {
        customerId: signal.customerId,
        segment: "cart_abandoner",
        products,
        channels: ["whatsapp", "facebook", "website"],
        objective: "conversion",
        priority: "high",
        reason: "Checkout intent exists without a completed order; recover the conversion.",
      };
    }
    if (views >= 3) {
      return {
        customerId: signal.customerId,
        segment: "engaged_visitor",
        products,
        channels: ["instagram", "youtube", "google", "website"],
        objective: "conversion",
        priority: "medium",
        reason: "Repeated product interest; use product-specific education and proof.",
      };
    }
    return {
      customerId: signal.customerId,
      segment: "new_customer",
      products,
      channels: ["instagram", "youtube", "google", "website"],
      objective: "conversion",
      priority: "low",
      reason: "Limited behavioral history; start with discovery and low-cost conversion testing.",
    };
  }
}
