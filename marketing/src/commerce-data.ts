export type CommerceIntelligence = {
  dataSource: "live";
  windowDays: number;
  generatedAt: string;
  revenue: number;
  previousRevenue: number;
  revenueTrend: "up" | "flat" | "down";
  orders: number;
  previousOrders: number;
  aov: number;
  topProducts: Array<{ productName: string; units: number; revenue: number }>;
  risingCategories: string[];
  inventoryRiskProducts: Array<{
    sku: string;
    name: string;
    category: string;
    stockQuantity: number;
    stockState: string;
  }>;
  lowStockCount: number;
};

export type CommerceFetchResult =
  | { ok: true; data: CommerceIntelligence }
  | { ok: false; error: string };

export async function fetchCommerceIntelligence(): Promise<CommerceFetchResult> {
  const baseUrl = (process.env.SILKU_BACKEND_URL ?? "").replace(/\/$/, "");
  const token = process.env.MARKETING_HQ_INTERNAL_TOKEN;
  if (!baseUrl || !token) return { ok: false, error: "Commerce feed is not configured." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${baseUrl}/v1/marketing/commerce-intelligence`, {
      method: "GET",
      headers: { "x-silku-internal-token": token, accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: `Commerce feed returned HTTP ${response.status}.` };
    const payload = (await response.json()) as { data?: CommerceIntelligence } & CommerceIntelligence;
    const data = payload.data ?? payload;
    if (data.dataSource !== "live") return { ok: false, error: "Commerce feed did not return a live data source." };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "AbortError" ? "Commerce feed timed out." : "Commerce feed is unavailable." };
  } finally {
    clearTimeout(timeout);
  }
}
