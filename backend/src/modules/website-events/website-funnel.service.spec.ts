import { WebsiteFunnelService } from "./website-funnel.service";

describe("WebsiteFunnelService", () => {
  it("aggregates funnel steps and conversion rates", async () => {
    const rows = [
      { eventName: "page_view", events: "10", sessions: "5" },
      { eventName: "product_view", events: "8", sessions: "4" },
      { eventName: "add_to_cart", events: "6", sessions: "3" },
      { eventName: "begin_checkout", events: "4", sessions: "2" },
      { eventName: "purchase", events: "2", sessions: "1" },
    ];
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    const repository = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as any;
    const service = new WebsiteFunnelService(repository);

    const result = await service.getFunnel(30);

    expect(result.steps).toEqual([
      { eventName: "page_view", events: 10, sessions: 5 },
      { eventName: "product_view", events: 8, sessions: 4 },
      { eventName: "add_to_cart", events: 6, sessions: 3 },
      { eventName: "begin_checkout", events: 4, sessions: 2 },
      { eventName: "purchase", events: 2, sessions: 1 },
    ]);
    expect(result.conversionRate).toBe(20);
    expect(result.cartRate).toBe(60);
    expect(result.checkoutRate).toBe(66.67);
    expect(result.purchaseRate).toBe(50);
  });
});
