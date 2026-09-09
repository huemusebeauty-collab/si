import { buildWebsiteActionRecommendations } from "../src/website-opportunity-actions";

describe("website action recommendations", () => {
  it("returns a safe monitor recommendation when intelligence is unavailable", async () => {
    const result = await buildWebsiteActionRecommendations();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("action");
  });
});
