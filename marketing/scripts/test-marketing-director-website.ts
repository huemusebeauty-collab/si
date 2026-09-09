import { MarketingDirector } from "../src/marketing-director";

const director = new MarketingDirector();
const result = director.decide({
  revenueTrend: "flat",
  topProducts: ["Silku Serum"],
  risingCategories: [],
  creatorOpportunities: 0,
  b2bOpportunities: 0,
  websiteOpportunities: [{
    action: "Improve product page",
    reason: "Views are rising while carts are falling.",
    priority: "high",
    score: 88,
    productId: "sku-123",
  }],
});

if (!result.action.includes("Improve product page") || !result.action.includes("sku-123")) {
  throw new Error("Director did not prioritize the high-priority website opportunity");
}
if (result.confidence !== 0.88) throw new Error(`Unexpected confidence: ${result.confidence}`);
if (!result.requiresApproval) throw new Error("Website-driven Director action must remain approval-gated");

console.log("Marketing Director website integration tests passed");
