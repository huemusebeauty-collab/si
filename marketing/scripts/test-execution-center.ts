import assert from "node:assert/strict";
import { MarketingExecutionCenter } from "../src/execution-center";
import { MarketingSecurityLayer } from "../src/marketing-security";

const security = new MarketingSecurityLayer();
const execution = new MarketingExecutionCenter(security);

const pending = security.requestApproval({
  requestId: "test_launch_ads",
  action: "launch_ads",
  actor: "marketing-hq",
  reason: "Test approval boundary",
});
assert.equal(pending.decision, "pending");
assert.equal(execution.pendingApprovals().length, 1);
assert.equal(execution.check("launch_ads", pending.requestId).executable, false);

security.decideApproval(pending.requestId, "approved", "test-user");
assert.equal(execution.check("launch_ads", pending.requestId).executable, true);
assert.equal(execution.pendingApprovals().length, 0);

const rejected = security.requestApproval({
  requestId: "test_b2b",
  action: "b2b_outreach",
  actor: "marketing-hq",
  reason: "Test rejection boundary",
});
security.decideApproval(rejected.requestId, "rejected", "test-user");
assert.equal(execution.check("b2b_outreach", rejected.requestId).executable, false);

execution.recordExecutionResult("launch_ads", "test-user", undefined, true, "Provider executor test result recorded");
assert.ok(security.listAudit().some((event) => event.details.includes("Execution succeeded")));

console.log("Phase 1D execution-center tests passed");
