import { PublishingPipelineService } from "../src/publishing-pipeline";

const service = new PublishingPipelineService();
const content = { contentId: "route-test", versionId: "v1", status: "scheduled" as const, scheduledAt: "2030-01-01T10:00:00.000Z" };
service.assertPublishable(content, "v1");
try { service.assertPublishable(content, "v2"); throw new Error("route guard accepted stale version"); } catch (error) {
  if (!(error instanceof Error) || error.message !== "Publishing version mismatch") throw error;
}
console.log(JSON.stringify({ ok: true, test: "publishing-pipeline-route-3k-5" }));
