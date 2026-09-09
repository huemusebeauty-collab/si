import { CustomerProductOpportunityService } from "./customer-product-opportunity.service";

describe("CustomerProductOpportunityService", () => {
  it("prioritizes high-view low-cart products", async () => {
    const products = {
      getProductConversion: jest.fn().mockResolvedValue([
        {
          productId: "p1",
          views: 100,
          carts: 1,
          purchases: 0,
          viewToCartRate: 0.01,
          cartToPurchaseRate: 0,
          viewToPurchaseRate: 0,
          opportunity: "high_view_low_cart",
        },
      ]),
    };
    const changes = {
      getChanges: jest.fn().mockResolvedValue({
        windowDays: 30,
        signals: [{ metric: "product_views", recent: 100, previous: 80, changePercent: 25, direction: "up", significance: "medium" }],
      }),
    };
    const journeys = {
      getJourney: jest.fn().mockResolvedValue({
        stageDropoff: [],
      }),
    };

    const service = new CustomerProductOpportunityService(products as any, changes as any, journeys as any);
    const result = await service.getOpportunities(30);

    expect(result[0]).toMatchObject({
      productId: "p1",
      priority: "high",
      opportunity: "conversion",
      recommendedAction: "improve_product_page",
    });
  });
});
