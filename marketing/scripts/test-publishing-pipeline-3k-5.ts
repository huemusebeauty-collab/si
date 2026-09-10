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

  const base = await lifecycle.createContent({ contentId: "test-3k-5", format: "post", hook: "hook", body: "body", callToAction: "shop", status: "draft", requiresApproval: true });
  const version = await versions.create({ versionId: "v1", contentId: base.contentId, versionNumber: 1, format: base.format, hook: base.hook, body: base.body, callToAction: base.callToAction, createdAt: new Date().toISOString() });

  let current = await service.transition(base, "qa_passed", "test", version.versionId);
  current = await service.transition(current, "approved", "test", version.versionId);
  current = await service.schedule(current, "test", version.versionId);
  current = await service.publish(current, "test", version.versionId);
  if (current.status !== "published") throw new Error("Publish failed");

  try { await service.transition({ ...base, status: "draft" }, "approved", "test", version.versionId); throw new Error("Invalid transition accepted: draft -> approved"); }
  catch (error) { if (!(error instanceof Error) || !error.message.includes("Invalid content transition")) throw error; }

  try { await service.transition({ ...base, status: "approved" }, "published", "test", version.versionId); throw new Error("Invalid transition accepted: approved -> published"); }
  catch (error) {
    if (!(error instanceof Error) || !["Invalid content transition", "Only scheduled content can be published"].some((message) => error.message.includes(message))) throw error;
  }

  try { await service.publish({ ...current, status: "scheduled" }, "test", "v2"); throw new Error("Version mismatch accepted"); }
  catch (error) { if (!(error instanceof Error) || error.message !== "Publishing version mismatch") throw error; }

  try { await service.transition(current, "draft", "test", version.versionId); throw new Error("Published content mutation accepted"); }
  catch (error) { if (!(error instanceof Error) || !error.message.includes("Published content is immutable")) throw error; }

  const entries = await audit.list(base.contentId);
  if (entries.length !== 4) throw new Error(`Expected 4 audit entries, got ${entries.length}`);
  console.log(JSON.stringify({ ok: true, test: "publishing-pipeline-3k-5", auditEntries: entries.length }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
