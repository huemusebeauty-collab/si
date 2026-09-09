import { fetchWebsiteChangeIntelligence, WebsiteChangeSignal } from "./website-intelligence";

export type WebsiteActionRecommendation = {
  action: "improve_product_page" | "promote_product" | "reduce_checkout_friction" | "monitor";
  priority: "high" | "medium" | "low";
  reason: string;
  evidence: WebsiteChangeSignal[];
};

export async function buildWebsiteActionRecommendations(): Promise<WebsiteActionRecommendation[]> {
  const result = await fetchWebsiteChangeIntelligence(7);
  if (!result.ok) return [{ action: "monitor", priority: "low", reason: result.error, evidence: [] }];

  const signals = result.data.signals;
  const recommendations: WebsiteActionRecommendation[] = [];
  const find = (metric: WebsiteChangeSignal["metric"]) => signals.find((signal) => signal.metric === metric);

  const productViews = find("product_views");
  const carts = find("add_to_carts");
  const checkouts = find("checkouts");
  const purchases = find("purchases");

  if (productViews?.direction === "up" && carts?.direction === "down") {
    recommendations.push({
      action: "improve_product_page",
      priority: "high",
      reason: "Product interest is rising while add-to-cart activity is falling.",
      evidence: [productViews, carts],
    });
  }

  if (carts?.direction === "up" && purchases?.direction === "down") {
    recommendations.push({
      action: "reduce_checkout_friction",
      priority: "high",
      reason: "Cart activity is rising while purchases are falling.",
      evidence: [carts, purchases],
    });
  }

  if (productViews?.direction === "up" && carts?.direction === "up" && purchases?.direction === "up") {
    recommendations.push({
      action: "promote_product",
      priority: "high",
      reason: "Interest, cart activity, and purchases are all trending upward.",
      evidence: [productViews, carts, purchases],
    });
  }

  if (checkouts?.direction === "up" && purchases?.direction === "down") {
    recommendations.push({
      action: "reduce_checkout_friction",
      priority: "high",
      reason: "Checkout starts are increasing while completed purchases are declining.",
      evidence: [checkouts, purchases],
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      action: "monitor",
      priority: "low",
      reason: "No strong website action signal crossed the recommendation threshold.",
      evidence: signals,
    });
  }

  return recommendations.slice(0, 10);
}
