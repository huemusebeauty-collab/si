import { randomUUID } from "node:crypto";
import { Client } from "pg";

export interface PublishingAuditEntry { auditId: string; contentId: string; versionId: string; fromStatus: string; toStatus: string; actor: string; occurredAt: string; }
export interface PublishingAuditRepository { append(entry: PublishingAuditEntry): Promise<PublishingAuditEntry>; list(contentId: string): Promise<PublishingAuditEntry[]>; }
export class MemoryPublishingAuditRepository implements PublishingAuditRepository {
  private readonly entries: PublishingAuditEntry[] = [];
  async append(entry: PublishingAuditEntry) { this.entries.push(entry); return entry; }
  async list(contentId: string) { return this.entries.filter((entry) => entry.contentId === contentId); }
}
export class NeonPublishingAuditRepository implements PublishingAuditRepository {
  private readonly databaseUrl = process.env.MARKETING_HQ_DATABASE_URL ?? process.env.DATABASE_URL;
  private async withClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("Marketing HQ persistence database URL is not configured");
    const client = new Client({ connectionString: this.databaseUrl }); await client.connect();
    try { return await work(client); } finally { await client.end(); }
  }
  async append(entry: PublishingAuditEntry) { return this.withClient(async (client) => { await client.query("INSERT INTO marketing_hq_publishing_audit (audit_id, content_id, version_id, from_status, to_status, actor, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [entry.auditId, entry.contentId, entry.versionId, entry.fromStatus, entry.toStatus, entry.actor, entry.occurredAt]); return entry; }); }
  async list(contentId: string) { return this.withClient(async (client) => { const rows = (await client.query("SELECT audit_id, content_id, version_id, from_status, to_status, actor, occurred_at FROM marketing_hq_publishing_audit WHERE content_id = $1 ORDER BY occurred_at ASC", [contentId.trim()])).rows; return rows.map((row) => ({ auditId: row.audit_id, contentId: row.content_id, versionId: row.version_id, fromStatus: row.from_status, toStatus: row.to_status, actor: row.actor, occurredAt: new Date(row.occurred_at).toISOString() })); }); }
}
export const createAuditEntry = (contentId: string, versionId: string, fromStatus: string, toStatus: string, actor: string): PublishingAuditEntry => ({ auditId: `audit_${randomUUID()}`, contentId, versionId, fromStatus, toStatus, actor, occurredAt: new Date().toISOString() });
