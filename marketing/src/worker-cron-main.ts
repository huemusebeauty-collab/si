import { NeonMarketingPersistence } from "./marketing-persistence";
import { DurableMarketingWorker } from "./durable-worker";

async function main(): Promise<void> {
  const databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("MARKETING_HQ_DATABASE_URL or DATABASE_URL is required");
  }

  const persistence = new NeonMarketingPersistence(databaseUrl);
  const worker = new DurableMarketingWorker(persistence, persistence, {
    stallAfterMs: Number(process.env.MARKETING_WORKER_STALL_AFTER_MS ?? 15 * 60 * 1000),
  });

  worker.register("maintenance", async () => ({ ok: true, type: "maintenance" }));

  try {
    await worker.runOnce();
  } finally {
    await persistence.close();
  }
}

main().catch((error) => {
  console.error("Silku Marketing durable worker failed", error);
  process.exitCode = 1;
});
