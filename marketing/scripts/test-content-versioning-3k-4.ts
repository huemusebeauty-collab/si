import assert from "node:assert/strict";
import { ContentVersioningService, MemoryContentVersionRepository } from "../src/content-versioning";
import type { MarketingContent } from "../src/contracts";

async function run() {
  const repo = new MemoryContentVersionRepository();
  const service = new ContentVersioningService(repo);
  const content: MarketingContent = {
    contentId: "content_version_test", format: "post", title: "Version one", hook: "Hook", body: "Body", callToAction: "Shop now",
    status: "draft", requiresApproval: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const first = await service.createFromContent(content, "initial snapshot", "test");
  const second = await service.createFromContent({ ...content, title: "Version two", body: "Updated body" }, "copy update", "test");
  assert.equal(first.versionNumber, 1);
  assert.equal(second.versionNumber, 2);
  assert.deepEqual(service.list(content.contentId).map((v) => v.versionNumber), [2, 1]);
  assert.equal(service.get(first.versionId)?.title, "Version one");
  const media = { mediaId: "media_version_test", contentId: content.contentId, versionId: second.versionId } as any;
  assert.equal(service.validateMediaLink(second, media), true);
  assert.throws(() => service.validateMediaLink(first, media), /versionId does not match/);
  console.log("3K-4 content versioning tests passed");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
