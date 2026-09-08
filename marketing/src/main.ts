import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { FieldForceApi } from "./field-force-api";
import { MarketingMonitor } from "./monitoring";
import { MarketingControlApi } from "./marketing-control-api";
import { MarketingHqDashboard } from "./marketing-hq-dashboard";
import { dashboardHtml, loginHtml } from "./dashboard-ui";
import { fetchCommerceIntelligence } from "./commerce-data";

const startedAt = new Date().toISOString();
const port = Number(process.env.PORT ?? 10000);
const hostname = "0.0.0.0";
const sessionToken = randomBytes(32).toString("hex");

const json = (response: import("node:http").ServerResponse, status: number, body: unknown) => { response.statusCode = status; response.setHeader("content-type", "application/json; charset=utf-8"); response.end(JSON.stringify(body)); };
const html = (response: import("node:http").ServerResponse, status: number, body: string) => { response.statusCode = status; response.setHeader("content-type", "text/html; charset=utf-8"); response.end(body); };
const parseCookies = (value: string | undefined): Record<string, string> => { if (!value) return {}; return Object.fromEntries(value.split(";").map((part) => part.trim().split("=")).filter(([key, val]) => key && val).map(([key, val]) => [key, decodeURIComponent(val)])); };
const authorized = (request: import("node:http").IncomingMessage): boolean => { const token = parseCookies(request.headers.cookie).silku_hq_session; if (!token) return false; const expected = Buffer.from(sessionToken); const actual = Buffer.from(token); return expected.length === actual.length && timingSafeEqual(expected, actual); };
const requireAuth = (request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse): boolean => { if (authorized(request)) return true; json(response, 401, { ok: false, error: "Unauthorized" }); return false; };
const readJson = async (request: import("node:http").IncomingMessage) => { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); };

const marketing = new MarketingControlApi();
const dashboard = new MarketingHqDashboard();
const monitor = new MarketingMonitor();
const fieldForce = new FieldForceApi();

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const rawUrl = request.url ?? "/";
  const pathname = rawUrl.split("?", 1)[0] || "/";

  if (method === "GET" && (pathname === "/health" || pathname === "/v1/health")) { json(response, 200, { ok: true, service: "silku-marketing-hq", startedAt }); return; }
  if (method === "GET" && pathname === "/") { html(response, 200, authorized(request) ? dashboardHtml() : loginHtml()); return; }

  if (method === "POST" && pathname === "/v1/hq/login") {
    const body = await readJson(request);
    const expected = process.env.MARKETING_HQ_ACCESS_KEY ?? process.env.MARKETING_HQ_ADMIN_TOKEN;
    const provided = typeof body.key === "string" ? body.key : "";
    if (!expected || !provided) { json(response, 401, { ok: false, error: "Invalid access key" }); return; }
    const expectedBuffer = Buffer.from(expected); const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) { json(response, 401, { ok: false, error: "Invalid access key" }); return; }
    response.statusCode = 204; response.setHeader("set-cookie", `silku_hq_session=${encodeURIComponent(sessionToken)}; HttpOnly; Secure; SameSite=Strict; Path=/`); response.end(); return;
  }

  if (method === "GET" && pathname === "/dashboard") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, dashboardHtml()); return; }
  if (!pathname.startsWith("/v1/") || !requireAuth(request, response)) return;

  if (method === "GET" && pathname === "/v1/marketing/dashboard") {
    const commerce = await fetchCommerceIntelligence();
    if (!commerce.ok) { json(response, 503, { ok: false, dataSource: "unavailable", error: commerce.error, message: "Marketing HQ is not showing placeholder commerce numbers." }); return; }
    const data = commerce.data; const capturedAt = new Date().toISOString();
    const evidence = [
      { source: "Silku commerce backend", capturedAt, confidence: 1, evidence: `Live commerce window: ${data.windowDays} days`, lastVerifiedAt: capturedAt },
      { source: "Silku inventory", capturedAt, confidence: 1, evidence: `Low/out-of-stock variants: ${data.lowStockCount}`, lastVerifiedAt: capturedAt },
    ];
    const snapshot = marketing.evaluate({ revenueTrend: data.revenueTrend, topProducts: data.topProducts.map((product) => product.productName), risingCategories: data.risingCategories, creatorOpportunities: 0, b2bOpportunities: 0, learningScore: 0.5, availableBudget: 0, analytics: { revenue: data.revenue, orders: data.orders, conversions: data.orders }, inventoryRiskProducts: data.inventoryRiskProducts.map((product) => product.name), evidence }).data!;
    json(response, 200, { ok: true, dataSource: "live", commerce: data, data: dashboard.build(snapshot, marketing.approvals().data ?? [], marketing.audit().data ?? []) }); return;
  }

  if (method === "POST" && pathname === "/v1/control-plane/prepare") {
    const body = await readJson(request);
    if (!body?.decision) { json(response, 400, { ok: false, error: "decision is required" }); return; }
    const result = marketing.prepareDirectorAction(body.decision);
    json(response, result.ok ? 200 : 400, result); return;
  }

  if (method === "POST" && pathname === "/v1/control-plane/check") {
    const body = await readJson(request);
    if (!body?.action) { json(response, 400, { ok: false, error: "action is required" }); return; }
    const result = marketing.executionBoundary(body.action, body.approvalRequestId);
    json(response, result.ok ? 200 : 403, result); return;
  }

  if (method === "GET" && pathname === "/v1/approvals") { json(response, 200, marketing.approvals()); return; }
  if (method === "GET" && pathname === "/v1/audit") { json(response, 200, marketing.audit()); return; }
  if (method === "GET" && pathname === "/v1/monitoring/status") { json(response, 200, monitor.status()); return; }
  if (method === "GET" && pathname.startsWith("/v1/field-force/")) { json(response, 200, fieldForce.handle(method, pathname, {})); return; }

  if (method === "POST" && pathname === "/v1/evaluate") { json(response, 200, marketing.evaluate(await readJson(request))); return; }
  if (method === "POST" && pathname === "/v1/approvals") { json(response, 201, marketing.requestApproval(await readJson(request))); return; }

  const approvalMatch = pathname.match(/^\/v1\/approvals\/([^/]+)\/(approve|reject)$/);
  if (method === "POST" && approvalMatch) { const body = await readJson(request); const result = approvalMatch[2] === "approve" ? marketing.approve(approvalMatch[1], body) : marketing.reject(approvalMatch[1], body); json(response, result.ok ? 200 : 404, result); return; }
  json(response, 404, { ok: false, error: "Not found" });
});

server.listen(port, hostname, () => { console.log(`Silku Marketing HQ listening on ${hostname}:${port}`); });
