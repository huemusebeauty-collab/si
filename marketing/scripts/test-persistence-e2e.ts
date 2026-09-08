import { MarketingControlApi } from "../src/marketing-control-api";
import { MarketingPersistence } from "../src/marketing-persistence";
import { ApprovalRequest, AuditEvent, MarketingSecurityLayer } from "../src/marketing-security";
class MemoryPersistence implements MarketingPersistence {
  approvals: ApprovalRequest[] = [];
  audit: AuditEvent[] = [];
  async loadApprovals() { return this.approvals.map((x) => ({ ...x })); }
  async loadAudit() { return this.audit.map((x) => ({ ...x })); }
  async saveApproval(request: ApprovalRequest) { const i = this.approvals.findIndex((x) => x.requestId === request.requestId); if (i >= 0) this.approvals[i] = { ...request }; else this.approvals.push({ ...request }); }
  async saveAudit(event: AuditEvent) { if (!this.audit.some((x) => x.eventId === event.eventId)) this.audit.push({ ...event }); }
}
async function main() {
  const store = new MemoryPersistence();
  const security = new MarketingSecurityLayer(store);
  const api = new MarketingControlApi(undefined, security);
  const created = await api.requestApprovalDurable({ action: "launch_ads", actor: "e2e", reason: "persistence approval test", target: "test-campaign" });
  if (!created.ok || !created.data || store.approvals.length !== 1 || store.audit.length !== 1) throw new Error("durable approval request failed");
  const approved = await api.decideApprovalDurable(created.data.requestId, "approved", "e2e-reviewer");
  if (!approved.ok || approved.data?.decision !== "approved" || store.audit.length !== 2) throw new Error("durable approval decision failed");
  const restarted = new MarketingSecurityLayer(store);
  await restarted.hydrate();
  if (restarted.listApprovals()[0]?.decision !== "approved") throw new Error("approved state did not survive restart");
  if (restarted.listAudit().length !== 2) throw new Error("audit history did not survive restart");
  if (!restarted.canExecute("launch_ads", created.data.requestId)) throw new Error("approved action blocked after restart");
  console.log("Persistence E2E PASS: request -> durable write -> decision -> audit -> hydrate -> executable");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
