import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { FieldForceApi, type CheckInRequest, type RegisterDeviceRequest } from "./field-force-api";
import { MarketingMonitor } from "./monitoring";

const startedAt = new Date().toISOString();
const port = Number(process.env.PORT ?? 10000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const fieldForce = new FieldForceApi();
const monitor = new MarketingMonitor();

function json(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
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
      json(response, 200, {
        ok: true,
        deviceId: trackingMatch[1],
        allowed: fieldForce.canTrackLocation(trackingMatch[1]),
      });
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
