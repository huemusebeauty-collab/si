export type WebsiteChangeSignal = {
  metric: "sessions" | "product_views" | "add_to_carts" | "checkouts" | "purchases";
  recent: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  significance: "high" | "medium" | "low";
};

export type WebsiteChangeResult =
  | { ok: true; data: { windowDays: number; signals: WebsiteChangeSignal[] } }
  | { ok: false; error: string };

export async function fetchWebsiteChangeIntelligence(windowDays = 7): Promise<WebsiteChangeResult> {
  const baseUrl = (process.env.SILKU_BACKEND_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) return { ok: false, error: "Website intelligence is not configured." };

  const days = Math.min(Math.max(Math.floor(windowDays) || 7, 1), 30);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${baseUrl}/v1/website/analytics/changes?days=${days}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: `Website intelligence returned HTTP ${response.status}.` };
    const data = (await response.json()) as { windowDays?: number; signals?: WebsiteChangeSignal[] };
    if (!Array.isArray(data.signals)) return { ok: false, error: "Website intelligence returned an invalid payload." };
    return { ok: true, data: { windowDays: Number(data.windowDays ?? days), signals: data.signals } };
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "AbortError" ? "Website intelligence timed out." : "Website intelligence is unavailable." };
  } finally {
    clearTimeout(timeout);
  }
}
