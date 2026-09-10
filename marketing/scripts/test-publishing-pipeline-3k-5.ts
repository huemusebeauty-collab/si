import { PublishingPipelineService, PublishingContent } from "../src/publishing-pipeline";

const service = new PublishingPipelineService();
const base: PublishingContent = { contentId: "test-3k-5", versionId: "v1", status: "draft", scheduledAt: "2030-01-01T10:00:00.000Z" };

const qa = service.transition(base, "qa_passed", "test");
if (qa.status !== "qa_passed") throw new Error("QA transition failed");
const approved = service.transition(qa, "approved", "test");
const scheduled = service.transition(approved, "scheduled", "test");
service.assertPublishable(scheduled, "v1");
const published = service.transition(scheduled, "published", "test", "2030-01-01T10:00:00.000Z");
if (published.status !== "published" || !published.publishedAt) throw new Error("Publish failed");

for (const [from, to] of [["draft", "approved"], ["approved", "published"], ["published", "draft"]] as const) {
  try {
    service.transition({ ...base, status: from }, to, "test");
    throw new Error(`Invalid transition accepted: ${from} -> ${to}`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Invalid publishing transition") && !error.message.includes("Published content is immutable")) throw error;
  }
}

try { service.assertPublishable(scheduled, "v2"); throw new Error("Version mismatch accepted"); } catch (error) {
  if (!(error instanceof Error) || error.message !== "Publishing version mismatch") throw error;
}

const audit = service.getAudit("test-3k-5");
if (audit.length !== 4) throw new Error(`Expected 4 audit entries, got ${audit.length}`);

console.log(JSON.stringify({ ok: true, test: "publishing-pipeline-3k-5", auditEntries: audit.length }));
