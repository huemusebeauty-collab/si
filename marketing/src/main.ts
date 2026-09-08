import { createServer } from "node:http";

const startedAt = new Date().toISOString();
const port = Number(process.env.PORT ?? 10000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const server = createServer((request, response) => {
  if (request.url === "/health" || request.url === "/v1/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "silku-marketing-hq",
        status: "healthy",
        startedAt,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false, error: "Not Found" }));
});

server.listen(port, hostname, () => {
  console.log(`Silku Marketing HQ listening on ${hostname}:${port}`);
});
