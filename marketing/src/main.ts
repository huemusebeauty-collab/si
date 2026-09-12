import { createServer } from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { FieldForceApi } from "./field-force-api";
import { MarketingMonitor } from "./monitoring";
import { MarketingControlApi } from "./marketing-control-api";
import { MarketingHqDashboard } from "./marketing-hq-dashboard";
import { MarketingSecurityLayer } from "./marketing-security";
import { NeonMarketingPersistence } from "./marketing-persistence";
import { MarketingDomainStore } from "./marketing-domain-store";
import { MarketingDomainApi, DomainKind } from "./marketing-domain-api";
import { DurableMarketingWorker } from "./durable-worker";
import { verifyRestartRecovery } from "./restart-recovery";
import { dashboardHtml, loginHtml } from "./dashboard-ui";
import { fetchCommerceIntelligence } from "./commerce-data";
import { fetchWebsiteChangeIntelligence } from "./website-intelligence";
import { buildWebsiteActionRecommendations } from "./website-opportunity-actions";
import { runWebsiteIntelligenceE2e } from "./website-intelligence-e2e";
import { SocialCenter, socialCenterHtml } from "./social-center";
import { CreatorCollaborationEngine } from "./creator-collaboration";

const startedAt = new Date().toISOString();
const port = Number(process.env.PORT ?? 10000);
const hostname = "0.0.0.0";
const sessionToken = (): string => { const accessKey = process.env.MARKETING_HQ_ACCESS_KEY ?? process.env.MARKETING_HQ_ADMIN_TOKEN; return accessKey ? createHmac("sha256", accessKey).update("silku-hq-session-v1").digest("hex") : ""; };
const json = (response: import("node:http").ServerResponse, status: number, body: unknown) => { response.statusCode = status; response.setHeader("content-type", "application/json; charset=utf-8"); response.end(JSON.stringify(body)); };
const html = (response: import("node:http").ServerResponse, status: number, body: string) => { response.statusCode = status; response.setHeader("content-type", "text/html; charset=utf-8"); response.end(body); };
const parseCookies = (value: string | undefined): Record<string, string> => { if (!value) return {}; return Object.fromEntries(value.split(";").map((part) => part.trim().split("=")).filter(([key, val]) => key && val).map(([key, val]) => [key, decodeURIComponent(val)])); };
const authorized = (request: import("node:http").IncomingMessage): boolean => { const token = parseCookies(request.headers.cookie).silku_hq_session; const expected = sessionToken(); if (!token || !expected) return false; const expectedBuffer = Buffer.from(expected); const actual = Buffer.from(token); return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual); };
const requireAuth = (request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse): boolean => { if (authorized(request)) return true; json(response, 401, { ok: false, error: "Unauthorized" }); return false; };
const readJson = async (request: import("node:http").IncomingMessage) => { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); };
const persistence = (process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL) ? new NeonMarketingPersistence() : undefined;
const security = new MarketingSecurityLayer(persistence);
const domainStore = new MarketingDomainStore(persistence);
const domainApi = new MarketingDomainApi(domainStore);
const marketing = new MarketingControlApi(undefined, security, domainStore);
const dashboard = new MarketingHqDashboard();
const monitor = new MarketingMonitor();
const fieldForce = new FieldForceApi();
const social = new SocialCenter();
const creators = new CreatorCollaborationEngine(persistence);
const durableWorker = persistence ? new DurableMarketingWorker(persistence, persistence, { stallAfterMs: Number(process.env.MARKETING_WORKER_STALL_AFTER_MS ?? 15 * 60 * 1000) }) : undefined;
if (durableWorker) durableWorker.register("maintenance", async () => ({ worker: "silku-marketing-hq", completedAt: new Date().toISOString() }));
const domainKinds = new Set<DomainKind>(["content", "campaigns", "jobs", "decisions"]);

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const rawUrl = request.url ?? "/";
  const pathname = rawUrl.split("?", 1)[0] || "/";
  if (method === "GET" && (pathname === "/health" || pathname === "/v1/health")) { json(response, 200, { ok: true, service: "silku-marketing-hq", startedAt }); return; }
  if (method === "GET" && pathname === "/") { html(response, 200, authorized(request) ? dashboardHtml() : loginHtml()); return; }
  if (method === "POST" && pathname === "/v1/hq/login") { const body = await readJson(request); const expected = process.env.MARKETING_HQ_ACCESS_KEY ?? process.env.MARKETING_HQ_ADMIN_TOKEN; const provided = typeof body.key === "string" ? body.key : ""; if (!expected || !provided) { json(response, 401, { ok: false, error: "Invalid access key" }); return; } const expectedBuffer = Buffer.from(expected); const providedBuffer = Buffer.from(provided); if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) { json(response, 401, { ok: false, error: "Invalid access key" }); return; } response.statusCode = 204; response.setHeader("set-cookie", `silku_hq_session=${encodeURIComponent(sessionToken())}; HttpOnly; Secure; SameSite=Strict; Path=/`); response.end(); return; }
  if (method === "GET" && pathname === "/dashboard") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, dashboardHtml()); return; }
  if (method === "GET" && pathname === "/social") { if (!authorized(request)) { response.statusCode = 302; response.setHeader("location", "/"); response.end(); return; } html(response, 200, socialCenterHtml()); return; }
  if (!pathname.startsWith("/v1/") || !requireAuth(request, response)) return;
  if (method === "GET" && pathname === "/v1/social/dashboard") { json(response, 200, social.dashboard()); return; }
  if (method === "GET" && pathname === "/v1/marketing/dashboard") {
    const [commerce, website, websiteActions] = await Promise.all([fetchCommerceIntelligence(), fetchWebsiteChangeIntelligence(7), buildWebsiteActionRecommendations()]);
    if (!commerce.ok) { json(response, 503, { ok: false, dataSource: "unavailable", error: commerce.error, message: "Marketing HQ is not showing placeholder commerce numbers." }); return; }
    const data = commerce.data;
    const capturedAt = new Date().toISOString();
    const websiteSignals = website.ok ? website.data.signals : [];
    const strongestWebsiteSignal = [...websiteSignals].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
    const evidence = [
      { source: "Silku commerce backend", capturedAt, confidence: 1, evidence: `Live commerce window: ${data.windowDays} days`, lastVerifiedAt: capturedAt },
      { source: "Silku inventory", capturedAt, confidence: 1, evidence: `Low/out-of-stock variants: ${data.lowStockCount}`, lastVerifiedAt: capturedAt },
      ...(strongestWebsiteSignal ? [{ source: "Silku website intelligence", capturedAt, confidence: 1, evidence: `${strongestWebsiteSignal.metric}: ${strongestWebsiteSignal.direction} ${Math.abs(strongestWebsiteSignal.changePercent)}% vs previous window`, lastVerifiedAt: capturedAt }] : []),
      ...(websiteActions[0] ? [{ source: "Silku website action radar", capturedAt, confidence: websiteActions[0].priority === "high" ? 0.9 : 0.7, evidence: `${websiteActions[0].action}: ${websiteActions[0].reason}`, lastVerifiedAt: capturedAt }] : []),
    ];
    const websiteOpportunities = websiteActions.map((item) => ({ action: item.action, reason: item.reason, priority: item.priority, score: item.priority === "high" ? 90 : item.priority === "medium" ? 70 : 40 }));
    const snapshot = marketing.evaluate({ revenueTrend: data.revenueTrend, topProducts: data.topProducts.map((product) => product.productName), risingCategories: data.risingCategories, creatorOpportunities: 0, b2bOpportunities: 0, learningScore: 0.5, availableBudget: 0, analytics: { revenue: data.revenue, orders: data.orders, conversions: data.orders }, inventoryRiskProducts: data.inventoryRiskProducts.map((product) => product.name), websiteOpportunities, evidence }).data!;
    json(response, 200, { ok: true, dataSource: "live", commerce: data, websiteIntelligence: website.ok ? website.data : { available: false, error: website.error }, websiteActions, data: dashboard.build(snapshot, marketing.approvals().data ?? [], marketing.audit().data ?? []) });
    return;
  }
  if (method === "POST" && pathname === "/v1/persistence/website-intelligence-e2e") { try { const result = await runWebsiteIntelligenceE2e(); json(response, result.ok ? 200 : 500, result); } catch (error) { json(response, 500, { ok: false, test: "website-intelligence-e2e", error: error instanceof Error ? error.message : "Website intelligence E2E failed", cleanedUp: true }); } return; }
  if (method === "GET" && pathname === "/v1/persistence/domain") { json(response, 200, { ok: true, durable: Boolean(persistence), data: domainStore.summary() }); return; }
  if (method === "POST" && pathname === "/v1/persistence/restart-recovery") { if (!persistence) { json(response, 503, { ok: false, error: "Persistence is not configured" }); return; } try { json(response, 200, await verifyRestartRecovery(persistence)); } catch (error) { json(response, 500, { ok: false, test: "restart-recovery", error: error instanceof Error ? error.message : "Restart recovery failed", cleanedUp: true }); } return; }
  if (method === "POST" && pathname === "/v1/control-plane/prepare") { const body = await readJson(request); if (!body?.decision) { json(response, 400, { ok: false, error: "decision is required" }); return; } const result = await marketing.prepareDirectorActionDurable(body.decision); return json(response, result.ok ? 200 : 400, result); }
  if (method === "POST" && pathname === "/v1/control-plane/check") { const body = await readJson(request); if (!body?.action) { json(response, 400, { ok: false, error: "action is required" }); return; } const result = marketing.executionBoundary(body.action, body.approvalRequestId); json(response, result.ok ? 200 : 403, result); return; }
  const domainMatch = pathname.match(/^\/v1\/domain\/([^/]+)(?:\/([^/]+))?(?:\/status)?$/);
  if (domainMatch && domainKinds.has(domainMatch[1] as DomainKind)) { const kind = domainMatch[1] as DomainKind; const id = domainMatch[2]; if (method === "GET" && !id) { json(response, 200, domainApi.list(kind)); return; } if (method === "GET" && id) { const result = domainApi.get(kind, id); json(response, result.ok ? 200 : 404, result); return; } if (method === "POST" && !id) { const result = await domainApi.create(kind, await readJson(request)); json(response, result.ok ? 201 : 400, result); return; } if (method === "PATCH" && kind === "content" && id && !pathname.endsWith("/status")) { const result = await domainApi.editContent(id, await readJson(request)); json(response, result.ok ? 200 : 400, result); return; } if (method === "POST" && id && pathname.endsWith("/status")) { const body = await readJson(request); if (typeof body.status !== "string") { json(response, 400, { ok: false, error: "status is required" }); return; } const result = await domainApi.updateStatus(kind, id, body.status, typeof body.errorMessage === "string" ? body.errorMessage : undefined); json(response, result.ok ? 200 : 404, result); return; } }
  if (method === "GET" && pathname === "/v1/approvals") { json(response, 200, marketing.approvals()); return; }
  if (method === "GET" && pathname === "/v1/audit") { json(response, 200, marketing.audit()); return; }
  if (method === "GET" && pathname === "/v1/monitoring/status") { json(response, 200, monitor.status()); return; }
  if (method === "GET" && pathname.startsWith("/v1/field-force/")) { json(response, 200, fieldForce.handle(method, pathname, {})); return; }
  if (method === "POST" && pathname === "/v1/evaluate") { json(response, 200, marketing.evaluate(await readJson(request))); return; }
  if (method === "POST" && pathname === "/v1/persistence/e2e") { if (!persistence) { json(response, 503, { ok: false, error: "Persistence is not configured" }); return; } const id = randomUUID(); const target = `e2e:${id}`; try { const testSecurity = new MarketingSecurityLayer(persistence); const testMarketing = new MarketingControlApi(undefined, testSecurity); const requested = await testMarketing.requestApprovalDurable({ action: "launch_ads", actor: "e2e", target, reason: "Protected persistence round-trip test" }); if (!requested.ok || !requested.data) throw new Error(requested.error ?? "E2E approval request failed"); const durableRequestId = requested.data.requestId; const approved = await testMarketing.decideApprovalDurable(durableRequestId, "approved", "e2e"); if (!approved.ok || !approved.data || approved.data.decision !== "approved") throw new Error(approved.error ?? "E2E approval decision failed"); const recoveredSecurity = new MarketingSecurityLayer(persistence); await recoveredSecurity.hydrate(); const recovered = recoveredSecurity.listApprovals().find((item) => item.requestId === durableRequestId); const recoveredAudit = recoveredSecurity.listAudit().filter((item) => item.target === target); if (!recovered || recovered.decision !== "approved") throw new Error("Fresh hydration did not recover approved request"); if (recoveredAudit.length < 2) throw new Error("Fresh hydration did not recover approval audit events"); if (!recoveredSecurity.canExecute("launch_ads", durableRequestId)) throw new Error("Recovered approved action is not executable"); await persistence.cleanupE2E(target); return json(response, 200, { ok: true, test: "persistence-e2e", verified: { durableRequest: true, durableDecision: true, auditEvents: recoveredAudit.length, freshHydration: true, executionBoundary: true }, cleanedUp: true }); } catch (error) { try { await persistence.cleanupE2E(target); } catch (cleanupError) { console.error("[marketing-persistence] E2E cleanup failed", cleanupError); } json(response, 500, { ok: false, test: "persistence-e2e", error: error instanceof Error ? error.message : "Persistence E2E failed", cleanedUp: false }); } return; }
  if (method === "POST" && pathname === "/v1/approvals") { json(response, 201, await marketing.requestApprovalDurable(await readJson(request))); return; }
  const approvalMatch = pathname.match(/^\/v1\/approvals\/([^/]+)\/(approve|reject)$/); if (method === "POST" && approvalMatch) { const body = await readJson(request); const result = approvalMatch[2] === "approve" ? await marketing.decideApprovalDurable(approvalMatch[1], "approved", body.actor ?? "marketing-hq") : await marketing.decideApprovalDurable(approvalMatch[1], "rejected", body.actor ?? "marketing-hq"); json(response, result.ok ? 200 : 404, result); return; }
  json(response, 404, { ok: false, error: "Not found" });
});

server.listen(port, hostname, () => {
  console.log(`Silku Marketing HQ listening on ${hostname}:${port}`);
  Promise.all([security.hydrate(), domainStore.hydrate(), creators.hydrate()]).catch((error) => { console.error("[marketing-persistence] startup hydration failed", error); process.exitCode = 1; });
  if (durableWorker) {
    const intervalMs = Number(process.env.MARKETING_WORKER_INTERVAL_MS ?? 15000);
    const runWorker = async () => { try { const result = await durableWorker.runOnce(); if (result.processed) console.log(`[durable-worker] ${result.jobId}: ${result.status}`); } catch (error) { console.error("[durable-worker] tick failed", error); } };
    void runWorker();
    const timer = setInterval(() => void runWorker(), intervalMs);
    timer.unref();
  }
});
