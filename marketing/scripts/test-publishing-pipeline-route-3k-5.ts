import { MarketingLifecycleService } from "../src/marketing-lifecycle";
import { MarketingDomainStore } from "../src/marketing-domain-store";
import { MemoryContentVersionRepository } from "../src/content-versioning";
import { MemoryPublishingAuditRepository } from "../src/publishing-audit";
import { PublishingPipelineService } from "../src/publishing-pipeline";

async function main() {
  const store = new MarketingDomainStore();
  const lifecycle = new MarketingLifecycleService(store);
  const versions = new MemoryContentVersionRepository();
  const audit = new MemoryPublishingAuditRepository();
  const service = new PublishingPipelineService(lifecycle, versions, audit);
  const content = await lifecycle.createContent({ contentId: "route-test", format: "post", hook: "h", body: "b", callToAction: "c", status: "scheduled", requiresApproval: true });
  await versions.create({ versionId: "v1", contentId: content.contentId, versionNumber: 1, format: content.format, hook: content.hook, body: content.body, callToAction: content.callToAction, createdAt: new Date().toISOString() });
  try { await service.publish(content, "test", "v2"); throw new Error("route guard accepted stale version"); }
  catch (error) { if (!(error instanceof Error) || error.message !== "Publishing version mismatch") throw error; }
  try { await service.publish(content, "", "v1"); throw new Error("route guard accepted missing actor"); }
  catch (error) { if (!(error instanceof Error) || error.message !== "actor is required") throw error; }
  console.log(JSON.stringify({ ok: true, test: "publishing-pipeline-route-3k-5" }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
