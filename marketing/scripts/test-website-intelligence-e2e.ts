import { buildWebsiteActionRecommendations } from "../src/website-opportunity-actions";
import { MarketingDirector } from "../src/marketing-director";
import { runWebsiteIntelligenceE2e } from "../src/website-intelligence-e2e";

async function main() {
  const originalFetch = globalThis.fetch;
  const originalBackend = process.env.SILKU_BACKEND_URL;
  const originalToken = process.env.MARKETING_HQ_INTERNAL_TOKEN;

  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes("/v1/website/analytics/e2e")) {
      return new Response(JSON.stringify({
        data: {
          ok: true,
          test: "website-intelligence-e2e",
          verified: {
            eventAccepted: true,
            funnelObserved: true,
            productConversionObserved: true,
            journeyObserved: true,
            websiteChangeObserved: true,
            opportunityRadarObserved: true,
          },
          opportunity: {
            productId: "website-e2e-product:test",
            score: 75,
            priority: "high",
            recommendedAction: "improve_product_page",
          },
          cleanedUp: true,
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({
      windowDays: 7,
      signals: [
        { metric: "sessions", recent: 120, previous: 100, changePercent: 20, direction: "up", significance: "medium" },
        { metric: "product_views", recent: 80, previous: 50, changePercent: 60, direction: "up", significance: "high" },
        { metric: "add_to_carts", recent: 2, previous: 6, changePercent: -66.67, direction: "down", significance: "high" },
        { metric: "checkouts", recent: 4, previous: 4, changePercent: 0, direction: "flat", significance: "low" },
        { metric: "purchases", recent: 1, previous: 3, changePercent: -66.67, direction: "down", significance: "high" },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  process.env.SILKU_BACKEND_URL = "https://silku-backend.onrender.com";
  process.env.MARKETING_HQ_INTERNAL_TOKEN = "test-internal-token";

  try {
    const e2e = await runWebsiteIntelligenceE2e();
    if (!e2e.ok || !e2e.cleanedUp || !e2e.verified.opportunityRadarObserved) {
      throw new Error("Website Intelligence E2E client contract failed.");
    }

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

    if (!decision.requiresApproval) throw new Error("Website-driven Director action must remain approval-gated.");
    if (!decision.action.includes("improve_product_page")) throw new Error("Director did not consume the website opportunity action.");

    console.log("Website Intelligence E2E GATE PASS: event contract -> analytics -> opportunity -> Director -> approval gate");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBackend === undefined) delete process.env.SILKU_BACKEND_URL;
    else process.env.SILKU_BACKEND_URL = originalBackend;
    if (originalToken === undefined) delete process.env.MARKETING_HQ_INTERNAL_TOKEN;
    else process.env.MARKETING_HQ_INTERNAL_TOKEN = originalToken;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
