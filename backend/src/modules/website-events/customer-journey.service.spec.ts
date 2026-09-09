import { CustomerJourneyService } from "./customer-journey.service";

describe("CustomerJourneyService", () => {
  it("builds ordered journey paths and stage dropoff", async () => {
    const rows = [
      { sessionId: "s1", eventName: "page_view", occurredAt: new Date("2026-09-09T00:00:00Z") },
      { sessionId: "s1", eventName: "product_view", occurredAt: new Date("2026-09-09T00:01:00Z") },
      { sessionId: "s1", eventName: "add_to_cart", occurredAt: new Date("2026-09-09T00:02:00Z") },
      { sessionId: "s1", eventName: "purchase", occurredAt: new Date("2026-09-09T00:05:00Z") },
      { sessionId: "s2", eventName: "page_view", occurredAt: new Date("2026-09-09T00:00:00Z") },
      { sessionId: "s2", eventName: "product_view", occurredAt: new Date("2026-09-09T00:01:00Z") },
    ];
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    const service = new CustomerJourneyService({ createQueryBuilder: jest.fn().mockReturnValue(qb) } as any);

    const result = await service.getJourney(30);
    expect(result.sessions).toBe(2);
    expect(result.completedPurchases).toBe(1);
    expect(result.topJourneys[0].path).toEqual(["page_view", "product_view", "add_to_cart", "purchase"]);
    expect(result.stageDropoff[2]).toMatchObject({ from: "add_to_cart", to: "begin_checkout", sessions: 1 });
  });
});
