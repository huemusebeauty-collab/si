import { WebsiteEventsService } from "./website-events.service";

const dto = {
  eventName: "page_view" as const,
  sessionId: "session-1",
  anonymousId: "anon-1",
  path: "/",
  referrer: "https://google.com/",
  source: "google",
  medium: "organic",
  campaign: undefined,
  metadata: { viewport: "desktop" },
  occurredAt: "2026-09-09T00:00:00.000Z",
};

describe("WebsiteEventsService", () => {
  it("persists a validated website event and returns its id", async () => {
    const insert = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn((value) => value);
    const service = new WebsiteEventsService({ create, insert } as never);

    const result = await service.track(dto);

    expect(result.accepted).toBe(true);
    expect(result.eventId).toEqual(expect.any(String));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "page_view",
        sessionId: "session-1",
        path: "/",
        metadata: { viewport: "desktop" },
      }),
    );
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
