import { DurableMarketingWorker } from "./durable-worker";
import { NeonMarketingPersistence } from "./marketing-persistence";

const databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("MARKETING_HQ_DATABASE_URL or DATABASE_URL is required for the durable worker");

const persistence = new NeonMarketingPersistence();
const worker = new DurableMarketingWorker(persistence, persistence);

worker.register("maintenance", async () => ({ worker: "silku-marketing-worker", completedAt: new Date().toISOString() }));

void (async () => {
  const result = await worker.runOnce();
  console.log(`[worker] processed=${result.processed} jobId=${result.jobId ?? "none"} status=${result.status ?? "idle"}`);
})().catch((error) => {
  console.error("[worker] fatal", error);
  process.exitCode = 1;
});
