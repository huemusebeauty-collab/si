import { MarketingHqServer } from "./marketing-hq-server";

const port = Number(process.env.PORT ?? 10000);
const host = process.env.HOSTNAME ?? "0.0.0.0";

new MarketingHqServer().listen(port, host);
console.log(`Silku Marketing HQ listening on ${host}:${port}`);
