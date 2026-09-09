import { WebsiteChangeIntelligenceService } from "./website-change-intelligence.service";

describe("WebsiteChangeIntelligenceService", () => {
  it("detects meaningful metric movement", async () => {
    const rows = [
      { sessionId: "a", eventName: "page_view", occurredAt: new Date() },
      { sessionId: "b", eventName: "page_view", occurredAt: new Date() },
      { sessionId: "c", eventName: "page_view", occurredAt: new Date(Date.now() - 8 * 86_400_000) },
      { sessionId: "c", eventName: "product_view", occurredAt: new Date(Date.now() - 8 * 86_400_000) },
    ];
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    const service = new WebsiteChangeIntelligenceService({ createQueryBuilder: jest.fn().mockReturnValue(qb) } as any);
    const result = await service.getChanges(7);
    expect(result.signals.find((s) => s.metric === "sessions")).toMatchObject({ recent: 2, previous: 1, direction: "up" });
  });
});
