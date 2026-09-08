import { Client } from "pg";
import type { ApprovalRequest, AuditEvent } from "./marketing-security";

export interface MarketingPersistence {
  loadApprovals(): Promise<ApprovalRequest[]>;
  loadAudit(): Promise<AuditEvent[]>;
  saveApproval(request: ApprovalRequest): Promise<void>;
  saveAudit(event: AuditEvent): Promise<void>;
}

export class NeonMarketingPersistence implements MarketingPersistence {
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;

  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl });
    await client.connect();
    try {
      return await work(client);
    } finally {
      await client.end();
    }
  }

  async loadApprovals(): Promise<ApprovalRequest[]> {
    return this.withClient(async (client) => {
      const result = await client.query("SELECT request_id, action, actor, target, reason, requested_at, decision, decided_at, decided_by FROM marketing_hq_approvals ORDER BY requested_at ASC");
      return result.rows.map((row) => ({
        requestId: row.request_id,
        action: row.action,
        actor: row.actor,
        target: row.target ?? undefined,
        reason: row.reason,
        createdAt: new Date(row.requested_at).toISOString(),
        decision: row.decision ?? "pending",
        decidedAt: row.decided_at ? new Date(row.decided_at).toISOString() : undefined,
        decidedBy: row.decided_by ?? undefined,
      } as ApprovalRequest));
    });
  }

  async loadAudit(): Promise<AuditEvent[]> {
    return this.withClient(async (client) => {
      const result = await client.query("SELECT event_id, event_type, action, actor, details, created_at FROM marketing_hq_audit_events ORDER BY created_at ASC");
      return result.rows.map((row) => {
        const details = row.details && typeof row.details === "object" ? row.details : {};
        return {
          eventId: row.event_id,
          action: row.action ?? row.event_type,
          actor: row.actor ?? "system",
          target: details.target ?? undefined,
          details: details.message ?? JSON.stringify(details),
          occurredAt: new Date(row.created_at).toISOString(),
        } as AuditEvent;
      });
    });
  }

  async saveApproval(request: ApprovalRequest): Promise<void> {
    await this.withClient((client) => client.query(
      `INSERT INTO marketing_hq_approvals
       (request_id, action, actor, target, reason, requested_at, decision, decided_at, decided_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (request_id) DO UPDATE SET
         action=EXCLUDED.action, actor=EXCLUDED.actor, target=EXCLUDED.target,
         reason=EXCLUDED.reason, requested_at=EXCLUDED.requested_at, decision=EXCLUDED.decision,
         decided_at=EXCLUDED.decided_at, decided_by=EXCLUDED.decided_by`,
      [request.requestId, request.action, request.actor, request.target ?? null, request.reason,
        request.createdAt, request.decision, request.decidedAt ?? null, request.decidedBy ?? null],
    ).then(() => undefined));
  }

  async saveAudit(event: AuditEvent): Promise<void> {
    await this.withClient((client) => client.query(
      `INSERT INTO marketing_hq_audit_events
       (event_id, event_type, request_id, action, actor, details, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.eventId, "approval", undefined, event.action, event.actor,
        JSON.stringify({ message: event.details, target: event.target ?? null }), event.occurredAt],
    ).then(() => undefined));
  }
}
