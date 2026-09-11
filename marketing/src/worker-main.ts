import { DurableMarketingWorker } from "./durable-worker";
import { NeonMarketingPersistence } from "./marketing-persistence";

const databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("MARKETING_HQ_DATABASE_URL or DATABASE_URL is required for the durable worker");

const persistence = new NeonMarketingPersistence();
const worker = new DurableMarketingWorker(persistence, persistence);

worker.register("maintenance", async () => ({
  worker: "silku-marketing-worker",
  completedAt: new Date().toISOString(),
}));

void (async () => {
  try {
    const result = await worker.runOnce();
    if (result.processed) console.log(`[worker] ${result.jobId}: ${result.status}`);
    else console.log("[worker] no due job");
    process.exitCode = 0;
  } catch (error) {
    console.error("[worker] run failed", error);
    process.exitCode = 1;
  }
})();
