import assert from "node:assert/strict";
import { CreatorCollaborationEngine, type CreatorProfile } from "../src/creator-collaboration";
import type { CreatorPersistence } from "../src/creator-persistence";

class MemoryCreatorPersistence implements CreatorPersistence {
  creators: CreatorProfile[] = [];
  kits: any[] = [];
  async loadCreators() { return this.creators; }
  async saveCreator(c: CreatorProfile) { this.creators = this.creators.filter((x) => x.creatorId !== c.creatorId).concat(c); }
  async loadSampleKits() { return this.kits; }
  async saveSampleKit(k: any) { this.kits = this.kits.filter((x) => x.kitId !== k.kitId).concat(k); }
}

const persistence = new MemoryCreatorPersistence();
const engine = new CreatorCollaborationEngine(persistence);
const creator: CreatorProfile = { creatorId: "creator-b6-e2e", displayName: "B6 Creator", handle: "@b6creator", platform: "instagram", beautyFocus: ["lipstick", "skincare"], followers: 100000, averageViews: 20000, engagementRate: 4, audienceFitScore: 90, authenticityScore: 85, conversionScore: 80, status: "prospect", productsSent: [], publishedContentIds: [] };
const saved = engine.addCreator(creator);
assert.ok((saved.creatorScore ?? 0) > 0);
const kit = engine.createSampleKit(creator.creatorId, ["prod-1", "prod-2"]);
assert.equal(persistence.creators.length, 1);
assert.equal(persistence.kits.length, 1);
const recovered = new CreatorCollaborationEngine(persistence);
await recovered.hydrate();
assert.equal(recovered.getCreator(creator.creatorId)?.displayName, "B6 Creator");
assert.deepEqual(recovered.listSampleKits()[0]?.productIds, ["prod-1", "prod-2"]);
recovered.updateStatus(creator.creatorId, "approved");
recovered.approveSampleKit(kit.kitId);
await recovered.flushPersistence();
const restarted = new CreatorCollaborationEngine(persistence);
await restarted.hydrate();
assert.equal(restarted.getCreator(creator.creatorId)?.status, "approved");
assert.equal(restarted.listSampleKits()[0]?.shipmentStatus, "approved");
console.log("PASS", { creator: creator.creatorId, status: restarted.getCreator(creator.creatorId)?.status, kits: restarted.listSampleKits().length });
