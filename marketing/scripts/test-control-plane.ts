import { strict as assert } from "node:assert";
import { MarketingControlPlane, normalizeDirectorAction } from "../src/control-plane";
import { MarketingSecurityLayer } from "../src/marketing-security";

const security = new MarketingSecurityLayer();
const controlPlane = new MarketingControlPlane(security);

assert.equal(normalizeDirectorAction("Create a campaign around skincare"), "launch_ads");
assert.equal(normalizeDirectorAction("Match creators with lipstick"), "contact_creator");
assert.equal(normalizeDirectorAction("Prioritize qualified B2B opportunities"), "b2b_outreach");
assert.equal(normalizeDirectorAction("Run a low-cost content experiment"), "publish_content");
assert.equal(normalizeDirectorAction("unknown internal operation"), null);

const sensitive = controlPlane.prepareFromDirector({
  action: "Launch ads for the strongest product",
  reason: "Test a qualified growth opportunity.",
  confidence: 0.8,
  requiresApproval: true,
});
assert.equal(sensitive.status, "approval_required");
assert.ok(sensitive.approvalRequestId);
assert.equal(controlPlane.canExecute(sensitive.action, sensitive.approvalRequestId), false);

security.decideApproval(sensitive.approvalRequestId!, "approved", "test-approver");
assert.equal(controlPlane.canExecute(sensitive.action, sensitive.approvalRequestId), true);

const rejected = controlPlane.prepareFromDirector({
  action: "Contact a creator for collaboration",
  reason: "Creator match is relevant.",
  confidence: 0.7,
  requiresApproval: true,
});
security.decideApproval(rejected.approvalRequestId!, "rejected", "test-approver");
assert.equal(controlPlane.canExecute(rejected.action, rejected.approvalRequestId), false);

const ready = controlPlane.prepareFromDirector({
  action: "Promote products with safe inventory",
  reason: "Avoid inventory-risk products.",
  confidence: 0.9,
  requiresApproval: false,
});
assert.equal(ready.status, "ready");
assert.equal(controlPlane.canExecute(ready.action), true);

console.log("Phase 1C control-plane tests passed");
