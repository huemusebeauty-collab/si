export type WebsiteIntelligenceE2eResult = {
  ok: boolean;
  test: "website-intelligence-e2e";
  verified: {
    eventAccepted: boolean;
    funnelObserved: boolean;
    productConversionObserved: boolean;
    journeyObserved: boolean;
    websiteChangeObserved: boolean;
    opportunityRadarObserved: boolean;
  };
  opportunity: {
    productId: string;
    score: number;
    priority: "high" | "medium" | "low";
    recommendedAction: string;
  } | null;
  cleanedUp: boolean;
};

export async function runWebsiteIntelligenceE2e(): Promise<WebsiteIntelligenceE2eResult> {
  const baseUrl = (process.env.SILKU_BACKEND_URL ?? "").replace(/\/$/, "");
  const token = process.env.MARKETING_HQ_INTERNAL_TOKEN ?? "";
  if (!baseUrl || !token) throw new Error("Website intelligence E2E is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl}/v1/website/analytics/e2e`, {
      headers: { accept: "application/json", "x-silku-hq-internal-token": token },
      signal: controller.signal,
    });
    const payload = (await response.json()) as { data?: WebsiteIntelligenceE2eResult } & Partial<WebsiteIntelligenceE2eResult>;
    const result = payload.data ?? payload;
    if (!response.ok || !result || typeof result.ok !== "boolean") {
      throw new Error(`Website intelligence E2E returned HTTP ${response.status}.`);
    }
    return result as WebsiteIntelligenceE2eResult;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Website intelligence E2E timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
