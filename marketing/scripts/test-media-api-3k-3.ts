import assert from "node:assert/strict";
import { MediaApi, type MediaAsset } from "../src/media-api";
import { createMediaStorageAdapter, MemoryMediaStorageAdapter } from "../src/media-storage";
import type { MediaRepository } from "../src/media-repository";
import { MemoryContentVersionRepository } from "../src/content-versioning";

class FakeMediaRepository implements MediaRepository {
  private readonly assets = new Map<string, MediaAsset>();
  async hydrate() {}
  async save(asset: MediaAsset) { this.assets.set(asset.mediaId, asset); }
  get(id: string) { return this.assets.get(id); }
  list() { return [...this.assets.values()]; }
}

async function run() {
  const previousMode = process.env.MEDIA_STORAGE_MODE;
  delete process.env.MEDIA_STORAGE_MODE;
  const safeAdapter = createMediaStorageAdapter();
  await assert.rejects(() => safeAdapter.put("unsafe/key", Buffer.from("x"), "text/plain"), /Durable media object storage is not configured/);
  if (previousMode !== undefined) process.env.MEDIA_STORAGE_MODE = previousMode;

  const repository = new FakeMediaRepository();
  const storage = new MemoryMediaStorageAdapter();
  const versions = new MemoryContentVersionRepository();
  await versions.create({ versionId: "version_media_test", contentId: "content_media_test", versionNumber: 1, format: "post", title: "Version", hook: "Hook", body: "Body", callToAction: "Shop", createdAt: new Date().toISOString() });
  const api = new MediaApi(repository, storage, versions);
  const uploaded = await api.upload({ mediaId: "media_api_test", kind: "image", originalName: "hero.jpg", mimeType: "image/jpeg", dataBase64: Buffer.from("silku-media-test").toString("base64"), metadata: { source: "3k-3-test" } });
  assert.equal(uploaded.ok, true);
  assert.equal(uploaded.data?.byteSize, 16);
  assert.equal(repository.get("media_api_test")?.status, "active");
  const versioned = await api.upload({ mediaId: "media_version_link_test", contentId: "content_media_test", versionId: "version_media_test", kind: "image", originalName: "version.jpg", mimeType: "image/jpeg", dataBase64: Buffer.from("versioned-media").toString("base64") });
  assert.equal(versioned.ok, true);
  const mismatch = await api.upload({ contentId: "wrong_content", versionId: "version_media_test", kind: "image", originalName: "bad.jpg", mimeType: "image/jpeg", dataBase64: Buffer.from("bad").toString("base64") });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error ?? "", /contentId does not match/);
  const preview = await api.preview("media_api_test");
  assert.equal(preview.ok, true);
  assert.equal(Buffer.from(preview.data?.dataBase64 ?? "", "base64").toString(), "silku-media-test");
  const listed = api.list();
  assert.equal(listed.data?.length, 2);
  const archived = await api.archive("media_api_test");
  assert.equal(archived.ok, true);
  assert.equal(archived.data?.status, "archived");
  const invalid = await api.upload({ originalName: "bad.jpg", mimeType: "image/jpeg", kind: "image", dataBase64: "" });
  assert.equal(invalid.ok, false);
  console.log("3K-3 media API test passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
