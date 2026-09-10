import { PublishingPipelineService } from "../src/publishing-pipeline";

const service = new PublishingPipelineService();
let content = { contentId: "verify-3k-5", versionId: "v1", status: "idea" as const, scheduledAt: "2030-01-01T10:00:00.000Z" };
for (const status of ["draft", "qa_passed", "approved", "scheduled"] as const) content = service.transition(content, status, "verify");
service.assertPublishable(content, "v1");
content = service.transition(content, "published", "verify");
if (content.status !== "published") throw new Error("3K-5 verification failed");
console.log(JSON.stringify({ ok: true, test: "3k-5-publishing-pipeline", status: content.status, auditEntries: service.getAudit(content.contentId).length }));
