import assert from "node:assert/strict";
import { SocialCenter } from "../src/social-center";

const social = new SocialCenter();
const account = social.connectAccount({ accountId: "test-ig", platform: "instagram", displayName: "SILKU Test", scopes: ["instagram_basic"] });
assert.equal(account.status, "connected");
assert.equal(social.health("test-ig").healthy, true);
const content = { contentId: "content_test", format: "reel", hook: "Test hook", body: "Test body", callToAction: "Shop now", status: "draft", requiresApproval: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any;
const queued = social.schedule({ content, platform: "instagram", format: "reel" });
assert.equal(queued.status, "pending_approval");
assert.equal(social.dashboard().counts.pendingApproval, 1);
let blocked = false;
try { social.setStatus(queued.postId, "published"); } catch { blocked = true; }
assert.equal(blocked, true);
console.log("social-center: ok");
