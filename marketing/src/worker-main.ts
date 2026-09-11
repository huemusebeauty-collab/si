import { DurableMarketingWorker } from "./durable-worker";
import { NeonMarketingPersistence } from "./marketing-persistence";

const databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("MARKETING_HQ_DATABASE_URL or DATABASE_URL is required for the durable worker");

const persistence = new NeonMarketingPersistence();
const worker = new DurableMarketingWorker(persistence, persistence);

// Module-specific handlers are registered by later infrastructure/features.
// Unknown job types remain queued rather than being failed by the infrastructure worker.
worker.register("maintenance", async () => ({ worker: "silku-marketing-worker", completedAt: new Date().toISOString() }));

const intervalMs = Number(process.env.MARKETING_WORKER_INTERVAL_MS ?? 15000);
let stopping = false;

const tick = async () => {
  if (stopping) return;
  try {
    const result = await worker.runOnce();
    if (result.processed) console.log(`[worker] ${result.jobId}: ${result.status}`);
  } catch (error) {
    console.error("[worker] tick failed", error);
  }
};

const stop = () => { stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

console.log(`Silku durable worker started; interval=${intervalMs}ms`);
void tick();
const timer = setInterval(() => void tick(), intervalMs);
timer.unref();
