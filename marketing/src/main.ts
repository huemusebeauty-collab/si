import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { FieldForceApi, type CheckInRequest, type RegisterDeviceRequest } from "./field-force-api";
import { MarketingMonitor } from "./monitoring";
import { MarketingControlApi } from "./marketing-control-api";
import { MarketingHqDashboard } from "./marketing-hq-dashboard";
import { dashboardHtml, loginHtml } from "./dashboard-ui";

const startedAt = new Date().toISOString();
const port = Number(process.env.PORT ?? 10000);
const hostname = "0.0.0.0";
const fieldForce = new FieldForceApi();
const monitor = new MarketingMonitor();
const marketing = new MarketingControlApi();
const dashboard = new MarketingHqDashboard();
const sessionToken = randomBytes(32).toString("hex");

function json(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function authorized(request: IncomingMessage): boolean {
  const cookie = request.headers.cookie ?? "";
  return cookie.split(";").some((item) => {
    const [key, value] = item.trim().split("=");
    if (key !== "silku_hq_session" || !value) return false;
    const a = Buffer.from(value);
    const b = Buffer.from(sessionToken);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

function requireAuth(request: IncomingMessage, response: ServerResponse): boolean {
  if (authorized(request)) return true;
  json(response, 401, { ok: false, error: "Marketing HQ authentication required" });
  return false;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  try {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (method === "GET" && (url.pathname === "/health" || url.pathname === "/v1/health")) {
      json(response, 200, {
        ok: true,
        service: "silku-marketing-hq",
        status: "healthy",
        startedAt,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(authorized(request) ? dashboardHtml() : loginHtml());
      return;
    }

    if (method === "POST" && url.pathname === "/v1/hq/login") {
      const configuredKey = process.env.MARKETING_HQ_ACCESS_KEY ?? process.env.MARKETING_HQ_ADMIN_TOKEN;
      const body = (await readJson(request)) as { key?: string };
      if (!configuredKey || !body.key) {
        json(response, 503, { ok: false, error: "HQ access is not configured" });
        return;
      }
      const a = Buffer.from(body.key);
      const b = Buffer.from(configuredKey);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        json(response, 401, { ok: false, error: "Invalid HQ access key" });
        return;
      }
      response.writeHead(200, { "content-type": "application/json", "set-cookie": `silku_hq_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`, "cache-control": "no-store" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (method === "GET" && url.pathname === "/dashboard") {
      if (!authorized(request)) {
        response.writeHead(302, { location: "/" });
        response.end();
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(dashboardHtml());
      return;
    }

    if (url.pathname.startsWith("/v1/") && !requireAuth(request, response)) return;

    if (method === "GET" && url.pathname === "/v1/marketing/health") {
      json(response, 200, marketing.health());
      return;
    }

    if (method === "GET" && url.pathname === "/v1/marketing/dashboard") {
      const snapshot = marketing.evaluate({
        revenueTrend: "flat",
        topProducts: ["Strongest product"],
        risingCategories: [],
        creatorOpportunities: 0,
        b2bOpportunities: 0,
        learningScore: 0.5,
        availableBudget: 0,
        analytics: { revenue: 0, orders: 0, conversions: 0 },
      }).data!;
      json(response, 200, { ok: true, data: dashboard.build(snapshot, marketing.approvals().data ?? [], marketing.audit().data ?? []) });
      return;
    }

    if (method === "POST" && url.pathname === "/v1/marketing/evaluate") {
      json(response, 200, marketing.evaluate((await readJson(request)) as any));
      return;
    }

    if (method === "GET" && url.pathname === "/v1/marketing/approvals") {
      json(response, 200, marketing.approvals());
      return;
    }

    if (method === "POST" && url.pathname === "/v1/marketing/approvals") {
      const body = (await readJson(request)) as { action: any; actor?: string; reason?: string; target?: string };
      if (!body.action || !body.actor || !body.reason) {
        json(response, 400, { ok: false, error: "action, actor and reason are required" });
        return;
      }
      json(response, 201, marketing.requestApproval(body.action, body.actor, body.reason, body.target));
      return;
    }

    const approvalMatch = url.pathname.match(/^\/v1\/marketing\/approvals\/([^/]+)\/(approve|reject)$/);
    if (method === "POST" && approvalMatch) {
      const body = (await readJson(request)) as { actor?: string };
      if (!body.actor) {
        json(response, 400, { ok: false, error: "actor is required" });
        return;
      }
      json(response, 200, marketing.decideApproval(decodeURIComponent(approvalMatch[1]), approvalMatch[2] === "approve" ? "approved" : "rejected", body.actor));
      return;
    }

    if (method === "GET" && url.pathname === "/v1/marketing/audit") {
      json(response, 200, marketing.audit());
      return;
    }

    if (method === "GET" && url.pathname === "/v1/monitoring/status") {
      json(response, 200, { ok: true, ...monitor.inspect() });
      return;
    }

    if (method === "POST" && url.pathname === "/v1/monitoring/jobs") {
      const body = (await readJson(request)) as { jobKey?: string; expectedStartAt?: string; maxRetries?: number };
      if (!body.jobKey) {
        json(response, 400, { ok: false, error: "jobKey is required" });
        return;
      }
      json(response, 201, { ok: true, job: monitor.register(body.jobKey, body.expectedStartAt, body.maxRetries) });
      return;
    }

    const jobActionMatch = url.pathname.match(/^\/v1\/monitoring\/jobs\/([^/]+)\/(running|succeeded|failed)$/);
    if (method === "POST" && jobActionMatch) {
      const jobKey = decodeURIComponent(jobActionMatch[1]);
      const action = jobActionMatch[2];
      let job;
      if (action === "running") job = monitor.markRunning(jobKey);
      else if (action === "succeeded") job = monitor.markSucceeded(jobKey);
      else {
        const body = (await readJson(request)) as { errorCode?: string; errorMessage?: string };
        job = monitor.markFailed(jobKey, body.errorCode ?? "JOB_FAILED", body.errorMessage ?? "Marketing job failed");
      }
      if (!job) {
        json(response, 404, { ok: false, error: "Job not found" });
        return;
      }
      json(response, 200, { ok: true, job });
      return;
    }

    if (method === "POST" && url.pathname === "/v1/field-force/devices") {
      const body = (await readJson(request)) as RegisterDeviceRequest;
      if (!body.employee?.employeeId || !body.deviceId) {
        json(response, 400, { ok: false, error: "employee and deviceId are required" });
        return;
      }
      json(response, 201, { ok: true, registration: fieldForce.registerDevice(body) });
      return;
    }

    const permissionMatch = url.pathname.match(/^\/v1\/field-force\/devices\/([^/]+)\/permissions$/);
    if (method === "GET" && permissionMatch) {
      json(response, 200, { ok: true, permissions: fieldForce.getPermissionStatus(permissionMatch[1]) });
      return;
    }

    const trackingMatch = url.pathname.match(/^\/v1\/field-force\/devices\/([^/]+)\/location-tracking$/);
    if (method === "GET" && trackingMatch) {
      json(response, 200, { ok: true, deviceId: trackingMatch[1], allowed: fieldForce.canTrackLocation(trackingMatch[1]) });
      return;
    }

    if (method === "POST" && url.pathname === "/v1/field-force/visits/check-in") {
      const body = (await readJson(request)) as CheckInRequest;
      if (!body.employeeId || !body.clientId) {
        json(response, 400, { ok: false, error: "employeeId and clientId are required" });
        return;
      }
      json(response, 201, { ok: true, visit: fieldForce.checkIn(body) });
      return;
    }

    if (method === "POST" && url.pathname === "/v1/field-force/visits/check-out") {
      const body = (await readJson(request)) as { employeeId?: string; clientId?: string };
      if (!body.employeeId || !body.clientId) {
        json(response, 400, { ok: false, error: "employeeId and clientId are required" });
        return;
      }
      const visit = fieldForce.checkOut(body.employeeId, body.clientId);
      if (!visit) {
        json(response, 404, { ok: false, error: "Active visit not found" });
        return;
      }
      json(response, 200, { ok: true, visit });
      return;
    }

    json(response, 404, { ok: false, error: "Not Found" });
  } catch (error) {
    console.error("Marketing HQ request failed", error);
    json(response, 400, { ok: false, error: "Invalid request" });
  }
});

setInterval(() => monitor.inspect(), 60_000).unref();

server.listen(port, hostname, () => {
  console.log(`Silku Marketing HQ listening on ${hostname}:${port}`);
});