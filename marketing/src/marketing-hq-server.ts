import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { MarketingControlApi } from "./marketing-control-api";

export class MarketingHqServer {
  private readonly api = new MarketingControlApi();

  private async readJson(req: IncomingMessage): Promise<unknown> {
    let body = "";
    for await (const chunk of req) body += chunk.toString();
    return body ? JSON.parse(body) : {};
  }

  private send(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/health") return this.send(res, 200, this.api.health());
      if (req.method === "GET" && url.pathname === "/v1/approvals") return this.send(res, 200, this.api.approvals());
      if (req.method === "GET" && url.pathname === "/v1/audit") return this.send(res, 200, this.api.audit());

      if (req.method === "POST" && url.pathname === "/v1/approvals") {
        const body = await this.readJson(req) as { action: any; actor: string; reason: string; target?: string };
        return this.send(res, 200, this.api.requestApproval(body.action, body.actor, body.reason, body.target));
      }

      const approvalMatch = url.pathname.match(/^\/v1\/approvals\/([^/]+)\/(approve|reject)$/);
      if (req.method === "POST" && approvalMatch) {
        const body = await this.readJson(req) as { actor: string };
        return this.send(res, 200, this.api.decideApproval(approvalMatch[1], approvalMatch[2] === "approve" ? "approved" : "rejected", body.actor));
      }

      if (req.method === "POST" && url.pathname === "/v1/evaluate") {
        const body = await this.readJson(req);
        return this.send(res, 200, this.api.evaluate(body as any));
      }

      return this.send(res, 404, { ok: false, error: "route not found", generatedAt: new Date().toISOString() });
    } catch (error) {
      return this.send(res, 400, { ok: false, error: error instanceof Error ? error.message : "request failed", generatedAt: new Date().toISOString() });
    }
  }

  listen(port = Number(process.env.PORT ?? 4100), host = process.env.HOSTNAME ?? "0.0.0.0") {
    const server = createServer((req, res) => void this.handle(req, res));
    return server.listen(port, host);
  }
}
