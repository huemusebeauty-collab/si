import { buildWebsiteActionRecommendations } from "../src/website-opportunity-actions";
import { MarketingDirector } from "../src/marketing-director";

async function main() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        windowDays: 7,
        signals: [
          { metric: "sessions", recent: 120, previous: 100, changePercent: 20, direction: "up", significance: "medium" },
          { metric: "product_views", recent: 80, previous: 50, changePercent: 60, direction: "up", significance: "high" },
          { metric: "add_to_carts", recent: 2, previous: 6, changePercent: -66.67, direction: "down", significance: "high" },
          { metric: "checkouts", recent: 4, previous: 4, changePercent: 0, direction: "flat", significance: "low" },
          { metric: "purchases", recent: 1, previous: 3, changePercent: -66.67, direction: "down", significance: "high" },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ) as Response) as typeof fetch;

  try {
    const recommendations = await buildWebsiteActionRecommendations();
    if (recommendations[0]?.action !== "improve_product_page") {
      throw new Error("Website opportunity mapping did not produce improve_product_page.");
    }

    const director = new MarketingDirector();
    const decision = director.decide({
      revenueTrend: "flat",
      topProducts: ["p1"],
      risingCategories: [],
      creatorOpportunities: 0,
      b2bOpportunities: 0,
      websiteOpportunities: recommendations.map((item) => ({
        action: item.action,
        reason: item.reason,
        priority: item.priority,
        score: item.priority === "high" ? 85 : item.priority === "medium" ? 60 : 30,
      })),
    });

    if (!decision.requiresApproval) {
      throw new Error("Website-driven Director action must remain approval-gated.");
    }
    if (!decision.action.includes("improve_product_page")) {
      throw new Error("Director did not consume the website opportunity action.");
    }

    console.log("Website Intelligence E2E GATE PASS: backend-shaped signals -> opportunity action -> Marketing Director -> approval gate");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
