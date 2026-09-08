import assert from "node:assert/strict";
import { MarketingSecurityLayer, type ApprovalRequest, type AuditEvent } from "../src/marketing-security";
import type { MarketingPersistence } from "../src/marketing-persistence";

class MemoryPersistence implements MarketingPersistence {
  approvals: ApprovalRequest[] = [];
  audit: AuditEvent[] = [];
  async loadApprovals() { return [...this.approvals]; }
  async loadAudit() { return [...this.audit]; }
  async saveApproval(request: ApprovalRequest) { const index = this.approvals.findIndex((item) => item.requestId === request.requestId); if (index >= 0) this.approvals[index] = { ...request }; else this.approvals.push({ ...request }); }
  async saveAudit(event: AuditEvent) { if (!this.audit.some((item) => item.eventId === event.eventId)) this.audit.push({ ...event }); }
}

async function main() {
  const persistence = new MemoryPersistence();
  const first = new MarketingSecurityLayer(persistence);
  const created = first.requestApproval({ requestId: "approval_persist_1", action: "launch_ads", actor: "test", reason: "persistence test" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(persistence.approvals.length, 1);
  assert.equal(persistence.audit.length, 1);
  first.decideApproval(created.requestId, "approved", "admin");
  await new Promise((resolve) => setTimeout(resolve, 0));

  const second = new MarketingSecurityLayer(persistence);
  await second.hydrate();
  assert.equal(second.listApprovals()[0]?.decision, "approved");
  assert.equal(second.canExecute("launch_ads", created.requestId), true);
  assert.equal(second.listAudit().length, 2);
  console.log("Marketing HQ persistence tests passed");
}

void main();
